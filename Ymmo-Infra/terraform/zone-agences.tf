# ──────────────────────────────────────────────
# Zone Agences — Simulation des sites distants (Démo : Agences 01 et 02)
# Chaque agence est simulée par une VM Debian 12 servant d'endpoint WireGuard.
# L'extension aux agences 03-12 se fait en dupliquant ces blocs.
# ──────────────────────────────────────────────

# Agence 01 — Site 1 (réseau : 10.1.0.0/16, tunnel WG : 10.254.0.11)
module "agence_01" {
  source = "./modules/vm"

  vm_name      = "Agence-01"
  node_name    = local.sites.agence_01.target_node
  source_vm_id = 9000 # Template Debian 12
  memory       = 1024
  cpu_cores    = 1
  storage_id   = local.sites.agence_01.storage_id
  tags         = ["ymmotom", "agence", "agence01"]
  pool_id      = "ymmo-pool"

  # Interface WAN (vmbr0) : permet d'atteindre l'IP WAN d'OPNsense pour initier le tunnel WireGuard.
  network_interfaces = [
    {
      bridge = local.sites.agence_01.wan_bridge
    }
  ]

  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "agence-01"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
}

# Agence 02 — Site 2 (réseau : 10.2.0.0/16, tunnel WG : 10.254.0.12)
module "agence_02" {
  source = "./modules/vm"

  vm_name      = "Agence-02"
  node_name    = local.sites.agence_02.target_node
  source_vm_id = 9000 # Template Debian 12
  memory       = 1024
  cpu_cores    = 1
  storage_id   = local.sites.agence_02.storage_id
  tags         = ["ymmotom", "agence", "agence02"]
  pool_id      = "ymmo-pool"

  # Interface WAN (vmbr0) : même logique qu'Agence-01.
  network_interfaces = [
    {
      bridge = local.sites.agence_02.wan_bridge
    }
  ]

  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "agence-02"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
}
