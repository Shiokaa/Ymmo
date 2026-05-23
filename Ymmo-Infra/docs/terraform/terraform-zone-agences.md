# Terraform — Zone Agences (Sites Distants)

> Ce document décrit les ressources déployées dans `terraform/zone-agences.tf`.
> Pour l'architecture générale et le workflow Terraform, voir `terraform.md`.

---

## Vue d'ensemble

La zone Agences simule les sites distants de l'entreprise. Chaque agence est
représentée par une VM Debian 12 qui sert d'endpoint WireGuard — elle établit
le tunnel VPN vers le siège et route le trafic de son réseau local.

```
zone-agences.tf
├── Agence-01   → Endpoint WireGuard site 1 (tunnel : 10.254.0.11)
└── Agence-02   → Endpoint WireGuard site 2 (tunnel : 10.254.0.12)
```

Seules les agences 01 et 02 sont instanciées (démo). Les agences 03 à 12 sont
réservées dans le plan d'adressage et peuvent être ajoutées en dupliquant les
blocs existants.

---

## Inventaire des VMs

| VM | Template | CPU | RAM | Réseau | Tags Proxmox |
|----|----------|-----|-----|--------|--------------|
| Agence-01 | 9000 — Debian 12 | 1 cœur | 1024 Mo | vmbr0 (WAN) | `ymmotom`, `agence`, `agence01` |
| Agence-02 | 9000 — Debian 12 | 1 cœur | 1024 Mo | vmbr0 (WAN) | `ymmotom`, `agence`, `agence02` |

---

## Agence-01

Endpoint WireGuard du site 1. Réseau agence : `10.1.0.0/16`. IP tunnel : `10.254.0.11`.

### Interface réseau

| Interface | Bridge Proxmox | Rôle | Mode |
|-----------|---------------|------|------|
| eth0 | vmbr0 | WAN | DHCP |

> **Pourquoi uniquement une interface WAN ?**
> Les VMs agences n'ont pas besoin d'un bridge interne Proxmox. Elles doivent
> uniquement atteindre l'IP WAN d'OPNsense pour initier le tunnel WireGuard.
> Le réseau interne de l'agence (`10.1.0.0/16`) est routé via le tunnel,
> pas via un bridge Proxmox supplémentaire.

### Tags Proxmox

`ymmotom`, `agence`, `agence01`

Le tag `agence` est utilisé par l'inventaire dynamique Ansible pour créer
automatiquement le groupe `tag_agence`. Ce groupe reçoit la configuration
WireGuard (client) via le rôle `debian_wireguard`.

Le tag `agence01` permet de cibler spécifiquement cette VM si nécessaire
(ex. : `--limit tag_agence01`).

### Cloud-init

| Variable | Valeur |
|----------|--------|
| `hostname` | `agence-01` |
| `ssh_public_keys` | `var.sysadmin_ssh_public_keys` |

L'utilisateur de connexion SSH est `sysadmin`, défini par cloud-init.
L'inventaire dynamique surcharge `ansible_user` vers `sysadmin` pour tout
le groupe `tag_agence` via `group_vars/tag_agence/main.yml`.

### Post-déploiement

La configuration WireGuard (génération des clés, enregistrement comme peer
OPNsense, écriture de `wg0.conf`, démarrage du service) est entièrement
gérée par Ansible :

```bash
make ansible-wireguard
```

Voir `docs/ansible/wireguard.md` pour le détail complet.

---

## Agence-02

Endpoint WireGuard du site 2. Réseau agence : `10.2.0.0/16`. IP tunnel : `10.254.0.12`.

Configuration identique à Agence-01, avec les valeurs propres au site 2 :

| Paramètre | Valeur |
|-----------|--------|
| `hostname` (cloud-init) | `agence-02` |
| Tags Proxmox | `ymmotom`, `agence`, `agence02` |
| IP tunnel WireGuard | `10.254.0.12/32` |
| Réseau agence routé | `10.2.0.0/16` |

---

## Ajouter une agence (03 à 12)

Pour instancier une nouvelle agence, trois fichiers sont à modifier :

### 1. `terraform/zone-agences.tf`

Dupliquer le bloc `module "agence_02"` en incrémentant les valeurs :

```hcl
module "agence_03" {
  source = "./modules/vm"

  vm_name      = "Agence-03"
  node_name    = local.sites.agence_03.target_node
  source_vm_id = 9000
  memory       = 1024
  cpu_cores    = 1
  storage_id   = local.sites.agence_03.storage_id
  tags         = ["ymmotom", "agence", "agence03"]

  network_interfaces = [
    {
      bridge = local.sites.agence_03.wan_bridge
    }
  ]

  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "agence-03"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
}
```

### 2. `terraform/main.tf` — locals

Vérifier que l'entrée `agence_03` existe dans le bloc `locals.sites`. Si non,
l'ajouter (même structure que `agence_01` et `agence_02`).

### 3. `ansible/roles/opnsense_wireguard/defaults/main.yml`

Ajouter le peer dans la liste `wireguard_peers` :

```yaml
- name: "Agence-03"
  inventory_hostname: "Agence-03"
  tunnel_ip: "10.254.0.13/32"
  allowed_ips: "10.3.0.0/16"
```

### 4. `ansible/inventory/host_vars/Agence-03/main.yml`

Créer le fichier avec l'IP tunnel :

```yaml
wireguard_peer_tunnel_ip: "10.254.0.13/32"
```

### 5. Appliquer

```bash
make tf-plan    # vérifier ce qui sera créé
make tf-apply   # provisionner la VM
make ansible-wireguard  # configurer WireGuard de bout en bout
```

---

## Points d'attention

| Point | Détail |
|-------|--------|
| Interface WAN uniquement | Intentionnel. Les agences n'ont pas de bridge interne — elles atteignent OPNsense via `vmbr0` et utilisent WireGuard pour le reste. Ajouter un bridge interne n'est nécessaire que si l'agence doit héberger d'autres VMs derrière elle. |
| IP WAN dynamique | L'IP est attribuée par DHCP sur `vmbr0`. L'inventaire dynamique Proxmox (QEMU guest agent) la résout automatiquement — aucune IP hardcodée dans l'inventaire. |
| `ansible_user: sysadmin` | L'inventaire dynamique fixe `ansible_user: root` pour tous les hôtes par défaut. Le fichier `group_vars/tag_agence/main.yml` surcharge cette valeur vers `sysadmin` pour les VMs agences. |
| Dimensionnement minimal | 1 CPU / 1024 Mo est suffisant pour un endpoint WireGuard pur. À augmenter si la VM doit héberger d'autres services (routage inter-VLAN, DNS local, etc.). |
| Extension 03–12 | Le plan d'adressage réserve `10.3.0.0/16` à `10.12.0.0/16` et `10.254.0.13` à `10.254.0.22` pour les agences restantes. Voir `docs/plan.md` section 6.2 et 6.3. |
