# Ymmo-Infra

## Description

Ymmo-Infra est le module Infrastructure as Code (IaC) du projet Ymmo. Il automatise le déploiement et la configuration de l'ensemble de l'infrastructure réseau et serveur sur Proxmox, en suivant un pipeline en trois étapes : **Packer** construit les templates de VM → **Terraform** provisionne les VMs → **Ansible** configure les services.

## Stack Technique

| Outil      | Rôle                                           |
| ---------- | ---------------------------------------------- |
| Packer     | Construction des templates VM (Debian, OPNsense) |
| Terraform  | Provisionnement des VMs par clonage de template |
| Ansible    | Configuration post-déploiement (réseau, VPN)   |
| Proxmox VE | Hyperviseur cible                              |
| WireGuard  | VPN site-à-site entre le siège et les agences  |
| OPNsense   | Routeur/Firewall                               |

## Structure du projet

```
Ymmo-Infra/
├── packer/      # Templates VM (Debian 12, OPNsense)
├── terraform/   # Provisionnement Proxmox (VMs, réseau)
├── ansible/     # Configuration post-déploiement
│   ├── inventory/   # Inventaire dynamique Proxmox
│   ├── playbooks/   # Playbooks OPNsense & WireGuard
│   └── roles/       # Rôles Ansible
└── docs/        # Documentation technique détaillée
```

Documentation détaillée par outil :

- [docs/packer/packer-debian.md](docs/packer/packer-debian.md)
- [docs/packer/packer-opnsense.md](docs/packer/packer-opnsense.md)
- [docs/terraform/terraform.md](docs/terraform/terraform.md)
- [docs/ansible/opnsense-pipeline.md](docs/ansible/opnsense-pipeline.md)
- [docs/ansible/wireguard.md](docs/ansible/wireguard.md)

## Installation

### Prérequis

- Python 3.x
- [Packer](https://developer.hashicorp.com/packer/install) ≥ 1.11
- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.10
- Accès à un Proxmox VE avec token API

> **Note** : Ansible doit être exécuté sous Linux ou WSL — pas nativement sous Windows.

### Mise en place

```bash
# 1. Cloner et se placer dans le dossier
cd Ymmo-Infra

# 2. Configurer les variables d'environnement
cp .env.example .env
# Renseigner les credentials Proxmox dans .env

# 3. Créer l'environnement virtuel et installer les dépendances
make venv

# 4. Activer l'environnement
source .env
```

Trois fichiers de credentials sont requis (tous gitignorés, tous avec un `.example`) :

| Fichier                         | Usage                                          |
| ------------------------------- | ---------------------------------------------- |
| `.env`                          | Credentials Proxmox pour l'inventaire Ansible  |
| `terraform/terraform.tfvars`    | Token API + clé SSH pour Terraform             |
| `packer/variables.pkrvars.hcl`  | Token API + chemin ISO + mot de passe SSH      |

## Commandes disponibles

```bash
make help   # Afficher toutes les commandes disponibles
```

### Packer

```bash
make init             # Initialise les plugins Packer
make build-debian     # Construit le template Debian 12 (VM ID 9000)
make build-opnsense   # Construit le template OPNsense (VM ID 9001)
make debug-debian     # Build Debian avec logs (PACKER_LOG=1)
make debug-opnsense   # Build OPNsense avec logs
```

### Terraform

```bash
make tf-init     # Initialise Terraform
make tf-plan     # Planifie les changements
make tf-apply    # Applique la configuration
make tf-destroy  # Supprime l'infrastructure
```

### Ansible

```bash
make ansible-update            # Met à jour les collections Galaxy
make ansible-inventory         # Affiche l'inventaire dynamique Proxmox
make ansible-ping              # Teste la connectivité SSH
make ansible-opnsense-setup    # Configure OPNsense (bootstrap initial)
make ansible-opnsense-network  # Configure VLANs, DHCP et firewall
make ansible-wireguard         # Déploie WireGuard (OPNsense + agences)
make ansible-deploy            # Enchaîne les trois playbooks complets
```

### Nettoyage

```bash
make clean   # Supprime packer_cache et les fichiers Terraform temporaires
```

## Architecture

### Pipeline IaC

```
Packer → Templates Proxmox (9000, 9001)
           ↓
        Terraform → VMs clonées depuis les templates
                      ↓
                   Ansible → Configuration réseau, VPN, services
```

### Plan d'adressage IP

Schéma : `10.[site_id].[vlan].[hôte]`

| Site          | Bloc          | VLANs principaux              |
| ------------- | ------------- | ----------------------------- |
| Siège (0)     | `10.0.0.0/16` | 10=SRV, 20=USR, 30=PRT, 99=MGT |
| Agence N (1–12) | `10.N.0.0/16` | 20=USR, 30=PRT              |
| WireGuard VPN | `10.254.0.0/24` | Backbone site-à-site        |

Les passerelles sont toujours en `.254` sur chaque sous-réseau VLAN.

### Templates Packer

- `debian-12.pkr.hcl` — Debian 12 durci, template ID **9000**
- `opnsense.pkr.hcl` — OPNsense (FreeBSD), template ID **9001**

### Inventaire Ansible

L'inventaire est **dynamique** via le plugin `community.proxmox.proxmox`. Il filtre les VMs taguées `ymmotom` et les groupe par tag (`tag_router`, `tag_infra`, etc.). Nécessite de sourcer `.env` avant utilisation.

## Troubleshooting (Dépannage)

<!-- Documenter les problèmes connus et leurs solutions -->
