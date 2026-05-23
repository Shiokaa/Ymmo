# ─────────────────────────────────────────────────────────────────────────────
# Sorties du module VM
# ─────────────────────────────────────────────────────────────────────────────

output "vm_id" {
  value = proxmox_virtual_environment_vm.this.vm_id
}

output "vm_name" {
  value = proxmox_virtual_environment_vm.this.name
}

output "ipv4_addresses" {
  value = proxmox_virtual_environment_vm.this.ipv4_addresses
}
