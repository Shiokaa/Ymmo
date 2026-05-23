# Documentation Technique : Template Packer OPNsense 26.1

Ce document détaille la conception et l'automatisation du template **OPNsense 26.1 (Witty Woodpecker)** pour l'infrastructure Ymmo-Infra sur Proxmox.

---

## 1. Présentation du Template

Ce template sert de base au routeur/pare-feu central du projet. Contrairement aux VMs Linux, OPNsense est basé sur **FreeBSD/HardenedBSD**, ce qui impose une méthode d'automatisation différente.

### Caractéristiques Techniques
- **Système** : OPNsense 26.1 (Architecture amd64).
- **Système de fichiers** : **ZFS** en mode "Stripe" (nouveauté par défaut de la v26.1 pour une meilleure fiabilité).
- **Matériel (Hardware)** :
    - **Mémoire** : 4096 Mo (Requis pour un boot stable en 26.1).
    - **CPU** : 2 Cores.
    - **Stockage** : 20 Go sur contrôleur **VirtIO**.
    - **Réseau** : Double interface VirtIO (WAN / LAN).

---

## 2. Automatisation du Build

OPNsense ne supportant pas de fichier de réponse standard (type preseed), l'automatisation repose sur une séquence `boot_command` simulant les frappes au clavier.

### Étapes clés de l'installation :
1.  **Login automatique** : Connexion initiale en tant que `installer` / `opnsense`.
2.  **Choix ZFS** : Sélection du partitionnement ZFS Stripe.
3.  **Sélection du disque** : Utilisation de la touche `<spacebar>` pour cocher le disque VirtIO (`vtbd0`), étape indispensable sans laquelle l'installeur échoue.
4.  **Mot de passe ROOT** : Définition du mot de passe root (via variable) **avant** le premier reboot.

### Le "Hack" du Réseau (Post-Install)
Pour permettre à Packer de se connecter en SSH et de finir le build, une séquence spécifique est exécutée au premier démarrage :
- **Désactivation temporaire du firewall** (`pfctl -d`).
- **Suppression de l'IP LAN par défaut** (`ifconfig vtnet1 inet 192.168.1.1 delete`). Cela force la VM à être jointe via son adresse DHCP sur le WAN, évitant que Packer ne tente de joindre une IP statique 192.168.1.1 injoignable depuis le PC de build.
- **Activation SSH** (`service openssh enable/start`).

---

## 3. Optimisation & Provisioning

Une fois le SSH actif, Packer exécute le script `scripts/opnsense-setup.sh` pour finaliser le template.

### Actions réalisées :
- **Agent QEMU** : Installation du paquet `os-qemu-guest-agent` et activation au démarrage. Cela permet à Proxmox d'afficher l'IP de la VM et de gérer l'arrêt propre.
- **Assistant de configuration** : Désactivation du "Setup Wizard" au premier boot réel (`wizard_done=yes`).
- **Credentials API OPNsense** : Injection de la clé API et du secret (hashé SHA-512 au format `$6$`) dans `config.xml` via le bloc PHP. Ces credentials permettent à Ansible de piloter OPNsense via REST dès le premier boot, sans aucune configuration manuelle.
- **Règle firewall WAN** : Ajout d'une règle `pass in on vtnet1 proto tcp to (self) port 443` directement dans `config.xml`. Sans cette règle, OPNsense bloque tout le trafic WAN entrant par défaut, rendant l'API inaccessible depuis le contrôleur Ansible.
- **Pré-déclaration des VLANs** : Écriture directe dans `config.xml` des 4 VLANs du Siège (`SRV_SIEGE`, `USR_SIEGE`, `PRT_SIEGE`, `MGT_SIEGE`) et de leurs interfaces OPT associées (`opt1`–`opt4`). Cette étape est obligatoire car l'API OPNsense n'expose pas l'assignation d'interfaces (issue core#7324, fermée "not planned"). Sans cette pré-déclaration, le rôle Ansible `opnsense_network` ne peut pas configurer DHCP ni firewall sur ces interfaces.
- **Nettoyage** : Purge du cache des paquets `pkg`.

---

## 4. Guide d'Utilisation

### Prérequis
- Avoir l'ISO DVD OPNsense sur le stockage Proxmox.
- Avoir configuré les variables dans `variables.pkrvars.hcl`, notamment :
  - `opnsense_api_key` — clé API (ex: `openssl rand -hex 40`)
  - `opnsense_api_secret` — secret en clair (OPNsense le hash en SHA-512 lors du build)

  Ces mêmes valeurs devront être renseignées dans le vault Ansible après le build.

### Commandes Makefile
- `make build-opnsense` : Lance la création standard du template.
- `make debug-opnsense` : Lance le build avec logs détaillés et pause en cas d'erreur.

---

## 5. Dépannage (Troubleshooting)

### Points résolus lors du développement :
- **Touche Espace** : Utilisation impérative de la balise `<spacebar>` pour la sélection de disque ZFS.
- **Délai de Boot** : Augmentation du `boot_wait` à 75s+ pour laisser l'ISO charger ses nouveaux services (hostwatch, etc.).
- **Problème de clavier** : Vigilance sur le fait que Packer simule un clavier US. Si l'OS bascule en FR trop tôt, les commandes complexes (ex: `openssh`) peuvent être mal tapées.
- **RAM insuffisante** : Passage de 2 Go à 4 Go pour éviter les kernel panic ou les lenteurs extrêmes lors de l'installation ZFS.
