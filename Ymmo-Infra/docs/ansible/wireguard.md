# WireGuard Site-à-Site — Ymmo-Infra

Tunnels VPN hub-and-spoke entre le siège (OPNsense) et les spokes Debian (bastion + agences distantes).

---

## Architecture

```
Control node (Ansible)
  192.168.10.x
       |
       | SSH direct (vmbr0 / réseau Proxmox)
       v
  Bastion — 192.168.10.43 (vmbr0)
    WireGuard tunnel : 10.254.0.2/32
       |
       | UDP 51820 — backbone 10.254.0.0/24
       v
  OPNsense — WAN 192.168.10.40 (Hub WireGuard)
    Tunnel : 10.254.0.1/24
       |
       |--- Bastion      10.254.0.2   AllowedIPs : 10.254.0.2/32
       |--- Agence-01    10.254.0.11  AllowedIPs : 10.1.0.0/16 + 10.254.0.11/32
       |--- Agence-02    10.254.0.12  AllowedIPs : 10.2.0.0/16 + 10.254.0.12/32
       |--- Agence-NN    10.254.0.1N  AllowedIPs : 10.N.0.0/16 + 10.254.0.1N/32
```

Le bastion joue un double rôle : il est un spoke WireGuard **et** le ProxyJump SSH utilisé par Ansible pour atteindre les VMs internes (VLANs `10.0.x.x`). Son `AllowedIPs` est limité à sa propre IP tunnel (`10.254.0.2/32`) — il ne route pas les réseaux agences.

---

## Flux d'exécution du playbook orchestrateur

Le playbook `playbooks/wireguard.yml` exécute 4 plays séquentiels. L'ordre est obligatoire : chaque play dépend des facts produits par le précédent.

| Play | Hôtes cibles | Actions |
|------|-------------|---------|
| 1 | `tag_router` | Activer WireGuard sur OPNsense, créer l'instance serveur, dériver et enregistrer la clé publique comme fact (`wg_server_pubkey`) |
| 2 | `tag_agence:tag_bastion` | Installer `wireguard-tools`, générer la keypair (`wg genkey`), enregistrer la clé publique comme fact (`wg_pubkey`) |
| 3 | `tag_router` | Lire `hostvars[*]['wg_pubkey']` pour chaque peer et les enregistrer sur OPNsense |
| 4 | `tag_agence:tag_bastion` | Écrire `wg0.conf` avec la clé publique OPNsense (depuis `hostvars[groups['tag_router'][0]]['wg_server_pubkey']`), activer `wg-quick@wg0` |

La clé publique OPNsense est transmise au play 4 via `hostvars` (variable Ansible inter-play). Si OPNsense est absent de l'inventaire, le play 4 échouera avec une erreur de variable indéfinie.

---

## Détail des tasks du rôle `opnsense_wireguard`

### `00_assert.yml` — Validation des prérequis

Vérifie avant tout appel API que :
- `opnsense_api_key` et `opnsense_api_secret` sont définis et non vides
- `wireguard_server_private_key` est définie dans le vault
- `wireguard_peers` contient au moins un peer

En cas d'échec, le message d'erreur indique précisément la variable manquante et où la définir.

### `05_general.yml` — Activation globale WireGuard

Active le module WireGuard sur OPNsense via `oxlorg.opnsense.wireguard_general` (équivalent de cocher "Enable WireGuard" dans l'interface), puis déclenche un `reconfigure` via l'API REST pour monter l'interface `wg0` côté OPNsense.

### `10_server.yml` — Création de l'instance serveur

1. Crée (ou met à jour) l'instance WireGuard avec `oxlorg.opnsense.wireguard_server` :
   - `name` : `wireguard_server_name` (défaut : `WG-Siege`)
   - `port` : `wireguard_server_port` (défaut : 51820)
   - `allowed_ips` : `wireguard_server_tunnel_ip` (défaut : `10.254.0.1/24`)
   - `private_key` : depuis le vault (`no_log: true`)
2. Dérive la clé publique **sur le control node** (`printf '<private_key>' | wg pubkey`, délégué à `localhost`) — évite un appel API supplémentaire.
3. Enregistre la clé publique dans le fact Ansible `wg_server_pubkey`, disponible pour les plays suivants.

La clé privée n'est jamais loguée (`no_log: true` sur les deux tâches concernées).

### `20_peers.yml` — Enregistrement des peers agences

Pour chaque entrée de `wireguard_peers` :
1. Vérifie que `hostvars[item.inventory_hostname]['wg_pubkey']` est défini (fail explicite si le play 2 n'a pas tourné ou si le host est absent de l'inventaire).
2. Appelle `oxlorg.opnsense.wireguard_peer` avec :
   - `public_key` : clé publique Debian récupérée via `hostvars`
   - `allowed_ips` : liste `[item.tunnel_ip, item.allowed_ips]` — OPNsense route vers ce peer tout trafic correspondant
   - `servers` : lien vers l'instance serveur (`wireguard_server_name`)

### `30_firewall.yml` — Règles firewall

Crée la règle OPNsense autorisant UDP `wireguard_server_port` en entrée sur le WAN, avec `match_fields: ['description']` pour l'idempotence. La règle floating backbone → VLANs siège est injectée au build Packer (l'API OPNsense ne supporte pas la création de floating rules — issue OPNsense #6938).

### `99_smoke.yml` — Tests de fumée (lecture seule)

Interroge les endpoints API `wireguard/server/searchServer` et `wireguard/client/searchClient` et affiche la réponse brute. Tous les appels sont `changed_when: false`. Ne pas inclure dans le playbook orchestrateur — usage manuel uniquement.

---

## Variables

### `roles/opnsense_wireguard/defaults/main.yml`

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `wireguard_server_name` | `WG-Siege` | Nom de l'instance dans OPNsense |
| `wireguard_server_port` | `51820` | Port UDP d'écoute |
| `wireguard_backbone_network` | `10.254.0.0/24` | Réseau backbone (utilisé dans les règles firewall) |
| `wireguard_server_tunnel_ip` | `10.254.0.1/24` | IP tunnel OPNsense dans le backbone |
| `wireguard_peers` | voir ci-dessous | Liste des spokes à enregistrer |

### Structure d'un peer dans `wireguard_peers`

```yaml
wireguard_peers:
  - name: "Bastion"                    # Identifiant dans OPNsense
    inventory_hostname: "Bastion"      # Nom de la VM dans l'inventaire Proxmox
    tunnel_ip: "10.254.0.2/32"         # IP du peer dans le backbone (/32 obligatoire)
    allowed_ips: "10.254.0.2/32"       # Réseau(x) routés via ce peer côté OPNsense
  - name: "Agence-01"
    inventory_hostname: "Agence-01"
    tunnel_ip: "10.254.0.11/32"
    allowed_ips: "10.1.0.0/16"
  - name: "Agence-02"
    inventory_hostname: "Agence-02"
    tunnel_ip: "10.254.0.12/32"
    allowed_ips: "10.2.0.0/16"
```

`inventory_hostname` doit correspondre exactement au nom de la VM dans Proxmox (sensible à la casse) : c'est la clé utilisée pour accéder à `hostvars[item.inventory_hostname]['wg_pubkey']`.

### Variables vault requises

Définir dans `ansible/inventory/group_vars/all/vault.yml` :

```yaml
vault_wireguard_server_private_key: "<output de wg genkey>"
```

Exposée au rôle via `group_vars/tag_router/main.yml` sous le nom `wireguard_server_private_key`. Générer une fois, ne jamais régénérer sans recréer l'instance serveur OPNsense.

### Variables du rôle `debian_wireguard` (spokes Debian)

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `wireguard_server_port` | `51820` | Port UDP du hub OPNsense |
| `wireguard_key_path` | `/etc/wireguard/wg0.key` | Clé privée locale (mode 0600, root) |
| `wireguard_interface` | `wg0` | Nom de l'interface wg-quick |
| `wireguard_keepalive` | `25` | PersistentKeepalive en secondes (NAT traversal) |
| `wireguard_hub_allowed_ips` | `10.0.0.0/16` | VLANs siège routés via le hub (pour le bastion) |
| `wireguard_peer_tunnel_ip` | *(défini en host_vars)* | IP du spoke dans le backbone — propre à chaque VM |

`wireguard_peer_tunnel_ip` est défini dans `inventory/host_vars/<VM>/main.yml` pour chaque spoke (et également dans `group_vars/tag_bastion/main.yml` pour le bastion).

---

## Prérequis

1. OPNsense configuré et accessible sur `192.168.10.40` — les playbooks de setup doivent avoir été exécutés :
   ```bash
   ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_setup.yml --ask-vault-pass
   ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_network.yml --ask-vault-pass
   ```

2. VMs agences et bastion provisionnés via Terraform :
   ```bash
   make tf-apply
   ```

3. Collection `oxlorg.opnsense` installée (version `25.7.8` pinée dans `collections/requirements.yml`) :
   ```bash
   ansible-galaxy collection install -r ansible/collections/requirements.yml
   ```

4. `wg` installé sur le control node (pour la dérivation de clé publique en local) :
   ```bash
   which wg || sudo apt install wireguard-tools
   ```

5. Vault configuré avec `vault_wireguard_server_private_key` :
   ```bash
   # Générer une clé privée (une seule fois)
   wg genkey

   # L'ajouter dans le vault
   ansible-vault edit ansible/inventory/group_vars/all/vault.yml
   # vault_wireguard_server_private_key: "<output>"
   ```

---

## Utilisation

### Setup complet (premier déploiement)

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass
```

Les playbooks individuels `opnsense_wireguard.yml` et `debian_wireguard.yml` ne peuvent pas être utilisés pour le premier setup — ils supposent que les clés sont déjà échangées. L'orchestrateur `wireguard.yml` est le seul point d'entrée correct.

### Exécution sélective par tag

```bash
# Serveur OPNsense seulement (plays 1 et 3)
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass --tags server,peers

# Agences seulement (génération clés + wg0.conf)
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass --tags install,keys,config,service
```

### Vérification manuelle après déploiement

```bash
# Depuis le control node — vérifier que les peers sont bien enregistrés
ansible -i inventory/ tag_router -m uri \
  -a "url=https://{{ opnsense_api_host }}/api/wireguard/server/searchServer method=GET ..."

# Sur une VM agence ou le bastion
ssh sysadmin@<IP vmbr0> "sudo wg show"

# Ping backbone depuis le bastion
ssh sysadmin@192.168.10.43 "ping -c 3 10.254.0.1"
```

---

## Ajouter une agence

Pour intégrer une nouvelle agence (ex. Agence-03, site 3, bloc `10.3.0.0/16`) :

**1. Terraform — `terraform/main.tf`**

Ajouter le site dans `locals.sites` :
```hcl
agence_03 = { name = "Agence-03", site_id = 3, node = "pve", storage = "local-lvm", bridges = ["vmbr0"] }
```

Créer le fichier `terraform/zone-agence-03.tf` en suivant le pattern des zones existantes.

**2. Packer / Terraform**

Provisionner la VM avec `make tf-apply`. La VM hérite du template Debian 12 (ID 9000).

**3. Role `opnsense_wireguard` — `defaults/main.yml`**

Ajouter l'entrée dans `wireguard_peers` :
```yaml
- name: "Agence-03"
  inventory_hostname: "Agence-03"
  tunnel_ip: "10.254.0.13/32"
  allowed_ips: "10.3.0.0/16"
```

**4. Inventaire Ansible — `host_vars/Agence-03/main.yml`**

Créer le fichier avec l'IP tunnel propre à cette VM :
```yaml
wireguard_peer_tunnel_ip: "10.254.0.13/32"
```

**5. Relancer le playbook**

```bash
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass
```

Le play 3 ajoutera Agence-03 comme peer sur OPNsense sans toucher aux peers existants (idempotence via `state: present`).

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `playbooks/wireguard.yml` | Orchestrateur complet — 4 plays séquentiels |
| `roles/opnsense_wireguard/defaults/main.yml` | Data model peers (tunnel_ip, allowed_ips) |
| `roles/opnsense_wireguard/tasks/10_server.yml` | Création serveur + dérivation clé publique |
| `roles/opnsense_wireguard/tasks/20_peers.yml` | Enregistrement des peers agences sur OPNsense |
| `roles/opnsense_wireguard/tasks/30_firewall.yml` | Règle firewall UDP 51820 WAN |
| `roles/debian_wireguard/tasks/20_keys.yml` | Génération idempotente des keypairs spokes |
| `roles/debian_wireguard/tasks/30_config.yml` | Écriture de `wg0.conf` via template Jinja2 |
| `roles/debian_wireguard/tasks/40_service.yml` | Activation et démarrage de `wg-quick@wg0` |
| `inventory/group_vars/tag_agence/main.yml` | `ansible_user: sysadmin`, `ansible_pipelining: false` |
| `inventory/group_vars/tag_bastion/main.yml` | `ansible_user`, `wireguard_peer_tunnel_ip` du bastion |
| `inventory/host_vars/Bastion/main.yml` | Surcharge host-level : `wireguard_peer_tunnel_ip` |
| `inventory/group_vars/all/vault.yml` | `vault_wireguard_server_private_key` (chiffré AES256) |

---

## Points d'attention

| Point | Détail |
|-------|--------|
| Ordre d'exécution obligatoire | Les 4 plays dépendent des facts produits par les plays précédents. Ne pas lancer les playbooks individuels pour le premier setup. |
| Passage de facts inter-plays | `wg_server_pubkey` (play 1 → play 4) et `wg_pubkey` (play 2 → play 3) transitent via `hostvars`. Si un hôte est absent de l'inventaire lors du play qui lit ses facts, Ansible lève une KeyError non explicite — le `assert` dans `20_peers.yml` rend l'erreur lisible. |
| Rotation des clés agence | Supprimer `/etc/wireguard/wg0.key` sur la VM, relancer `wireguard.yml`. Le play 3 met à jour le peer côté OPNsense avec la nouvelle clé publique. |
| Rotation de la clé serveur OPNsense | Impossible sans supprimer et recréer l'instance serveur (`state: absent` puis `state: present`). Toutes les agences devront relancer le play 4 avec la nouvelle clé publique. |
| `ansible_user` | L'inventaire dynamique Proxmox fixe `ansible_user: root` par défaut. Les `group_vars/tag_agence` et `group_vars/tag_bastion` surchargent vers `sysadmin` (créé par cloud-init au provisionnement Terraform). |
| Règle floating OPNsense | La règle autorisant le trafic backbone → VLANs internes est injectée au build Packer dans `config.xml`. L'API OPNsense ne permet pas de créer des floating rules (issue #6938). Ne pas tenter de la créer via Ansible. |
