# Ymmo-Infra

Pipeline IaC pour l'infrastructure Ymmo sur Proxmox VE. Trois outils enchaînés :

**Packer** construit des templates VM reproductibles → **Terraform** provisionne les VMs par clonage → **Ansible** configure les services post-déploiement.

---

## Architecture

```
Packer
  ├── debian-12.pkr.hcl  → template Proxmox ID 9000  (Debian 12 durci)
  ├── opnsense.pkr.hcl   → template Proxmox ID 9001  (OPNsense/FreeBSD)
  └── windows-11.pkr.hcl → template Proxmox ID 9002  (Windows 11 25H2)
         |
         v
Terraform (provider bpg/proxmox ~> 0.100)
  ├── zone-infra.tf    → OPNsense-Master, Bastion, Samba4-DC1, Webapp
  ├── zone-agences.tf  → Agence-01, Agence-02  (VMs Debian endpoint WireGuard)
  └── zone-clients.tf  → CLI01-Siege  (poste Windows, déployé en 2e phase)
  (toutes les VMs sont rangées dans le pool Proxmox « ymmo-pool »)
         |
         v
Ansible (inventaire dynamique Proxmox, tag ymmotom)
  ├── opnsense_setup.yml    — bootstrap OPNsense initial
  ├── opnsense_network.yml  — VLANs, DHCP, règles firewall (dont accès Webapp)
  ├── wireguard.yml         — tunnels WireGuard siège + agences
  ├── samba4.yml            — contrôleur de domaine Samba4 AD DC
  ├── webapp.yml            — site web Ymmo (stack Docker Compose)
  └── windows_client.yml    — jonction des postes Windows au domaine AD
```

### VMs provisionnées

| VM | Template | Site | Rôle | IP principale |
|---|---|---|---|---|
| OPNsense-Master | 9001 | Siège | Routeur / Firewall / VPN / DHCP | WAN : DHCP (vmbr0) + `.254` sur chaque VLAN |
| Bastion | 9000 | Siège | Jump host Ansible, endpoint WireGuard | WAN : DHCP (vmbr0) / VPN `10.254.0.2` |
| Samba4-DC1 | 9000 | Siège | Contrôleur de domaine AD + DNS interne | 10.0.10.1 |
| Webapp | 9000 | Siège | Site web Ymmo (Docker Compose) | 10.0.10.2 |
| CLI01-Siege | 9002 | Siège | Poste de test Windows (jonction AD) | DHCP (VLAN 20) |
| Agence-01 | 9000 | Agence 01 | Endpoint WireGuard agence | WAN (vmbr0) / VPN `10.254.0.11` |
| Agence-02 | 9000 | Agence 02 | Endpoint WireGuard agence | WAN (vmbr0) / VPN `10.254.0.12` |

> Les IP WAN d'OPNsense et du Bastion sont attribuées par **DHCP** sur le réseau
> physique (`vmbr0`) : elles varient d'un déploiement à l'autre. L'inventaire Ansible
> les résout dynamiquement via l'agent QEMU.

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
| `10.0.10.2` | Webapp (site Ymmo, Docker Compose) |
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

## Site web Ymmo

L'application Ymmo (frontend Angular + backend Spring Boot + PostgreSQL) est hébergée
sur la VM **Webapp** (`10.0.10.2`, VLAN 10) sous forme d'une stack **Docker Compose**.
Le rôle Ansible `docker_webapp` installe Docker, copie les sources depuis le poste de
contrôle, génère le `.env` depuis le vault, puis lance `docker compose up -d --build`.
Détails : [`docs/ansible/webapp.md`](docs/ansible/webapp.md).

**Accès au site :**

| Depuis | URL | Mécanisme |
|---|---|---|
| Poste utilisateur du siège (VLAN 20) | `http://10.0.10.2` | Règle firewall OPNsense (USR → Webapp) |
| Poste d'agence | `http://10.0.10.2` | À travers le tunnel WireGuard |
| Poste d'administration (réseau WAN) | `http://<IP-WAN-OPNsense>:8080` | Port-forward (NAT) baké dans OPNsense |

> Le frontend nginx relaie `/api` vers le backend en interne : un seul port est exposé.

## Pool Proxmox `ymmo-pool`

Tous les templates Packer et toutes les VMs Terraform sont regroupés dans le pool
**`ymmo-pool`**. Ce pool doit **exister au préalable** (le token API a le droit d'y
rattacher des membres — `Pool.Allocate` — mais pas de le créer). Création unique si
besoin, depuis un compte disposant des droits Pool :

```bash
pvesh create /pools --poolid ymmo-pool --comment "Infrastructure Ymmo"
```

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
./ymmo.sh packer build windows    # crée le template ID 9002 (postes clients)
```

> Le pool **`ymmo-pool`** doit exister avant le build (voir section « Pool Proxmox »).

### 4. Provisionner les VMs avec Terraform

```bash
./ymmo.sh tf init
./ymmo.sh tf plan
./ymmo.sh tf apply
```

### 5. Configurer les services avec Ansible

```bash
./ymmo.sh ansible setup           # bootstrap OPNsense
./ymmo.sh ansible network         # VLANs, DHCP, firewall (dont accès Webapp)
./ymmo.sh ansible wireguard       # tunnels VPN site-à-site
./ymmo.sh ansible samba4          # contrôleur de domaine AD
./ymmo.sh ansible webapp          # site web Ymmo (Docker Compose)
./ymmo.sh ansible windows         # jonction des postes Windows au domaine
# ou en une seule commande :
./ymmo.sh ansible deploy
```

> 💡 **Tout en une commande** : `./ymmo.sh full-deploy [--auto-approve]` enchaîne
> Terraform et Ansible en phases (infra → réseau/AD/webapp → poste Windows → jonction),
> ce qui gère la dépendance DHCP des clients Windows. Voir la référence des commandes.

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
./ymmo.sh ansible webapp   [options]  # déployer le site web Ymmo (Docker Compose)
./ymmo.sh ansible windows  [options]  # joindre les postes Windows au domaine AD
./ymmo.sh ansible deploy   [options]  # enchaîner tous les playbooks (setup→windows)
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

### Déploiement complet

```bash
./ymmo.sh full-deploy [--auto-approve]      # TF (infra+webapp) → Ansible (réseau/AD/webapp)
                                            # → TF (poste Windows) → Ansible (jonction AD)
```

Le déploiement est **phasé** : le poste Windows obtient son IP via le DHCP d'OPNsense,
qui doit être configuré par Ansible avant que Terraform ne puisse finir de créer la VM.

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
│   ├── zone-infra.tf           # VMs siège : OPNsense, Bastion, Samba4-DC1, Webapp
│   ├── zone-agences.tf         # VMs agences : Agence-01, Agence-02
│   ├── zone-clients.tf         # poste Windows CLI01-Siege (déployé en 2e phase)
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
│   │   ├── samba4.yml
│   │   ├── webapp.yml           # site web Ymmo (rôle docker_webapp)
│   │   └── windows_client.yml   # jonction des postes Windows au domaine AD
│   ├── roles/                  # dont docker_webapp (déploiement de la stack Docker)
│   └── collections/
│       └── requirements.yml    # community.proxmox, oxlorg.opnsense 25.7.8
└── docs/
    ├── plan.md                 # plan d'architecture complet
    ├── architecture.md         # schémas Mermaid (vue d'ensemble accessible)
    ├── ansible/                # un doc par rôle (samba4, webapp, wireguard, ...)
    ├── packer/                 # docs des templates (debian, opnsense, windows)
    └── terraform/              # docs des zones et du module VM
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
