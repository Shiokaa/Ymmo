# ──────────────────────────────────────────────
# Zone Clients - Postes de travail Windows (Siège)
# ──────────────────────────────────────────────

# Les clients dépendent du DHCP OPNsense (configuré par Ansible APRÈS le
# premier apply Terraform). Ce flag permet de phaser le déploiement complet :
#   1. terraform apply -var="deploy_clients=false"   → infra sans clients
#   2. ./ymmo.sh ansible setup && ./ymmo.sh ansible network → DHCP actif
#   3. terraform apply                                → ajoute les clients
# Sans DHCP, le provider attend l'IP du guest agent et échoue au timeout.
variable "deploy_clients" {
  description = "Déployer les postes clients Windows (nécessite le DHCP OPNsense actif)"
  type        = bool
  default     = true
}

# 1. Client Windows 11 (poste utilisateur de test Samba/AD)
# Note : Connecté au VLAN 20 (Utilisateurs Siège), adressage en DHCP
# (le template Windows n'a pas de cloud-init — l'IP est servie par OPNsense).

module "client01_siege" {
  source = "./modules/vm"
  count  = var.deploy_clients ? 1 : 0

  vm_name      = "CLI01-Siege"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9002 # Template Windows 11 25H2
  memory       = 4096
  cpu_cores    = 4
  disk_size    = 64 # Doit correspondre au disque du template Windows (64G)
  storage_id   = local.sites.siege.storage_id
  tags         = ["ymmotom", "client", "windows"]
  pool_id      = "ymmo-pool"

  # Spécificités du template Windows : firmware UEFI (OVMF) + machine q35,
  # disque sur sata0 (iothread non supporté en sata). Les disques EFI et TPM
  # sont hérités du clone sans être gérés par Terraform.
  bios           = "ovmf"
  machine        = "q35"
  disk_interface = "sata0"
  disk_iothread  = false

  # Pas de cloud-init sur Windows : pas de lecteur initialization, IP en DHCP.
  enable_cloud_init = false

  network_interfaces = [
    {
      bridge  = local.sites.siege.internal_bridge
      vlan_id = 20 # VLAN USR_SIEGE
    }
  ]
}
