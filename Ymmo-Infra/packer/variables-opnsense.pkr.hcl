# ──────────────────────────────────────────────
# Variables Packer - OPNsense
# ──────────────────────────────────────────────

# Les variables proxmox_api_* et http_bind_address sont héritées de variables.pkr.hcl
# On définit ici uniquement ce qui est spécifique à OPNsense.

variable "opnsense_template_name" {
  type        = string
  default     = "opnsense-26-template"
  description = "Nom du template OPNsense"
}


variable "opnsense_vm_id" {
  type    = number
  default = 9001
}

variable "opnsense_iso_file" {
  type        = string
  description = "Chemin vers l'ISO OPNsense (ex: local:iso/OPNsense-24.1-dvd-amd64.iso)"
}

variable "opnsense_ssh_username" {
  type        = string
  default     = "root"
  description = "Utilisateur SSH pour le build (root par défaut sur OPNsense)"
}

variable "opnsense_ssh_password" {
  type      = string
  sensitive = true
  default   = "opnsense"
  description = "Mot de passe temporaire pour le build"
}

# Configuration Matérielle Spécifique
variable "opnsense_vm_cores" {
  type    = number
  default = 2
}

variable "opnsense_vm_memory" {
  type    = number
  default = 4096
}

variable "opnsense_vm_disk_size" {
  type    = string
  default = "20G"
}

variable "opnsense_authorized_keys" {
  type        = list(string)
  default     = []
  description = "Liste des clés SSH publiques à autoriser pour l'utilisateur root"
}

# Credentials API OPNsense injectés dans config.xml pendant le build
# Permet à Ansible de piloter OPNsense via l'API REST dès le premier démarrage
variable "opnsense_api_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Clé API OPNsense (ex: openssl rand -hex 40)"
}

variable "opnsense_api_secret" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Secret API OPNsense en clair (OPNsense le hashera en SHA-512)"
}
