terraform {
  # Verrouillage pessimiste pour la stabilité
  required_version = "~> 1.5"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.100"
    }
  }
}
