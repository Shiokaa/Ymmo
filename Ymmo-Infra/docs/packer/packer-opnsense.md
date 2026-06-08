# Documentation Technique : Template Packer OPNsense

Ce document décrit la conception, l'automatisation et les décisions techniques du template OPNsense construit par Packer pour l'infrastructure Ymmo-Infra sur Proxmox. Il est destiné à quiconque doit maintenir ou déboguer ce pipeline.

---

## 1. Vue d'ensemble

Le template OPNsense (VM ID 9001) sert de base au routeur/pare-feu central du projet. Il est construit à partir de l'ISO DVD officiel et produit un template Proxmox prêt à être cloné par Terraform.

La difficulté centrale d'OPNsense par rapport à une VM Linux est l'absence de mécanisme de preseed ou de cloud-init : le système est basé sur FreeBSD/HardenedBSD, et toute configuration écrite directement sur le filesystem (fichiers de configuration, clés SSH, etc.) est **écrasée au premier boot** par la fonction interne `local_sync_accounts()` d'OPNsense, qui reconstruit l'état du système depuis `config.xml`. La seule manière fiable d'injecter une configuration est d'écrire directement dans `config.xml` via l'API PHP interne d'OPNsense, ce que fait le script `opnsense-setup.sh`.

### Caractéristiques du template produit

| Parametre         | Valeur                          |
|-------------------|---------------------------------|
| Nom               | `opnsense-26-template`          |
| VM ID             | 9001                            |
| OS                | FreeBSD (`other` dans Proxmox)  |
| CPU               | 2 cores, type `host`            |
| Memoire           | 4096 Mo                         |
| Disque            | 20 Go, VirtIO, format raw       |
| Systeme de fichiers | ZFS Stripe                    |
| Reseau            | 2 interfaces VirtIO             |
| Controleur SCSI   | `virtio-scsi-single`            |

La memoire minimum est de 4 Go : en dessous, l'installation ZFS peut se terminer avec un kernel panic ou etre extremement lente.

---

## 2. Variables

Les variables OPNsense sont definies dans `packer/variables-opnsense.pkr.hcl`. Les variables de connexion Proxmox (`proxmox_api_url`, `proxmox_api_token_id`, etc.) sont partagees avec le build Debian et definies dans `packer/variables.pkr.hcl`.

Les valeurs sensibles (mot de passe, cles API) sont fournies dans `packer/variables.pkrvars.hcl` (gitignore, voir `.example`).

### Variables specifiques OPNsense

| Variable                   | Defaut                    | Sensible | Description |
|----------------------------|---------------------------|----------|-------------|
| `opnsense_template_name`   | `opnsense-26-template`    | non      | Nom du template dans Proxmox |
| `opnsense_vm_id`           | `9001`                    | non      | ID de la VM |
| `opnsense_iso_file`        | aucun (obligatoire)       | non      | Chemin de l'ISO dans le stockage Proxmox (ex: `local:iso/OPNsense-26.1-dvd-amd64.iso`) |
| `opnsense_ssh_username`    | `root`                    | non      | Utilisateur SSH pour la phase de build |
| `opnsense_ssh_password`    | `opnsense`                | oui      | Mot de passe root temporaire defini pendant l'installation |
| `opnsense_vm_cores`        | `2`                       | non      | Nombre de vCPU |
| `opnsense_vm_memory`       | `4096`                    | non      | Memoire en Mo |
| `opnsense_vm_disk_size`    | `20G`                     | non      | Taille du disque |
| `opnsense_authorized_keys` | `[]`                      | non      | Liste de cles SSH publiques pour root (injectees dans config.xml) |
| `opnsense_api_key`         | `""`                      | oui      | Cle API OPNsense (ex: `openssl rand -hex 40`) |
| `opnsense_api_secret`      | `""`                      | oui      | Secret API en clair (hache en SHA-512 lors du build) |

### Variables Proxmox partagees (definies dans `variables.pkr.hcl`)

| Variable                    | Description |
|-----------------------------|-------------|
| `proxmox_api_url`           | URL de l'API Proxmox |
| `proxmox_api_token_id`      | ID du jeton API (`user@pam!token`) |
| `proxmox_api_token_secret`  | Secret du jeton API |
| `proxmox_node`              | Noeud Proxmox cible |
| `proxmox_skip_tls_verify`   | Ignorer la verification TLS (defaut: `true`) |
| `vm_storage_pool`           | Pool de stockage (defaut: `local-lvm`) |
| `vm_bridge`                 | Bridge reseau (defaut: `vmbr0`) |

---

## 3. Automatisation de l'installation (boot_command)

OPNsense ne supporte pas de fichier de reponse automatique. L'installation est pilotee par une sequence de frappes clavier simulees (`boot_command`) qui interagit avec l'installeur texte.

### Sequence detaillee

```
boot_wait = "65s"
```

Le delai initial est de 65 secondes pour laisser l'ISO charger entierement ses services (le daemon `hostwatch`, introduit en 26.1, retarde l'affichage du prompt).

**Etapes de l'installation :**

1. Login `installer` / `opnsense` (credentials par defaut de l'installeur).
2. Selection du clavier US (valeur par defaut, acceptee avec `<enter>`).
3. Selection de la tache "Install (ZFS)".
4. Selection du type ZFS "Stripe - Single Disk".
5. Cochage du disque VirtIO avec `<spacebar>` : etape critique. Sans l'appui sur espace, aucun disque n'est selectionne et l'installation echoue silencieusement.
6. Confirmation de l'ecrasement du disque.
7. Attente de 230 secondes pour l'extraction des fichiers.
8. Definition du mot de passe root via `var.opnsense_ssh_password` avant le reboot.
9. Reboot et attente de 40 secondes.

**Sequence post-reboot (connexion console) :**

Apres le premier reboot, Packer se connecte via la console (pas encore SSH) pour preparer l'acces reseau :

1. Login root en console.
2. Entree dans le shell via le menu OPNsense (option `8`).
3. `pfctl -d` : desactivation du pare-feu pour permettre les connexions entrantes.
4. `dhclient vtnet0` : force une requete DHCP sur le WAN pour obtenir une IP routable.
5. `ifconfig vtnet1 inet 192.168.1.1 delete` : suppression de l'IP LAN statique (`192.168.1.1`) de la memoire vive. Sans cette etape, Packer detecte l'IP LAN comme IP de la VM et tente de s'y connecter en SSH, ce qui est impossible depuis le reseau de build.
6. Activation et demarrage du daemon SSH.
7. Installation et activation du paquet `os-qemu-guest-agent` (permet a Proxmox d'afficher l'IP de la VM et de gerer l'arret propre).
8. Sortie du shell et deconnexion du menu OPNsense.

Packer prend ensuite le relai en SSH avec `var.opnsense_ssh_username` / `var.opnsense_ssh_password` pour executer le script de provisioning.

---

## 4. Script de provisioning : opnsense-setup.sh

Le script recoit trois variables d'environnement injectees par Packer :

- `AUTH_KEYS_B64` : cles SSH autorisees encodees en base64 (`base64(key1\nkey2\n...)`).
- `OPN_API_KEY` : cle API OPNsense en clair.
- `OPN_API_SECRET` : secret API OPNsense en clair.

### Pourquoi PHP et config.xml

OPNsense gere son etat dans un unique fichier XML (`/conf/config.xml`). Au demarrage, plusieurs fonctions systeme lisent ce fichier et ecrivent les fichiers de configuration du systeme (sshd_config, authorized_keys, pf.conf, etc.). Toute modification directe de ces fichiers est donc ecrasee au prochain boot.

La seule approche fiable est d'ecrire dans `config.xml` avant le demarrage definitif. OPNsense fournit pour cela une API PHP interne (`require_once("config.inc")`) qui garantit que les modifications passent par le bon parseur XML et que la sauvegarde met a jour le checksum interne. C'est l'approche utilisee par tous les outils officiels OPNsense (y compris le Setup Wizard lui-meme).

### Section 1 : Marqueur wizard et clavier

```php
$config["system"]["wizard_done"] = "yes";
$config["system"]["keymap"] = "fr.iso";
```

Le marqueur `wizard_done` empeche l'affichage du Setup Wizard au premier boot reel de la VM clonee. Sans lui, OPNsense redirige toute connexion web vers l'assistant de configuration, bloquant l'acces API dont Ansible a besoin. Le clavier AZERTY est aussi configure au niveau `rc.conf` FreeBSD via `sysrc keymap="fr.iso"` en fin de script.

### Section 2 : SSH daemon et acces root

```php
$config["system"]["ssh"]["enabled"] = "enabled";
$config["system"]["ssh"]["permitrootlogin"] = "yes";
```

Une valeur non-vide pour `enabled` active le daemon SSH au boot. `permitrootlogin` est necessaire car OPNsense n'a pas d'autre utilisateur systeme par defaut.

### Section 3 : Cles SSH autorisees pour root

OPNsense stocke les cles SSH dans `config.xml` en base64 sous l'element `<authorizedkeys>` du user root. Au boot, `local_sync_accounts()` fait un `base64_decode()` de cette valeur et ecrit le resultat dans `/root/.ssh/authorized_keys`. La variable `AUTH_KEYS_B64` est deja au bon format (`base64(key1\nkey2\n...)`).

Le script gere deux cas possibles selon la structure XML : un seul utilisateur (element plat) ou plusieurs (tableau).

### Section 4 : Interfaces reseau

```php
// LAN => vtnet0 (interface interne vers le coeur du reseau)
$config["interfaces"]["lan"]["if"]     = "vtnet0";
$config["interfaces"]["lan"]["ipaddr"] = "192.168.1.1";

// WAN => vtnet1 en DHCP (interface vers Proxmox/internet)
$config["interfaces"]["wan"]["if"]     = "vtnet1";
$config["interfaces"]["wan"]["ipaddr"] = "dhcp";
```

Le mapping LAN=vtnet0 / WAN=vtnet1 correspond a l'ordre des interfaces dans le template Packer et sera conserve par Terraform lors du clonage. Les attributs `blockpriv` et `blockbogons` sont supprimes du WAN pour eviter le blocage des adresses RFC1918 (utile dans un environnement Proxmox ou les IPs privees sont courantes sur le reseau de gestion).

### Section 5 : Credentials API OPNsense

OPNsense authentifie les appels API via une paire cle/secret stockee dans `config.xml`. Le secret n'est pas stocke en clair : OPNsense attend un hash SHA-512 au format `$6$sel$hash` (fonction `crypt()` de PHP). Le script calcule ce hash avec un sel aleatoire genere via `random_bytes(8)`.

Pourquoi injecter les credentials au build plutot que les configurer apres ? Parce qu'Ansible doit pouvoir joindre l'API OPNsense des le premier boot de la VM clonee, sans aucune intervention manuelle. Si les credentials n'etaient pas pre-configures, le premier playbook ne pourrait pas s'authentifier.

Les memes valeurs (`opnsense_api_key` et `opnsense_api_secret` en clair) doivent etre stockees dans le vault Ansible apres le build.

### Section 6 : Regle firewall WAN pour l'API Ansible

```php
array_unshift($config["filter"]["rule"], [
    "type"      => "pass",
    "interface" => "wan",
    "protocol"  => "tcp",
    "destination" => ["network" => "(self)", "port" => "443"],
    "descr"     => "Ansible-API-WAN",
]);
```

Par defaut, OPNsense bloque tout le trafic entrant sur le WAN. Ansible utilisant `connection: local` (appels HTTP directs vers l'API), les requetes arrivent sur l'interface WAN. Sans cette regle, l'API est inaccessible et les playbooks echouent avec une erreur de connexion. La regle est inseree en premier (`array_unshift`) pour etre evaluee avant les regles de blocage generiques.

### Section 7 : Regles pass VLAN (opt1-opt4)

```php
// Note : pas de cle "protocol"
$config["filter"]["rule"][] = [
    "type"      => "pass",
    "interface" => "opt1",
    "source"    => ["network" => "10.0.10.0/24"],
    "destination" => ["any" => ""],
    ...
];
```

OPNsense bloque par defaut tout trafic entrant sur les interfaces OPT. Ces regles autorisent le trafic sortant de chaque VLAN du Siege vers le WAN.

**Piege critique : ne jamais mettre `"protocol" => "any"`**

La valeur `"any"` pour le protocole genere `proto any` dans la syntaxe pf de FreeBSD, ce qui est invalide. pf rejette l'ensemble du ruleset silencieusement : aucune regle de firewall n'est chargee et le comportement devient imprevisible. La solution correcte est d'omettre completement la cle `"protocol"` : son absence signifie "tous protocoles" en pf, ce qui est le comportement voulu.

Les regles sont creees comme regles "legacy" (directement dans `config.xml`) plutot que via l'API `oxlorg.opnsense.rule`, car les regles API apparaissent dans "Rules from Automation" et ne sont evaluees que si le toggle d'interface est actif, ce qui n'est pas garanti au premier boot.

### Section 8 : Regle floating WireGuard

```php
$config["filter"]["rule"][] = [
    "type"      => "pass",
    "floating"  => "yes",
    "direction" => "in",
    "quick"     => "1",
    "source"    => ["network" => "10.254.0.0/24"],
    "destination" => ["network" => "10.0.0.0/16"],
    "descr"     => "Allow-WireGuard-backbone-to-VLANs-siege",
];
```

Cette regle autorise le backbone VPN WireGuard (`10.254.0.0/24`) a joindre tous les VLANs du Siege (`10.0.0.0/16`).

**Pourquoi via PHP et non via l'API ?** L'API OPNsense ne peut pas creer de vraies regles floating (issue #6938 dans le tracker officiel). Les regles creees via `oxlorg.opnsense.rule` sont des regles d'interface classiques, pas des floating rules. L'injection PHP dans `config.xml` avec `"floating" => "yes"` est la seule methode disponible.

**Piege : meme contrainte sur `protocol`** — la cle est omise pour la meme raison que les regles VLAN ci-dessus.

### Section 9 : NAT outbound hybride

```php
$config["nat"]["outbound"]["mode"] = "hybrid";
// + regles explicites par VLAN
```

Le mode hybride combine les regles NAT automatiques d'OPNsense (pour le trafic LAN/WAN de base) avec les regles explicites ajoutees ici pour chaque VLAN. Sans ces regles, les VLANs ne peuvent pas acceder a internet car OPNsense n'inclut que le reseau LAN dans ses regles NAT automatiques.

**Pourquoi via PHP et non via l'API ?** L'API REST OPNsense n'expose pas le NAT outbound. Le code correspondant est du code legacy non migre vers le framework API. L'injection PHP dans `config.xml` est la seule methode disponible, identique a l'approche des regles floating.

### Section 10 : Pre-declaration des VLANs et interfaces OPT

```php
$config["vlans"]["vlan"][] = [
    "if"     => "vtnet0",
    "tag"    => "10",
    "vlanif" => "vlan0.10",
    "descr"  => "SRV_SIEGE",
];
$config["interfaces"]["opt1"] = [
    "if"     => "vlan0.10",
    "ipaddr" => "10.0.10.254",
    "subnet" => "24",
    ...
];
```

Les 4 VLANs du Siege sont pre-declares (tags 10, 20, 30, 99) avec leurs interfaces OPT associees (opt1-opt4) et leurs IPs de passerelle (`10.0.X.254`).

**Pourquoi pre-declarer au build ?** L'API OPNsense n'expose pas l'assignation d'interfaces (issue core#7324, fermee "not planned"). Sans cette pre-declaration, Ansible (role `opnsense_network`) ne peut pas configurer le DHCP ni les regles de firewall sur ces interfaces car elles n'existent pas encore dans le systeme.

L'attribut `vlanif` est necessaire depuis OPNsense 22.1.6 : sans lui, OPNsense genere un nom sequentiel (`vlan01`, `vlan02`...) au lieu du nom previsible `vlan0.10`, ce qui casse les references dans les regles de firewall.

### Validation post-PHP

Apres le bloc PHP, le script verifie que le code de retour est 0, puis effectue une validation live des credentials API :

```sh
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" \
  -u "${OPN_API_KEY}:${OPN_API_SECRET}" \
  https://127.0.0.1/api/core/firmware/status)
```

Si les credentials sont invalides (HTTP != 200), le build echoue immediatement avec une erreur explicite plutot que de produire un template inutilisable.

---

## 5. Comment builder

### Prerequis

1. L'ISO OPNsense (format DVD, amd64) doit etre present dans le stockage Proxmox.
2. Le fichier `packer/variables.pkrvars.hcl` doit exister (voir `.pkrvars.hcl.example`).

### Variables obligatoires dans variables.pkrvars.hcl

```hcl
opnsense_iso_file   = "local:iso/OPNsense-26.1-dvd-amd64.iso"
opnsense_api_key    = "..."  # openssl rand -hex 40
opnsense_api_secret = "..."  # openssl rand -hex 40

# Variables Proxmox partagees
proxmox_api_url          = "https://proxmox:8006/api2/json"
proxmox_api_token_id     = "packer@pam!packer-token"
proxmox_api_token_secret = "..."
proxmox_node             = "pve"
ssh_password             = "..."  # mot de passe pour le template Debian
```

### Commandes

```bash
# Initialiser les plugins (premiere fois uniquement)
make init

# Build standard
make build-opnsense

# Build avec logs detailles et pause en cas d'erreur
make debug-opnsense
```

### Apres le build

Les valeurs `opnsense_api_key` et `opnsense_api_secret` doivent etre reportees dans le vault Ansible (`ansible/group_vars/all/vault.yml`) pour que les playbooks puissent s'authentifier aupres de l'API.

---

## 6. Pieges connus et decisions techniques

### proto any est invalide en pf FreeBSD

Ne jamais mettre `"protocol" => "any"` dans une regle de firewall injectee dans `config.xml`. pf FreeBSD rejette la directive `proto any` et refuse de charger l'ensemble du ruleset. Le comportement resultant est imprevisible (regles partielles ou aucune regle). La solution : omettre completement la cle `protocol`, ce qui signifie "tous protocoles" dans pf.

### Les floating rules ne sont pas creables via l'API

L'issue #6938 du tracker OPNsense documente l'impossibilite de creer de vraies regles floating via l'API REST. Les regles creees via `oxlorg.opnsense.rule` sont des regles d'interface classiques. La seule methode pour creer une floating rule est l'injection directe dans `config.xml` via PHP.

### Le NAT outbound n'est pas expose par l'API REST

Le code NAT outbound d'OPNsense est du code legacy non migre vers le framework API. Toute tentative de configuration via l'API (y compris via les modules Ansible officiels) echouera ou sera silencieusement ignoree. La configuration passe obligatoirement par PHP/config.xml.

### L'assignation d'interfaces n'est pas exposee par l'API

L'issue core#7324 (fermee "not planned") confirme que l'API OPNsense ne permettra pas de creer ou modifier des assignations d'interfaces. La pre-declaration des VLANs et OPT dans `config.xml` au moment du build est la seule approche viable.

### Le filesystem est ecrase au boot

Toute modification directe de fichiers systeme OPNsense (sshd_config, authorized_keys, pf.conf) est ecrasee au demarrage par `local_sync_accounts()` et les fonctions equivalentes. Toute configuration doit passer par `config.xml`.

### La sequentialite du build est fragile

Le `boot_command` est une sequence de frappes clavier simulees avec des delais fixes. Un systeme Proxmox lent (charge CPU elevee, latence reseau) peut decaler les etapes. Si le build echoue avec des erreurs bizarre, augmenter les valeurs `<waitXs>` dans le `boot_command`.
