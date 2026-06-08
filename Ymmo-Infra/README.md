# Ymmo-Infra

Pipeline IaC pour l'infrastructure Ymmo sur Proxmox VE. Trois outils enchaînés :

**Packer** construit des templates VM reproductibles → **Terraform** provisionne les VMs par clonage → **Ansible** configure les services post-déploiement.

---

## Architecture

```
Packer
  ├── debian-12.pkr.hcl  → template Proxmox ID 9000  (Debian 12 durci)
  └── opnsense.pkr.hcl   → template Proxmox ID 9001  (OPNsense/FreeBSD)
         |
         v
Terraform (provider bpg/proxmox ~> 0.100)
  ├── zone-infra.tf   → OPNsense-Master, Bastion, Samba4-DC1
  └── zone-agences.tf → Agence-01, Agence-02  (VMs Debian endpoint WireGuard)
         |
         v
Ansible (inventaire dynamique Proxmox, tag ymmotom)
  ├── opnsense_setup.yml    — bootstrap OPNsense initial
  ├── opnsense_network.yml  — VLANs, DHCP, règles firewall
  ├── wireguard.yml         — tunnels WireGuard siège + agences
  └── samba4.yml            — contrôleur de domaine Samba4 AD DC
```

### VMs provisionnées

| VM | Template | Site | Rôle | IP principale |
|---|---|---|---|---|
| OPNsense-Master | 9001 | Siège | Routeur / Firewall | WAN : 192.168.10.40 |
| Bastion | 9000 | Siège | Jump host Ansible, endpoint WireGuard | WAN : 192.168.10.43 |
| Samba4-DC1 | 9000 | Siège | Contrôleur de domaine AD | 10.0.10.1 |
| Agence-01 | 9000 | Agence 01 | Endpoint WireGuard agence | WAN (vmbr0) |
| Agence-02 | 9000 | Agence 02 | Endpoint WireGuard agence | WAN (vmbr0) |

---

## Schéma d'adressage IP

Convention : `10.[site_id].[vlan].[hôte]`

### Siège — Site 0 (`10.0.0.0/16`)

| VLAN | Nom | Réseau | Passerelle | Rôle |
|---|---|---|---|---|
| 10 | SRV_SIEGE | `10.0.10.0/24` | `10.0.10.254` | Serveurs : Samba4, DNS, applicatif Ymmo |
| 20 | USR_SIEGE | `10.0.20.0/24` | `10.0.20.254` | Postes de travail (~30) |
| 30 | PRT_SIEGE | `10.0.30.0/24` | `10.0.30.254` | Imprimantes (isolé) |
| 99 | MGT_SIEGE | `10.0.99.0/24` | `10.0.99.254` | Administration infrastructure |

Adresses fixes notables dans le VLAN SRV :

| IP | Rôle |
|---|---|
| `10.0.10.1` | Samba4-DC1 (contrôleur de domaine) |
| `10.0.10.254` | Interface OPNsense VLAN 10 (passerelle) |

### Agences — Sites 1 à 12 (`10.N.0.0/16`)

Chaque agence dispose de deux VLANs alignés sur la numérotation du siège :

| Site | VLAN 20 Utilisateurs | VLAN 30 Imprimantes |
|---|---|---|
| Agence 01 | `10.1.20.0/24` | `10.1.30.0/24` |
| Agence 02 | `10.2.20.0/24` | `10.2.30.0/24` |
| Agences 03–12 | `10.N.20.0/24` | `10.N.30.0/24` |

Passerelle locale toujours en `.254` sur chaque sous-réseau.

### Backbone WireGuard (`10.254.0.0/24`)

| IP tunnel | Peer |
|---|---|
| `10.254.0.1` | OPNsense-Master (siège) |
| `10.254.0.2` | Bastion |
| `10.254.0.11` | Agence-01 |
| `10.254.0.12` | Agence-02 |

---

## Prérequis

- Linux ou WSL (Ansible ne fonctionne pas nativement sous Windows)
- Packer >= 1.11
- Terraform >= 1.10
- Python 3.x
- Accès à un Proxmox VE avec token API et agent SSH activé sur le nœud

---

## Quick start

### 1. Configurer les credentials

Trois fichiers sont requis (tous gitignorés, chacun a un `.example`) :

| Fichier | Contenu |
|---|---|
| `.env` | Variables `PROXMOX_*` pour l'inventaire Ansible + activation du venv |
| `terraform/terraform.tfvars` | Token API Proxmox + clé SSH sysadmin |
| `packer/variables.pkrvars.hcl` | Token API Proxmox + chemin ISO + mot de passe SSH |

```bash
cp .env.example .env
# Renseigner les valeurs dans .env

cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Renseigner les valeurs dans terraform/terraform.tfvars

cp packer/variables.pkrvars.hcl.example packer/variables.pkrvars.hcl
# Renseigner les valeurs dans packer/variables.pkrvars.hcl
```

### 2. Initialiser l'environnement

```bash
source .env              # exporte PROXMOX_* et active le venv si déjà créé
./ymmo.sh env venv       # première fois : crée .venv et installe requirements.txt + collections Galaxy
```

### 3. Construire les templates Packer

```bash
./ymmo.sh packer init
./ymmo.sh packer build debian     # crée le template ID 9000
./ymmo.sh packer build opnsense   # crée le template ID 9001
```

### 4. Provisionner les VMs avec Terraform

```bash
./ymmo.sh tf init
./ymmo.sh tf plan
./ymmo.sh tf apply
```

### 5. Configurer les services avec Ansible

```bash
./ymmo.sh ansible setup           # bootstrap OPNsense
./ymmo.sh ansible network         # VLANs, DHCP, firewall
./ymmo.sh ansible wireguard       # tunnels VPN site-à-site
./ymmo.sh ansible samba4          # contrôleur de domaine AD
# ou en une seule commande :
./ymmo.sh ansible deploy
```

---

## Référence des commandes (`ymmo.sh`)

### Environnement

```bash
./ymmo.sh env venv                    # créer le venv Python et installer les dépendances
```

### Ansible

```bash
./ymmo.sh ansible update              # mettre à jour les collections Galaxy
./ymmo.sh ansible inventory           # afficher l'inventaire dynamique Proxmox
./ymmo.sh ansible ping                # tester la connectivité SSH
./ymmo.sh ansible setup    [options]  # bootstrap OPNsense (configuration initiale)
./ymmo.sh ansible network  [options]  # VLANs, DHCP et firewall OPNsense
./ymmo.sh ansible wireguard [options] # tunnels WireGuard complets
./ymmo.sh ansible bastion  [options]  # reconfigurer uniquement le Bastion
./ymmo.sh ansible samba4   [options]  # configurer Samba4 AD DC
./ymmo.sh ansible deploy   [options]  # enchaîner tous les playbooks
```

Options disponibles pour les sous-commandes Ansible :

| Option | Effet |
|---|---|
| `--limit <hôte>` | Restreindre l'exécution à un hôte ou groupe |
| `--tags <tags>` | N'exécuter que les tâches portant ces tags |
| `--skip-tags <tags>` | Ignorer les tâches portant ces tags |
| `--debug` | Mode verbeux (`-vvv`) |
| `--check` | Simulation — aucun changement appliqué |
| `--diff` | Afficher les différences fichier par fichier |
| `--no-vault` | Ne pas demander le mot de passe vault |

### Packer

```bash
./ymmo.sh packer init                       # initialiser les plugins Packer
./ymmo.sh packer build debian  [--debug]    # template Debian 12 (ID 9000)
./ymmo.sh packer build opnsense [--debug]   # template OPNsense (ID 9001)
./ymmo.sh packer build windows  [--debug]   # template Windows 11 25H2 (ID 9002)
```

> ℹ️ Le build Windows requiert trois ISO sur le datastore Proxmox, dont
> `autounattend.iso` à construire et uploader au préalable — voir
> [`docs/packer/packer-windows.md`](docs/packer/packer-windows.md).

### Terraform

```bash
./ymmo.sh tf init                           # initialiser Terraform
./ymmo.sh tf plan  [--var-file <fichier>]   # planifier les changements
./ymmo.sh tf apply [--auto-approve]         # appliquer la configuration
./ymmo.sh tf destroy                        # supprimer l'infrastructure (confirmation requise)
./ymmo.sh tf clean                          # purger .terraform/, lock et state locaux
```

### Nettoyage global

```bash
./ymmo.sh clean    # supprime packer_cache/ et les fichiers Terraform temporaires
```

---

## Structure du projet

```
Ymmo-Infra/
├── ymmo.sh                     # script principal (remplace le Makefile)
├── requirements.txt            # dépendances Python (Ansible + plugin Proxmox)
├── .env.example                # modèle de variables d'environnement
├── packer/
│   ├── debian-12.pkr.hcl       # template Debian 12 (ID 9000)
│   ├── opnsense.pkr.hcl        # template OPNsense (ID 9001)
│   ├── windows-11.pkr.hcl      # template Windows 11 25H2 (ID 9002)
│   ├── variables.pkr.hcl       # déclaration des variables Debian
│   ├── variables-opnsense.pkr.hcl
│   ├── variables-windows.pkr.hcl
│   ├── variables.pkrvars.hcl.example
│   ├── autounattend/           # Autounattend.xml + setup-winrm.ps1 (→ autounattend.iso)
│   ├── http/                   # preseed.cfg pour l'installation automatique Debian
│   └── scripts/                # provisioners : update, hardening, cloud-init, cleanup, windows-sysprep
├── terraform/
│   ├── main.tf                 # provider + locals.sites (source de vérité topologie)
│   ├── variables.tf
│   ├── versions.tf
│   ├── zone-infra.tf           # VMs siège : OPNsense, Bastion, Samba4-DC1
│   ├── zone-agences.tf         # VMs agences : Agence-01, Agence-02
│   ├── templates/
│   │   └── cloud-init-debian.yml.tftpl
│   ├── modules/vm/             # module VM réutilisable (clone + réseau + cloud-init)
│   └── terraform.tfvars.example
├── ansible/
│   ├── ansible.cfg
│   ├── inventory/              # inventaire dynamique (plugin community.proxmox)
│   ├── playbooks/
│   │   ├── opnsense_setup.yml
│   │   ├── opnsense_network.yml
│   │   ├── wireguard.yml
│   │   ├── opnsense_wireguard.yml
│   │   ├── debian_wireguard.yml
│   │   └── samba4.yml
│   ├── roles/
│   └── collections/
│       └── requirements.yml    # community.proxmox, oxlorg.opnsense 25.7.8
└── docs/
    └── plan.md                 # plan d'architecture complet
```

---

## Inventaire Ansible

L'inventaire est dynamique via le plugin `community.proxmox.proxmox`. Il filtre les VMs taguées `ymmotom` sur Proxmox et les regroupe par tag :

| Groupe Ansible | Tag Proxmox | VMs |
|---|---|---|
| `tag_router` | `router` | OPNsense-Master |
| `tag_bastion` / `tag_infra` | `bastion`, `infra` | Bastion |
| `tag_samba4` | `samba4` | Samba4-DC1 |
| `tag_agence` | `agence` | Agence-01, Agence-02 |

L'inventaire nécessite que `.env` soit sourcé — les variables `PROXMOX_*` sont lues par le plugin.
