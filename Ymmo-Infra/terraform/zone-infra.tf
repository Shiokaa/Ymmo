# ──────────────────────────────────────────────
# Zone Infrastructure - Siège Social (Site 0)
# ──────────────────────────────────────────────

# 1. Routeur OPNsense (Siège)
# Note : OPNsense est déployé avec ses deux interfaces (WAN et LAN)

module "opnsense_master" {
  source = "./modules/vm"

  vm_name      = "OPNsense-Master"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9001 # Template OPNsense
  memory       = 4096
  cpu_cores    = 2
  storage_id   = local.sites.siege.storage_id
  tags         = ["ymmotom", "infra", "router"]

  network_interfaces = [
    {
      bridge = local.sites.siege.internal_bridge # LAN
    },
    {
      bridge = local.sites.siege.wan_bridge # WAN
    }
  ]
}

# 2. Bastion de provisioning (jump host Ansible → VLANs internes via WireGuard)

module "bastion" {
  source = "./modules/vm"

  vm_name      = "Bastion"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9000 # Template Debian 12
  memory       = 512
  cpu_cores    = 1
  storage_id   = local.sites.siege.storage_id
  tags         = ["ymmotom", "bastion", "infra"]

  # Interface WAN (vmbr0) : accessible depuis le control node Ansible.
  # Le tunnel WireGuard (10.254.0.2/32) donne ensuite accès aux VLANs internes.
  network_interfaces = [
    {
      bridge = local.sites.siege.wan_bridge
    }
  ]

  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "bastion"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
  # Bastion sur le WAN : résolveurs publics pour l'amorçage (apt, WireGuard).
  dns_servers = ["8.8.8.8", "1.1.1.1"]
}

# 3. Contrôleur de Domaine Samba4 (DC1)
# Note : Connecté au VLAN 10 (Serveurs Siège)

module "samba4_dc1" {
  source = "./modules/vm"

  vm_name      = "Samba4-DC1"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9000 # Template Debian 12
  memory       = 4096
  cpu_cores    = 2
  storage_id   = local.sites.siege.storage_id
  tags         = ["ymmotom", "samba4", "ad-dc", "infra"]


  network_interfaces = [
    {
      bridge  = local.sites.siege.internal_bridge
      vlan_id = 10 # VLAN SRV_SIEGE
    }
  ]

  # Configuration Réseau
  ipv4_config = {
    address = "10.0.10.1/24"
    gateway = "10.0.10.254"
  }

  # Injection Cloud-init
  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "dc1"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
  # DC1 sur VLAN 10 : DNS via OPNsense (Unbound sur .254) + repli public 8.8.8.8
  # pour l'amorçage apt avant que Samba ne devienne lui-même serveur DNS.
  dns_servers = ["10.0.10.254", "8.8.8.8"]
}
