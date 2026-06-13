# ──────────────────────────────────────────────────────────────────────────────
# windows-sysprep.ps1 — Dernier provisioner du build Packer Windows 11 25H2
# ──────────────────────────────────────────────────────────────────────────────
# Ordre d'exécution :
#   1. Détection du lecteur CD virtio-win
#   2. Installation silencieuse de l'agent QEMU
#   3. Injection des pilotes VirtIO dans le driver store Windows
#   4. Installation + configuration d'OpenSSH Server (transport Ansible des clones)
#   5. Blocage du pare-feu WinRM (évite une reconnexion Packer pendant le shutdown)
#   6. Écriture du fichier unattend.xml pour Sysprep (OOBE sans interaction)
#   7. Lancement de Sysprep /generalize /shutdown → Packer convertit en template
#
# Variables d'environnement injectées par le provisioner Packer :
#   PACKER_BUILD_USERNAME / PACKER_BUILD_PASSWORD : compte local admin re-déclaré
#     dans l'unattend pour que les clones bootent sans OOBE interactive.
#   SSH_AUTHORIZED_KEY : clé publique SSH autorisée pour les administrateurs
#     (vide = authentification par mot de passe uniquement).
# ──────────────────────────────────────────────────────────────────────────────

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── 1. Détection du lecteur CD virtio-win ────────────────────────────────────
Write-Host "==> Recherche du lecteur CD virtio-win..."

$virtioDrive = $null

# On parcourt toutes les lettres de lecteur CD/DVD pour trouver l'ISO virtio-win
foreach ($drive in (Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name.Length -eq 1 })) {
    $drivePath = "$($drive.Name):"
    # L'ISO virtio-win contient toujours le dossier "guest-agent" à sa racine
    if (Test-Path "$drivePath\guest-agent\qemu-ga-x64.msi") {
        $virtioDrive = $drivePath
        break
    }
    # Deuxième indicateur : présence du MSI principal virtio-win-gt-x64
    if (Test-Path "$drivePath\virtio-win-gt-x64.msi") {
        $virtioDrive = $drivePath
        break
    }
}

if ($null -eq $virtioDrive) {
    Write-Error "ERREUR : Lecteur CD virtio-win introuvable. Vérifiez que l'ISO est bien montée."
    exit 1
}

Write-Host "==> Lecteur virtio-win détecté : $virtioDrive"

# ─── 2. Installation silencieuse de l'agent QEMU ─────────────────────────────
Write-Host "==> Installation de l'agent QEMU (qemu-ga-x64.msi)..."

$guestAgentMsi = "$virtioDrive\guest-agent\qemu-ga-x64.msi"

if (Test-Path $guestAgentMsi) {
    $proc = Start-Process -FilePath "msiexec.exe" `
        -ArgumentList "/i `"$guestAgentMsi`" /qn /norestart" `
        -Wait -PassThru
    if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
        Write-Warning "msiexec a retourné le code $($proc.ExitCode) — l'agent QEMU est peut-être déjà installé."
    }
    else {
        Write-Host "==> Agent QEMU installé avec succès (code $($proc.ExitCode))."
    }
}
else {
    Write-Warning "MSI agent QEMU introuvable à $guestAgentMsi — étape ignorée."
}

# ─── 3. Injection des pilotes VirtIO (uniquement Windows 11 / amd64) ──────────
# On NE balaie PAS tout le catalogue virtio-win ("$virtioDrive\*.inf" /subdirs) :
# l'ISO contient une variante de chaque pilote pour TOUTES les versions Windows
# (xp, 2k3, 2k8, w7, w8, w10, w11) et TOUTES les archis (amd64, x86, ARM64),
# soit ~328 paquets. C'est ce balayage qui faisait durer le build ~30 min, avec
# des centaines d'échecs parfaitement normaux (un pilote w7/x86 ne s'installe pas
# sur du Win11 amd64). On ne cible donc QUE les sous-dossiers "w11\amd64", les
# seuls pertinents pour ce template.
#
# On retire aussi /install : /add-driver suffit à *stager* les pilotes dans le
# driver store ; Windows les lie automatiquement quand le périphérique virtio
# apparaît (au boot d'un clone). /install ne sert qu'à poser le pilote sur un
# périphérique déjà présent — inutile pour un template destiné au clonage.
Write-Host "==> Injection des pilotes VirtIO (w11/amd64) dans le driver store..."

# Énumère les .inf des sous-dossiers "w11\amd64" de chaque pilote de l'ISO
# (ex : NetKVM\w11\amd64\netkvm.inf, vioscsi\w11\amd64\vioscsi.inf,
# vioserial\w11\amd64\vioser.inf — ce dernier fournit le canal de l'agent QEMU).
$infFiles = Get-ChildItem -Path $virtioDrive -Recurse -Filter '*.inf' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\w11\\amd64\\' }

if (-not $infFiles) {
    Write-Warning "Aucun pilote w11\amd64 trouvé sur $virtioDrive — étape ignorée."
}
else {
    foreach ($inf in $infFiles) {
        $pnpProc = Start-Process -FilePath "pnputil.exe" `
            -ArgumentList "/add-driver `"$($inf.FullName)`"" `
            -Wait -PassThru -NoNewWindow
        # 0 = succès, 259 = aucun nouveau pilote ; tout autre code → avertissement
        if ($pnpProc.ExitCode -notin @(0, 259)) {
            Write-Warning "pnputil ($($inf.Name)) a retourné le code $($pnpProc.ExitCode)."
        }
    }
    Write-Host "==> $($infFiles.Count) pilotes VirtIO (w11/amd64) injectés dans le driver store."
}

# ─── 4. Installation et configuration d'OpenSSH Server ───────────────────────
# OpenSSH est le transport Ansible des clones : contrairement à WinRM, il
# supporte le ProxyJump à travers le bastion WireGuard (comme les VMs Debian).
Write-Host "==> Installation d'OpenSSH Server..."

# Installation de la capacité Windows (Feature on Demand, téléchargée si besoin)
$sshCapability = Get-WindowsCapability -Online -Name 'OpenSSH.Server*' |
    Select-Object -First 1
if ($sshCapability.State -ne 'Installed') {
    Add-WindowsCapability -Online -Name $sshCapability.Name | Out-Null
}
Write-Host "==> OpenSSH Server installé ($($sshCapability.Name))."

# Démarrage automatique du service sshd sur les clones (la config des services
# survit à Sysprep /generalize, contrairement aux infos spécifiques machine).
Set-Service -Name sshd -StartupType Automatic
Start-Service -Name sshd

# PowerShell comme shell par défaut des sessions SSH — requis par Ansible
# (ansible_shell_type: powershell).
New-Item -Path 'HKLM:\SOFTWARE\OpenSSH' -Force | Out-Null
Set-ItemProperty -Path 'HKLM:\SOFTWARE\OpenSSH' -Name 'DefaultShell' `
    -Value "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"

# Clé publique autorisée pour les membres du groupe Administrateurs.
# Le fichier administrators_authorized_keys exige des ACL strictes
# (Administrateurs + SYSTEM uniquement), sinon sshd le rejette.
if (-not [string]::IsNullOrWhiteSpace($env:SSH_AUTHORIZED_KEY)) {
    $adminKeysPath = "$env:ProgramData\ssh\administrators_authorized_keys"
    Set-Content -Path $adminKeysPath -Value $env:SSH_AUTHORIZED_KEY -Encoding ascii
    # SDDL : SYSTEM et Administrateurs en contrôle total, héritage désactivé
    icacls $adminKeysPath /inheritance:r /grant 'SYSTEM:F' /grant '*S-1-5-32-544:F' | Out-Null
    Write-Host "==> Clé SSH administrateur déployée dans $adminKeysPath"
}
else {
    Write-Host "==> Pas de clé SSH fournie — authentification par mot de passe."
}

# La règle pare-feu OpenSSH-Server-In-TCP est créée par la capacité ; on la
# force sur tous les profils car un clone fraîchement sysprepé classe son
# réseau en profil Public.
New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' `
    -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 `
    -Profile Any -ErrorAction SilentlyContinue | Out-Null
Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -Enabled True -Profile Any
Write-Host "==> Règle pare-feu OpenSSH activée (TCP/22, tous profils)."

# ─── 5. Blocage du pare-feu WinRM avant Sysprep ──────────────────────────────
# On désactive les règles WinRM entrantes pour éviter que Packer tente de
# se reconnecter pendant que Sysprep éteint la machine (ce qui causerait une
# erreur de build).
Write-Host "==> Désactivation des règles pare-feu WinRM..."

try {
    Disable-NetFirewallRule -DisplayGroup 'Windows Remote Management' -ErrorAction SilentlyContinue
    Write-Host "==> Règles WinRM désactivées."
}
catch {
    # Tolérance : si la règle n'existe pas ou est déjà désactivée, on continue
    Write-Warning "Impossible de désactiver les règles WinRM : $_"
}

# ─── 6. Écriture du fichier unattend.xml pour Sysprep ────────────────────────
# L'unattend permet aux clones de terminer l'OOBE sans aucune interaction :
# paramètres régionaux français, écrans OOBE masqués, et re-déclaration du
# compte local d'administration (le compte survit au generalize ; sa présence
# dans l'unattend garantit que l'OOBE saute l'écran de création de compte et
# l'exigence de compte Microsoft).
Write-Host "==> Écriture du fichier unattend.xml Sysprep..."

$sysprepUnattendPath = "$env:WINDIR\System32\Sysprep\unattend.xml"

# Here-string expansible : injecte le compte/mot de passe passés par Packer
$sysprepUnattendContent = @"
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
  <settings pass="oobeSystem">
    <component name="Microsoft-Windows-International-Core"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <!-- Paramètres régionaux français pour l'OOBE post-sysprep -->
      <InputLocale>040c:0000040c</InputLocale>
      <SystemLocale>fr-FR</SystemLocale>
      <UILanguage>fr-FR</UILanguage>
      <UserLocale>fr-FR</UserLocale>
    </component>
    <component name="Microsoft-Windows-Shell-Setup"
               processorArchitecture="amd64"
               publicKeyToken="31bf3856ad364e35"
               language="neutral"
               versionScope="nonSxS"
               xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
      <OOBE>
        <!-- Masquer tous les écrans OOBE pour un boot clone sans interaction -->
        <HideEULAPage>true</HideEULAPage>
        <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
        <ProtectYourPC>3</ProtectYourPC>
        <NetworkLocation>Work</NetworkLocation>
      </OOBE>
      <UserAccounts>
        <LocalAccounts>
          <!-- Re-déclaration du compte d'administration local : évite l'écran
               de création de compte OOBE et fixe le mot de passe du clone -->
          <LocalAccount wcm:action="add">
            <Name>$($env:PACKER_BUILD_USERNAME)</Name>
            <DisplayName>$($env:PACKER_BUILD_USERNAME)</DisplayName>
            <Group>Administrators</Group>
            <Password>
              <Value>$($env:PACKER_BUILD_PASSWORD)</Value>
              <PlainText>true</PlainText>
            </Password>
          </LocalAccount>
        </LocalAccounts>
      </UserAccounts>
    </component>
  </settings>
</unattend>
"@

Set-Content -Path $sysprepUnattendPath -Value $sysprepUnattendContent -Encoding UTF8
Write-Host "==> Fichier Sysprep unattend.xml écrit dans $sysprepUnattendPath"

# ─── 7. Lancement de Sysprep ─────────────────────────────────────────────────
# /generalize : supprime les informations spécifiques à la machine (SID, drivers HW)
# /oobe       : au prochain démarrage, Windows lance l'OOBE
# /shutdown   : éteint la VM → Packer détecte l'arrêt et convertit en template
Write-Host "==> Lancement de Sysprep /generalize /oobe /shutdown..."

$sysprepExe = "$env:WINDIR\System32\Sysprep\sysprep.exe"
& $sysprepExe /generalize /oobe /shutdown /unattend:"$sysprepUnattendPath"

# Note : Sysprep éteint la machine — la suite du script ne s'exécutera pas.
# C'est le comportement attendu ; Packer attend l'arrêt de la VM pour créer
# le template Proxmox.
