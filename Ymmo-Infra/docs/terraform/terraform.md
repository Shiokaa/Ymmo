# Terraform — Vue d'ensemble

Terraform est la couche de provisionnement du pipeline IaC. Il clone les templates
construits par Packer et instancie toutes les VMs du projet sur Proxmox.

```
1. Packer     → Templates disponibles sur Proxmox
                  - ID 9000 : Debian 12 durci (serveurs applicatifs)
                  - ID 9001 : OPNsense 26.1 (routeur / pare-feu)

2. Terraform  → Clone des templates, création des VMs
                  - Provider bpg/proxmox ~> 0.100
                  - State local (terraform/terraform.tfstate)

3. Ansible    → Configuration post-déploiement
                  (voir les docs dédiées par composant)
```

---

## Prérequis

- Proxmox opérationnel avec un token API valide
- Templates Packer construits (IDs 9000 et 9001)
- SSH agent actif et clé chargée (`ssh-add`) — requis pour l'upload des snippets cloud-init
- Fichier `terraform/terraform.tfvars` configuré (copier depuis `terraform.tfvars.example`) :

```hcl
proxmox_api_url              = "https://<ip-proxmox>:8006/api2/json"
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
├── versions.tf        # Terraform ~> 1.5, bpg/proxmox ~> 0.100
├── main.tf            # Provider Proxmox + locals multi-site (source de vérité topologie)
├── variables.tf       # Variables d'entrée (connexion API, SSH, clés sysadmin)
├── terraform.tfvars   # Valeurs secrètes (gitignore)
├── zone-infra.tf      # Zone Infrastructure : OPNsense, Samba4-DC1, Bastion
├── zone-agences.tf    # Zone Agences : endpoints WireGuard Agences 01 et 02
└── modules/
    └── vm/            # Module générique de création de VM
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

Chaque fichier `zone-*.tf` correspond à un périmètre réseau distinct. Les modifications
sur une zone n'impactent pas les autres — les plans et applies peuvent être ciblés
avec `-target=module.<nom>` si besoin.

---

## Locals multi-site — source de vérité

`main.tf` contient un bloc `locals.sites` qui centralise la topologie de l'ensemble
des sites. Toutes les zones (`zone-infra.tf`, `zone-agences.tf`, futures `zone-*.tf`)
consomment ces valeurs via `local.sites.<site>.*`.

```hcl
locals {
  sites = {
    siege = {
      name            = "Siège"
      site_id         = 0
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
    agence_01 = {
      name            = "Agence 01"
      site_id         = 1
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
    agence_02 = {
      name            = "Agence 02"
      site_id         = 2
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
  }
}
```

Aucune valeur de site n'est hardcodée dans les fichiers de zone — toujours
`local.sites.siege.target_node`, jamais `"node2"` en dur.

> **Pourquoi des locals plutôt que des variables ?**
> Les sites sont une configuration interne à l'infra, pas un paramètre que l'opérateur
> doit pouvoir modifier à l'exécution. Les `locals` empêchent toute surcharge accidentelle
> via CLI ou tfvars.

---

## Le module VM

Toutes les VMs sont instanciées via le module `./modules/vm`. Il standardise les
comportements suivants :

| Capacité | Détail |
|----------|--------|
| Clone | Full clone depuis le template `source_vm_id` |
| CPU | Type `host` (performances maximales en KVM) |
| Disque | VirtIO, `discard = on` (Trim), `iothread = true`, format `raw` |
| Réseau | Blocs dynamiques — N interfaces avec VLAN ID optionnel par interface |
| Cloud-init | Snippet YAML uploadé sur Proxmox via SSH si `user_data_template` est fourni |
| IP statique | Bloc `initialization.ip_config` avec adresse CIDR et gateway |
| QEMU agent | Toujours activé (`agent.enabled = true`) |

### Variables du module

| Variable | Type | Défaut | Description |
|----------|------|--------|-------------|
| `vm_name` | string | — | Nom Proxmox de la VM |
| `node_name` | string | — | Nœud Proxmox cible |
| `source_vm_id` | number | — | ID du template Packer à cloner |
| `vm_id` | number | null | ID VM Proxmox (auto si null) |
| `cpu_cores` | number | 2 | Nombre de vCPU |
| `memory` | number | 2048 | RAM en Mo |
| `disk_size` | number | 20 | Disque en Go |
| `storage_id` | string | `local-lvm` | Datastore Proxmox |
| `tags` | list(string) | `["terraform"]` | Tags Proxmox |
| `network_interfaces` | list(object) | — | Interfaces réseau (bridge, vlan_id, firewall, mac_address) |
| `ipv4_config` | object | null | IP statique CIDR + gateway |
| `user_data_template` | string | null | Chemin vers le template cloud-init `.tftpl` |
| `user_data_vars` | any | `{}` | Variables injectées dans le template |
| `snippet_datastore` | string | `local` | Datastore pour l'upload du snippet |

### Cloud-init par snippets

Le provider `bpg/proxmox` injecte le cloud-init en uploadant un fichier YAML sur
Proxmox via SSH (type `snippets`, datastore `local`). C'est pourquoi le provider
nécessite un accès SSH au nœud en plus du token API.

Le `lifecycle.ignore_changes` sur `initialization[0].user_data_file_id` est intentionnel :
il empêche Terraform de re-uploader le snippet et de redémarrer la VM à chaque plan
après le premier déploiement.

---

## Workflow

### Initialisation (une seule fois)

```bash
make tf-init
```

Télécharge le provider `bpg/proxmox` et initialise le backend local.

### Prévisualisation

```bash
make tf-plan
```

Affiche les ressources qui seront créées, modifiées ou détruites. A lire attentivement
avant chaque apply.

### Déploiement

```bash
make tf-apply
```

Clone les templates et démarre les VMs. L'opération est idempotente : relancer `apply`
sur une infra déjà déployée sans changement de code ne produit aucune modification.

### Destruction

```bash
make tf-destroy

# Cibler une seule VM :
terraform destroy -target=module.samba4_dc1
```

La destruction supprime toutes les VMs gérées par Terraform. Utiliser `-target`
pour ne détruire qu'une ressource spécifique.

---

## Ajouter un site (nouvelle agence)

Voir `docs/terraform/terraform-zone-agences.md` pour la procédure complète.
En résumé : étendre `locals.sites` dans `main.tf`, puis créer ou compléter le
fichier `zone-agences.tf` avec un nouveau bloc `module "agence_XX"`.

## Ajouter une VM dans une zone existante

1. Ouvrir le fichier `zone-*.tf` correspondant à la zone cible.
2. Ajouter un bloc `module` en appelant `./modules/vm` :

```hcl
module "ma_nouvelle_vm" {
  source = "./modules/vm"

  vm_name      = "Nom-VM"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9000  # Template Debian 12
  memory       = 2048
  cpu_cores    = 2
  storage_id   = local.sites.siege.storage_id
  tags         = ["ymmotom", "mon-tag"]

  network_interfaces = [
    {
      bridge  = local.sites.siege.internal_bridge
      vlan_id = 10  # VLAN SRV_SIEGE
    }
  ]

  ipv4_config = {
    address = "10.0.10.5/24"
    gateway = "10.0.10.254"
  }

  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "ma-vm"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
}
```

3. Vérifier : `make tf-plan`
4. Appliquer : `make tf-apply`

---

## Points d'attention

| Point | Détail |
|-------|--------|
| State local | Fichier `terraform/terraform.tfstate`. Ne pas le supprimer (Terraform perd la connaissance de l'infra). Ne pas le committer (`.gitignore`). |
| SSH agent | Le provider utilise `ssh-agent` pour uploader les snippets. Vérifier que la clé est chargée (`ssh-add`) avant tout `tf-apply`. |
| `insecure_tls = true` | Valeur par défaut dans `variables.tf` — acceptable en homelab (certificat Proxmox auto-signé). Passer à `false` en production avec un certificat valide. |
| Schéma IP | `10.[site_id].[vlan].[host]`. Les gateways sont toujours `.254` sur chaque sous-réseau VLAN. |
| Reconstruire une VM | `terraform destroy -target=module.<nom>` puis `terraform apply`. Ne jamais modifier le state manuellement. |
