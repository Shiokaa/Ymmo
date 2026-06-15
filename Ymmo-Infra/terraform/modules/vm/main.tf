# ─────────────────────────────────────────────────────────────────────────────
# Module de création de VM Proxmox (Support Debian / OPNsense)
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    proxmox = {
      source = "bpg/proxmox"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Gestion Dynamique du Cloud-Init (Snippet)
# ─────────────────────────────────────────────────────────────────────────────
resource "proxmox_virtual_environment_file" "user_data" {
  count        = var.user_data_template != null ? 1 : 0
  content_type = "snippets"
  datastore_id = var.snippet_datastore
  node_name    = var.node_name

  source_raw {
    # On fusionne dns_servers dans les variables du template : le cloud-init
    # itère sur cette liste pour écrire resolv.conf (sinon templatefile échoue
    # car la clé dns_servers est absente de user_data_vars).
    data      = templatefile(var.user_data_template, merge(var.user_data_vars, { dns_servers = var.dns_servers }))
    file_name = "${var.vm_name}-user-data.yaml"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Ressource Principale : Machine Virtuelle
# ─────────────────────────────────────────────────────────────────────────────
resource "proxmox_virtual_environment_vm" "this" {
  name        = var.vm_name
  node_name   = var.node_name
  vm_id       = var.vm_id
  description = var.description
  tags        = var.tags
  pool_id     = var.pool_id

  # Firmware et type de machine : null = la valeur du template cloné est
  # conservée. Les clones Windows UEFI doivent passer bios="ovmf"/machine="q35"
  # explicitement (les disques EFI et TPM sont hérités du clone sans être gérés).
  bios    = var.bios
  machine = var.machine

  agent {
    enabled = true
  }

  cpu {
    cores = var.cpu_cores
    type  = "host"
  }

  memory {
    dedicated = var.memory
  }

  clone {
    vm_id = var.source_vm_id
    full  = true
  }

  disk {
    datastore_id = var.storage_id
    size         = var.disk_size
    interface    = var.disk_interface
    discard      = "on"
    iothread     = var.disk_iothread
    file_format  = "raw"
  }

  dynamic "network_device" {
    for_each = var.network_interfaces
    content {
      bridge      = network_device.value.bridge
      vlan_id     = network_device.value.vlan_id
      firewall    = network_device.value.firewall
      mac_address = network_device.value.mac_address
      model       = "virtio"
    }
  }

  # Bloc cloud-init optionnel : absent pour les templates sans cloud-init
  # (ex: Windows) afin de ne pas attacher de lecteur cloud-init inutile.
  dynamic "initialization" {
    for_each = var.enable_cloud_init ? [1] : []
    content {
      user_data_file_id = var.user_data_template != null ? proxmox_virtual_environment_file.user_data[0].id : null

      dynamic "ip_config" {
        for_each = var.ipv4_config != null ? [var.ipv4_config] : []
        content {
          ipv4 {
            address = ip_config.value.address
            gateway = ip_config.value.gateway
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      initialization[0].user_data_file_id,
      # Le provider bpg ne relit pas l'appartenance au pool : sans cet ignore,
      # chaque apply suivant la création retente l'ajout au pool et échoue avec
      # « VM ... is already a pool member » (HTTP 500). Le rattachement se fait
      # à la création ; on ignore ensuite ce faux diff (la VM reste dans le pool).
      pool_id,
    ]
  }
}
