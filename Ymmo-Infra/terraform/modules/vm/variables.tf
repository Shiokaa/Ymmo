# ─────────────────────────────────────────────────────────────────────────────
# Variables du module VM
# ─────────────────────────────────────────────────────────────────────────────

variable "vm_name" {
  description = "Nom de la machine virtuelle"
  type        = string
}

variable "node_name" {
  description = "Nom du noeud Proxmox (node2 par défaut)"
  type        = string
}

variable "vm_id" {
  description = "ID spécifique pour la VM"
  type        = number
  default     = null
}

variable "description" {
  description = "Description de la machine virtuelle"
  type        = string
  default     = "Géré par Terraform"
}

variable "tags" {
  description = "Liste de tags"
  type        = list(string)
  default     = ["terraform"]
}

variable "cpu_cores" {
  description = "Nombre de cœurs CPU"
  type        = number
  default     = 2
}

variable "memory" {
  description = "Mémoire vive (RAM) en Mo"
  type        = number
  default     = 2048
}

variable "source_vm_id" {
  description = "ID du template source (Packer)"
  type        = number
}

variable "disk_size" {
  description = "Taille du disque en Go"
  type        = number
  default     = 20
}

variable "storage_id" {
  description = "ID du datastore cible"
  type        = string
  default     = "local-lvm"
}

variable "pool_id" {
  description = "Pool de ressources Proxmox auquel rattacher la VM (null = aucun)"
  type        = string
  default     = null
}

variable "network_interfaces" {
  description = "Liste des interfaces réseau"
  type = list(object({
    bridge      = string
    vlan_id     = optional(number)
    firewall    = optional(bool, false)
    mac_address = optional(string)
  }))
}

variable "ipv4_config" {
  description = "Configuration de l'adresse IPv4 (CIDR et gateway)"
  type = object({
    address = string
    gateway = optional(string)
  })
  default = null
}

variable "user_data_template" {
  description = "Chemin vers le template cloud-init"
  type        = string
  default     = null
}

variable "user_data_vars" {
  description = "Variables pour le template cloud-init"
  type        = any
  default     = {}
}

variable "dns_servers" {
  description = "Liste des serveurs DNS à injecter dans resolv.conf via cloud-init"
  type        = list(string)
  default     = []
}

variable "snippet_datastore" {
  description = "Datastore pour les snippets"
  type        = string
  default     = "local"
}

variable "bios" {
  description = "Firmware de la VM (seabios ou ovmf). null = hérite du template cloné"
  type        = string
  default     = null
}

variable "machine" {
  description = "Type de machine QEMU (ex: q35). null = hérite du template cloné"
  type        = string
  default     = null
}

variable "disk_interface" {
  description = "Interface du disque principal — doit correspondre au disque du template cloné"
  type        = string
  default     = "virtio0"
}

variable "disk_iothread" {
  description = "Active iothread sur le disque (virtio/scsi uniquement — désactiver pour sata)"
  type        = bool
  default     = true
}

variable "enable_cloud_init" {
  description = "Génère le bloc initialization (cloud-init). Désactiver pour les templates sans cloud-init (ex: Windows, IP via DHCP)"
  type        = bool
  default     = true
}
