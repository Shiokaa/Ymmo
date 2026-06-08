# Bastion de provisioning — Ymmo-Infra

VM Debian 12 servant de jump host SSH pour atteindre les VMs internes depuis le control node Ansible.

---

## Rôle dans l'infrastructure

Le bastion est le seul hôte accessible directement depuis le control node sur le réseau de gestion Proxmox (`192.168.10.0/24`). Son IP LAN Proxmox est `192.168.10.43`.

Les VMs internes (VLAN 10 siège `10.0.10.x`, VLAN 20 `10.0.20.x`, etc.) ne sont pas routables depuis le control node. Ansible les atteint via un `ProxyJump` SSH à travers le bastion. Le bastion participe au backbone WireGuard (`10.254.0.2/32`) ce qui lui donne accès aux VLANs siège via OPNsense.

```
Control node
  192.168.10.x
       |
       | SSH direct (vmbr0)
       v
  Bastion — 192.168.10.43
    WireGuard : 10.254.0.2/32
       |
       | WireGuard backbone 10.254.0.0/24
       v
  OPNsense (Hub) — 10.254.0.1
       |
       | Routage VLANs internes (AllowedIPs 10.0.0.0/16 dans wg0.conf du bastion)
       v
  VMs internes
    Samba4-DC1 — 10.0.10.1  (VLAN SRV_SIEGE)
    ...
```

Le bastion **ne route pas** les réseaux agences (`10.1.0.0/16`, `10.2.0.0/16`, …). Son `AllowedIPs` côté OPNsense est uniquement `10.254.0.2/32` (sa propre IP tunnel) ; son `wg0.conf` déclare `AllowedIPs = 10.0.0.0/16` vers OPNsense pour accéder aux VLANs siège.

---

## Architecture réseau

| Interface | Adresse | Réseau |
|-----------|---------|--------|
| `ens18` (vmbr0) | `192.168.10.43` | Réseau de gestion Proxmox — accès direct depuis le control node |
| `wg0` | `10.254.0.2/32` | Backbone WireGuard — communication chiffrée avec OPNsense |

Le bastion n'a pas d'interface sur les VLANs internes. Il accède à `10.0.x.x` en envoyant le trafic dans le tunnel WireGuard vers OPNsense, qui le route ensuite sur le bon VLAN.

---

## Prérequis

1. La VM Bastion est provisionnée par Terraform (définie dans `terraform/zone-infra.tf`) :
   ```bash
   make tf-apply
   ```
   Elle clone le template Debian 12 (ID 9000). Cloud-init crée l'utilisateur `sysadmin` et configure l'IP statique sur `vmbr0`.

2. Le vault Ansible contient la clé privée WireGuard du serveur OPNsense :
   ```bash
   ansible-vault edit ansible/inventory/group_vars/all/vault.yml
   # vault_wireguard_server_private_key: "<output de wg genkey>"
   ```

3. Le hub OPNsense est configuré (playbooks de setup exécutés) :
   ```bash
   ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_setup.yml --ask-vault-pass
   ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_network.yml --ask-vault-pass
   ```

4. La collection `oxlorg.opnsense` est installée :
   ```bash
   ansible-galaxy collection install -r ansible/collections/requirements.yml
   ```

---

## Variables Ansible

### `inventory/group_vars/tag_bastion/main.yml`

```yaml
ansible_user: sysadmin
ansible_pipelining: false
wireguard_peer_tunnel_ip: "10.254.0.2/32"
```

| Variable | Valeur | Description |
|----------|--------|-------------|
| `ansible_user` | `sysadmin` | Utilisateur SSH créé par cloud-init — root est désactivé par le script de durcissement Packer |
| `ansible_pipelining` | `false` | Désactivé pour compatibilité avec le mode `requiretty` du durcissement Debian |
| `wireguard_peer_tunnel_ip` | `10.254.0.2/32` | IP du bastion dans le backbone WireGuard |

### `inventory/host_vars/Bastion/main.yml`

```yaml
wireguard_peer_tunnel_ip: "10.254.0.2/32"
```

Surcharge host-level identique au `group_vars`. Permet de modifier l'IP tunnel du bastion seul sans toucher au groupe. Si les deux définitions coexistent, la valeur `host_vars` prend la priorité (précédence Ansible standard).

### Variables du rôle `debian_wireguard` pertinentes pour le bastion

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| `wireguard_hub_allowed_ips` | `10.0.0.0/16` | VLANs siège routés vers OPNsense dans `wg0.conf` |
| `wireguard_keepalive` | `25` | PersistentKeepalive — maintient le tunnel actif derrière NAT |
| `wireguard_key_path` | `/etc/wireguard/wg0.key` | Clé privée locale (mode 0600, propriétaire root) |

---

## Configuration WireGuard du bastion

Le bastion est traité par les plays 2 et 4 du playbook `wireguard.yml` (groupe `tag_agence:tag_bastion`).

`wg0.conf` généré sur le bastion :

```ini
[Interface]
PrivateKey = <clé privée générée par Ansible>
Address    = 10.254.0.2/32
DNS        = 10.0.10.254   # optionnel selon la configuration du rôle

[Peer]
# Hub OPNsense
PublicKey    = <clé publique OPNsense — transmise via hostvars>
Endpoint     = 192.168.10.40:51820
AllowedIPs   = 10.0.0.0/16
PersistentKeepalive = 25
```

La clé publique OPNsense est transmise depuis le play 1 via `hostvars[groups['tag_router'][0]]['wg_server_pubkey']`. L'endpoint est l'IP WAN d'OPNsense : `192.168.10.40`.

---

## Exécution

### Setup complet (premier déploiement)

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass
```

Le bastion est inclus aux plays 2 et 4 via `hosts: tag_agence:tag_bastion`. Il partage le rôle `debian_wireguard` avec les agences.

| Play | Bastion concerné | Action |
|------|-----------------|--------|
| 1 (tag_router) | Non | Configuration OPNsense |
| 2 (tag_agence:tag_bastion) | Oui | Installation `wireguard-tools`, génération de la keypair |
| 3 (tag_router) | Non | Enregistrement du bastion comme peer sur OPNsense |
| 4 (tag_agence:tag_bastion) | Oui | Écriture `wg0.conf`, activation `wg-quick@wg0` |

### Reconfiguration du bastion seul

Si le tunnel doit être reconstruit sans toucher aux agences ni à OPNsense, fournir la clé publique OPNsense en extra-vars :

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass \
  --limit Bastion \
  --tags config,service \
  -e "wg_server_pubkey=<clé publique OPNsense>" \
  -e "opnsense_wan_ip=192.168.10.40"
```

---

## Utiliser le ProxyJump pour accéder aux VMs internes

### Comment fonctionne le ProxyJump

Ansible ouvre d'abord une connexion SSH vers le bastion (`192.168.10.43`), puis établit une seconde connexion SSH vers la VM cible (`10.0.x.x`) à travers ce premier tunnel. Du point de vue de la VM cible, la connexion provient du bastion.

Le tunnel WireGuard du bastion doit être actif pour que la VM cible soit joignable. Sans tunnel, `10.0.x.x` est inaccessible depuis le bastion.

### Configurer le ProxyJump dans un group_vars

Pour qu'un playbook ciblant un groupe interne utilise le bastion, définir `ansible_ssh_common_args` dans le `group_vars` de ce groupe.

Exemple avec `tag_samba4` (`inventory/group_vars/tag_samba4/main.yml`) :

```yaml
ansible_user: sysadmin
ansible_become_timeout: 30
ansible_ssh_common_args: >-
  -o ProxyJump=sysadmin@{{ hostvars[groups['tag_bastion'][0]]['ansible_host'] }}
  -o ForwardAgent=yes
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
```

Les options utilisées :
- `ProxyJump` : adresse SSH du bastion, résolue dynamiquement depuis l'inventaire Proxmox
- `ForwardAgent=yes` : transmet l'agent SSH pour ne pas avoir à copier de clé privée sur le bastion
- `StrictHostKeyChecking=no` + `UserKnownHostsFile=/dev/null` : évite les blocages sur mismatch de clé après un rebuild Terraform (la VM est recréée, son fingerprint change)

### Ajouter un nouveau groupe avec ProxyJump

1. Créer `ansible/inventory/group_vars/tag_<monservice>/main.yml` :
   ```yaml
   ansible_user: sysadmin
   ansible_pipelining: false
   ansible_ssh_common_args: >-
     -o ProxyJump=sysadmin@{{ hostvars[groups['tag_bastion'][0]]['ansible_host'] }}
     -o ForwardAgent=yes
     -o StrictHostKeyChecking=no
     -o UserKnownHostsFile=/dev/null
   ```

2. Vérifier la connectivité avant de lancer le playbook :
   ```bash
   ansible -i inventory/ tag_<monservice> -m ping --ask-vault-pass
   ```

3. Lancer le playbook normalement — le ProxyJump est transparent pour les modules Ansible :
   ```bash
   ansible-playbook -i inventory/ playbooks/mon_playbook.yml --ask-vault-pass
   ```

### Accès manuel via SSH

```bash
# Connexion directe au bastion
ssh sysadmin@192.168.10.43

# Connexion à une VM interne via le bastion (ProxyJump explicite)
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1

# Vérifier l'état du tunnel WireGuard depuis le bastion
ssh sysadmin@192.168.10.43 "sudo wg show"

# Tester la connectivité vers OPNsense via le tunnel
ssh sysadmin@192.168.10.43 "ping -c 3 10.254.0.1"

# Tester l'accès à un VLAN interne
ssh sysadmin@192.168.10.43 "ping -c 3 10.0.10.1"
```

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `terraform/zone-infra.tf` | Définition Terraform du module `bastion` (template 9000, `vmbr0`, tags Proxmox) |
| `ansible/inventory/group_vars/tag_bastion/main.yml` | `ansible_user`, `ansible_pipelining`, `wireguard_peer_tunnel_ip` |
| `ansible/inventory/host_vars/Bastion/main.yml` | Surcharge host-level de `wireguard_peer_tunnel_ip` |
| `ansible/playbooks/wireguard.yml` | Orchestrateur WireGuard — plays 2 et 4 configurent le bastion |
| `ansible/roles/debian_wireguard/` | Rôle partagé bastion + agences |
| `ansible/inventory/group_vars/tag_samba4/main.yml` | Exemple de ProxyJump via bastion pour un groupe interne |

---

## Points d'attention

| Point | Détail |
|-------|--------|
| Ordre d'exécution | Le bastion doit être configuré via `wireguard.yml` (orchestrateur complet) lors du premier setup. Le playbook `debian_wireguard.yml` seul suppose que les clés OPNsense sont connues — il échouera au play de configuration. |
| Tunnel WireGuard obligatoire | Tant que `wg-quick@wg0` n'est pas actif sur le bastion, les VMs internes (`10.0.x.x`) sont injoignables. Vérifier l'état du service avant tout diagnostic réseau : `ssh sysadmin@192.168.10.43 "sudo systemctl status wg-quick@wg0"`. |
| Dépendance à l'inventaire Proxmox | `hostvars[groups['tag_bastion'][0]]['ansible_host']` dans `ansible_ssh_common_args` est résolu dynamiquement par le plugin d'inventaire. Si le bastion est absent de l'inventaire (VM arrêtée, tag manquant), les playbooks ciblant les groupes internes échoueront avec une erreur d'index. |
| Tag Proxmox | Le bastion porte les tags `bastion` et `ymmotom`. L'inventaire dynamique le regroupe sous `tag_bastion`. Le tag `ymmotom` est requis pour qu'il apparaisse dans l'inventaire (filtre configuré dans `inventory/proxmox.proxmox.yml`). |
| Rotation des clés | Pour régénérer la keypair WireGuard du bastion, supprimer `/etc/wireguard/wg0.key` sur la VM, puis relancer `wireguard.yml`. Le play 3 met à jour le peer côté OPNsense avec la nouvelle clé publique. |
| `ForwardAgent` | L'agent SSH doit être chargé sur le control node (`ssh-add ~/.ssh/id_*`). Sans agent actif, `ForwardAgent=yes` est sans effet et Ansible demandera le mot de passe de la clé privée à chaque connexion. |
