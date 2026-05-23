# ──────────────────────────────────────────────
# Build Packer — Template OPNsense pour Proxmox
# ──────────────────────────────────────────────

source "proxmox-iso" "opnsense" {
  # Connexion (Variables globales)
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  node                     = var.proxmox_node
  insecure_skip_tls_verify = var.proxmox_skip_tls_verify

  # Métadonnées
  vm_name              = var.opnsense_template_name
  template_description = "OPNsense Hardened Template (Généré le : ${formatdate("YYYY-MM-DD", timestamp())})"
  vm_id                = var.opnsense_vm_id

  # ISO
  boot_iso {
    unmount      = true
    iso_file     = var.opnsense_iso_file
    iso_checksum = "none"
  }

  # Système
  qemu_agent      = true
  scsi_controller = "virtio-scsi-single"
  os              = "other" # OPNsense est basé sur FreeBSD
  cpu_type        = "host"
  cores           = var.opnsense_vm_cores
  memory          = var.opnsense_vm_memory

  # Disque
  disks {
    type         = "virtio" # VirtIO recommandé pour OPNsense
    disk_size    = var.opnsense_vm_disk_size
    storage_pool = var.vm_storage_pool
    format       = "raw"
  }

  # Réseau (LAN par défaut pour le build)
  network_adapters {
    model    = "virtio"
    bridge   = var.vm_bridge
    firewall = false
  }

  network_adapters {
    model    = "virtio"
    bridge   = var.vm_bridge # Peut être le même bridge pour le build
    firewall = false
  }

  # Automatisation de l'installeur OPNsense
  boot_wait = "65s"
  boot_command = [
    "<enter><wait5s>",                   # Réveil de la console
    "installer<enter>",                  # Login installeur
    "<wait5s>opnsense<enter>",           # Password par défaut installeur
    "<wait5s>",                          # Attente du menu principal
    "<enter>",                           # Sélectionner US comme langue par défaut
    "<wait2s><enter>",                   # Task (Install ZFS)
    "<wait4s><enter>",                   # ZFS Type (Stripe - Single Disk)
    "<wait2s><spacebar><wait2s><enter>", # COCHER le disque (Espace) puis VALIDER (Entrée)
    "<wait2s><left><wait2s><enter>",     # Sélectionner YES (Gauche) et VALIDER (Entrée)

    "<wait230s>", # Attente de l'installation des fichiers

    # Étape critique : Définition du mot de passe ROOT avant reboot
    "<enter>",                                     # Sélection de "Password" dans le menu post-install
    "<wait2s>${var.opnsense_ssh_password}<enter>", # Saisie du mot de passe (variable)
    "<wait2s>${var.opnsense_ssh_password}<enter>", # Confirmation
    "<wait15s><down><enter>",                      # OK / Retour au menu

    # Reboot final
    "<wait4s><enter>", # Sélection de "Reboot"
    "<wait40s>",       # Attente du premier reboot sur disque

    # Connexion console pour activer SSH et installer l'Agent QEMU
    "${var.opnsense_ssh_username}<enter>",         # Login root (variable)
    "<wait5s>${var.opnsense_ssh_password}<enter>", # Password (variable)
    "<wait5s>",
    "8<enter>", # Shell
    "<wait5s>",

    # 1. Désactivation du pare-feu (Pour autoriser Packer à se connecter sur le WAN)
    "pfctl -d<enter>",
    "<wait2s>",

    # 2. On force une requête DHCP sur le WAN (vtnet0) pour être sûr d'avoir internet
    "dhclient vtnet0<enter>",
    "<wait5s>",

    # 3. LE HACK : On supprime l'IP statique LAN (vtnet1) en RAM
    # Ainsi Packer ne la verra pas et sera obligé d'utiliser l'IP DHCP !
    "ifconfig vtnet1 inet 192.168.1.1 delete<enter>",
    "<wait2s>",

    # 4. Activation de SSH
    "service openssh enable<enter>",
    "<wait2s>service openssh start<enter>",

    # 5. Installation de l'agent QEMU (WireGuard intégré au core depuis OPNsense 24.1)
    "<wait2s>pkg update<enter>",
    "<wait5s>pkg install -y os-qemu-guest-agent<enter>",
    "<wait5s>",

    # 6. Activation de l'agent QEMU
    "service qemu-guest-agent enable<enter>",
    "<wait2s>service qemu-guest-agent start<enter>",

    # 7. Sortie
    "<wait2s>exit<enter>",
    "<wait2s>",
    "0<enter>", # Logout
  ]

  # Connexion SSH (après le premier reboot et l'activation manuelle ci-dessus)
  ssh_username = var.opnsense_ssh_username
  ssh_password = var.opnsense_ssh_password
  ssh_timeout  = "20m"
}

build {
  name    = "opnsense"
  sources = ["source.proxmox-iso.opnsense"]

  # Provisioning final
  provisioner "shell" {
    environment_vars = [
      "AUTH_KEYS_B64=${base64encode(join("\n", var.opnsense_authorized_keys))}",
      "OPN_API_KEY=${var.opnsense_api_key}",
      "OPN_API_SECRET=${var.opnsense_api_secret}"
    ]
    execute_command = "chmod +x {{ .Path }}; env {{ .Vars }} /bin/sh {{ .Path }}"
    scripts = [
      "scripts/opnsense-setup.sh"
    ]
  }
}
