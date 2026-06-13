# ──────────────────────────────────────────────
# Build Packer — Template Windows 11 25H2 pour Proxmox
# ──────────────────────────────────────────────
# Stratégie matérielle du build :
#   - Disque SATA + carte réseau e1000 → pilotes inbox Windows → WinRM
#     disponible immédiatement sans injection de pilotes WinPE.
#   - Les pilotes virtio + l'agent QEMU sont installés DANS l'image via
#     le provisioner PowerShell, puis disponibles sur les clones.

source "proxmox-iso" "windows-11" {
  # Connexion à l'hyperviseur
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  node                     = var.proxmox_node
  insecure_skip_tls_verify = var.proxmox_skip_tls_verify

  # Métadonnées du template
  vm_name              = var.windows_template_name
  vm_id                = var.windows_vm_id
  template_description = "Template Windows 11 25H2 (Sysprep + pilotes VirtIO) — Généré le : ${formatdate("YYYY-MM-DD", timestamp())}"

  # ISO principal Windows 11 — démonté après installation
  boot_iso {
    unmount      = true
    iso_file     = var.windows_iso_file
    iso_checksum = "none"
  }

  # Firmware UEFI (OVMF) + SecureBoot — obligatoire pour Windows 11
  bios = "ovmf"
  efi_config {
    efi_storage_pool  = var.windows_efi_storage_pool
    efi_type          = "4m"
    pre_enrolled_keys = true
  }

  # TPM 2.0 — requis par Windows 11
  tpm_config {
    tpm_storage_pool = var.windows_tpm_storage_pool
    tpm_version      = "v2.0"
  }

  # Type de machine, OS et CPU
  machine  = "q35"
  os       = "win11"
  cpu_type = "host"

  # Activation de l'agent QEMU (sera installé par le provisioner)
  qemu_agent = true

  # Ressources de la VM de build
  cores   = var.windows_vm_cores
  sockets = 1
  memory  = var.windows_vm_memory

  # Disque SATA intentionnel : Windows détecte le contrôleur SATA via les
  # pilotes inbox, ce qui évite toute injection de pilotes en phase WinPE.
  disks {
    type         = "sata"
    disk_size    = var.windows_vm_disk_size
    storage_pool = var.vm_storage_pool
    format       = "raw"
    discard      = true
  }

  # Carte réseau e1000 intentionnelle : pilote inbox → WinRM opérationnel
  # dès la fin de l'OOBE, sans intervention manuelle.
  network_adapters {
    model    = "e1000"
    bridge   = var.vm_bridge
    firewall = false
  }

  # ISO secondaires montés pendant le build
  additional_iso_files {
    # ISO virtio-win déjà présent sur Proxmox — contient les pilotes et
    # l'agent QEMU ; monté en SATA pour que Windows le détecte facilement.
    type         = "sata"
    iso_file     = var.virtio_iso_file
    iso_checksum = "none"
    unmount      = true
  }

  # ISO Autounattend PRÉ-CONSTRUITE et déjà uploadée sur Proxmox (comme l'ISO
  # virtio). On n'utilise pas cd_files : sur ce Proxmox, l'upload d'une ISO
  # générée à la volée échoue (le datastore ISO ne gère pas l'écriture via
  # l'API du node de build). Construire et uploader l'ISO une fois :
  #   xorriso -as mkisofs -J -r -V AUTOUNATTEND -o autounattend.iso autounattend/
  # puis l'uploader via l'UI Proxmox et renseigner autounattend_iso_file.
  # Windows Setup détecte automatiquement Autounattend.xml à la racine du média.
  additional_iso_files {
    type     = "ide"
    iso_file = var.autounattend_iso_file
    unmount  = true
  }

  # Ordre de boot explicite : CD d'installation Windows (ide2) puis disque
  # système (sata0). On exclut net0 pour éviter les tentatives PXE/HTTP qui
  # timeout au démarrage. Sur les reboots de l'install, le CD affiche
  # "Press any key…" sans réponse → bascule automatique sur le disque.
  boot = "order=ide2;sata0"

  # Attente avant d'envoyer la commande de boot.
  # Sous OVMF, le firmware affiche "Press any key to boot from CD/DVD" —
  # cette pression de touche est sensible au timing.
  # Augmenter boot_wait à "8s" ou "10s" si le build reste bloqué au démarrage.
  boot_wait = "5s"
  boot_command = [
    "<spacebar>"
  ]

  # Communicateur WinRM — Packer attend que WinRM soit disponible avant
  # de lancer les provisioners (jusqu'à 45 min pour l'installation Windows).
  communicator   = "winrm"
  winrm_username = var.winrm_username
  winrm_password = var.winrm_password
  winrm_insecure = true
  # Connexion WinRM en HTTPS (port 5986). Raison : sur cette image, la policy
  # "AllowUnencrypted" est verrouillée à false → Basic sur HTTP impossible, et
  # le durcissement NTLM est mal supporté par la lib Go de Packer. En HTTPS, le
  # canal est chiffré par TLS : Basic est autorisé sans AllowUnencrypted.
  # Le listener HTTPS + le certif auto-signé sont créés par setup-winrm.ps1
  # (FirstLogon). winrm_insecure ignore la validation du certif auto-signé.
  winrm_use_ssl  = true
  winrm_use_ntlm = false
  winrm_port     = 5986
  winrm_timeout  = "45m"
}

build {
  name    = "windows-11"
  sources = ["source.proxmox-iso.windows-11"]

  # Dernier provisioner : installe les pilotes virtio + agent QEMU,
  # puis lance Sysprep. Sysprep éteint la VM — Packer convertit ensuite
  # en template Proxmox.
  provisioner "powershell" {
    # elevated_user/password : exécute le script en élévation (UAC) via une
    # tâche planifiée — requis pour Sysprep. Le compte packer est admin local.
    elevated_user     = var.winrm_username
    elevated_password = var.winrm_password
    # Variables consommées par windows-sysprep.ps1 : compte local re-déclaré
    # dans l'unattend Sysprep + clé SSH autorisée pour Ansible sur les clones.
    environment_vars = [
      "PACKER_BUILD_USERNAME=${var.winrm_username}",
      "PACKER_BUILD_PASSWORD=${var.winrm_password}",
      "SSH_AUTHORIZED_KEY=${var.windows_ssh_authorized_key}",
    ]
    scripts = ["scripts/windows-sysprep.ps1"]
  }
}
