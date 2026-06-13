# ──────────────────────────────────────────────
# Variables Packer - Windows 11 25H2
# ──────────────────────────────────────────────

# Les variables proxmox_api_*, vm_storage_pool et vm_bridge sont héritées
# de variables.pkr.hcl — ne pas les redéfinir ici.
# On définit uniquement ce qui est spécifique au build Windows 11.

variable "windows_template_name" {
  type        = string
  default     = "windows-11-25h2-template"
  description = "Nom du template Windows 11 généré dans Proxmox"
}

variable "windows_vm_id" {
  type        = number
  default     = 9002
  description = "ID de la VM Proxmox (utiliser un nombre élevé pour éviter les conflits)"
}

variable "windows_iso_file" {
  type        = string
  description = "Chemin vers l'ISO Windows 11 25H2 sur Proxmox (ex: local:iso/Win11_25H2_French_x64_v2.iso)"
}

variable "virtio_iso_file" {
  type        = string
  description = "Chemin vers l'ISO virtio-win sur Proxmox (ex: local:iso/virtio-win-0.1.285.iso)"
}

variable "windows_vm_cores" {
  type        = number
  default     = 4
  description = "Nombre de cœurs CPU alloués à la VM de build"
}

variable "windows_vm_memory" {
  type        = number
  default     = 8192
  description = "Quantité de RAM en Mo allouée à la VM de build"
}

variable "windows_vm_disk_size" {
  type        = string
  default     = "64G"
  description = "Taille du disque principal de la VM de build"
}

variable "windows_efi_storage_pool" {
  type        = string
  default     = "local-lvm"
  description = "Pool de stockage Proxmox pour le disque EFI (OVMF/SecureBoot)"
}

variable "windows_tpm_storage_pool" {
  type        = string
  default     = "local-lvm"
  description = "Pool de stockage Proxmox pour l'état du TPM 2.0"
}

variable "autounattend_iso_file" {
  type        = string
  description = "Chemin Proxmox vers l'ISO Autounattend pré-construite (ex: Backup-Node1:iso/autounattend.iso). Générer avec : xorriso -as mkisofs -J -r -V AUTOUNATTEND -o autounattend.iso autounattend/"
}

variable "winrm_username" {
  type        = string
  default     = "packer"
  description = "Nom d'utilisateur WinRM utilisé par Packer pour se connecter pendant le build"
}

variable "winrm_password" {
  type        = string
  sensitive   = true
  description = "Mot de passe WinRM — doit correspondre au compte créé dans Autounattend.xml"
}

variable "windows_ssh_authorized_key" {
  type        = string
  default     = ""
  description = "Clé publique SSH autorisée pour les administrateurs des clones (transport Ansible). Vide = authentification par mot de passe uniquement."
}
