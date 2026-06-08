# ──────────────────────────────────────────────────────────────────────────────
# windows-sysprep.ps1 — Dernier provisioner du build Packer Windows 11 25H2
# ──────────────────────────────────────────────────────────────────────────────
# Ordre d'exécution :
#   1. Détection du lecteur CD virtio-win
#   2. Installation silencieuse de l'agent QEMU
#   3. Injection des pilotes VirtIO dans le driver store Windows
#   4. Blocage du pare-feu WinRM (évite une reconnexion Packer pendant le shutdown)
#   5. Écriture du fichier unattend.xml minimal pour Sysprep
#   6. Lancement de Sysprep /generalize /shutdown → Packer convertit en template
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

# ─── 3. Injection des pilotes VirtIO dans le driver store ────────────────────
# pnputil pré-installe les pilotes dans le store Windows so qu'ils s'activent
# automatiquement quand les périphériques virtio apparaissent sur un clone.
Write-Host "==> Injection des pilotes VirtIO dans le driver store..."

$pnputilArgs = "/add-driver `"$virtioDrive\*.inf`" /subdirs /install"
$pnpProc = Start-Process -FilePath "pnputil.exe" `
    -ArgumentList $pnputilArgs `
    -Wait -PassThru -NoNewWindow

# pnputil retourne 0 (succès) ou 259 (aucun nouveau pilote) — les deux sont OK
if ($pnpProc.ExitCode -notin @(0, 259)) {
    Write-Warning "pnputil a retourné le code $($pnpProc.ExitCode) — certains pilotes n'ont peut-être pas été injectés."
}
else {
    Write-Host "==> Pilotes VirtIO injectés (code $($pnpProc.ExitCode))."
}

# ─── 4. Blocage du pare-feu WinRM avant Sysprep ──────────────────────────────
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

# ─── 5. Écriture du fichier unattend.xml pour Sysprep ────────────────────────
# Fichier minimal pour que la VM généralisée démarre directement sur l'OOBE
# avec les paramètres régionaux français, sans demander de configuration
# supplémentaire à l'utilisateur final.
Write-Host "==> Écriture du fichier unattend.xml Sysprep..."

$sysprepUnattendPath = "$env:WINDIR\System32\Sysprep\unattend.xml"

$sysprepUnattendContent = @'
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
        <!-- Masquer les écrans superflus pour un démarrage OOBE propre -->
        <HideEULAPage>true</HideEULAPage>
        <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
        <ProtectYourPC>3</ProtectYourPC>
        <NetworkLocation>Work</NetworkLocation>
      </OOBE>
    </component>
  </settings>
</unattend>
'@

Set-Content -Path $sysprepUnattendPath -Value $sysprepUnattendContent -Encoding UTF8
Write-Host "==> Fichier Sysprep unattend.xml écrit dans $sysprepUnattendPath"

# ─── 6. Lancement de Sysprep ─────────────────────────────────────────────────
# /generalize : supprime les informations spécifiques à la machine (SID, drivers HW)
# /oobe       : au prochain démarrage, Windows lance l'OOBE
# /shutdown   : éteint la VM → Packer détecte l'arrêt et convertit en template
Write-Host "==> Lancement de Sysprep /generalize /oobe /shutdown..."

$sysprepExe = "$env:WINDIR\System32\Sysprep\sysprep.exe"
& $sysprepExe /generalize /oobe /shutdown /unattend:"$sysprepUnattendPath"

# Note : Sysprep éteint la machine — la suite du script ne s'exécutera pas.
# C'est le comportement attendu ; Packer attend l'arrêt de la VM pour créer
# le template Proxmox.
