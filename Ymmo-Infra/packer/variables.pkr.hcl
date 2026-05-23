# ──────────────────────────────────────────────
# Variables Packer - Debian 12
# ──────────────────────────────────────────────

# Connexion Proxmox
variable "proxmox_api_url" {
  type        = string
  description = "URL de l'API Proxmox (ex: https://proxmox:8006/api2/json)"
}

variable "proxmox_api_token_id" {
  type        = string
  description = "ID du jeton API Proxmox (ex: user@pam!token-name)"
}

variable "proxmox_api_token_secret" {
  type        = string
  sensitive   = true
  description = "Secret du jeton API Proxmox"
}

variable "proxmox_node" {
  type        = string
  description = "Nœud Proxmox cible"
}

variable "proxmox_skip_tls_verify" {
  type        = bool
  default     = true
  description = "Ignorer la vérification TLS (déconseillé en production)"
}

# Paramètres du template VM
variable "template_name" {
  type        = string
  default     = "debian-12-hardened"
  description = "Nom du template généré"
}

variable "template_description" {
  type    = string
  default = "Template Debian 12 Bookworm Sécurisé (Hardened)"
}

variable "vm_id" {
  type        = number
  default     = 9000
  description = "ID de la VM (utiliser un nombre élevé pour éviter les conflits)"
}

# ISO
variable "iso_file" {
  type        = string
  description = "Chemin vers l'ISO Debian (ex: local:iso/debian-12.x.x-amd64-netinst.iso)"
}

variable "iso_checksum" {
  type        = string
  default     = "none"
  description = "Somme de contrôle de l'ISO (optionnel)"
}

# Matériel (Hardware)
variable "vm_cores" {
  type    = number
  default = 2
}

variable "vm_memory" {
  type    = number
  default = 2048
}

variable "vm_disk_size" {
  type    = string
  default = "20G"
}

variable "vm_storage_pool" {
  type    = string
  default = "local-lvm"
}

variable "vm_bridge" {
  type    = string
  default = "vmbr0"
}

# SSH (Utilisé uniquement pendant la phase de build)
variable "ssh_username" {
  type    = string
  default = "packer"
}

variable "ssh_password" {
  type      = string
  sensitive = true
}

# Réseau Packer (Serveur HTTP pour Preseed)
variable "http_bind_address" {
  type        = string
  default     = "0.0.0.0"
  description = "Adresse IP sur laquelle Packer écoute (ex: IP de votre tunnel VPN)"
}
