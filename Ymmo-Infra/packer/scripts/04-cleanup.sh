#!/bin/bash
set -euo pipefail

echo ">>> Nettoyage final et scellage du template..."

# Arrêt des services (si présents) pour un nettoyage propre des logs
sudo systemctl stop rsyslog 2>/dev/null || true
sudo systemctl stop systemd-journald 2>/dev/null || true

# Purge des logs
sudo find /var/log -type f -exec truncate -s 0 {} \;

# Réinitialisation du machine-id (CRUCIAL pour éviter les doublons d'IP DHCP)
sudo truncate -s 0 /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo ln -sf /etc/machine-id /var/lib/dbus/machine-id

# Suppression des clés d'hôte SSH (régénérées par cloud-init au premier boot)
sudo rm -f /etc/ssh/ssh_host_*

# Nettoyage du cache APT
sudo apt-get autoremove -y
sudo apt-get clean

# Suppression des fichiers temporaires
sudo rm -rf /tmp/* /var/tmp/*

# Nettoyage de l'historique du shell (Packer et Root)
history -c
cat /dev/null > ~/.bash_history
sudo truncate -s 0 /root/.bash_history 2>/dev/null || true

echo ">>> Template scelle et pret."
