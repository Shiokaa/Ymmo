# Samba4 — Active Directory Domain Controller

Rôle Ansible configurant Samba4 en mode AD DC sur la VM `Samba4-DC1` (Debian 12, VLAN SRV_SIEGE, IP `10.0.10.1`).

---

## Vue d'ensemble

Samba4 est la brique d'authentification centralisée de l'infrastructure Ymmo : annuaire LDAP, Kerberos, GPO compatibles Windows et Linux. Le realm est `YMMO.LAN`, le domaine NetBIOS `YMMO`.

La VM est provisionnée par Terraform (`terraform/zone-infra.tf`, module `samba4_dc1`). Ce rôle prend le relais après le provisionnement cloud-init.

---

## Prérequis

### 1. Connectivité réseau : internet via OPNsense NAT

Le rôle installe des paquets `apt` (`samba-ad-dc`, `krb5-config`, `dnsutils`, `smbclient`). La VM `10.0.10.1` n'a pas d'accès internet direct — elle passe par OPNsense comme passerelle sur `10.0.10.254`.

OPNsense est configuré avec une règle NAT outbound hybrid baked dans le template Packer. Si OPNsense n'est pas en service ou si la règle NAT est absente, l'étape `apt install` échoue. Vérifier avant d'exécuter le playbook :

```bash
# Depuis la VM (via ProxyJump) — doit retourner une réponse HTTP 200
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 "curl -s -o /dev/null -w '%{http_code}' http://deb.debian.org"
```

### 2. Connectivité SSH : ProxyJump via le Bastion

La VM `10.0.10.1` est sur le VLAN SRV_SIEGE, inaccessible directement depuis le control node. Ansible y accède via ProxyJump à travers le bastion (`192.168.10.43`), comme défini dans `group_vars/tag_samba4/main.yml` :

```yaml
ansible_ssh_common_args: >-
  -o ProxyJump=sysadmin@{{ hostvars[groups['tag_bastion'][0]]['ansible_host'] }}
  -o ForwardAgent=yes
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
```

Le tunnel WireGuard du bastion doit être actif. Vérifier avant tout :

```bash
ssh sysadmin@192.168.10.43 "sudo wg show"
# La sortie doit afficher le peer OPNsense avec un "latest handshake" récent
```

### 3. VM démarrée et cloud-init terminé

La VM doit avoir un hostname configuré, l'utilisateur `sysadmin` créé, et l'IP statique `10.0.10.1/24` assignée sur l'interface VLAN 10. Vérifier le démarrage dans l'interface Proxmox ou via :

```bash
ansible -i ansible/inventory/ tag_samba4 -m ping --ask-vault-pass
```

### 4. Tag Proxmox

La VM doit porter le tag `samba4` (et `ymmotom`) pour apparaître dans l'inventaire dynamique sous le groupe `tag_samba4`.

### 5. Vault Ansible

Le mot de passe de l'administrateur AD doit être défini dans `group_vars/all/vault.yml` avant d'exécuter le playbook :

```bash
ansible-vault edit ansible/inventory/group_vars/all/vault.yml
```

Ajouter :

```yaml
vault_samba4_admin_password: "<mot de passe fort>"
```

Le mot de passe doit satisfaire la politique Active Directory et les assertions du rôle :
- Minimum 14 caractères
- Au moins une majuscule, une minuscule, un chiffre, un caractère spécial

Il est exposé au rôle via `group_vars/tag_samba4/main.yml` :

```yaml
samba4_admin_password: "{{ vault_samba4_admin_password }}"
```

---

## Exécution

```bash
# Depuis la racine du projet, venv activé et .env sourcé
ansible-playbook ansible/playbooks/samba4.yml --ask-vault-pass
```

Le playbook cible `hosts: tag_samba4` avec `become: true` et `gather_facts: false` (aucun `ansible_*` n'est consommé dans le rôle).

---

## Séquence de tâches

### `00_assert.yml` — Validation des prérequis

Vérifie les variables avant toute action destructive. Les assertions suivantes doivent passer :

| Assertion | Règle de validation |
|-----------|-------------------|
| `samba4_realm` | Défini, FQDN en MAJUSCULES (`^[A-Z0-9][A-Z0-9.-]*[A-Z0-9]$`) |
| `samba4_domain` | Défini, MAJUSCULES alphanumériques, 15 caractères max (`^[A-Z0-9-]{1,15}$`) |
| `samba4_dc_ip` | Défini, format IPv4 valide |
| `samba4_admin_password` | Défini, 14 chars min, majuscule + minuscule + chiffre + caractère spécial |

La dernière assertion est protégée par `no_log: true` — le mot de passe n'apparaît jamais dans les logs Ansible.

### `10_install.yml` — Installation des paquets

```
apt update
apt install samba-ad-dc krb5-config dnsutils smbclient
```

- `samba-ad-dc` : métapackage Debian 12 qui installe `samba`, `samba-dsdb-modules` et `winbind`
- `krb5-config` : configuration Kerberos — remplacée après provisionnement, les réponses aux prompts interactifs sont ignorées (`DEBIAN_FRONTEND=noninteractive`)
- `dnsutils` : outils de diagnostic DNS (`host`, `dig`, `nslookup`)
- `smbclient` : client SMB pour les tests de fumée

### `20_provision.yml` — Provisionnement du domaine AD

**Idempotence** : la présence de `/var/lib/samba/private/sam.ldb` est vérifiée en premier. Si le fichier existe, `samba-tool domain provision` n'est pas relancé — toutes les tâches conditionnées par `when: not samba4_sam_db_stat.stat.exists` sont sautées.

Séquence si le domaine n'est pas encore provisionné :

1. Configure le hostname court du DC (`dc1`)
2. Ajoute l'entrée dans `/etc/hosts` :
   ```
   10.0.10.1 dc1.ymmo.lan dc1
   ```
3. Supprime `/etc/samba/smb.conf` par défaut (requis par `samba-tool`)
4. Lance le provisionnement :
   ```bash
   samba-tool domain provision \
     --use-rfc2307 \
     --dns-backend=SAMBA_INTERNAL \
     --realm=YMMO.LAN \
     --domain=YMMO \
     --server-role=dc \
     --host-ip=10.0.10.1 \
     --adminpass-fd=0
   ```
   Le mot de passe est passé via `stdin` (`--adminpass-fd=0`) pour ne pas l'exposer dans `/proc/<pid>/cmdline`. La tâche est protégée par `no_log: true`.

### `30_config.yml` — Configuration post-provisionnement

1. Copie `/var/lib/samba/private/krb5.conf` vers `/etc/krb5.conf` (copie physique, pas un lien symbolique — voir la section Points d'attention)
2. Ajoute le DNS forwarder dans `smb.conf` :
   ```ini
   [global]
       dns forwarder = 10.0.10.254
   ```
   Notifie le handler `Restart samba-ad-dc` si le fichier est modifié.
3. Désactive et masque `systemd-resolved` (`state: stopped`, `enabled: false`, `masked: true`)
4. Supprime `/etc/resolv.conf` (qui est un lien symbolique géré par `systemd-resolved`)
5. Crée un nouveau `/etc/resolv.conf` pointant sur `127.0.0.1` :
   ```
   search ymmo.lan
   nameserver 127.0.0.1
   ```

### `40_service.yml` — Gestion des services systemd

Masque les services incompatibles avec le mode AD DC (`smbd`, `nmbd`, `winbind`) — ils doivent être masqués (pas seulement désactivés) car `samba-ad-dc` démarre ses propres instances de ces démons en sous-processus. Les lancer en parallèle via systemd provoquerait des conflits de ports.

Active et démarre `samba-ad-dc` avec `daemon_reload: true`.

### `99_smoke.yml` — Tests de fumée post-configuration

| Test | Commande | Ce qu'il vérifie |
|------|----------|-----------------|
| Info domaine | `samba-tool domain info 127.0.0.1` | Le DC répond, le domaine est reconnu |
| DNS realm | `host -t A ymmo.lan 127.0.0.1` | Le DNS interne Samba résout le realm |
| DNS DC | `host -t A dc1.ymmo.lan 127.0.0.1` | L'enregistrement A du DC est présent |
| Utilisateurs | `samba-tool user list` | Le compte Administrator est présent dans le domaine |

Toutes les tâches sont `changed_when: false`. Un `assert` final vérifie la présence de `Administrator` dans la sortie de `samba-tool user list`.

---

## Variables

Toutes les variables sont définies dans `ansible/inventory/group_vars/tag_samba4/main.yml` et peuvent être surchargées en `host_vars` ou via `--extra-vars`.

| Variable | Valeur | Source | Description |
|----------|--------|--------|-------------|
| `ansible_user` | `sysadmin` | `group_vars/tag_samba4` | Utilisateur SSH — root désactivé par Packer |
| `ansible_become_timeout` | `30` | `group_vars/tag_samba4` | Timeout sudo élevé — ProxyJump ajoute ~3s par connexion |
| `ansible_ssh_common_args` | `-o ProxyJump=...` | `group_vars/tag_samba4` | Chaîne SSH complète avec ProxyJump via bastion |
| `samba4_realm` | `YMMO.LAN` | `group_vars/tag_samba4` | Realm Kerberos — MAJUSCULES, FQDN |
| `samba4_domain` | `YMMO` | `group_vars/tag_samba4` | Nom NetBIOS — MAJUSCULES, 15 chars max |
| `samba4_dc_fqdn` | `dc1.ymmo.lan` | `group_vars/tag_samba4` | FQDN complet du DC |
| `samba4_dc_ip` | `10.0.10.1` | `group_vars/tag_samba4` | IP statique du DC (VLAN SRV_SIEGE) |
| `samba4_dns_forwarder` | `10.0.10.254` | `group_vars/tag_samba4` | Passerelle OPNsense — résolution DNS externe |
| `samba4_admin_password` | `{{ vault_samba4_admin_password }}` | `group_vars/tag_samba4` | Mot de passe Administrator — chargé depuis le vault |
| `samba4_smb_conf` | `/etc/samba/smb.conf` | `defaults/main.yml` | Chemin de smb.conf |
| `samba4_sam_db` | `/var/lib/samba/private/sam.ldb` | `defaults/main.yml` | Marqueur d'idempotence du provisionnement |

---

## Architecture réseau du DC

```
VLAN 10 — SRV_SIEGE (10.0.10.0/24)
  |--- 10.0.10.1    Samba4-DC1  (ce rôle)
  |--- 10.0.10.2    réservé
  |--- 10.0.10.254  OPNsense    (passerelle + DNS forwarder + NAT outbound)

Accès depuis le control node :
  Control node -> Bastion (192.168.10.43) -> wg0 -> OPNsense -> VLAN 10 -> 10.0.10.1
```

Le DNS interne de Samba (`SAMBA_INTERNAL`) écoute sur `127.0.0.1:53`. Les requêtes que Samba ne peut pas résoudre (noms externes) sont forwardées vers OPNsense (`10.0.10.254`), qui utilise Unbound pour la résolution externe.

---

## Handlers

Un seul handler est défini dans `roles/samba4/handlers/main.yml` :

```yaml
- name: Restart samba-ad-dc
  ansible.builtin.service:
    name: samba-ad-dc
    state: restarted
```

Il est notifié par la tâche d'ajout du DNS forwarder dans `smb.conf` (`30_config.yml`). Le handler s'exécute en fin de play, après que `40_service.yml` a démarré `samba-ad-dc`. Si `samba-ad-dc` n'est pas encore démarré au moment de la notification, le handler le redémarre quand même (`state: restarted` démarre le service s'il est arrêté).

---

## Points d'attention

### Internet obligatoire pour apt install

L'étape `10_install.yml` requiert un accès internet. Si OPNsense est arrêté ou si la règle NAT outbound est absente (template Packer non appliqué), `apt install` échoue avec `Could not resolve host: deb.debian.org`. Vérifier la règle NAT sur OPNsense avant d'exécuter le playbook.

### Services systemd maskés

`smbd`, `nmbd` et `winbind` sont masqués, pas seulement désactivés. `systemctl unmask smbd` puis `systemctl start smbd` en parallèle de `samba-ad-dc` provoquerait des conflits de ports sur TCP 445/139 et casserait le DC. Ne pas tenter de les démarrer manuellement.

### DNS : dépendance circulaire au service

Après provisionnement, `/etc/resolv.conf` pointe uniquement sur `127.0.0.1`. Si `samba-ad-dc` est arrêté, le DC ne peut plus résoudre son propre FQDN. Avant tout diagnostic réseau ou commande `samba-tool` sur la VM :

```bash
systemctl status samba-ad-dc
# Si arrêté :
systemctl start samba-ad-dc
samba-tool domain info 127.0.0.1
```

### krb5.conf — copie physique, pas de lien symbolique

La tâche `30_config.yml` copie `/var/lib/samba/private/krb5.conf` vers `/etc/krb5.conf` avec `remote_src: true`. Ne pas remplacer par un lien symbolique : le répertoire `private/` devient inaccessible aux processus non-root dans Samba 4.7+ (cf. [wiki.samba.org](https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller)).

### Sécurité du mot de passe Administrator

Le mot de passe transite via `stdin` (`--adminpass-fd=0`) et non en argument de ligne de commande. Les tâches concernées sont protégées par `no_log: true`. Il est stocké chiffré en AES256 dans le vault Ansible. Ne jamais le passer en `--extra-vars` sur la ligne de commande — il serait visible dans l'historique shell.

---

## Troubleshooting

**`apt install` échoue avec `Could not resolve host`**

OPNsense n'est pas joignable ou la règle NAT outbound est absente.

```bash
# Vérifier la passerelle depuis la VM
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 "ping -c 3 10.0.10.254"
# Vérifier internet
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 "curl -v http://deb.debian.org"
```

**Le provisionnement échoue avec "Domain already exists"**

`sam.ldb` est présent mais le domaine est dans un état incohérent. Supprimer les données Samba et relancer :

```bash
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 \
  "sudo rm -rf /var/lib/samba/private/ /etc/samba/smb.conf"
ansible-playbook ansible/playbooks/samba4.yml --ask-vault-pass --tags provision
```

**`samba-ad-dc` ne démarre pas**

Consulter les logs systemd :

```bash
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 "sudo journalctl -u samba-ad-dc -n 50"
```

Cause fréquente : `smbd` ou `winbind` non masqués (vérifier avec `systemctl status smbd`), ou hostname non résolu (`/etc/hosts` mal configuré).

**Le DNS interne ne répond pas**

Vérifier que `systemd-resolved` est bien masqué et que `/etc/resolv.conf` pointe sur `127.0.0.1` :

```bash
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 \
  "sudo systemctl status systemd-resolved && cat /etc/resolv.conf"
```

**Kerberos échoue (`kinit Administrator@YMMO.LAN`)**

Vérifier que `/etc/krb5.conf` contient le realm `YMMO.LAN` et l'adresse `dc1.ymmo.lan`. Le re-copier si nécessaire :

```bash
ssh -J sysadmin@192.168.10.43 sysadmin@10.0.10.1 \
  "sudo cp /var/lib/samba/private/krb5.conf /etc/krb5.conf"
```

**Ansible n'atteint pas la VM (`Connection refused` ou timeout)**

Vérifier dans l'ordre :
1. La VM est démarrée (Proxmox UI)
2. Le tunnel WireGuard du bastion est actif : `ssh sysadmin@192.168.10.43 "sudo wg show"`
3. Le bastion peut pinguer la VM : `ssh sysadmin@192.168.10.43 "ping -c 3 10.0.10.1"`
4. L'inventaire dynamique détecte la VM : `ansible-inventory -i ansible/inventory/ --list | grep samba`

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `ansible/playbooks/samba4.yml` | Playbook orchestrateur (cible `tag_samba4`, `become: true`) |
| `ansible/roles/samba4/defaults/main.yml` | Valeurs par défaut (realm, domaine, IP, chemins) |
| `ansible/roles/samba4/tasks/00_assert.yml` | Validation des prérequis et de la politique mot de passe |
| `ansible/roles/samba4/tasks/10_install.yml` | Installation apt des paquets Samba |
| `ansible/roles/samba4/tasks/20_provision.yml` | Provisionnement AD via `samba-tool domain provision` (idempotent) |
| `ansible/roles/samba4/tasks/30_config.yml` | krb5.conf, DNS forwarder, désactivation systemd-resolved |
| `ansible/roles/samba4/tasks/40_service.yml` | Masquage smbd/nmbd/winbind, activation samba-ad-dc |
| `ansible/roles/samba4/tasks/99_smoke.yml` | Tests de fumée : domain info, DNS, liste utilisateurs |
| `ansible/roles/samba4/handlers/main.yml` | Handler de redémarrage samba-ad-dc |
| `ansible/inventory/group_vars/tag_samba4/main.yml` | Variables du groupe : ProxyJump, realm, IP, mot de passe vault |
| `ansible/inventory/group_vars/all/vault.yml` | `vault_samba4_admin_password` (chiffré AES256) |
