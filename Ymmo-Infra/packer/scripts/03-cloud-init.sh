#!/bin/bash
set -euo pipefail

echo ">>> Préparation de cloud-init pour Proxmox..."

# Configuration de cloud-init pour utiliser la source NoCloud (Standard Proxmox)
sudo tee /etc/cloud/cloud.cfg.d/99-proxmox.cfg > /dev/null <<EOF
datasource_list: [ NoCloud, ConfigDrive, None ]
EOF

# S'assurer que cloud-init est activé
sudo systemctl enable cloud-init
