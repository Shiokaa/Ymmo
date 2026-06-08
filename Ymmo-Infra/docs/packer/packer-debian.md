# Documentation Technique : Template Packer Debian 12

Ce document decrit la conception, les scripts de provisioning et les decisions techniques du template Debian 12 (Bookworm) construit par Packer pour l'infrastructure Ymmo-Infra sur Proxmox.

---

## 1. Vue d'ensemble

Le template Debian 12 (VM ID 9000) fournit la base immuable de tous les serveurs du projet : Samba4, hotes Docker, DNS, etc. L'objectif est de produire une image durcie, propre et prete a etre clonee par Terraform, avec cloud-init active pour que chaque clone puisse recevoir sa configuration (nom, IP, cle SSH) sans intervention manuelle.

### Caracteristiques du template produit

| Parametre          | Valeur                          |
|--------------------|---------------------------------|
| Nom                | `debian-12-hardened`            |
| VM ID              | 9000                            |
| OS                 | Linux 2.6+ (`l26` dans Proxmox) |
| CPU                | 2 cores, type `host`            |
| Memoire            | 2048 Mo                         |
| Disque             | 20 Go, SCSI, format raw         |
| Partitionnement    | LVM (recette `atomic`)          |
| Controleur SCSI    | `virtio-scsi-single`            |
| Discard/Trim       | active                          |
| Agent QEMU         | active                          |

---

## 2. Variables

Les variables sont definies dans `packer/variables.pkr.hcl`. Les valeurs sensibles sont fournies dans `packer/variables.pkrvars.hcl` (gitignore, voir `.pkrvars.hcl.example`).

### Variables de connexion Proxmox

| Variable                    | Defaut  | Sensible | Description |
|-----------------------------|---------|----------|-------------|
| `proxmox_api_url`           | aucun   | non      | URL de l'API Proxmox (ex: `https://proxmox:8006/api2/json`) |
| `proxmox_api_token_id`      | aucun   | non      | ID du jeton API (`user@pam!token-name`) |
| `proxmox_api_token_secret`  | aucun   | oui      | Secret du jeton API |
| `proxmox_node`              | aucun   | non      | Noeud Proxmox cible (ex: `pve`) |
| `proxmox_skip_tls_verify`   | `true`  | non      | Ignorer la verification TLS |

### Variables du template

| Variable               | Defaut                                    | Description |
|------------------------|-------------------------------------------|-------------|
| `template_name`        | `debian-12-hardened`                      | Nom du template dans Proxmox |
| `template_description` | `Template Debian 12 Bookworm Securise...` | Description affichee dans Proxmox |
| `vm_id`                | `9000`                                    | ID de la VM |
| `iso_file`             | aucun (obligatoire)                       | Chemin de l'ISO dans le stockage Proxmox (ex: `local:iso/debian-12.9.0-amd64-netinst.iso`) |
| `iso_checksum`         | `none`                                    | Checksum de l'ISO (optionnel) |
| `vm_cores`             | `2`                                       | Nombre de vCPU |
| `vm_memory`            | `2048`                                    | Memoire en Mo |
| `vm_disk_size`         | `20G`                                     | Taille du disque |
| `vm_storage_pool`      | `local-lvm`                               | Pool de stockage Proxmox |
| `vm_bridge`            | `vmbr0`                                   | Bridge reseau |
| `ssh_username`         | `packer`                                  | Utilisateur SSH pour la phase de build |
| `ssh_password`         | aucun (obligatoire, sensible)             | Mot de passe temporaire pour le build |
| `http_bind_address`    | `0.0.0.0`                                 | IP d'ecoute du serveur HTTP Packer (voir section VPN) |

---

## 3. Automatisation de l'installation : preseed.cfg

L'installation Debian est entierement automatisee via le fichier `packer/http/preseed.cfg`. Packer demarre un serveur HTTP temporaire et passe l'URL de ce fichier a l'installeur Debian via la ligne de commande du kernel (`preseed/url=http://...`).

### Localisation

```
d-i debian-installer/locale string fr_FR.UTF-8
d-i keyboard-configuration/xkb-keymap select fr
```

Systeme en francais, clavier AZERTY. Ces parametres s'appliquent a l'installeur et au systeme installe.

### Reseau

```
d-i netcfg/choose_interface select auto
d-i netcfg/get_hostname string unassigned-hostname
```

L'interface est detectee automatiquement. Le hostname est laisse generique car il sera assign par cloud-init lors du clonage.

### Comptes utilisateurs

```
d-i passwd/root-login boolean false
d-i passwd/username string packer
d-i passwd/user-password password packer
```

Le compte root est desactive pour la securite. Un utilisateur `packer` est cree avec le mot de passe `packer` (remplace par `var.ssh_password` pour la connexion SSH Packer). Cet utilisateur est temporaire : il est laisse dans le template car cloud-init peut le reconfigurer ou le supprimer lors du clonage. Il n'a pas de cle SSH injectee dans le template — Terraform injecte la cle via cloud-init.

### Elevation de privileges sans mot de passe

```
d-i preseed/late_command string \
    echo 'packer ALL=(ALL) NOPASSWD: ALL' > /target/etc/sudoers.d/packer ; \
    in-target chmod 440 /etc/sudoers.d/packer
```

La `late_command` est executee en fin d'installation, dans le contexte du systeme cible (`in-target`). Elle configure sudo sans mot de passe pour `packer`, ce qui permet aux scripts de provisioning de s'executer via SSH sans interaction. Sans cette etape, les commandes `sudo` dans les scripts echouent avec "un terminal est requis".

### Partitionnement

```
d-i partman-auto/method string lvm
d-i partman-auto/choose_recipe select atomic
```

LVM avec la recette `atomic` : une seule partition logique occupant tout l'espace. La recette `atomic` est choisie pour sa simplicite et sa compatibilite avec le thin provisioning de Proxmox. LVM permet de redimensionner les volumes apres clonage sans reinstallation.

### Paquets installes a l'installation

```
tasksel tasksel/first multiselect standard, ssh-server
d-i pkgsel/include string qemu-guest-agent, cloud-init, sudo, curl, ufw, unattended-upgrades, vim, net-tools
```

- `qemu-guest-agent` : integration Proxmox (affichage IP, arret propre).
- `cloud-init` : configuration au premier boot des clones (hostname, IP, cle SSH).
- `ufw` : pare-feu applicatif, configure par le script de hardening.
- `unattended-upgrades` : correctifs de securite automatiques.

### Option Discard/Trim

```hcl
disks {
  discard = true
}
```

Active dans `debian-12.pkr.hcl` (pas dans le preseed). Permet au disque virtuel de liberer l'espace sur le stockage Proxmox quand des fichiers sont supprimes, essentiel pour le thin provisioning.

---

## 4. Scripts de provisioning

Packer execute 4 scripts shell sequentiellement apres connexion SSH. L'ordre est important : chaque script s'appuie sur l'etat laisse par le precedent.

### Script 01 : Mise a jour systeme (`scripts/01-update.sh`)

```bash
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get dist-upgrade -y
sudo apt-get autoremove -y
```

Mise a jour complete du systeme avant tout autre traitement. `DEBIAN_FRONTEND=noninteractive` evite les dialogues interactifs (questions de configuration de paquets) qui bloqueraient le build.

`dist-upgrade` (par opposition a `upgrade`) met aussi a jour les paquets qui necessitent l'installation ou la suppression d'autres paquets, ce qui est necessaire pour les mises a jour noyau.

### Script 02 : Durcissement (`scripts/02-hardening.sh`)

#### SSH

```bash
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
```

Desactivation du login root via SSH. L'authentification par mot de passe reste active pour que Packer puisse se connecter. Elle sera desactivee en production par cloud-init ou Ansible (injection de cle SSH, puis `PasswordAuthentication no`).

#### Durcissement du noyau (sysctl)

Le fichier `/etc/sysctl.d/99-hardened.conf` applique les protections suivantes :

| Parametre                              | Effet |
|----------------------------------------|-------|
| `rp_filter = 1`                        | Anti-spoofing IP : rejette les paquets dont l'adresse source n'est pas routable par l'interface de reception |
| `icmp_echo_ignore_broadcasts = 1`      | Ignore les pings de broadcast (attaques Smurf) |
| `accept_source_route = 0`              | Desactive le routage par la source (permet a un attaquant de dicter le chemin d'un paquet) |
| `send_redirects = 0`                   | Desactive l'envoi de redirections ICMP (evite la manipulation de routes sur le reseau) |
| `tcp_syncookies = 1`                   | Protection contre les attaques SYN flood |
| `tcp_max_syn_backlog = 2048`           | Augmente la file d'attente SYN pour absorber les pics |
| `log_martians = 1`                     | Log les paquets avec des adresses source impossibles (aide au diagnostic) |

Ces parametres s'appliquent pour les versions IPv4 et IPv6 quand applicable.

#### Pare-feu UFW

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw --force enable
```

Politique de defaut restrictive : tout entrant est bloque sauf SSH. Les regles specifiques aux services (HTTP, HTTPS, etc.) sont ajoutees par Ansible lors du deploiement.

#### Mises a jour automatiques

La configuration `unattended-upgrades` limite les mises a jour automatiques aux depots Debian officiels et de securite. Le redemarrage automatique est desactive (`Automatic-Reboot "false"`) pour eviter les coupures de service imprevisibles.

### Script 03 : Cloud-init (`scripts/03-cloud-init.sh`)

```bash
sudo tee /etc/cloud/cloud.cfg.d/99-proxmox.cfg > /dev/null <<EOF
datasource_list: [ NoCloud, ConfigDrive, None ]
EOF
sudo systemctl enable cloud-init
```

Cloud-init est configure pour utiliser la source `NoCloud` en priorite. C'est la source utilisee par Proxmox : il monte un disque CD-ROM virtuel contenant les fichiers `user-data`, `meta-data` et `network-config` generes par Terraform depuis le template `cloud-init-debian.yml.tftpl`.

Sans cette configuration, cloud-init tenterait d'autres sources (AWS, GCP, etc.) avant `NoCloud`, allongeant considerablement le temps de demarrage et potentiellement echouant.

### Script 04 : Nettoyage et scellage (`scripts/04-cleanup.sh`)

Ce script prepare l'image pour etre clonee en masse. Un template non scelle produit des clones avec des identites conflictuelles.

#### Reinitialisation du machine-id

```bash
sudo truncate -s 0 /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo ln -sf /etc/machine-id /var/lib/dbus/machine-id
```

Le `machine-id` identifie de maniere unique l'instance systemd. S'il est identique sur tous les clones, le serveur DHCP attribue la meme IP a toutes les VMs (le bail DHCP est lie au machine-id, pas a l'adresse MAC). Le fichier est vide (pas supprime) car cloud-init le regenere au premier boot.

Le lien symbolique entre `/var/lib/dbus/machine-id` et `/etc/machine-id` est necessaire car D-Bus utilise sa propre copie : sans le lien, les deux fichiers divergent apres la regeneration par cloud-init.

#### Suppression des cles SSH d'hote

```bash
sudo rm -f /etc/ssh/ssh_host_*
```

Les cles d'hote SSH (`/etc/ssh/ssh_host_*`) identifient le serveur SSH aupres des clients. Si tous les clones partagent les memes cles, n'importe quel clone peut se faire passer pour un autre (violation de l'authenticite SSH). Cloud-init regenere des cles uniques au premier boot.

#### Nettoyage des logs et historique

```bash
sudo find /var/log -type f -exec truncate -s 0 {} \;
```

Les logs sont vides (pas supprimes car certains daemons gardent un descripteur de fichier ouvert). L'historique shell est efface pour eviter de laisser des informations sensibles dans le template.

---

## 5. Comment builder

### Prerequis

1. L'ISO Debian 12 netinst doit etre present dans le stockage Proxmox.
2. Le fichier `packer/variables.pkrvars.hcl` doit exister (voir `.pkrvars.hcl.example`).

### Variables obligatoires dans variables.pkrvars.hcl

```hcl
proxmox_api_url          = "https://proxmox:8006/api2/json"
proxmox_api_token_id     = "packer@pam!packer-token"
proxmox_api_token_secret = "..."
proxmox_node             = "pve"
iso_file                 = "local:iso/debian-12.9.0-amd64-netinst.iso"
ssh_password             = "..."  # mot de passe temporaire pour le build
```

### Commandes

```bash
# Initialiser les plugins (premiere fois uniquement)
make init

# Build standard
make build-debian

# Build avec logs detailles et pause en cas d'erreur
make debug-debian
```

### Configuration pour un build depuis un VPN

Packer demarre un serveur HTTP local sur `http_bind_address` pour servir le fichier `preseed.cfg` a la VM Proxmox. Si le build est lance depuis un PC connecte via VPN a Proxmox, la VM ne peut pas joindre `0.0.0.0` (qui correspond a toutes les interfaces locales du PC).

Il faut specifier l'IP du tunnel VPN :

```hcl
# Dans variables.pkrvars.hcl
http_bind_address = "10.x.x.x"  # IP de votre interface VPN WireGuard
```

Sans cette configuration, l'installeur Debian attend indefiniment le fichier preseed et le build expire apres le timeout SSH.

---

## 6. Troubleshooting

### 401 Authentication Failed

Le Token ID doit inclure le domaine : `user@pam!token-name` (et non `user!token-name`). Verifier que le secret est exact (pas de caracteres caches en copie-colle).

### 403 Permission Denied (SDN)

Sur Proxmox 8+, le token Packer doit avoir le role `PVENetworkUser` (ou le privilege `SDN.Use`) sur le chemin du bridge (`/sdn/zones/...`). Ajouter le privilege dans Datacenter > Permissions.

### "sudo: un terminal est requis"

La `late_command` du preseed n'a pas configure `NOPASSWD` correctement. Verifier que le fichier `/etc/sudoers.d/packer` existe dans la VM de build et contient bien `packer ALL=(ALL) NOPASSWD: ALL`.

### Le preseed n'est pas telecharge (timeout installer)

La VM ne peut pas joindre le serveur HTTP Packer. Causes possibles :
- `http_bind_address` non configure pour un build via VPN.
- Le pare-feu du PC de build bloque le port 8000-8100.
- Proxmox et le PC de build ne sont pas sur le meme reseau/routage.

### Permission non accordee lors du nettoyage

Certaines redirections shell (`> /fichier`) echouent si le script tourne sans terminal (cas de Packer). Utiliser `sudo truncate -s 0 /fichier` a la place des redirections pour les fichiers proteges, comme c'est le cas dans `04-cleanup.sh`.
