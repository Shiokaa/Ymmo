# Pipeline IaC OPNsense — De Packer à Ansible

> **Note** : Ce document remplace `opnsense-ansible.md` qui référençait l'ancienne
> collection `ansibleguy.opnsense` (renommée `oxlorg.opnsense` en septembre 2024)
> et une approche d'inventaire statique abandonnée.

---

## Vue d'ensemble

OPNsense est piloté entièrement en IaC selon ce pipeline :

```
1. Packer          → Build du template OPNsense sur Proxmox
                      - Credentials API injectés dans config.xml
                      - Règle firewall WAN (port 443) baked dans le template

2. Terraform       → Clone du template, déploiement de la VM

3. Inventaire      → Découverte automatique de l'IP WAN via le plugin Proxmox
   Dynamique         (QEMU guest agent → vtnet1 → IP WAN)

4. Ansible         → Configuration déclarative via l'API REST OPNsense
                      (collection oxlorg.opnsense, connection: local)
```

---

## Prérequis

- Proxmox opérationnel avec un token API valide
- ISO OPNsense 26.1 uploadée sur Proxmox
- Environnement Python/Ansible configuré (`.venv` + `requirements.txt`)
- Variables d'environnement Proxmox exportées :
  ```bash
  export PROXMOX_URL="https://192.168.10.x:8006"
  export PROXMOX_USER="user@pam"
  export PROXMOX_TOKEN_ID="token-id"
  export PROXMOX_TOKEN_SECRET="token-secret"
  ```

---

## Étape 1 — Packer : build du template OPNsense

### Ce qui est baked dans le template

Le script `packer/scripts/opnsense-setup.sh` configure `config.xml` via l'API PHP
interne d'OPNsense (`write_config()`) pendant le build. Il injecte :

| Élément | Détail |
|---------|--------|
| Clés SSH root | Permet la connexion SSH post-déploiement |
| Interface LAN | vtnet0 → 192.168.1.1/24 (statique) |
| Interface WAN | vtnet1 → DHCP |
| Credentials API | Clé + secret (hashé SHA-512) dans `<apikeys>` du user root |
| Règle firewall WAN | `pass in on vtnet1 proto tcp from any to (self) port 443` |
| Plugin QEMU agent | `os-qemu-guest-agent` installé et activé |

> **Pourquoi injecter les credentials dans Packer ?**
> OPNsense ne supporte pas cloud-init. La seule méthode fiable pour pré-configurer
> une VM clonée est de baked la configuration dans le template via `config.xml`.
> Sans ça, Ansible n'aurait aucun moyen de s'authentifier à l'API au premier boot.

> **Pourquoi la règle firewall WAN ?**
> OPNsense bloque tout le trafic entrant sur le WAN par défaut. La règle permet
> à Ansible (qui tourne sur le contrôleur, hors du LAN OPNsense) de joindre l'API
> HTTPS sur le port 443.

### Variables requises

Ajouter dans `packer/variables.pkrvars.hcl` :

```hcl
# Générer avec : openssl rand -hex 40
opnsense_api_key    = "votre-cle-hex-80-chars"
opnsense_api_secret = "votre-secret-hex-80-chars"
```

### Commande de build

```bash
make build-opnsense
```

### Validation post-build

À la fin du build, le script exécute automatiquement :
```bash
curl -k -u "${OPN_API_KEY}:${OPN_API_SECRET}" https://127.0.0.1/api/core/firmware/status
```
Un retour HTTP 200 confirme que les credentials sont valides dans le template.

---

## Étape 2 — Terraform : déploiement de la VM

```bash
make tf-apply
```

Terraform clone le template `9001` et crée la VM `OPNsense-Master` avec :
- **vtnet0** connecté au bridge interne (`YmmoTom`)
- **vtnet1** connecté au bridge WAN (`vmbr0`)
- Tags Proxmox : `ymmotom`, `infra`, `router`

---

## Étape 3 — Inventaire dynamique Proxmox

### Fonctionnement

L'inventaire dynamique (`inventory/proxmox.proxmox.yml`) interroge l'API Proxmox
et filtre les VMs taguées `ymmotom`. Il crée automatiquement des groupes basés sur
les tags, dont le groupe `tag_router` qui contient `OPNsense-Master`.

La règle `compose` extrait l'IP WAN automatiquement :
```yaml
compose:
  ansible_host: >
    proxmox_agent_interfaces |
    selectattr('name', 'in', ['vtnet1']) |
    map(attribute='ip-addresses') | flatten |
    reject('match', '^192\.168\.1\.') |   # exclut l'IP LAN statique
    first | split('/') | first
```

> Grâce au QEMU guest agent (installé par Packer), Proxmox expose les interfaces
> réseau de la VM. L'IP WAN (vtnet1, DHCP) est récupérée dynamiquement à chaque
> run — aucune IP hardcodée dans l'inventaire.

### Vérification

```bash
cd ansible
# Vérifier que OPNsense-Master est dans tag_router avec la bonne IP
ansible-inventory --host OPNsense-Master --ask-vault-pass
```

La sortie doit contenir :
```json
{
    "ansible_connection": "local",
    "ansible_host": "192.168.10.x",
    ...
}
```

---

## Étape 4 — Ansible : configuration via API REST

### Architecture de connexion

```
Contrôleur Ansible (ta machine)
        │
        │ HTTPS (connection: local)
        ▼
OPNsense API (192.168.10.x:443)
        │
        ▼
   config.xml / daemon reload
```

`connection: local` signifie qu'Ansible s'exécute localement et envoie des requêtes
HTTPS vers l'API OPNsense. Il n'y a pas de SSH vers OPNsense pour la configuration.

### Collection requise

```bash
cd ansible
ansible-galaxy collection install -r collections/requirements.yml
```

Contenu de `collections/requirements.yml` :
```yaml
collections:
  - name: oxlorg.opnsense
```

> **Important** : la collection s'appelait `ansibleguy.opnsense` jusqu'en septembre
> 2024. Elle a été renommée `oxlorg.opnsense`. L'ancien namespace ne doit plus être
> utilisé.

### Vault Ansible

Les credentials API sont stockés dans `inventory/group_vars/all/vault.yml`,
chiffré avec Ansible Vault :

```bash
# Chiffrer le vault (première fois)
ansible-vault encrypt inventory/group_vars/all/vault.yml

# Éditer le vault
ansible-vault edit inventory/group_vars/all/vault.yml
```

Contenu attendu :
```yaml
vault_opnsense_api_key: "la-même-valeur-que-dans-packer"
vault_opnsense_api_secret: "la-même-valeur-brute-que-dans-packer"
```

### Variables de groupe (`group_vars/tag_router/main.yml`)

Ces variables sont automatiquement appliquées à tous les hôtes du groupe `tag_router` :

```yaml
ansible_connection: local          # API REST, pas SSH
opnsense_api_key: "{{ vault_opnsense_api_key }}"
opnsense_api_secret: "{{ vault_opnsense_api_secret }}"
opnsense_api_host: "{{ ansible_host }}"   # IP WAN résolue dynamiquement
opnsense_ssl_verify: false               # certificat auto-signé (homelab)
```

### Exécution du playbook

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/opnsense_setup.yml --ask-vault-pass
```

---

## Reproduire de zéro

```bash
# 1. Générer les credentials API
API_KEY=$(openssl rand -hex 40)
API_SECRET=$(openssl rand -hex 40)
echo "api_key: $API_KEY"
echo "api_secret: $API_SECRET"

# 2. Ajouter dans packer/variables.pkrvars.hcl
#    opnsense_api_key    = "$API_KEY"
#    opnsense_api_secret = "$API_SECRET"

# 3. Construire le template
make build-opnsense

# 4. Déployer la VM
make tf-apply

# 5. Mettre à jour le vault Ansible avec les mêmes valeurs
ansible-vault edit ansible/inventory/group_vars/all/vault.yml

# 6. Installer la collection
cd ansible && ansible-galaxy collection install -r collections/requirements.yml

# 7. Vérifier l'inventaire
ansible-inventory --host OPNsense-Master --ask-vault-pass

# 8. Lancer le playbook
ansible-playbook -i inventory/ playbooks/opnsense_setup.yml --ask-vault-pass
```

---

## Points d'attention

| Point | Détail |
|-------|--------|
| IP WAN dynamique | L'IP change à chaque redéploiement (DHCP). L'inventaire dynamique la résout automatiquement. Aucune action manuelle requise. |
| Même credentials dans Packer et Vault | La valeur dans `vault_opnsense_api_secret` doit être le secret **en clair** (pas le hash). OPNsense stocke le hash dans `config.xml`, Ansible utilise la valeur brute pour s'authentifier. |
| Rebuild template | Tout changement dans `opnsense-setup.sh` nécessite un `make build-opnsense` suivi d'un `make tf-apply` pour recréer la VM depuis le nouveau template. |
| `ssl_verify: false` | Acceptable en homelab. En production, déployer une CA interne et utiliser `ca_path`. |
