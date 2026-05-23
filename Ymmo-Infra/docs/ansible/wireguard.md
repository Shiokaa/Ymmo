# WireGuard Site-à-Site — Ymmo-Infra

Configuration des tunnels VPN hub-and-spoke entre le siège (OPNsense) et les agences distantes (VMs Debian).

---

## Architecture

```
Siège (OPNsense) — Hub
  WireGuard : 10.254.0.1/24
  Port UDP   : 51820
       │
       ├── Agence-01 (Debian) — 10.254.0.11
       │     Réseau agence : 10.1.0.0/16
       │
       └── Agence-02 (Debian) — 10.254.0.12
             Réseau agence : 10.2.0.0/16
```

**Backbone VPN** : `10.254.0.0/24`  
**Réseau accessible depuis les agences** : `10.0.0.0/16` (VLANs siège)

---

## Flux de génération des clés

| Composant | Qui génère la clé | Stockage |
|-----------|-------------------|---------|
| OPNsense (hub) | OPNsense via API (automatique) | Interne à OPNsense |
| Agences (Debian) | `wg genkey` via Ansible | `/etc/wireguard/wg0.key` (mode 0600) |

Les clés publiques des agences sont récupérées à l'exécution et enregistrées comme peers sur OPNsense. La clé publique d'OPNsense est récupérée via l'API après création du serveur.

---

## Prérequis

1. Les playbooks OPNsense ont été exécutés :
   ```bash
   ansible-playbook -i inventory/ playbooks/opnsense_setup.yml --ask-vault-pass
   ansible-playbook -i inventory/ playbooks/opnsense_network.yml --ask-vault-pass
   ```

2. Les VMs agences sont provisionnées via Terraform :
   ```bash
   make tf-apply
   ```

3. La collection `oxlorg.opnsense` est installée (v25.7.8+) :
   ```bash
   ansible-galaxy collection install -r collections/requirements.yml
   ```

4. La clé privée WireGuard du serveur OPNsense est dans le vault Ansible :
   ```bash
   # Générer une clé (une seule fois, à conserver précieusement)
   wg genkey

   # L'ajouter dans le vault
   ansible-vault edit inventory/group_vars/all/vault.yml
   # Ajouter la ligne :
   # vault_wireguard_server_private_key: "<output de wg genkey>"
   ```

   Cette variable est exposée à OPNsense via `group_vars/tag_router/main.yml` sous le nom `wireguard_server_private_key`.

---

## Utilisation

### Setup complet (première installation)

```bash
# Via Makefile (depuis la racine du projet)
make ansible-wireguard

# Ou directement via ansible-playbook
cd ansible
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass
```

### Exécution sélective par tag

```bash
# Serveur OPNsense seulement
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass --tags server

# Peers OPNsense seulement
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass --tags peers

# Agences seulement (installer + générer les clés)
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass --tags install,keys

# Écrire wg0.conf et redémarrer le service
ansible-playbook -i inventory/ playbooks/wireguard.yml --ask-vault-pass --tags config,service
```

### Smoke tests (vérification manuelle)

```bash
ansible-playbook -i inventory/ playbooks/opnsense_wireguard.yml --ask-vault-pass --tags smoke
```

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `roles/opnsense_wireguard/defaults/main.yml` | Data model peers (IP tunnel, allowed IPs) |
| `roles/opnsense_wireguard/tasks/10_server.yml` | Création serveur + récupération clé publique |
| `roles/opnsense_wireguard/tasks/20_peers.yml` | Enregistrement des peers agences |
| `roles/debian_wireguard/tasks/20_keys.yml` | Génération idempotente des keypairs |
| `roles/debian_wireguard/templates/wg0.conf.j2` | Template de configuration wg-quick |
| `inventory/host_vars/Agence-01/main.yml` | IP tunnel propre à chaque agence |
| `playbooks/wireguard.yml` | **Orchestrateur complet (4 plays séquentiels)** |

---

## Points d'attention

| Point | Détail |
|-------|--------|
| **Ordre d'exécution obligatoire** | Le playbook `wireguard.yml` orchestre 4 plays séquentiels. Les playbooks individuels (`opnsense_wireguard.yml`, `debian_wireguard.yml`) ne peuvent PAS être utilisés pour le premier setup — ils supposent que les clés sont déjà échangées. |
| **Passage de facts entre plays** | La clé publique d'OPNsense (`wg_server_pubkey`) est transmise aux Debian via `hostvars[groups['tag_router'][0]]`. Si OPNsense est absent de l'inventaire, le play 4 échouera. |
| **Rotation des clés** | Pour régénérer les clés d'une agence, supprimer `/etc/wireguard/wg0.key` sur la VM, puis relancer `wireguard.yml`. Les clés OPNsense ne peuvent pas être régénérées sans recréer l'instance serveur. |
| **Extension aux agences 03-12** | Ajouter un module dans `terraform/zone-agences.tf`, une entrée dans `wireguard_peers` (defaults du rôle), et un fichier `host_vars/Agence-XX/main.yml` avec le `wireguard_peer_tunnel_ip`. |
| **ansible_user** | L'inventaire dynamique fixe `ansible_user: root` pour tous les hôtes. Le group_vars `tag_agence` surcharge vers `sysadmin` pour les VMs Debian. |
