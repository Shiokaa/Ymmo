# Packer — Template Windows 11 25H2

Construction d'un template Proxmox **Windows 11 25H2** (VM ID **9002**) via le
builder `proxmox-iso`, en installation totalement non-attendue (`Autounattend.xml`).

> ⚠️ Windows sur Proxmox + Packer est très peu documenté. Ce document détaille la
> chaîne complète **et** les pièges rencontrés (voir [Dépannage](#dépannage)) —
> chaque blocage a été confirmé par observation, pas supposé.

## 1. Objectif

Produire un template Windows 11 generalisé (sysprep) prêt à être cloné par
Terraform, avec : Secure Boot + TPM 2.0, drivers VirtIO, agent invité QEMU
fonctionnel, et accès WinRM pour les provisioners.

## 2. Prérequis — trois ISO sur le datastore `Backup-Node1`

Contrairement aux templates Debian/OPNsense, **trois** ISO doivent être présentes
sur le datastore Proxmox **avant** le build :

| ISO | Rôle | Comment l'obtenir |
|---|---|---|
| `Win11_25H2_French_x64_v2.iso` | Média d'installation Windows | Téléchargement Microsoft |
| `virtio-win-0.1.285.iso` | Drivers VirtIO + agent QEMU | [fedorapeople virtio-win](https://fedorapeople.org/groups/virt/virtio-win/) |
| `autounattend.iso` | Fichier de réponses + `setup-winrm.ps1` | **À construire (ci-dessous)** |

### Construire et uploader `autounattend.iso`

Le builder n'utilise **pas** `cd_files` (génération à la volée) : l'API du node de
build refuse l'upload d'ISO générée. À la place, on construit une ISO à partir du
dossier `packer/autounattend/` et on l'uploade manuellement.

```bash
cd packer
# Construit autounattend.iso à partir de Autounattend.xml + setup-winrm.ps1
xorriso -as mkisofs -J -r -V AUTOUNATTEND -o autounattend.iso autounattend/

# Upload sur Backup-Node1 (UI Proxmox : Backup-Node1 → ISO Images → Upload,
# ou scp vers le chemin template/iso/ du datastore)
```

> 🔁 **À refaire à chaque modification** de `Autounattend.xml` ou `setup-winrm.ps1` :
> l'ISO sur Proxmox est figée, elle ne se met pas à jour toute seule.

## 3. Architecture matérielle

Machine `q35` + UEFI (`ovmf`), comme l'exige Windows 11 :

- **Secure Boot activé** (`efidisk` avec `pre-enrolled-keys=1`) + **TPM 2.0**
  (`tpmstate0`, version `v2.0`) — prérequis Windows 11.
- **Disque système en SATA** (`sata0`, 64 Go) : Windows n'a pas le driver SCSI
  VirtIO au démarrage de l'installeur. SATA est reconnu nativement, ce qui évite
  d'injecter un driver dès l'install.
- **Carte réseau en `e1000`** (`net0`, `vmbr0`) : pilote natif Windows → le réseau
  marche sans driver VirtIO. (Le driver NetKVM est tout de même installé ensuite
  par les guest-tools, mais n'est pas requis pour le build.)
- **Agent QEMU activé** (`agent = 1`) : Packer découvre l'IP de la VM via l'agent
  invité — d'où l'importance d'installer cet agent (voir §4).

### Mapping des lecteurs

| Device | Contenu |
|---|---|
| `ide2` | ISO installation Windows (`boot_iso`) |
| `ide0` | `autounattend.iso` |
| `sata0` | Disque système (64 Go) |
| `sata1` | ISO VirtIO |

### Ordre de boot

```hcl
boot = "order=ide2;sata0"
```

CD d'install (`ide2`) puis disque (`sata0`). On **exclut `net0`** pour éviter les
tentatives PXE/HTTP qui timeout au démarrage UEFI. Aux reboots de l'install, le CD
affiche « Press any key… » sans réponse → bascule automatique sur le disque.

## 4. Fichier de réponses et FirstLogonCommands

`autounattend/Autounattend.xml` automatise toute l'installation (langue, disque,
édition, compte local admin `packer`, OOBE, AutoLogon). À la première ouverture de
session, trois commandes s'enchaînent :

| Ordre | Action | Pourquoi |
|---|---|---|
| 1 | Exécute `setup-winrm.ps1` | Configure WinRM (voir §5) |
| 2 | Installe `virtio-win-guest-tools.exe` (drivers + agent QEMU) | L'agent permet à Packer de découvrir l'IP ; le driver `vioser` fournit le canal de communication |
| 3 | **Reboot** | Les drivers VirtIO ne sont pleinement fonctionnels qu'après redémarrage : sans reboot, l'agent tourne mais ne peut pas ouvrir le canal virtio-serial |

Au redémarrage, l'agent QEMU (démarrage automatique) se connecte au canal, Proxmox
le voit, Packer récupère l'IP, et le listener WinRM HTTPS est prêt.

## 5. Connexion WinRM — HTTPS (port 5986)

`setup-winrm.ps1` (sur l'ISO autounattend) configure un listener **WinRM en HTTPS** :

- `LocalAccountTokenFilterPolicy = 1` : autorise l'auth distante d'un compte admin
  **local** (sinon le jeton est filtré par l'UAC → 401).
- Profil réseau forcé en **Private** : en Public, la règle pare-feu WinRM est
  restreinte au sous-réseau local et Packer se fait jeter (timeout).
- Certificat auto-signé + **listener HTTPS sur 5986** + règle pare-feu 5986 (tous
  profils).
- Auth **Basic par-dessus TLS**.

> **Pourquoi HTTPS et pas HTTP/5985 ?** Sur cette image, la policy
> `AllowUnencrypted` est verrouillée à `false` → Basic sur HTTP est impossible. Et
> l'auth NTLM est mal supportée par la lib Go `masterzen/winrm` de Packer
> (`401 invalid content type`). En HTTPS, TLS chiffre le canal : Basic est autorisé
> sans `AllowUnencrypted`, et on évite NTLM. C'est l'approche documentée robuste.

Côté Packer (`windows-11.pkr.hcl`) :

```hcl
communicator   = "winrm"
winrm_username = var.winrm_username   # "packer"
winrm_password = var.winrm_password   # doit correspondre au compte de l'Autounattend
winrm_use_ssl  = true
winrm_insecure = true                 # ignore la validation du certif auto-signé
winrm_use_ntlm = false                # Basic over TLS
winrm_port     = 5986
winrm_timeout  = "45m"
```

## 6. Déroulé du build

```
Création VM → boot sur ISO Windows (ide2)
  → install non-attendue (Autounattend.xml) → reboots auto → bureau, autologon "packer"
     → FirstLogon Order 1 : setup-winrm.ps1 (listener HTTPS 5986)
     → FirstLogon Order 2 : install drivers VirtIO + agent QEMU
     → FirstLogon Order 3 : reboot
        → agent QEMU connecté → Proxmox voit l'agent → Packer récupère l'IP
           → WinRM HTTPS/Basic → provisioner windows-sysprep.ps1
              → arrêt VM → conversion en template 9002
```

### Le provisioner final `windows-sysprep.ps1`

C'est le dernier script exécuté via WinRM avant le sysprep. Il prépare l'image pour le **clonage** (Terraform) et bascule le transport des clones de WinRM vers **SSH** :

| Étape | Action | Pourquoi |
|---|---|---|
| 1 | Détecte le lecteur CD virtio-win | Source des pilotes + agent QEMU |
| 2 | Installe l'agent QEMU (`qemu-ga-x64.msi`) | Proxmox découvre l'IP du clone via l'agent |
| 3 | Injecte les pilotes VirtIO dans le driver store (`pnputil /add-driver`) | Les périphériques virtio se lient automatiquement au boot d'un clone |
| 4 | Installe **OpenSSH Server** + service `sshd` (auto) + `DefaultShell`=PowerShell + règle pare-feu TCP/22 (`-Profile Any`) | **Transport Ansible des clones** : contrairement à WinRM, SSH supporte le ProxyJump à travers le bastion WireGuard |
| 5 | Désactive les règles pare-feu WinRM | Évite une reconnexion Packer pendant le shutdown du sysprep |
| 6 | Écrit `unattend.xml` (OOBE FR, re-déclaration du compte local `packer`) | Les clones terminent l'OOBE sans interaction |
| 7 | Lance `sysprep /generalize /oobe /shutdown` | Généralise l'image → Packer convertit en template |

> **WinRM vs SSH — ne pas confondre les deux transports :**
> - **WinRM (HTTPS/5986)** = transport *du build Packer* uniquement (provisioners).
> - **OpenSSH (22)** = transport *des clones* par Ansible (rôle `windows_client`), via le bastion.
>
> OpenSSH **survit au `sysprep /generalize`** (vérifié : `sshd.exe` présent, service `Running`, port 22 en écoute sur le clone). Pas besoin de l'installer en `SetupComplete.cmd`.

#### Injection des pilotes : `w11\amd64` uniquement (perf)

L'ISO virtio-win contient une variante de **chaque** pilote pour **toutes** les versions Windows (`xp`, `2k8`, `w7`, `w8`, `w10`, `w11`) et **toutes** les archis (`amd64`, `x86`, `ARM64`), soit ~328 paquets. Injecter `*.inf /subdirs /install` les balayait tous → **~30 min de build** avec des centaines d'« Échec » normaux (pilote non applicable).

Le script ne cible donc que les sous-dossiers `w11\amd64` (≈20 INF, tous pertinents) et **retire `/install`** (`/add-driver` seul *stage* le pilote dans le store, suffisant pour un template) → **build ramené à ~5 min**, sans régression. Le pilote `vioserial\w11\amd64\vioser.inf` (canal de l'agent QEMU) reste bien dans le lot ciblé.

## 7. Variables

Définies dans `variables-windows.pkr.hcl`, valeurs dans `variables.pkrvars.hcl` :

| Variable | Rôle |
|---|---|
| `windows_template_name` | Nom du template (`windows-11-25h2-template`) |
| `windows_vm_id` | ID de la VM/template (`9002`) |
| `windows_iso_file` | ISO d'installation Windows (`Backup-Node1:iso/...`) |
| `virtio_iso_file` | ISO VirtIO (`Backup-Node1:iso/...`) |
| `autounattend_iso_file` | ISO de réponses (`Backup-Node1:iso/autounattend.iso`) |
| `windows_vm_cores` / `windows_vm_memory` / `windows_vm_disk_size` | Ressources |
| `windows_efi_storage_pool` / `windows_tpm_storage_pool` | Stockage EFI / TPM |
| `winrm_username` / `winrm_password` | Identifiants WinRM — **doivent correspondre au compte créé dans `Autounattend.xml`** |

## 8. Commande de build

```bash
./ymmo.sh packer build windows            # build standard
./ymmo.sh packer build windows --debug    # PACKER_LOG=1 + -on-error=ask (VM conservée si échec)
```

Le `--debug` garde la VM en vie en cas d'échec, indispensable pour inspecter
l'intérieur (console Proxmox, agent, WinRM).

## Dépannage

Les six blocages rencontrés lors de la mise au point, du premier au dernier :

| Symptôme | Cause | Correctif |
|---|---|---|
| `volume 'Backup-Node1:iso/autounattend.iso' does not exist` | ISO de réponses jamais construite/uploadée | `xorriso` + upload (§2) |
| Boucle PXE/HTTP au boot UEFI | Aucun ordre de boot défini | `boot = "order=ide2;sata0"` |
| `Waiting for WinRM` infini | Agent QEMU absent → IP non découverte | Install guest-tools au FirstLogon |
| `500 QEMU guest agent is not running` (alors que le service tourne) | Drivers VirtIO incomplets avant reboot → canal virtio-serial KO | Reboot après install des drivers (Order 3) |
| `401 - invalid content type` | `AllowUnencrypted` verrouillé (policy) + NTLM mal supporté par la lib Go | Listener **HTTPS** + Basic over TLS |
| Port WinRM en `i/o timeout` après coup | Profil réseau basculé en Public → pare-feu restreint | Profil forcé en Private + règle FW `-Profile Any` |
| Build très long (~30 min), « bloqué » sur OpenSSH | Injection de tout le catalogue virtio (`*.inf /subdirs /install`) + téléchargement du FOD OpenSSH depuis Windows Update | Pilotes ciblés `w11\amd64` sans `/install` (voir §6) ; le téléchargement du FOD est ponctuel et normal |
| Clone Windows injoignable en SSH (`:22` timeout), l'agent QEMU montre `OpenSSH.Server = NotPresent` | Template construit **avant** l'ajout de la section OpenSSH au script | Reconstruire le template (`./ymmo.sh packer build windows`) puis recloner la VM (Terraform) |

### Inspecter une VM de build bloquée

Le `--debug` garde la VM. Sans agent fonctionnel, on récupère l'IP via l'API
Proxmox (`agent/network-get-interfaces`) une fois l'agent connecté, ou via un
screenshot de la console (`qm monitor <id>` → `screendump`).
