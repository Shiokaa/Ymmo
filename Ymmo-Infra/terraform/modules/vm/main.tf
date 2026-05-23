# ─────────────────────────────────────────────────────────────────────────────
# Module de création de VM Proxmox (Support Debian / OPNsense)
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
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
    data      = templatefile(var.user_data_template, var.user_data_vars)
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
    interface    = "virtio0"
    discard      = "on"
    iothread     = true
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

  initialization {
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
  
  lifecycle {
    ignore_changes = [
      initialization[0].user_data_file_id,
    ]
  }
}
