#!/bin/bash
set -euo pipefail

echo ">>> Application du durcissement (Hardening) de sécurité..."

# 1. Sécurisation SSH (Basique)
# Le login Root est déjà désactivé via le preseed, on l'explicite ici.
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
# Note : On garde l'authentification par mot de passe ACTIVE pour que Packer puisse finir,
# elle devra être désactivée par Cloud-init ou Ansible en production.

# 2. Durcissement du Noyau (sysctl)
sudo tee /etc/sysctl.d/99-hardened.conf > /dev/null <<EOF
# Protection contre l'IP Spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignorer les requêtes de broadcast ICMP
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Désactiver le routage par la source
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Ignorer l'envoi de redirections
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Blocage des attaques SYN
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Log des paquets "Martiens"
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
EOF

# 3. Pare-feu (UFW) - Autorise uniquement le SSH par défaut
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw --force enable

# 4. Configuration des mises à jour automatiques
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Origins-Pattern {
        "origin=Debian,codename=\${distro_codename},label=Debian";
        "origin=Debian,codename=\${distro_codename},label=Debian-Security";
        "origin=Debian,codename=\${distro_codename}-security,label=Debian-Security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

echo "Unattended-Upgrade::Automatic-Reboot \"false\";" | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades
