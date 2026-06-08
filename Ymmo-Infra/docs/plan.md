# Plan d'Architecture Infrastructure Ymmo

---

## 1. Vue d'ensemble

L'infrastructure Ymmo repose sur un pipeline IaC en trois phases séquentielles :

```
Packer
  Construit deux templates VM reproductibles sur Proxmox.
  Garantit que toutes les VMs partent d'une base identique et durcie.
        |
        v
Terraform
  Clone les templates pour instancier l'ensemble des VMs.
  Injecte la configuration réseau et les clés SSH via Cloud-init.
        |
        v
Ansible
  Configure les services sur les VMs déployées.
  Idempotent — peut être rejoué sans effet de bord.
```

La topologie cible couvre un siège social et jusqu'à 12 agences distantes, interconnectés par des tunnels WireGuard site-à-site. Le périmètre déployé en démo comprend le siège et deux agences.

---

## 2. Topologie réseau

### 2.1 Segmentation par site

L'adressage suit la convention `10.[site_id].[vlan].[hôte]`. Cette lisibilité directe dans l'IP facilite l'écriture des règles de firewall et la supervision.

```
10. [site_id] . [vlan] . [hôte]
     |            |         |
     |            |         Identifiant de l'équipement (1–253)
     |            Fonction réseau (10=SRV, 20=USR, 30=PRT, 99=MGT)
     Identifiant du site (0=Siège, 1–12=Agences)
```

### 2.2 Siège — Site 0 (`10.0.0.0/16`)

| VLAN | Nom | Réseau | Passerelle | Contenu |
|---|---|---|---|---|
| 10 | SRV_SIEGE | `10.0.10.0/24` | `10.0.10.254` | Samba4-DC1, serveur applicatif Ymmo, DNS interne |
| 20 | USR_SIEGE | `10.0.20.0/24` | `10.0.20.254` | Postes de travail (~30 utilisateurs) |
| 30 | PRT_SIEGE | `10.0.30.0/24` | `10.0.30.254` | Imprimantes (isolé, aucune communication inter-VLAN) |
| 99 | MGT_SIEGE | `10.0.99.0/24` | `10.0.99.254` | Administration — seul réseau autorisé à atteindre l'infra |

Adresses fixes dans le VLAN SRV (10) :

| IP | Machine | Rôle |
|---|---|---|
| `10.0.10.1` | Samba4-DC1 | Contrôleur de domaine Active Directory |
| `10.0.10.254` | OPNsense (interface VLAN 10) | Passerelle du VLAN SRV |

### 2.3 Agences — Sites 1 à 12 (`10.N.0.0/16`)

Chaque agence compte ~5 postes commerciaux et une imprimante. Deux VLANs par site, numérotés de façon identique au siège pour la cohérence des règles de filtrage.

| VLAN | Nom | Réseau (Agence N) | Passerelle |
|---|---|---|---|
| 20 | USR_AGENCE | `10.N.20.0/24` | `10.N.20.254` |
| 30 | PRT_AGENCE | `10.N.30.0/24` | `10.N.30.254` |

Périmètre déployé : Agences 01 et 02. Agences 03–12 : plages réservées, non instanciées.

### 2.4 Backbone VPN WireGuard (`10.254.0.0/24`)

Réseau de transport dédié aux tunnels site-à-site, hors des plages de sites pour éviter tout chevauchement.

| IP tunnel | Peer | Rôle |
|---|---|---|
| `10.254.0.1` | OPNsense-Master | Concentrateur VPN siège |
| `10.254.0.2` | Bastion | Jump host Ansible (accès aux VLANs internes) |
| `10.254.0.11` | Agence-01 | Endpoint agence 01 |
| `10.254.0.12` | Agence-02 | Endpoint agence 02 |
| `10.254.0.1N` | Agence-0N | Endpoint agence N (pattern pour les agences 03–12) |

WireGuard est préféré à IPSec : performances supérieures, configuration déclarative plus simple à scripter via l'API OPNsense.

### 2.5 Interfaces réseau Proxmox

| Bridge Proxmox | Rôle |
|---|---|
| `vmbr0` | WAN — connectivité externe (192.168.10.0/24) |
| `YmmoTom` | LAN interne — tronc VLAN taggé (VLANs 10, 20, 30, 99) |

OPNsense-Master est connecté aux deux bridges. Les autres VMs internes n'ont qu'une interface sur `YmmoTom` avec un VLAN ID configuré.

---

## 3. Flux de déploiement

### Phase 1 — Packer : construction des templates

Deux templates sont construits et stockés comme templates Proxmox :

**Template Debian 12 (ID 9000)**
- Fichier : `packer/debian-12.pkr.hcl`
- Installation automatisée via `packer/http/preseed.cfg`
- 4 scripts de provisioning : mise à jour → durcissement → cloud-init → nettoyage
- Utilisé par : Bastion, Samba4-DC1, Agence-01, Agence-02

**Template OPNsense (ID 9001)**
- Fichier : `packer/opnsense.pkr.hcl`
- Basé sur FreeBSD, un seul script de setup, pas de preseed
- Utilisé par : OPNsense-Master

### Phase 2 — Terraform : provisionnement des VMs

Provider `bpg/proxmox` ~> 0.100. Nécessite un token API pour la gestion des ressources et un agent SSH pour l'upload des snippets Cloud-init sur le nœud Proxmox.

**Source de vérité topologique : `terraform/main.tf`**

Le bloc `locals.sites` est la référence unique de la topologie. Il définit pour chaque site : nom, `site_id`, nœud Proxmox cible, stockage, bridges réseau. Ajouter une agence = étendre cette map et ajouter un bloc dans `zone-agences.tf`.

**Fichiers de zone :**

`zone-infra.tf` — VMs du siège :
- `OPNsense-Master` : 2 vCPU, 4 Go RAM, interfaces WAN + LAN, clone template 9001
- `Bastion` : 1 vCPU, 512 Mo RAM, interface WAN uniquement, Cloud-init avec clé SSH
- `Samba4-DC1` : 2 vCPU, 4 Go RAM, VLAN 10, IP statique `10.0.10.1/24`, Cloud-init

`zone-agences.tf` — VMs agences (une VM Debian par agence, endpoint WireGuard) :
- `Agence-01` : 1 vCPU, 1 Go RAM, interface WAN, Cloud-init avec clé SSH
- `Agence-02` : idem, site_id 2

**Injection Cloud-init :**

Le template `terraform/templates/cloud-init-debian.yml.tftpl` est uploadé comme snippet Proxmox. Il configure le hostname et les clés SSH autorisées. Le bloc `lifecycle.ignore_changes` sur `user_data_file_id` empêche un re-upload à chaque plan.

### Phase 3 — Ansible : configuration post-déploiement

**Inventaire dynamique :** plugin `community.proxmox.proxmox` configuré dans `ansible/inventory/`. Filtre les VMs taguées `ymmotom` et les groupe par tag Proxmox.

Groupes utilisés dans les playbooks :

| Groupe | Tag Proxmox | VMs ciblées |
|---|---|---|
| `tag_router` | `router` | OPNsense-Master |
| `tag_bastion` | `bastion` | Bastion |
| `tag_samba4` | `samba4` | Samba4-DC1 |
| `tag_agence` | `agence` | Agence-01, Agence-02 |

**Playbooks, dans l'ordre d'exécution recommandé :**

1. `opnsense_setup.yml` — bootstrap OPNsense : accès API, configuration de base
2. `opnsense_network.yml` — VLANs, DHCP Dnsmasq, règles firewall
3. `wireguard.yml` — génération des clés, configuration des peers, activation des tunnels
4. `samba4.yml` — installation et provisionnement du contrôleur de domaine AD

OPNsense est configuré exclusivement via l'API HTTP (collection `oxlorg.opnsense` 25.7.8). Les playbooks OPNsense utilisent `gather_facts: false` — OPNsense tourne sur FreeBSD sans Python.

Le Bastion sert de jump host pour atteindre les VMs sur les VLANs internes. Le tunnel WireGuard `10.254.0.2` du Bastion est établi avant de rejouer les playbooks vers les VMs internes.

---

## 4. Décisions techniques

### Routeur / Firewall — OPNsense

OPNsense est retenu pour son API REST complète, qui permet une automatisation Ansible sans accès SSH. La collection `oxlorg.opnsense` couvre la gestion des interfaces, VLANs, règles NAT/firewall, DHCP et WireGuard.

### DHCP — Dnsmasq (intégré OPNsense)

Dnsmasq est le service DHCP retenu sur OPNsense. Il couvre également la résolution DNS dynamique des baux DHCP, ce qui simplifie l'intégration avec le DNS interne. Kea DHCP a été écarté — non natif sur OPNsense et plus complexe à maintenir dans ce contexte.

### DNS interne — Dnsmasq (OPNsense) + Samba4

La résolution DNS interne des postes du domaine est assurée par Samba4-DC1 (`10.0.10.1`), qui agit comme serveur DNS autoritaire pour la zone AD. OPNsense transfert les requêtes DNS internes vers Samba4.

### Annuaire — Samba4 en mode AD DC

Le cahier des charges requiert Active Directory et GPO. Samba4 est la seule implémentation libre production-ready compatible avec ces protocoles (LDAP, Kerberos, GPO, clients Windows et Linux). Il est déployé sur Samba4-DC1 dans le VLAN SRV du siège.

### Contrôleur de domaine unique (démo)

Un seul DC est déployé (Samba4-DC1). Un second DC de réplication est prévu pour la production mais n'est pas instancié dans le périmètre démo.

### VPN site-à-site — WireGuard (plugin OPNsense)

WireGuard est intégré nativement dans OPNsense. Ses avantages dans ce contexte : configuration entièrement déclarative via l'API OPNsense, performances supérieures à IPSec, footprint minimal, paires de clés gérables par Ansible. Chaque agence est un peer WireGuard configuré sur OPNsense-Master.

### Bastion comme point d'entrée Ansible

Le Bastion (`192.168.10.43`) est la seule VM accessible directement depuis le réseau de contrôle. Il dispose d'une interface WireGuard (`10.254.0.2`) qui lui donne accès aux VLANs internes via le tunnel. Cela évite d'exposer l'ensemble de l'infrastructure sur le WAN.

### Cloud-init pour la configuration initiale des VMs

Cloud-init est injecté par Terraform via un snippet Proxmox. Il configure uniquement le hostname et les clés SSH autorisées — assez pour qu'Ansible puisse atteindre la VM. Toute la configuration applicative relève d'Ansible, pas de Cloud-init.

### Module Terraform `modules/vm`

Un module unique gère la création de toutes les VMs : clone depuis template, interfaces réseau dynamiques (avec VLAN ID optionnel), upload du snippet Cloud-init, IP statique via le bloc `initialization`. Ce module est l'unique point de création de VM — aucune ressource `proxmox_virtual_environment_vm` n'est instanciée directement dans les fichiers de zone.

---

## 5. Périmètre déployé vs. cible

| Composant | Démo (déployé) | Cible production |
|---|---|---|
| OPNsense-Master | 1 instance | 1 instance (+ redondance envisagée) |
| Bastion | 1 instance | 1 instance |
| Samba4 AD DC | 1 DC (DC1) | 2 DC (réplication) |
| Agences | 2 (Agence-01, Agence-02) | Jusqu'à 12 |
| Stack applicative Ymmo | Non déployée via ce pipeline | Docker Compose sur VM dédiée VLAN 10 |

---

## 6. Récapitulatif des plages IP réservées

| Bloc | Usage | Statut |
|---|---|---|
| `10.0.0.0/16` | Siège Social | Déployé |
| `10.1.0.0/16` | Agence 01 | Déployé (démo) |
| `10.2.0.0/16` | Agence 02 | Déployé (démo) |
| `10.3.0.0/16` – `10.12.0.0/16` | Agences 03–12 | Réservé, non instancié |
| `10.254.0.0/24` | Backbone WireGuard | Déployé |
| `10.255.0.0/24` | Réservé usage futur | Non instancié |
| `192.168.10.0/24` | WAN Proxmox (réseau physique) | Hors périmètre IaC |
