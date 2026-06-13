# Windows Client — Jonction au domaine Active Directory

Rôle Ansible `windows_client` : configure les postes Windows 11 (clone du template Packer `9002`) et les **joint au domaine** `YMMO.LAN` servi par le DC Samba4.

Cible : VMs taguées `client` dans l'inventaire dynamique Proxmox (groupe `tag_client`). VM de référence : `CLI01-Siege`, VLAN USR_SIEGE (VLAN 20).

---

## Vue d'ensemble

Le poste est cloné par Terraform (`terraform/zone-clients.tf`, module `client01_siege`) depuis le template Windows 11 `9002`. Ce rôle prend le relais : DNS vers le DC → renommage → jonction AD → tests post-jonction.

**Transport : SSH (OpenSSH), pas WinRM.** Le template embarque OpenSSH Server (installé par `windows-sysprep.ps1`, voir [packer-windows](../packer/packer-windows.md)). SSH est choisi car — contrairement à WinRM — il supporte le **ProxyJump** à travers le bastion WireGuard, comme les VMs Debian. Les sessions ouvrent un **PowerShell** (`DefaultShell` du template), requis par les modules `ansible.windows` / `microsoft.ad`.

---

## Prérequis

1. **Template Windows avec OpenSSH** — le template `9002` doit avoir été construit *après* l'ajout de la section OpenSSH au provisioner. Sinon le clone n'a pas de `sshd` → `:22` en timeout. En cas de doute, reconstruire (`./ymmo.sh packer build windows`) puis recloner.
2. **DHCP OPNsense actif** — le clone n'a pas de cloud-init : son IP (VLAN 20, `10.0.20.x`) est servie par OPNsense. D'où le phasage du `full-deploy` (`deploy_clients=false` tant que le DHCP n'est pas prêt). L'IP **flotte** (pas de réservation) → l'inventaire la récupère dynamiquement via l'agent QEMU.
3. **Samba4 déployé** — DC `10.0.10.1` opérationnel ([samba4](samba4.md)).
4. **Collections** : `ansible.windows` et `microsoft.ad` (dans `ansible/collections/requirements.yml`).
5. **Vault** : `vault_samba4_admin_password` (réutilisé comme mot de passe admin du domaine).
6. **Tag Proxmox** : `client` (+ `ymmotom`).

---

## Transport (group_vars/tag_client)

```yaml
ansible_user: packer                 # compte admin local du template
ansible_shell_type: powershell       # sessions SSH Windows = PowerShell
ansible_ssh_common_args: >-
  -o ProxyJump=sysadmin@{{ hostvars[groups['tag_bastion'][0]]['ansible_host'] }}
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
```

`StrictHostKeyChecking=no` + `UserKnownHostsFile=/dev/null` : évite le blocage sur la clé d'hôte qui change à chaque rebuild/clone.

---

## Exécution

```bash
./ymmo.sh ansible windows          # joue windows_client.yml
# ou, dans la chaîne complète (terraform + ansible) :
./ymmo.sh full-deploy              # Phase 4 = jonction du client
```

Le playbook `windows_client.yml` cible `hosts: tag_client`, `gather_facts: false`, `become: false` (le compte `packer` est déjà admin local).

---

## Séquence de tâches

### `00_assert.yml`

1. **`wait_for_connection`** (timeout `windows_client_boot_timeout`, 900 s) : attend que le clone termine son premier boot OOBE/sysprep et que `sshd` réponde. Indispensable : un clone fraîchement créé peut être injoignable plusieurs minutes.
2. Assertion : `windows_client_domain_password` non vide (vault déchiffré).

### `10_dns.yml`

Pointe le DNS de **tous** les adaptateurs vers le DC (`win_dns_client`). Indispensable à la jonction : les enregistrements SRV (`_ldap._tcp.ymmo.lan`) doivent être résolus par le DC Samba, pas par OPNsense. Vérifie ensuite la résolution (`nslookup`).

### `20_join.yml`

1. **Renommage** (`win_hostname`) vers le nom NetBIOS — *avant* la jonction, pour éviter un double reboot et un objet ordinateur AD au mauvais nom.
2. Reboot si nécessaire.
3. **Jonction** (`microsoft.ad.membership`, `state: domain`, `reboot: true`) avec le compte admin du domaine.

### `99_smoke.yml`

| Test | Commande | Vérifie |
|---|---|---|
| Localisation DC | `nltest /dsgetdc:ymmo.lan` | Le client trouve un DC |
| Canal sécurisé | `Test-ComputerSecureChannel` | Le canal NETLOGON machine↔DC est sain (`failed_when` si ≠ True) |

---

## Variables

| Variable | Valeur par défaut | Source | Description |
|---|---|---|---|
| `windows_client_domain` | `ymmo.lan` | defaults / `group_vars/tag_client` | Domaine AD à rejoindre |
| `windows_client_dc_ip` | `10.0.10.1` | defaults / `group_vars/tag_client` | IP du DC (serveur DNS du client) |
| `windows_client_domain_admin` | `Administrator@YMMO.LAN` | defaults / `group_vars/tag_client` | Compte admin du domaine (UPN) |
| `windows_client_domain_password` | `""` | `group_vars/tag_client` (vault) | Mot de passe admin domaine — `{{ vault_samba4_admin_password }}` |
| `windows_client_hostname` | `{{ inventory_hostname \| upper \| truncate(15) }}` | defaults | Nom NetBIOS (≤ 15 car.) |
| `windows_client_boot_timeout` | `900` | defaults | Délai max (s) du premier boot OOBE |

---

## Tester une ouverture de session avec un compte de domaine

1. Créer le compte côté DC via Ansible (idempotent) — voir [samba4 § `50_users`](samba4.md) (`samba4_domain_users`). Compte de test fourni : `testuser` / `Test@Ymmo2026!`.
2. Se connecter au client (IP courante donnée par l'agent QEMU, ex. `10.0.20.156`) :

```bash
# SSH en tant qu'utilisateur du domaine (OpenSSH prend le dernier @ comme séparateur d'hôte)
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -J sysadmin@<bastion> testuser@ymmo.lan@10.0.20.156
```

Ou via la **console Proxmox (noVNC)** : « Autre utilisateur » → `YMMO\testuser` (ou le compte local `packer` / `winrm_password` de `variables.pkrvars.hcl`).

Une fois connecté : `whoami` → `ymmo\testuser`, `whoami /groups`.

---

## Diagnostic via l'agent QEMU (sans SSH)

Quand SSH ne répond pas, on inspecte le clone **via l'agent QEMU exposé par l'API Proxmox** — pas besoin de réseau ni de `sshd`. Voir le détail dans la mémoire projet `qemu-agent-windows-diagnostic`. Exemples utiles (PowerShell exécuté dans la VM) :

```powershell
Test-Path $env:WINDIR\System32\OpenSSH\sshd.exe          # OpenSSH installé ?
(Get-CimInstance Win32_ComputerSystem).PartOfDomain      # jonction AD ?
Test-ComputerSecureChannel                               # canal sécurisé
# Authentifier un compte domaine sans login interactif :
Add-Type -AssemblyName System.DirectoryServices.AccountManagement
$ctx = New-Object System.DirectoryServices.AccountManagement.PrincipalContext('Domain','ymmo.lan')
$ctx.ValidateCredentials('testuser','Test@Ymmo2026!')    # True = OK
```

L'IP réelle du clone (DHCP) : `GET /api2/json/nodes/<node>/qemu/<vmid>/agent/network-get-interfaces`.

---

## Troubleshooting

**`:22` en timeout (le clone ne répond pas en SSH)**
- L'agent QEMU montre `OpenSSH.Server = NotPresent` → le template a été construit avant l'ajout d'OpenSSH → reconstruire + recloner.
- Sinon, le clone boote encore (OOBE/sysprep, plusieurs minutes) → attendre, `wait_for_connection` s'en charge.
- `ping` KO n'est **pas** un symptôme : Windows bloque l'ICMP echo par défaut en profil Public.

**Ansible cible la mauvaise IP**
L'IP est en DHCP et flotte. L'inventaire la résout via l'agent (`Ethernet`/`Ethernet 2`). Vérifier l'IP courante côté Proxmox (agent) avant de débugguer une « mauvaise IP ».

**La jonction échoue (résolution SRV)**
Vérifier que le DNS du client pointe bien sur le DC (`10.0.10.1`), pas sur OPNsense — c'est le rôle de `10_dns.yml`.

**Depuis le bastion, tester le chemin réseau**
```bash
ssh sysadmin@<bastion> "nc -vz <ip-client> 22"   # refused/bannière = côté Windows ; timeout = filtrage
```

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `ansible/playbooks/windows_client.yml` | Playbook (cible `tag_client`, SSH/PowerShell) |
| `ansible/roles/windows_client/tasks/00_assert.yml` | `wait_for_connection` + assertion mot de passe |
| `ansible/roles/windows_client/tasks/10_dns.yml` | DNS du client vers le DC |
| `ansible/roles/windows_client/tasks/20_join.yml` | Renommage + jonction AD (`microsoft.ad.membership`) |
| `ansible/roles/windows_client/tasks/99_smoke.yml` | Tests post-jonction (nltest, canal sécurisé) |
| `ansible/roles/windows_client/defaults/main.yml` | Domaine, DC, compte admin, hostname, timeout |
| `ansible/inventory/group_vars/tag_client/main.yml` | Transport SSH (packer, PowerShell, ProxyJump) + vars domaine |
| `terraform/zone-clients.tf` | Clone du template `9002` (module `client01_siege`) |
