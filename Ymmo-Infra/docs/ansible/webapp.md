# Webapp — Hébergement du site Ymmo (Docker Compose)

Rôle Ansible `docker_webapp` déployant l'application web Ymmo sur la VM `Webapp`
(Debian 12, VLAN SRV_SIEGE, IP `10.0.10.2`).

---

## Vue d'ensemble

Le site Ymmo est une stack **Docker Compose** à trois conteneurs :

| Conteneur | Rôle | Port |
|---|---|---|
| `frontend` | Angular servi par nginx (sert aussi de reverse-proxy `/api`) | 80 (exposé) |
| `backend` | API Spring Boot | 8080 (interne au réseau Docker) |
| `db` | PostgreSQL | 5432 (interne, volume persistant) |

Le navigateur ne joint qu'**un seul port** (le frontend) ; nginx relaie les appels
`/api` vers le backend sur le réseau Docker interne — pas de CORS, pas d'IP en dur.

La VM est provisionnée par Terraform (`terraform/zone-infra.tf`, module `webapp`).
Le code applicatif **n'est pas cloné depuis Git** : il est copié depuis le poste de
contrôle (dossier `../Ymmo-Web`) puis construit sur la VM.

---

## Prérequis

### 1. Secrets dans le vault

Le `.env` de la stack est généré sur la VM à partir du vault. Ajouter dans
`ansible/inventory/group_vars/all/vault.yml` (`ansible-vault edit`) :

```yaml
vault_webapp_db_password: "<mot de passe fort>"
vault_webapp_jwt_secret:  "<secret fort>"
```

> ⚠️ Ces valeurs doivent rester **stables** entre déploiements : si elles changent
> après le premier `docker compose up`, le mot de passe déjà initialisé dans le volume
> `postgres_data` ne correspondra plus (il faudrait recréer le volume).

### 2. Connectivité SSH : ProxyJump via le Bastion

La VM `10.0.10.2` est sur le VLAN SRV_SIEGE, inaccessible directement. Ansible y accède
via ProxyJump à travers le bastion, comme pour Samba4 (`group_vars/tag_webapp/main.yml`).
Le tunnel WireGuard du bastion doit être actif — le rôle attend la connexion
(`wait_for_connection`) pour absorber la course de handshake après un `wireguard.yml`.

### 3. Accès internet via OPNsense NAT

Le build télécharge Docker (apt), des images, puis compile Angular (npm) et Spring
(maven). La VM `10.0.10.2` sort sur internet via OPNsense (`10.0.10.254`, NAT outbound
baked dans le template Packer). Sans cet accès, le build échoue.

### 4. Code source côté poste de contrôle

Le dossier `../Ymmo-Web` (au même niveau que `Ymmo-Infra`) doit être présent. Variable
`webapp_source_dir` (défaut `{{ playbook_dir }}/../../../Ymmo-Web`).

---

## Tâches du rôle (`roles/docker_webapp/`)

| Fichier | Rôle |
|---|---|
| `00_assert.yml` | Attend la connexion SSH ; vérifie les secrets vault et la présence du dossier source |
| `10_docker.yml` | Installe Docker CE + plugin `docker compose` (dépôt officiel) ; ajoute `sysadmin` au groupe `docker` |
| `20_source.yml` | Archive `../Ymmo-Web` (hors `node_modules`, `target`, `.git`, `.env`…), copie le tar.gz, décompresse dans `/opt/ymmo-web` |
| `30_env.yml` | Génère `/opt/ymmo-web/.env` depuis le vault (`templates/env.j2`) |
| `40_deploy.yml` | `docker compose up -d --build` dans `/opt/ymmo-web` |
| `99_smoke.yml` | Vérifie que les 3 conteneurs sont `running` + `HTTP 200` sur le frontend |

Le `.env` n'est **jamais copié** depuis le poste de contrôle : il est régénéré à partir
du vault. Variables non sensibles (`webapp_db_user`, `webapp_db_name`, `webapp_db_port`)
dans `defaults/main.yml`.

---

## Exécution

```bash
source .env                       # exporte PROXMOX_* + active le venv
./ymmo.sh ansible webapp          # demande le mot de passe vault
```

Le premier build est long (compilation Angular + Spring sur la VM) : quelques minutes.

---

## Accès au site

| Depuis | URL | Mécanisme |
|---|---|---|
| Poste utilisateur du siège (VLAN 20) | `http://10.0.10.2` | Règle firewall OPNsense (rôle `opnsense_network`, `40_firewall.yml`) |
| Poste d'agence | `http://10.0.10.2` | À travers le tunnel WireGuard |
| Poste d'administration (réseau WAN) | `http://<IP-WAN-OPNsense>:8080` | Port-forward (NAT) baké dans `packer/scripts/opnsense-setup.sh` |

Le port-forward redirige `WAN:8080 → 10.0.10.2:80` pour les sources `192.168.10.0/24`.
Comme il est baké dans le template OPNsense, **toute modification nécessite un rebuild**
du template (`./ymmo.sh packer build opnsense`).

---

## Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| `Connection closed by UNKNOWN port 65535` | Tunnel WireGuard bastion pas encore monté | Relancer ; voir le `wait_for_connection` de `00_assert.yml` |
| Build échoue sur `apt`/`npm`/`maven` | Pas d'accès internet (NAT OPNsense) | Vérifier OPNsense + la règle NAT outbound |
| `assert` vault en échec | `vault_webapp_*` absents | `ansible-vault edit inventory/group_vars/all/vault.yml` |
| Site inaccessible depuis un poste | Règle firewall absente | Rejouer `./ymmo.sh ansible network` |
| Le frontend charge mais l'API échoue | `nginx.conf` / `api.config.ts` côté Ymmo-Web | Vérifier le reverse-proxy `/api` |
