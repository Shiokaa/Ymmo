# Plan d'Architecture Infrastructure

## Vue d'ensemble

Ce document décrit l'architecture complète de l'infrastructure, couvrant le provisioning automatisé, le cœur réseau, la gestion des identités, la stack applicative et la configuration post-déploiement.

---

## 1. Fondations de l'Infrastructure (Provisioning)

### Templates — Packer

Les images de base sont construites automatiquement via **Packer**, garantissant que toutes les VM partent d'une base saine et identique.

- Template **Debian** (serveurs applicatifs, DNS, DHCP, Samba)
- Template **OPNsense** (routeur/pare-feu)

### Déploiement — Terraform + Provider Proxmox

Terraform clone les templates Packer pour instancier l'infrastructure complète :

| Composant   | Quantité | Rôle                             |
| ----------- | -------- | -------------------------------- |
| VM OPNsense | 1        | Routeur principal                |
| VM Serveurs | N        | Hébergement siège                |
| VM Agences  | 12       | Simulation des agences distantes |

---

## 2. Cœur de Réseau

### Routeur / Pare-feu — OPNsense

Solution robuste et hautement configurable. L'API intégrée permet une automatisation via Ansible.

### VPN Site-à-Site — WireGuard (plugin OPNsense)

Tunnels sécurisés entre le siège et les 12 agences.

> Choix justifié : WireGuard est plus performant qu'IPSec et nettement plus simple à scripter.

### DNS — PowerDNS

Solution entreprise adossée à une base de données, permettant la gestion des zones DNS via l'IaC (API + Ansible).

### DHCP — Dnsmasq (intégré à OPNsense)

> Le choix définitif s'est porté sur **Dnsmasq** (en remplacement de Kea DHCP qui est désormais considéré comme obsolète pour notre cas d'usage).

**Dnsmasq** est le standard retenu pour ce projet :

- **Garantit la résolution DNS dynamique** de manière fiable sur OPNsense 26.1.
- Simplifie l'intégration entre le service DHCP et le DNS interne.
- Extrêmement léger et nativement supporté par OPNsense.

---

## 3. Gestion des Identités et des Fichiers

> Le cahier des charges exige Active Directory et GPO. L'alternative 100% Linux retenue est **Samba4 en mode AD DC** — le seul remplacement transparent production-ready.

### Annuaire — Samba4 (Active Directory Domain Controller)

Samba4 intègre un contrôleur de domaine complet, compatible avec les protocoles Microsoft :

- **LDAP** + **Kerberos** natifs
- Authentification centralisée des utilisateurs sur l'ensemble de l'infrastructure
- Compatible avec les GPO et les clients Windows/Linux

### Serveur de Fichiers — Samba (membre du domaine)

Gestion des partages et des droits via les **ACL POSIX**, appliquées de manière déclarative par Ansible :

| Pôle         | Droits                              |
| ------------ | ----------------------------------- |
| Direction    | Lecture / Écriture                  |
| Autres pôles | Accès restreint (interdits croisés) |

---

## 4. Stack Applicative — Plateforme Ymmo

L'application de gestion des transactions immobilières et d'analyse de données est hébergée sur les serveurs Debian.

### Conteneurisation — Docker & Docker Compose

| Service         | Technologie      |
| --------------- | ---------------- |
| Backend         | Java Spring Boot |
| Frontend        | Angular          |
| Base de données | PostgreSQL       |

### Reverse Proxy — Nginx / Traefik

Placé devant les conteneurs pour assurer :

- Routage **HTTP/HTTPS**
- Gestion des **certificats SSL**
- Terminaison TLS

---

## 5. Configuration Post-Déploiement — Ansible

Une fois les VM provisionnées par Terraform, Ansible prend le relais de façon **idempotente**.

### Périmètre d'action

```none
Terraform (VM UP)
│
▼
Ansible
├── Serveurs applicatifs
│   ├── Installation de Docker
│   └── Déploiement docker-compose.yml + démarrage des services
├── Annuaire & Fichiers
│   ├── Configuration Samba4 (AD DC)
│   ├── Configuration Samba (serveur membre)
│   └── Application des ACL POSIX
└── Réseau
├── Configuration PowerDNS
├── Configuration Dnsmasq
└── Règles OPNsense (API / modules Ansible)
```

---

## Stack Technologique — Récapitulatif

| Couche        | Outil                   | Rôle                         |
| ------------- | ----------------------- | ---------------------------- |
| Build images  | Packer                  | Templates VM reproductibles  |
| IaC           | Terraform + bpg/proxmox | Provisioning des VM          |
| Réseau        | OPNsense                | Routage, pare-feu, DHCP      |
| VPN           | WireGuard               | Tunnels site-à-site          |
| DNS           | PowerDNS                | Résolution interne           |
| DHCP          | Dnsmasq                 | Attribution d'adresses et DNS dynamique |
| Identités     | Samba4 AD DC            | Authentification centralisée |
| Fichiers      | Samba + ACL POSIX       | Partages et droits           |
| Conteneurs    | Docker + Compose        | Runtime applicatif           |
| Reverse Proxy | Nginx / Traefik         | Routage HTTP/S, TLS          |
| Config Mgmt   | Ansible                 | Post-déploiement idempotent  |

## 6. Plan d'Adressage IP et Segmentation Réseau (VLANs)

L'adressage de l'infrastructure Ymmo repose sur le bloc privé `10.0.0.0/8` (RFC 1918). La segmentation suit une logique hiérarchique à trois niveaux encodée directement dans l'IP :

```
10. [Site] . [Fonction] . [Hôte]
     │           │           └─ Identifiant de l'équipement (1–253)
     │           └─────────── VLAN / rôle fonctionnel
     └─────────────────────── Identifiant du site (0 = Siège, 1–12 = Agences)
```

Cette convention rend le plan d'adressage **auto-documenté** : à la simple lecture d'une IP, on identifie immédiatement le site et la fonction de l'équipement. Elle facilite également l'écriture des règles de pare-feu (filtrage par octet) et la supervision.

---

### 6.1. Siège Social (Aix-en-Provence) — Site `0`

**Périmètre :** \~30 postes de travail, 2 serveurs physiques, 1 imprimante. **Préfixe de site :** `10.0.X.X`

|  VLAN  | Nom         | Plage / Masque | Capacité  | Équipements / Rôle                                      | Passerelle    |
| :----: | :---------- | :------------- | :-------: | :------------------------------------------------------ | :------------ |
| **10** | `SRV_SIEGE` | `10.0.10.0/24` | 253 hôtes | Serveurs : Proxmox, Debian, Samba4 AD DC, PowerDNS, Dnsmasq | `10.0.10.254` |
| **20** | `USR_SIEGE` | `10.0.20.0/24` | 253 hôtes | Postes de travail utilisateurs (\~30)                   | `10.0.20.254` |
| **30** | `PRT_SIEGE` | `10.0.30.0/24` | 253 hôtes | Périphériques d'impression (isolation réseau)           | `10.0.30.254` |
| **99** | `MGT_SIEGE` | `10.0.99.0/24` | 253 hôtes | Management : accès administrateur à l'infra             | `10.0.99.254` |

> **Règle de sécurité :** Le VLAN `MGT_SIEGE` (99) est strictement isolé. Seules les IP de ce sous-réseau sont autorisées à initier des connexions SSH/HTTPS vers les équipements d'infrastructure. Le VLAN `PRT_SIEGE` (30) ne peut communiquer qu'avec les serveurs d'impression — aucune connexion inter-VLAN n'est permise par défaut.

**Adresses réservées remarquables :**

| IP            | Rôle                                           |
| :------------ | :--------------------------------------------- |
| `10.0.10.1`   | Samba4 AD DC (contrôleur de domaine principal) |
| `10.0.10.2`   | PowerDNS (résolution DNS interne)              |
| `10.0.10.3`   | Serveur applicatif Ymmo (Docker host)          |
| `10.0.10.254` | Interface OPNsense VLAN 10 (passerelle)        |

---

### 6.2. Agences — Sites `1` à `12`

**Périmètre par agence :** \~5 postes commerciaux, 1 imprimante. **Préfixe de site :** `10.[ID_AGENCE].X.X`

Chaque agence dispose de deux VLANs fonctionnels, alignés sur la même numérotation que le siège pour la cohérence des règles de filtrage :

| Site          | VLAN 20 — Utilisateurs | VLAN 30 — Imprimantes | Passerelle locale |
| :------------ | :--------------------- | :-------------------- | :---------------- |
| **Agence 01** | `10.1.20.0/24`         | `10.1.30.0/24`        | `10.1.X.254`      |
| **Agence 02** | `10.2.20.0/24`         | `10.2.30.0/24`        | `10.2.X.254`      |
| **Agence 03** | `10.3.20.0/24`         | `10.3.30.0/24`        | `10.3.X.254`      |
| **Agence 04** | `10.4.20.0/24`         | `10.4.30.0/24`        | `10.4.X.254`      |
| **Agence 05** | `10.5.20.0/24`         | `10.5.30.0/24`        | `10.5.X.254`      |
| **Agence 06** | `10.6.20.0/24`         | `10.6.30.0/24`        | `10.6.X.254`      |
| **Agence 07** | `10.7.20.0/24`         | `10.7.30.0/24`        | `10.7.X.254`      |
| **Agence 08** | `10.8.20.0/24`         | `10.8.30.0/24`        | `10.8.X.254`      |
| **Agence 09** | `10.9.20.0/24`         | `10.9.30.0/24`        | `10.9.X.254`      |
| **Agence 10** | `10.10.20.0/24`        | `10.10.30.0/24`       | `10.10.X.254`     |
| **Agence 11** | `10.11.20.0/24`        | `10.11.30.0/24`       | `10.11.X.254`     |
| **Agence 12** | `10.12.20.0/24`        | `10.12.30.0/24`       | `10.12.X.254`     |

---

### 6.3. Interconnexion VPN (WireGuard) — Réseau `254`

Le plan de transport VPN utilise un sous-réseau dédié hors des plages de sites, évitant tout risque de chevauchement.

| Réseau        | Plage / Masque  | Rôle                                     |
| :------------ | :-------------- | :--------------------------------------- |
| `VPN_WG_CORE` | `10.254.0.0/24` | Backbone WireGuard — tunnels Site-à-Site |

**Attribution des peers WireGuard :**

| IP Tunnel     | Peer                                  |
| :------------ | :------------------------------------ |
| `10.254.0.1`  | Siège (OPNsense — endpoint WireGuard) |
| `10.254.0.11` | Agence 01                             |
| `10.254.0.12` | Agence 02                             |
| _(...)_       | _(...)_                               |
| `10.254.0.22` | Agence 12                             |

---

### 6.4. Récapitulatif des Plages Réservées

| Bloc                           | Usage                  | Statut                     |
| :----------------------------- | :--------------------- | :------------------------- |
| `10.0.0.0/16`                  | Siège Social           | ✅ Déployé                 |
| `10.1.0.0/16` – `10.2.0.0/16`  | Agences 01–02          | ✅ Déployé (démo)          |
| `10.3.0.0/16` – `10.12.0.0/16` | Agences 03–12          | 🔒 Réservé (non instancié) |
| `10.254.0.0/24`                | Backbone VPN WireGuard | ✅ Déployé                 |
| `10.255.0.0/24`                | Réservé (usage futur)  | 🔒 Réservé                 |
