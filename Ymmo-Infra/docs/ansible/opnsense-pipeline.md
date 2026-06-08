# Pipeline IaC OPNsense — Packer vers Ansible

Ce document décrit le pipeline complet de déploiement d'OPNsense dans l'infrastructure
Ymmo : ce qui est configuré lors du build Packer, ce qui est délégué à Ansible, et
les raisons techniques de cette séparation.

---

## Vue d'ensemble

```
Packer
  build du template OPNsense (ID 9001) sur Proxmox
  - interfaces physiques assignées dans config.xml
  - VLANs pré-déclarés dans config.xml
  - credentials API baked dans le template
  - règles firewall et NAT outbound injectées directement
        |
        v
Terraform
  clone du template 9001
  déploiement de la VM OPNsense-Master
        |
        v
Inventaire dynamique Proxmox
  découverte automatique de l'IP WAN via QEMU guest agent
  groupe tag_router créé automatiquement
        |
        v
Ansible — opnsense_setup
  vérification de la connectivité SSH brute (bootstrap)
        |
        v
Ansible — opnsense_network
  déclaration des devices VLAN via API REST
  configuration DHCP Dnsmasq via API REST
  création des règles firewall via API REST
```

Le principe central est le suivant : tout ce que l'API OPNsense ne permet pas de
configurer (assignation d'interfaces, NAT outbound, règles floating) est injecté
directement dans `config.xml` lors du build Packer. Ansible ne prend en charge que
ce que l'API REST expose de façon fiable.

---

## Contrainte fondamentale : OPNsense sans Python

OPNsense tourne sur FreeBSD et n'embarque pas Python. Les modules Ansible standards
qui reposent sur SSH + exécution Python à distance sont donc inutilisables pour la
configuration réseau.

La collection `oxlorg.opnsense` (pinned à la version `25.7.8`) contourne cette
contrainte : elle s'exécute en `connection: local` sur le contrôleur Ansible et
envoie des requêtes HTTPS vers l'API REST OPNsense. Il n'y a pas de connexion SSH
pour les tâches réseau. `gather_facts: false` est obligatoire dans les deux playbooks
pour la même raison.

Le playbook `opnsense_setup` comporte un rôle `opnsense_bootstrap` qui vérifie la
connectivité SSH brute (via `ansible.builtin.raw`) — c'est la seule tâche qui utilise
SSH, et uniquement pour confirmer que la VM répond avant la configuration API.

---

## Étape 1 — Packer : ce qui est baked dans le template

### Pourquoi Packer et non Ansible

Plusieurs éléments de configuration OPNsense ne sont pas exposés par l'API REST.
La seule méthode fiable pour les initialiser est d'écrire directement dans
`config.xml` lors du build du template, via le script `packer/scripts/opnsense-setup.sh`.
Ce script utilise l'API PHP interne d'OPNsense (`write_config()`), disponible
uniquement depuis la VM elle-même pendant le build.

Une fois le template créé, toutes les VMs clonées depuis ce template héritent de
cette configuration de base. Ansible n'a donc pas à gérer ces éléments.

### Ce que opnsense-setup.sh configure

| Section | Contenu | Raison de le baker dans Packer |
|---------|---------|-------------------------------|
| Interfaces physiques | vtnet0 → LAN (192.168.1.1/24), vtnet1 → WAN (DHCP) | L'API ne permet pas d'assigner des interfaces à des slots OPT (issue upstream core#7324, fermée "not planned") |
| Credentials API | Clé + secret hashé SHA-512 dans `<apikeys>` du user root | OPNsense ne supporte pas cloud-init ; sans credentials baked, Ansible n'a aucun moyen de s'authentifier au premier boot |
| Clé SSH root | Ajoutée dans `config.xml` | Même raison : pas de cloud-init, la clé doit être présente avant le premier démarrage |
| Plugin QEMU guest agent | `os-qemu-guest-agent` installé et activé | Requis pour que Proxmox expose les interfaces réseau de la VM, ce qui permet à l'inventaire dynamique de découvrir l'IP WAN |
| Règle firewall WAN (port 443) | `pass in on vtnet1 proto tcp from any to (self) port 443` | OPNsense bloque tout le trafic entrant sur le WAN par défaut. Sans cette règle, Ansible ne peut pas joindre l'API depuis le contrôleur |
| NAT outbound | Mode hybrid + règles explicites par VLAN | L'API REST (`/api/firewall/nat/outbound/*`) n'est pas exposée : le code NAT outbound reste dans le legacy PHP et renvoie 404 sur tous les endpoints MVC testés (`search_rule`, `addRule`, etc.). La seule option est l'injection PHP dans `config.xml` |
| Règles floating | Règles inter-VLAN de base | L'API OPNsense ne peut pas créer de règles floating (issue #6938). Elles doivent être écrites directement dans `config.xml` |
| Règles VLAN legacy | Règles de filtrage de base | Le champ `protocol` dans les règles `pf` n'accepte pas la valeur `any` via l'API dans ce contexte ; le champ doit être omis, ce qui n'est possible qu'en écrivant directement dans `config.xml` |
| Pré-déclaration des VLANs | 4 entrées `<vlan>` + 4 interfaces OPT dans `config.xml` | L'API ne peut pas assigner des interfaces VLAN à des slots OPT. Ansible peut ensuite déclarer les devices VLAN via l'API, mais uniquement parce que les slots OPT sont déjà présents dans `config.xml` |

### Variables requises dans Packer

Les credentials API doivent être définis dans `packer/variables.pkrvars.hcl` :

```hcl
# Générer avec : openssl rand -hex 40
opnsense_api_key    = "valeur-hex-80-caracteres"
opnsense_api_secret = "valeur-hex-80-caracteres"
```

Ces valeurs doivent être identiques à celles stockées dans le vault Ansible.
OPNsense stocke le hash du secret dans `config.xml` ; Ansible utilise la valeur
en clair pour s'authentifier.

### Build du template

```bash
make build-opnsense
```

La commande exécute un `packer init` suivi d'un `packer build`. À la fin du build,
le script vérifie automatiquement la disponibilité de l'API :

```bash
curl -k -u "${OPN_API_KEY}:${OPN_API_SECRET}" \
  https://127.0.0.1/api/core/firmware/status
```

Un retour HTTP 200 confirme que les credentials sont valides dans le template.

Tout changement dans `opnsense-setup.sh` nécessite un rebuild complet (`make build-opnsense`)
suivi d'un redéploiement Terraform (`make tf-apply`) pour recréer la VM depuis le
nouveau template.

---

## Étape 2 — Terraform : déploiement de la VM

```bash
make tf-apply
```

Terraform clone le template `9001` et crée la VM `OPNsense-Master` avec :

- **vtnet0** connecté au bridge interne (`YmmoTom`)
- **vtnet1** connecté au bridge WAN (`vmbr0`)
- Tags Proxmox : `ymmotom`, `infra`, `router` (le tag `router` crée le groupe `tag_router` dans l'inventaire)

---

## Étape 3 — Inventaire dynamique Proxmox

L'inventaire dynamique (`ansible/inventory/proxmox.proxmox.yml`) interroge l'API
Proxmox via le plugin `community.proxmox.proxmox`. Il filtre les VMs taguées
`ymmotom` et crée automatiquement des groupes basés sur les tags Proxmox. La VM
`OPNsense-Master`, taguée `router`, apparaît dans le groupe `tag_router`.

L'IP de l'hôte est résolue dynamiquement à partir des interfaces exposées par le
QEMU guest agent (installé par Packer). La règle `compose` de l'inventaire filtre
l'interface WAN (`vtnet1`) et exclut les adresses locales et l'IP LAN statique.
Aucune IP n'est hardcodée.

Les variables de connexion du groupe `tag_router` sont définies dans
`ansible/inventory/group_vars/tag_router/main.yml` :

| Variable | Valeur | Rôle |
|----------|--------|------|
| `ansible_connection` | `local` | Pas de SSH pour la configuration OPNsense — les modules API s'exécutent sur le contrôleur |
| `opnsense_api_key` | `{{ vault_opnsense_api_key }}` | Clé API chargée depuis le vault |
| `opnsense_api_secret` | `{{ vault_opnsense_api_secret }}` | Secret API en clair (non hashé) |
| `opnsense_api_host` | `{{ ansible_host }}` | IP WAN résolue dynamiquement par l'inventaire |
| `opnsense_ssl_verify` | `false` | Certificat auto-signé acceptable en homelab |
| `wireguard_server_private_key` | `{{ vault_wireguard_server_private_key }}` | Clé privée WireGuard du hub siège |

### Vérification de l'inventaire

```bash
cd ansible
ansible-inventory --host OPNsense-Master --ask-vault-pass
```

---

## Étape 4 — Ansible : opnsense_setup

Le playbook `ansible/playbooks/opnsense_setup.yml` applique le rôle
`opnsense_bootstrap`. Ce rôle se limite à une vérification de connectivité SSH
brute via `ansible.builtin.raw`. Il ne configure rien : la configuration initiale
(credentials, interfaces, firewall) a déjà été réalisée par Packer.

Ce playbook est à exécuter une seule fois après le premier démarrage de la VM,
pour confirmer que la VM est accessible avant de passer à `opnsense_network`.

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/opnsense_setup.yml --ask-vault-pass
```

---

## Étape 5 — Ansible : opnsense_network

Le playbook `ansible/playbooks/opnsense_network.yml` applique le rôle
`opnsense_network`. Il configure via l'API REST :

- les devices VLAN (`vlan0.10`, `vlan0.20`, `vlan0.30`, `vlan0.99`)
- les plages DHCP Dnsmasq par VLAN
- les règles firewall autorisant chaque VLAN à sortir vers WAN

Ce rôle est documenté en détail dans `docs/ansible/opnsense-network.md`.

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/opnsense_network.yml --ask-vault-pass
```

---

## Résumé de la séparation Packer / Ansible

| Élément | Géré par | Raison |
|---------|----------|--------|
| Assignation interfaces physiques (LAN/WAN) | Packer | API core#7324 inexistante |
| Pré-déclaration interfaces OPT et VLANs | Packer | API core#7324 inexistante |
| Credentials API OPNsense | Packer | Pas de cloud-init sur OPNsense |
| Clé SSH root | Packer | Pas de cloud-init sur OPNsense |
| QEMU guest agent | Packer | Requis avant le démarrage de la VM |
| Règle firewall WAN (port 443) | Packer | Requis avant qu'Ansible puisse joindre l'API |
| NAT outbound | Packer | API REST NAT outbound inexistante (legacy PHP) |
| Règles floating | Packer | API ne peut pas créer de règles floating (issue #6938) |
| Règles VLAN legacy | Packer | Champ `proto any` invalide en pf via API |
| Devices VLAN | Ansible (oxlorg.opnsense) | API `interface_vlan` disponible et fiable |
| Plages DHCP Dnsmasq | Ansible (oxlorg.opnsense) | API `dnsmasq_range` disponible |
| Règles firewall VLAN-to-WAN | Ansible (oxlorg.opnsense) | API `rule` disponible et idempotente |

---

## Reproduire de zéro

```bash
# 1. Générer les credentials API
API_KEY=$(openssl rand -hex 40)
API_SECRET=$(openssl rand -hex 40)

# 2. Ajouter dans packer/variables.pkrvars.hcl :
#    opnsense_api_key    = "$API_KEY"
#    opnsense_api_secret = "$API_SECRET"

# 3. Construire le template Packer
make build-opnsense

# 4. Déployer la VM via Terraform
make tf-apply

# 5. Mettre à jour le vault Ansible (mêmes valeurs que Packer)
ansible-vault edit ansible/inventory/group_vars/all/vault.yml
# vault_opnsense_api_key: "$API_KEY"
# vault_opnsense_api_secret: "$API_SECRET"

# 6. Installer la collection oxlorg.opnsense
cd ansible && ansible-galaxy collection install -r collections/requirements.yml

# 7. Vérifier que OPNsense-Master apparaît dans l'inventaire avec la bonne IP
ansible-inventory --host OPNsense-Master --ask-vault-pass

# 8. Bootstrap : confirmer la connectivité SSH
ansible-playbook -i inventory/ playbooks/opnsense_setup.yml --ask-vault-pass

# 9. Configurer le réseau via API
ansible-playbook -i inventory/ playbooks/opnsense_network.yml --ask-vault-pass
```

---

## Points d'attention

| Point | Détail |
|-------|--------|
| Credentials identiques dans Packer et Vault | La valeur dans `vault_opnsense_api_secret` doit être le secret en clair. OPNsense stocke le hash SHA-512 dans `config.xml` et s'en charge lui-même. Ne pas pré-hasher la valeur côté Ansible. |
| IP WAN dynamique | L'IP change à chaque redéploiement (DHCP). L'inventaire dynamique la résout automatiquement via le QEMU guest agent. Aucune action manuelle requise. |
| Rebuild template | Tout changement dans `opnsense-setup.sh` nécessite `make build-opnsense` puis `make tf-apply` pour recréer la VM depuis le nouveau template. Les modifications Ansible seules ne suffisent pas pour les éléments baked. |
| `ssl_verify: false` | Acceptable en homelab avec certificat auto-signé. En production, déployer une CA interne et passer `opnsense_ssl_verify: true` avec un `ca_path` valide. |
| Collection `oxlorg.opnsense` | Anciennement `ansibleguy.opnsense` jusqu'en septembre 2024. L'ancien namespace ne doit plus être utilisé. La version est pinned à `25.7.8` dans `ansible/collections/requirements.yml`. |
