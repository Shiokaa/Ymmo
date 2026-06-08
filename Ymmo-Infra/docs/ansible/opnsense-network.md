# Rôle Ansible — `opnsense_network`

Ce document décrit le rôle `opnsense_network` appliqué par le playbook
`ansible/playbooks/opnsense_network.yml`. Il couvre la configuration réseau
d'OPNsense via l'API REST : VLANs, DHCP Dnsmasq, et règles firewall.

Pour comprendre ce que Packer configure en amont (NAT outbound, interfaces OPT,
assignation physique), voir `docs/ansible/opnsense-pipeline.md`.

---

## 1. Rôle dans le pipeline

```
Packer (template 9001)
  - interfaces physiques assignées dans config.xml
  - VLANs et interfaces OPT pré-déclarés dans config.xml
  - NAT outbound, règles floating et règles VLAN legacy baked
        |
        v
Terraform — VM OPNsense-Master déployée et accessible
        |
        v
opnsense_setup — connectivité SSH confirmée
        |
        v
opnsense_network — CE ROLE
  devices VLAN déclarés via API REST
  plages DHCP Dnsmasq configurées via API REST
  règles firewall VLAN-to-WAN créées via API REST
```

---

## 2. Prérequis

### Template Packer avec VLANs pré-déclarés

Le rôle suppose que le template OPNsense a été construit avec la section 7 de
`packer/scripts/opnsense-setup.sh`. Cette section écrit dans `config.xml` :

- les 4 entrées `<vlan>` du Siège (tags 10, 20, 30, 99) sur l'interface parent `vtnet0`
- les 4 interfaces OPT (`opt1` à `opt4`) associées aux devices `vlan0.10` à `vlan0.99`

L'API OPNsense ne peut pas assigner des interfaces à des slots OPT (issue upstream
core#7324, fermée "not planned"). Sans cette pré-déclaration dans `config.xml`,
le rôle peut déclarer les devices VLAN via l'API, mais ceux-ci ne seront pas liés
aux interfaces OPT — les règles firewall et le DHCP seront sans effet.

Si le template a été construit sans la section 7, un rebuild complet est nécessaire :

```bash
make build-opnsense
make tf-apply
```

### Vault Ansible

Les credentials API doivent être définis dans
`ansible/inventory/group_vars/all/vault.yml` :

```yaml
vault_opnsense_api_key: "valeur-identique-a-packer"
vault_opnsense_api_secret: "valeur-en-clair-non-hashee"
vault_wireguard_server_private_key: "output-de-wg-genkey"
```

Le secret doit être la valeur en clair. OPNsense stocke un hash SHA-512 dans
`config.xml` et effectue le hachage lui-même lors de l'authentification. Fournir
une valeur pré-hashée provoquerait un refus d'authentification silencieux.

### Collection Ansible

```bash
cd ansible
ansible-galaxy collection install -r collections/requirements.yml
```

La collection utilisée est `oxlorg.opnsense`, pinned à la version `25.7.8` dans
`ansible/collections/requirements.yml`. Elle s'appelait `ansibleguy.opnsense`
jusqu'en septembre 2024 — l'ancien namespace ne doit plus être utilisé.

---

## 3. Architecture réseau — VLANs du Siège

Les VLANs sont définis dans `ansible/roles/opnsense_network/defaults/main.yml`
via la variable `opnsense_network_vlans`. Ils héritent tous de l'interface parent
`vtnet0` (LAN interne).

| Tag | Nom | Device OS | Interface OPT | Passerelle | Plage DHCP |
|-----|-----|-----------|---------------|------------|------------|
| 10 | `SRV_SIEGE` | `vlan0.10` | `opt1` | `10.0.10.254` | `10.0.10.100` – `10.0.10.200` |
| 20 | `USR_SIEGE` | `vlan0.20` | `opt2` | `10.0.20.254` | `10.0.20.100` – `10.0.20.200` |
| 30 | `PRT_SIEGE` | `vlan0.30` | `opt3` | `10.0.30.254` | `10.0.30.100` – `10.0.30.200` |
| 99 | `MGT_SIEGE` | `vlan0.99` | `opt4` | `10.0.99.254` | `10.0.99.100` – `10.0.99.200` |

Réseau : `10.0.[vlan].[host]`, conforme au schéma d'adressage global (siège = site 0).
Domaine DNS interne : `ymmo.lan` (aligné sur le realm Active Directory)
Durée de bail DHCP : `43200` secondes (12 heures)

---

## 4. Variables

### Variables de connexion — `group_vars/tag_router/main.yml`

Ces variables sont appliquées à tous les hôtes du groupe `tag_router`. Elles
configurent la connexion API et sont consommées par le `module_defaults` des
deux playbooks OPNsense.

| Variable | Valeur par défaut | Description |
|----------|------------------|-------------|
| `ansible_connection` | `local` | Exécution locale sur le contrôleur — pas de SSH pour les tasks OPNsense |
| `opnsense_api_key` | `{{ vault_opnsense_api_key }}` | Clé API OPNsense, chargée depuis le vault |
| `opnsense_api_secret` | `{{ vault_opnsense_api_secret }}` | Secret API en clair, chargé depuis le vault |
| `opnsense_api_host` | `{{ ansible_host }}` | IP WAN résolue dynamiquement par l'inventaire Proxmox |
| `opnsense_ssl_verify` | `false` | Vérification SSL — `false` acceptable en homelab avec certificat auto-signé |
| `wireguard_server_private_key` | `{{ vault_wireguard_server_private_key }}` | Clé privée WireGuard du hub siège |

### Variables réseau — `roles/opnsense_network/defaults/main.yml`

Ces variables définissent la topologie réseau consommée par toutes les boucles du rôle.

| Variable | Type | Description |
|----------|------|-------------|
| `opnsense_network_vlans` | liste | Définition complète de chaque VLAN (voir structure ci-dessous) |
| `opnsense_network_dns_domain` | chaîne | Domaine DNS interne — valeur par défaut : `ymmo.lan` (doit correspondre au realm AD) |
| `opnsense_network_dns_servers` | liste | Serveur(s) DNS poussé(s) aux clients DHCP (option 6) — défaut : `["10.0.10.1"]` (le DC AD) |
| `opnsense_network_dhcp_lease` | entier | Durée de bail DHCP en secondes — valeur par défaut : `43200` |

Structure d'un élément de `opnsense_network_vlans` :

| Clé | Exemple | Description |
|-----|---------|-------------|
| `tag` | `10` | Identifiant VLAN 802.1Q |
| `name` | `SRV_SIEGE` | Nom de description — clé d'idempotence pour DHCP et firewall |
| `device` | `vlan0.10` | Nom du device OS tel qu'écrit par Packer dans `config.xml` |
| `parent` | `vtnet0` | Interface physique parente |
| `opt` | `opt1` | Slot d'interface OPT dans OPNsense — doit correspondre à ce que Packer a déclaré |
| `network` | `10.0.10.0` | Adresse réseau (sans masque) |
| `gw` | `10.0.10.254` | Passerelle — adresse IP de l'interface OPT dans OPNsense |
| `dhcp_start` | `10.0.10.100` | Première adresse de la plage DHCP |
| `dhcp_end` | `10.0.10.200` | Dernière adresse de la plage DHCP |

---

## 5. Tâches par fichier

Le rôle est découpé en fichiers numérotés, chacun isolé dans son propre fichier
et ciblable via un tag Ansible. `main.yml` orchestre les imports.

### `00_assert.yml` — tag : `always`

Vérifie que `opnsense_api_key` et `opnsense_api_secret` sont définis et non vides
avant tout appel API. Le playbook échoue explicitement avec un message lisible
si l'une de ces variables est absente, plutôt que de laisser les modules remonter
une erreur d'authentification opaque.

Vérifie également que `opnsense_network_vlans` est défini et non vide, pour éviter
que les boucles des tâches suivantes s'exécutent à vide en silence.

Ce fichier est importé avec le tag `always` : il s'exécute systématiquement,
y compris lors d'une exécution sélective par tag.

### `10_vlans.yml` — tag : `vlans`

Déclare chaque device VLAN via le module `oxlorg.opnsense.interface_vlan`.
La tâche boucle sur `opnsense_network_vlans`.

Le paramètre `device` (exemple : `vlan0.10`) est obligatoire. Sans lui, OPNsense
génère un nom séquentiel automatique (`vlan01`, `vlan02`...) depuis la version 22.1.6.
Ce nom séquentiel ne correspond pas aux entrées pré-déclarées par Packer dans
`config.xml`, ce qui empêche le binding des interfaces OPT et rend DHCP et firewall
inopérants sur ces interfaces.

### `20_nat.yml` — intentionnellement vide

Ce fichier ne contient aucune tâche. Il documente la décision de ne pas configurer
le NAT outbound via l'API.

L'API REST OPNsense (`/api/firewall/nat/outbound/*`) n'est pas exposée. Le code
NAT outbound reste dans le legacy PHP d'OPNsense et renvoie 404 sur tous les
endpoints MVC testés (`search_rule`, `searchRule`, `add_rule`, `addRule`). La
configuration NAT outbound est donc injectée directement dans `config.xml` lors
du build Packer (mode hybrid + règles explicites par VLAN dans le script
`opnsense-setup.sh`, section 8).

Le fichier est conservé pour documenter cette décision et prévenir toute tentative
de réintroduire des tâches NAT qui échoueraient en silence.

### `30_dhcp.yml` — tag : `dhcp`

Configure le service DHCP via Dnsmasq. Deux tâches sont exécutées.

**Activation globale de Dnsmasq** (`oxlorg.opnsense.dnsmasq_general`) :

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| `enabled` | `true` | Active le service |
| `port` | `0` | Désactive le DNS de Dnsmasq. Unbound gère déjà le DNS sur le port 53. OPNsense ne permet pas à deux services d'écouter sur ce port, même liés à des interfaces différentes. Forcer `port: 0` est obligatoire pour éviter un conflit qui empêcherait l'un des deux services de démarrer. |
| `interfaces` | liste des `opt` de chaque VLAN | Restreint Dnsmasq aux interfaces VLAN uniquement, pas au LAN ni au WAN |
| `dhcp_authoritative` | `true` | Mode autoritaire : Dnsmasq répond aux clients sans bail existant plutôt que de les ignorer |
| `dhcp_fqdn` | `true` | Enregistre les baux avec le FQDN complet (`hostname.ymmo.lan`) |
| `dhcp_domain` | `{{ opnsense_network_dns_domain }}` | Domaine DNS attaché aux baux |

**Déclaration des plages DHCP** (`oxlorg.opnsense.dnsmasq_range`) :

Une entrée est créée par VLAN, en boucle sur `opnsense_network_vlans`. La description
(`DHCP-SRV_SIEGE`, `DHCP-USR_SIEGE`...) est la clé d'idempotence implicite utilisée
par le module pour retrouver une entrée existante lors des exécutions suivantes. Ne
jamais modifier cette valeur après le premier déploiement : cela créerait un orphelin
dans OPNsense (l'ancienne entrée resterait, une nouvelle serait créée à côté).

Note : le paramètre `interface` de `dnsmasq_range` attend le nom de description du
VLAN (exemple : `SRV_SIEGE`), pas le slot OPT (`opt1`). Le module effectue la
résolution en interne. Passer `opt1` provoque une erreur API silencieuse où la plage
est créée sans être associée à l'interface.

**Serveur DNS poussé aux clients** (`oxlorg.opnsense.dnsmasq_option`, option 6) :

Une entrée est créée par VLAN (description `DNS-SRV_SIEGE`, `DNS-USR_SIEGE`...) pour
forcer le serveur DNS distribué aux clients DHCP vers le DC Active Directory
(`opnsense_network_dns_servers`, défaut `10.0.10.1`). Sans cette option, Dnsmasq
pousse par défaut l'IP de l'interface OPNsense (Unbound), qui ne connaît pas la zone
AD : la résolution des enregistrements SRV échoue et le **join de domaine Windows est
impossible**. Le DC, lui, forwarde les requêtes externes vers OPNsense
(`samba4_dns_forwarder`). Ne jamais ajouter OPNsense en DNS secondaire : Windows
alternerait entre les deux et échouerait par intermittence à résoudre la zone AD.

### `40_firewall.yml` — tag : `firewall`

Crée une règle `pass` par VLAN via le module `oxlorg.opnsense.rule`, pour autoriser
le trafic sortant de chaque VLAN vers Internet.

Paramètres notables :

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| `description` | `Allow-SRV_SIEGE-to-WAN` | Clé d'idempotence — `match_fields: ['description']` garantit qu'une règle existante est mise à jour plutôt que dupliquée |
| `interface` | `["{{ item.opt }}"]` | Slot OPT de l'interface VLAN source |
| `direction` | `in` | Trafic entrant sur l'interface VLAN (sortant vers WAN) |
| `ip_protocol` | `inet` | IPv4 uniquement |
| `protocol` | `any` | Tous les protocoles — valeur valide via API pour les règles de filtrage standard |
| `source_net` | `10.0.X.0/24` | Réseau source du VLAN |
| `destination_net` | `any` | Accès Internet sans restriction de destination |

L'isolation inter-VLAN (PRT isolé de USR, MGT restreint à certaines sources, etc.)
n'est pas dans le périmètre de ce rôle. Elle sera traitée dans une itération
ultérieure.

### `99_smoke.yml` — tag : `smoke` (désactivé par défaut)

Tests de validation post-configuration. Ce fichier n'est pas exécuté lors d'un run
normal — le tag `never` dans `main.yml` le désactive par défaut. Il faut l'activer
explicitement avec `--tags smoke`.

Les smoke tests interrogent l'API OPNsense et affichent la réponse HTTP brute pour
vérification manuelle. Ils ne font pas d'assertion automatique sur le contenu de la
réponse : l'interprétation est laissée à l'opérateur.

---

## 6. Utilisation

### Exécution complète

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/opnsense_network.yml --ask-vault-pass
```

### Exécution sélective par tag

```bash
# Devices VLAN uniquement
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags vlans

# DHCP uniquement
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags dhcp

# Règles firewall uniquement
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags firewall

# Smoke tests (vérification manuelle post-déploiement)
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags smoke
```

Le tag `always` sur `00_assert.yml` garantit que la vérification des prérequis
s'exécute dans tous les cas, y compris lors d'une exécution sélective.

---

## 7. Points d'attention

| Point | Détail |
|-------|--------|
| Paramètre `device` obligatoire dans `10_vlans.yml` | Sans lui, OPNsense génère un nom séquentiel (`vlan01`, `vlan02`...) depuis la version 22.1.6, qui ne correspond pas aux entrées Packer dans `config.xml`. Les interfaces OPT ne sont pas liées et le réseau ne fonctionne pas. |
| Paramètre `interface` dans `dnsmasq_range` | Ce champ attend le nom de description du VLAN (ex. `SRV_SIEGE`), pas le slot OPT (ex. `opt1`). Utiliser `opt1` crée la plage sans l'associer à l'interface — erreur silencieuse. |
| Faux positif `changed` sur `dnsmasq_range` | Le module signale `changed` à chaque exécution même sans changement effectif. Comportement connu du module, pas un problème de configuration. La configuration dans OPNsense est bien idempotente. |
| Dnsmasq en `port: 0` obligatoire | OPNsense ne permet pas à deux services d'écouter sur le port 53, même liés à des interfaces différentes. Sans `port: 0`, Dnsmasq entre en conflit avec Unbound et l'un des deux services refuse de démarrer. |
| Ne pas renommer les descriptions DHCP | La description (`DHCP-SRV_SIEGE`) est la clé d'idempotence du module `dnsmasq_range`. La modifier après le premier déploiement crée un orphelin : l'ancienne entrée reste dans OPNsense, une nouvelle est créée. Supprimer l'entrée manuellement dans l'interface OPNsense avant de relancer le playbook. |
| Ajout ou suppression de VLANs | Modifier `opnsense_network_vlans` dans les defaults ne suffit pas. L'assignation des interfaces OPT est baked dans Packer. Tout changement de la liste des VLANs nécessite un rebuild du template (`make build-opnsense`) suivi d'un redéploiement (`make tf-apply`). |
| NAT outbound absent de ce rôle | Aucune tâche NAT n'est exécutable via l'API REST OPNsense. Le NAT outbound est configuré par Packer dans `config.xml`. `20_nat.yml` est intentionnellement vide et documente cette décision. |
