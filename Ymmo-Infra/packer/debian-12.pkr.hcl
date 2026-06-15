# ──────────────────────────────────────────────
# Build Packer — Template Debian 12 pour Proxmox
# ──────────────────────────────────────────────

source "proxmox-iso" "debian-12" {
  # Connexion à l'hyperviseur
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  node                     = var.proxmox_node
  insecure_skip_tls_verify = var.proxmox_skip_tls_verify

  # Métadonnées du template
  vm_name              = var.template_name
  template_description = "${var.template_description} (Généré le : ${formatdate("YYYY-MM-DD", timestamp())})"
  vm_id                = var.vm_id
  # Pool de ressources Proxmox regroupant les templates et VMs Ymmo (doit exister avant le build).
  pool = "ymmo-pool"

  # Fichier ISO
  boot_iso {
    unmount      = true
    iso_file     = var.iso_file
    iso_checksum = var.iso_checksum
  }

  # Système
  qemu_agent      = true
  scsi_controller = "virtio-scsi-single"
  os              = "l26"
  cpu_type        = "host"
  cores           = var.vm_cores
  memory          = var.vm_memory

  # Configuration disque avec support Discard/Trim (Indispensable pour SSD/Thin Provisioning)
  disks {
    type         = "scsi"
    disk_size    = var.vm_disk_size
    storage_pool = var.vm_storage_pool
    format       = "raw"
    discard      = true
  }

  # Configuration réseau
  network_adapters {
    model    = "virtio"
    bridge   = var.vm_bridge
    firewall = false
  }

  # Configuration du boot (via Preseed)
  http_directory    = "http"
  http_bind_address = var.http_bind_address
  http_port_min     = 8000
  http_port_max     = 8100
  boot_wait         = "10s"
  boot_command = [
    "<esc><wait>",
    "install ",
    "preseed/url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed.cfg ",
    "debian-installer/locale=fr_FR.UTF-8 ",
    "keyboard-configuration/xkb-keymap=fr ",
    "netcfg/get_domain=local ",
    "fb=false debconf/priority=critical ",
    "grub-installer/bootdev=/dev/sda ",
    "<enter>"
  ]

  # Paramètres SSH pour le provisionnement
  ssh_username = var.ssh_username
  ssh_password = var.ssh_password
  ssh_timeout  = "20m"
}

build {
  name    = "debian-12"
  sources = ["source.proxmox-iso.debian-12"]

  # Étapes de provisionnement
  provisioner "shell" {
    scripts = [
      "scripts/01-update.sh",
      "scripts/02-hardening.sh",
      "scripts/03-cloud-init.sh",
      "scripts/04-cleanup.sh"
    ]
  }
}
