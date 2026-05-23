# Documentation Technique : Template Packer Debian 12

Ce document détaille la conception, la sécurité et l'utilisation du template **Debian 12 (Bookworm)** créé pour l'infrastructure Ymmo-Infra.

---

## 1. Présentation du Template

L'objectif de ce template est de fournir une base **immuable, sécurisée et optimisée** pour l'ensemble des serveurs du projet (Samba4, Docker hosts, DNS, etc.).

### Caractéristiques Techniques

- **Système** : Debian 12 Bookworm (64 bits).
- **Partitionnement** : **LVM** avec recette "atomic" (indispensable pour la flexibilité du stockage en production).
- **Optimisation Proxmox** :
  - Agent QEMU installé et activé.
  - Support **Discard/Trim** activé (optimisation de l'espace sur SSD/Thin Provisioning).
  - Pilotes **VirtIO** pour le réseau et le stockage (performances maximales).

---

## 2. Automatisation (Zero-Touch)

L'installation est entièrement automatisée via un fichier **Preseed** (`packer/http/preseed.cfg`).

- **Localisation** : Système en français (`fr_FR.UTF-8`), clavier AZERTY.
- **Utilisateur de Build** : Un utilisateur `packer` est créé temporairement.
- **Élévation de privilèges** : Le fichier preseed inclut une `late_command` qui configure `sudo` sans mot de passe pour l'utilisateur `packer`, permettant le provisioning automatique par SSH sans intervention humaine.

---

## 3. Sécurité & Hardening (Durcissement)

Conformément aux standards du projet, le template intègre un haut niveau de sécurité.

### Mesures appliquées (`scripts/02-hardening.sh`)

- **Noyau (sysctl)** : Protection contre l'IP Spoofing, les attaques SYN flood, et désactivation du routage par la source.
- **SSH** : Désactivation du login root et de l'accès par mot de passe (à finaliser via Cloud-init/Ansible).
- **Firewall** : `UFW` activé par défaut, autorisant uniquement le port 22 (SSH).
- **Mises à jour** : Configuration de `unattended-upgrades` pour l'installation automatique des correctifs de sécurité.

### Scellage du Template (Sealing)

Le script `scripts/04-cleanup.sh` prépare l'image pour le clonage :

- Réinitialisation du `machine-id` (évite les conflits d'IP en DHCP).
- Suppression des clés d'hôte SSH (régénérées par cloud-init sur chaque clone).
- Purge complète des logs et de l'historique shell.

---

## 4. Guide d'Utilisation

Le build est piloté par un **Makefile** à la racine du projet.

### Commandes principales

- `make init` : Initialise les plugins Packer requis (Proxmox).
- `make build-debian` : Lance la création standard du template.
- `make debug-debian` : Lance le build avec les logs détaillés (`PACKER_LOG=1`) et met le build en pause en cas d'erreur (`-on-error=ask`).

### Configuration (VPN WireGuard)

Pour lancer le build depuis un PC connecté via VPN à Proxmox, il est impératif de configurer la variable `http_bind_address` dans votre fichier `variables.pkrvars.hcl` avec votre IP de tunnel VPN (ex: `10.x.x.x`). Cela permet à la VM Proxmox de télécharger le fichier `preseed.cfg` depuis votre PC.

---

## 5. Dépannage (Troubleshooting)

### Erreurs résolues lors de la mise en œuvre :

- **401 Authentication Failed** : Vérifier que le Token ID inclut bien le domaine (`user@pve!token`) et que le secret est exact.
- **403 Permission Denied (SDN)** : Sur Proxmox 8+, l'utilisateur Packer doit posséder le rôle `PVENetworkUser` (ou le privilège `SDN.Use`) sur le chemin du bridge réseau (`/sdn/zones/...`).
- **Sudo: un terminal est requis** : Résolu par l'ajout de `NOPASSWD` dans les sudoers via la `late_command` du preseed.
- **Permission non accordée (Root History)** : Utilisation de `sudo truncate` au lieu des redirections shell standard pour nettoyer les fichiers protégés.
