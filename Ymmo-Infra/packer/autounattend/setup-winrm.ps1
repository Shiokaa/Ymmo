# Configuration WinRM pour le build Packer.
# Approche HTTPS : sur cette image Windows, AllowUnencrypted est verrouille par
# une policy, donc Basic sur HTTP (5985) est impossible. On monte un listener
# HTTPS (5986) : le canal est chiffre par TLS, ce qui autorise Basic sans
# AllowUnencrypted et evite le durcissement NTLM mal supporte par la lib Go de
# Packer (erreur "401 invalid content type").
$ErrorActionPreference = 'Stop'

# Autorise les comptes admin LOCAUX a s'authentifier a distance (sinon le jeton
# est filtre par l'UAC et l'auth WinRM echoue).
New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' `
  -Name LocalAccountTokenFilterPolicy -Value 1 -PropertyType DWord -Force | Out-Null

# Force le profil reseau en Private : en Public, la regle pare-feu WinRM est
# restreinte au sous-reseau local et Packer (hors sous-reseau) se fait jeter.
Get-NetConnectionProfile | ForEach-Object {
  Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private -ErrorAction SilentlyContinue
}

# Active WinRM et l'auth Basic (utilisee par Packer, ici par-dessus TLS).
Enable-PSRemoting -Force -SkipNetworkProfileCheck
Set-Item WSMan:\localhost\Service\Auth\Basic -Value $true -Force

# Certificat auto-signe + listener HTTPS sur 5986.
$cert = New-SelfSignedCertificate -DnsName $env:COMPUTERNAME -CertStoreLocation Cert:\LocalMachine\My
Get-ChildItem WSMan:\localhost\Listener | Where-Object { $_.Keys -contains 'Transport=HTTPS' } |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
New-Item -Path WSMan:\localhost\Listener -Transport HTTPS -Address * `
  -CertificateThumbPrint $cert.Thumbprint -Force | Out-Null

# Ouvre le port HTTPS WinRM sur tous les profils pare-feu.
New-NetFirewallRule -DisplayName 'WinRM-HTTPS-5986' -Direction Inbound -Protocol TCP `
  -LocalPort 5986 -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null

Restart-Service WinRM
