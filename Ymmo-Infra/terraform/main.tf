# ──────────────────────────────────────────────
# Configuration du Provider Proxmox
# ──────────────────────────────────────────────

provider "proxmox" {
  endpoint  = var.proxmox_api_url
  api_token = "${var.proxmox_api_token_id}=${var.proxmox_api_token_secret}"
  insecure  = var.insecure_tls

  ssh {
    agent       = true
    username    = var.proxmox_ssh_username
    private_key = file(var.proxmox_ssh_private_key_path)
  }
}

# ──────────────────────────────────────────────
# Locals : Définition de l'Architecture Multi-Site
# ──────────────────────────────────────────────
locals {
  # Configuration centralisée des sites (Siège + Agences)
  sites = {
    siege = {
      name            = "Siège"
      site_id         = 0
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
    agence_01 = {
      name            = "Agence 01"
      site_id         = 1
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
    agence_02 = {
      name            = "Agence 02"
      site_id         = 2
      target_node     = "node2"
      storage_id      = "local-lvm"
      internal_bridge = "YmmoTom"
      wan_bridge      = "vmbr0"
    }
    # On pourra étendre ici jusqu'à l'agence 12 facilement
  }
}
