# ──────────────────────────────────────────────
# Variables de Connexion Proxmox (Standards DevSecOps)
# ──────────────────────────────────────────────

variable "proxmox_api_url" {
  type        = string
  description = "URL de l'API Proxmox (ex: https://proxmox:8006/api2/json)"

  validation {
    condition     = can(regex("^https://", var.proxmox_api_url))
    error_message = "L'URL de l'API Proxmox doit obligatoirement commencer par https://"
  }
}

variable "proxmox_api_token_id" {
  type        = string
  description = "ID du jeton API Proxmox (ex: utilisateur@pam!token)"
}

variable "proxmox_api_token_secret" {
  type        = string
  sensitive   = true
  description = "Secret du jeton API Proxmox"
}

variable "insecure_tls" {
  type        = bool
  default     = true
  description = "Désactive la vérification TLS (à passer à false en production)"
}

variable "proxmox_ssh_username" {
  type        = string
  default     = "root"
  description = "Utilisateur SSH pour l'hôte Proxmox (Préférer un utilisateur dédié)"
}

variable "proxmox_ssh_private_key_path" {
  type        = string
  default     = "~/.ssh/id_rsa"
  description = "Chemin vers la clé privée SSH locale pour l'accès à l'hôte"
}

# Liste des clés SSH publiques pour les administrateurs système (Injectées via Cloud-init)
variable "sysadmin_ssh_public_keys" {
  type        = list(string)
  description = "Liste des clés SSH publiques autorisées pour l'utilisateur sysadmin"
}
