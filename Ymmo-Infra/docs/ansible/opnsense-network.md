# Rôle Ansible — `opnsense_network`

Ce document décrit le rôle `opnsense_network` et le playbook associé. Il couvre
la configuration réseau complète d'OPNsense après son déploiement Terraform :
VLANs, DHCP Dnsmasq, et règles firewall.

---

## 1. Présentation

### Rôle dans le pipeline

```
1. Packer          → Template OPNsense avec VLANs pré-déclarés dans config.xml
                      (section 7 du script opnsense-setup.sh)

2. Terraform       → VM OPNsense déployée et accessible

3. opnsense_setup  → Playbook initial : credentials API, SSH, wizard (déjà fait)

4. opnsense_network → CE RÔLE : VLANs, DHCP Dnsmasq, règles firewall
```

### Pourquoi cette étape existe

L'API OPNsense ne permet pas d'assigner des interfaces physiques ou VLAN à des
slots OPT (issue upstream core#7324, fermée "not planned"). Cette limitation
implique une séparation stricte des responsabilités :

- **Packer** écrit l'assignation des interfaces dans `config.xml` lors du build
  du template (pré-déclaration statique, une seule fois).
- **Ce rôle** configure tout ce qui est modifiable via l'API REST : les devices
  VLAN, les plages DHCP et les règles firewall.

---

## 2. Prérequis

### Template Packer

Le template OPNsense doit avoir été construit avec la **section 7** présente
dans `packer/scripts/opnsense-setup.sh`. Cette section écrit dans `config.xml` :

- Les 4 entrées `<vlan>` du Siège (tags 10, 20, 30, 99)
- Les 4 interfaces OPT (`opt1`–`opt4`) associées aux devices `vlan0.10`–`vlan0.99`

Si le template a été construit sans la section 7, un rebuild complet est nécessaire
(`make build-opnsense` puis `make tf-apply`).

### Variables vault

Les variables suivantes doivent être définies dans le vault Ansible
(`ansible/inventory/group_vars/all/vault.yml`) :

| Variable | Description |
|----------|-------------|
| `vault_opnsense_api_key` | Clé API OPNsense (même valeur que dans `variables.pkrvars.hcl`) |
| `vault_opnsense_api_secret` | Secret API en clair (OPNsense hash lui-même, ne pas pré-hasher) |

Ces valeurs sont exposées au rôle via `group_vars/tag_router/main.yml` sous les
noms `opnsense_api_key` et `opnsense_api_secret`.

### Collection Ansible

```bash
cd ansible
ansible-galaxy collection install -r collections/requirements.yml
```

La collection utilisée est `oxlorg.opnsense` (anciennement `ansibleguy.opnsense`,
renommée en septembre 2024).

---

## 3. Architecture réseau — VLANs du Siège

Tous les VLANs sont définis dans `ansible/roles/opnsense_network/defaults/main.yml`
via la variable `opnsense_network_vlans`. Ils héritent tous de l'interface parent
`vtnet0`.

| Tag VLAN | Nom | Device OS | Interface OPT | Passerelle | Plage DHCP |
|----------|-----|-----------|---------------|------------|------------|
| 10 | `SRV_SIEGE` | `vlan0.10` | `opt1` | 10.0.10.254/24 | 10.0.10.100 – 10.0.10.200 |
| 20 | `USR_SIEGE` | `vlan0.20` | `opt2` | 10.0.20.254/24 | 10.0.20.100 – 10.0.20.200 |
| 30 | `PRT_SIEGE` | `vlan0.30` | `opt3` | 10.0.30.254/24 | 10.0.30.100 – 10.0.30.200 |
| 99 | `MGT_SIEGE` | `vlan0.99` | `opt4` | 10.0.99.254/24 | 10.0.99.100 – 10.0.99.200 |

Domaine DNS interne : `ymmo.local`
Durée de bail DHCP : 43 200 secondes (12 heures)

---

## 4. Ce que le rôle configure

Le rôle est découpé en fichiers de tâches numérotés, chacun ciblable via un tag
Ansible distinct.

### 4.1 Validation des prérequis (`00_assert.yml`) — tag : `always`

Avant tout appel API, le rôle vérifie que `opnsense_api_key` et
`opnsense_api_secret` sont définis et non vides. Le playbook échoue explicitement
si l'une de ces variables est absente plutôt que de laisser les modules API
remonter une erreur d'authentification peu lisible.

### 4.2 Devices VLAN (`10_vlans.yml`) — tag : `vlans`

Le module `oxlorg.opnsense.interface_vlan` enregistre chaque VLAN via l'API REST.

Contrainte technique : le paramètre `device` (ex. `vlan0.10`) est **obligatoire**.
Sans lui, OPNsense génère un nom séquentiel automatique (`vlan01`, `vlan02`...)
depuis la version 22.1.6. Ce nom séquentiel ne correspond pas aux entrées
pré-déclarées par Packer dans `config.xml`, ce qui empêche le binding des
interfaces OPT.

### 4.3 DHCP Dnsmasq (`30_dhcp.yml`) — tag : `dhcp`

La configuration DHCP utilise **Dnsmasq**, pas le serveur DHCP natif d'OPNsense.

Deux tâches sont exécutées :

**Activation globale de Dnsmasq** (`dnsmasq_general`) :

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| `port` | `0` | Désactive le DNS de Dnsmasq. Unbound gère déjà le port 53 ; les deux services ne peuvent pas coexister sur ce port dans OPNsense, même avec un binding par interface. |
| `interfaces` | `[opt1, opt2, opt3, opt4]` | Restreint Dnsmasq aux interfaces VLAN uniquement. |
| `dhcp_authoritative` | `true` | Mode autoritaire : répond aux clients sans bail existant plutôt que de les ignorer. |
| `dhcp_fqdn` | `true` | Enregistre les baux avec le FQDN complet dans Dnsmasq. |

**Déclaration des plages DHCP** (`dnsmasq_range`) : une entrée par VLAN, en
boucle sur `opnsense_network_vlans`.

### 4.4 Règles firewall (`40_firewall.yml`) — tag : `firewall`

Une règle `pass` est créée par VLAN pour autoriser le trafic sortant vers
Internet (`source: réseau VLAN → destination: any`).

La règle cible l'interface par son slot OPT (`opt1`, `opt2`...) et non par le
nom de description. `match_fields: ['description']` garantit l'idempotence :
si la règle existe déjà avec la même description (`Allow-SRV_SIEGE-to-WAN`),
elle est mise à jour plutôt que dupliquée.

> L'isolation inter-VLAN (PRT isolé de USR, MGT restreint, etc.) n'est pas dans
> le périmètre de ce rôle. Elle sera traitée dans une itération ultérieure.

### 4.5 Smoke tests (`99_smoke.yml`) — tag : `smoke` (désactivé par défaut)

Les smoke tests ne s'exécutent **pas** lors d'un run normal. Ils doivent être
explicitement activés avec `--tags smoke`. Ils interrogent l'API OPNsense et
affichent la réponse brute pour vérification manuelle.

```bash
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags smoke
```

---

## 5. Utilisation

### Exécution complète

```bash
cd ansible
ansible-playbook -i inventory/ playbooks/opnsense_network.yml --ask-vault-pass
```

### Exécution sélective par tag

```bash
# VLANs uniquement
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags vlans

# DHCP uniquement
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags dhcp

# Firewall uniquement
ansible-playbook -i inventory/ playbooks/opnsense_network.yml \
  --ask-vault-pass --tags firewall
```

---

## 6. Points d'attention

| Point | Détail |
|-------|--------|
| `dnsmasq_range` : paramètre `interface` | Ce champ attend le **nom de description** du VLAN (ex. `SRV_SIEGE`), pas l'alias interne OPNsense (ex. `opt1`). Le module fait lui-même la résolution en interne. Utiliser `opt1` ici provoque une erreur API silencieuse où la plage est créée sans être associée à l'interface. |
| Faux positif `changed` sur les plages DHCP | Le module `dnsmasq_range` signale `changed` à chaque exécution même si la configuration OPNsense n'a pas changé. C'est un comportement connu du module, pas un problème de configuration. La configuration effective dans OPNsense est bien idempotente. |
| Dnsmasq en `port: 0` obligatoire | OPNsense ne permet pas à deux services d'écouter sur le port 53, même en les liant à des interfaces différentes. Si `port` n'est pas forcé à `0`, Dnsmasq entre en conflit avec Unbound et l'un des deux services ne démarre pas. |
| Assignation d'interfaces impossible via API | L'API OPNsense ne permet pas de créer ni d'assigner des interfaces OPT (issue core#7324, fermée "not planned"). C'est pourquoi Packer écrit directement dans `config.xml`. Tout changement dans la liste des VLANs (ajout, suppression, renommage) nécessite un rebuild du template Packer (`make build-opnsense`) suivi d'un `make tf-apply`. |
| Ne pas renommer les descriptions DHCP | La description d'une plage (`DHCP-SRV_SIEGE`) est la clé d'idempotence du module. La modifier après le premier déploiement crée un orphelin dans OPNsense (l'ancienne entrée reste, une nouvelle est créée). Supprimer l'entrée manuellement dans l'interface OPNsense avant de relancer le playbook. |
