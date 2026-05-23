# Terraform — Déploiement des VMs sur Proxmox

## Vue d'ensemble

Terraform est la couche de déploiement du pipeline IaC. Il clone les templates Packer
et instancie toutes les VMs du projet sur Proxmox.

```
1. Packer          → Templates disponibles sur Proxmox
                      - ID 9000 : Debian 12 (serveurs applicatifs, AD...)
                      - ID 9001 : OPNsense 26.1 (routeur/pare-feu)

2. Terraform       → Clone des templates, création des VMs
                      - Provider bpg/proxmox ~> 0.100
                      - State local (terraform.tfstate)

3. Ansible         → Configuration post-déploiement
                      (voir les docs dédiées par composant)
```

---

## Prérequis

- Proxmox opérationnel avec un token API valide
- Templates Packer construits (IDs 9000 et 9001)
- SSH agent actif avec la clé d'accès au nœud Proxmox (`ssh-add`)
- Fichier `terraform/terraform.tfvars` configuré :

```hcl
proxmox_api_url              = "https://192.168.10.x:8006/api2/json"
proxmox_api_token_id         = "user@pam!token-id"
proxmox_api_token_secret     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
proxmox_ssh_username         = "root"
proxmox_ssh_private_key_path = "~/.ssh/id_rsa"
sysadmin_ssh_public_keys     = ["ssh-ed25519 AAAA... user@machine"]
```

---

## Structure du code

```
terraform/
├── versions.tf       # Contraintes de version (Terraform ~>1.5, bpg/proxmox ~>0.100)
├── main.tf           # Provider Proxmox + locals multi-site
├── variables.tf      # Variables d'entrée (connexion, clés SSH)
├── zone-infra.tf     # Zone Infrastructure : OPNsense, Samba4...
├── zone-agences.tf   # Zone Agences : VMs Debian endpoint WireGuard (Agences 01 et 02)
└── modules/
    └── vm/           # Module générique de création de VM
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

> **Pourquoi séparer par zones ?**
> Chaque fichier `zone-*.tf` correspond à un périmètre réseau (Infra, Agences, DMZ...).
> Les modifications sur une zone n'impactent pas les autres.

---

## Locals multi-site

La définition de tous les sites est centralisée dans `main.tf` via un bloc `locals` :

```hcl
locals {
  sites = {
    siege = {
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
    agence_01 = { ... }
    agence_02 = { ... }
    # Extensible jusqu'à agence_12
  }
}
```

Chaque zone consomme ces valeurs via `local.sites.siege.*` — aucune valeur de site
n'est hardcodée dans les fichiers de zone.

> **Pourquoi des locals plutôt que des variables ?**
> Les sites sont une configuration interne à l'infra, pas un paramètre que l'opérateur
> doit changer au déploiement. Les `locals` empêchent toute modification accidentelle
> via CLI ou tfvars.

---

## Le module VM

Toutes les VMs sont créées via le module `modules/vm`, qui standardise la création :

| Capacité | Détail |
|----------|--------|
| Clone | Full clone depuis le template `source_vm_id` |
| Disque | VirtIO, `discard` (Trim) activé, `iothread` activé |
| Réseau | Blocs dynamiques — supporte N interfaces avec VLAN optionnel |
| Cloud-init | Snippet uploadé par SSH sur Proxmox si `user_data_template` fourni |
| CPU | Type `host` (performances maximales en KVM) |

> **Cloud-init par snippets**
> Le provider `bpg/proxmox` injecte la configuration cloud-init en uploadant un fichier YAML
> sur Proxmox via SSH (datastore `local`, type `snippets`). C'est pourquoi le provider
> nécessite un accès SSH au nœud Proxmox **en plus** du token API.

---

## Workflow

### Étape 1 — Initialisation (une seule fois)

```bash
make tf-init
```

Télécharge le provider `bpg/proxmox` et initialise le backend local.

### Étape 2 — Prévisualisation

```bash
make tf-plan
```

Affiche les ressources qui seront créées, modifiées ou détruites.
**À lire attentivement avant chaque apply.**

### Étape 3 — Déploiement

```bash
make tf-apply
```

Clone les templates et démarre les VMs. L'opération est idempotente : relancer `apply`
sur une infra déjà déployée ne change rien si le code n'a pas évolué.

### Destruction

```bash
make tf-destroy
```

> ⚠️ Détruit **toutes** les VMs gérées par Terraform. À utiliser uniquement pour
> reconstruire depuis zéro ou détruire une VM spécifique avec `-target`.

---

## Reproduire de zéro

```bash
# 1. Configurer les variables
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Éditer terraform.tfvars avec les valeurs de l'environnement

# 2. Initialiser Terraform
make tf-init

# 3. Vérifier le plan
make tf-plan

# 4. Déployer
make tf-apply
```

---

## Points d'attention

| Point | Détail |
|-------|--------|
| State local | Le state est dans `terraform/terraform.tfstate`. Ne pas le supprimer (Terraform perd la connaissance de l'infra déployée). Ne pas le committer dans Git (inclus dans `.gitignore`). |
| SSH agent | Le provider utilise `ssh-agent` pour uploader les snippets cloud-init. S'assurer que la clé est chargée (`ssh-add`) avant tout `tf-apply`. |
| `insecure_tls: true` | Acceptable en homelab (certificat Proxmox auto-signé). À désactiver en production avec un certificat valide. |
| Rebuilder une VM | `terraform destroy -target=module.nom_vm` puis `terraform apply`. Ne jamais modifier le state manuellement. |
