# Terraform — Zone Agences (Sites Distants)

> Ce document décrit les ressources déployées dans `terraform/zone-agences.tf`
> et la procédure pour étendre l'infrastructure à de nouvelles agences.
> Pour l'architecture générale et le module VM, voir `terraform.md`.

---

## Vue d'ensemble

La zone Agences simule les sites distants de l'entreprise. Chaque agence est
représentée par une VM Debian 12 qui joue le rôle d'endpoint WireGuard : elle
établit le tunnel VPN site-à-site vers le siège (OPNsense-Master) et route le
trafic de son réseau local à travers ce tunnel.

```
zone-agences.tf
├── Agence-01   → Endpoint WireGuard site 1 — réseau : 10.1.0.0/16, tunnel : 10.254.0.11
└── Agence-02   → Endpoint WireGuard site 2 — réseau : 10.2.0.0/16, tunnel : 10.254.0.12
```

Seules les agences 01 et 02 sont instanciées (démo projet). Les agences 03 à 12
sont réservées dans le plan d'adressage et peuvent être ajoutées en suivant la
procédure ci-dessous.

---

## Inventaire des VMs

| VM | Module Terraform | Template | CPU | RAM | Disque | Réseau | Tags Proxmox |
|----|-----------------|----------|-----|-----|--------|--------|--------------|
| Agence-01 | `module.agence_01` | 9000 — Debian 12 | 1 vCPU | 1024 Mo | 20 Go | vmbr0 — DHCP | `ymmotom`, `agence`, `agence01` |
| Agence-02 | `module.agence_02` | 9000 — Debian 12 | 1 vCPU | 1024 Mo | 20 Go | vmbr0 — DHCP | `ymmotom`, `agence`, `agence02` |

---

## Agence-01

Endpoint WireGuard du site 1. Réseau agence : `10.1.0.0/16`. IP tunnel : `10.254.0.11/32`.

### Interface réseau

| Bridge Proxmox | VLAN ID | Rôle | Adresse |
|---------------|---------|------|---------|
| vmbr0 | aucun | WAN | DHCP |

Connexion directe sur `vmbr0` — même bridge que le WAN d'OPNsense. La VM doit
pouvoir joindre l'IP WAN d'OPNsense-Master pour initier le tunnel WireGuard.
Le réseau interne de l'agence (`10.1.0.0/16`) est routé via le tunnel, pas via
un bridge Proxmox supplémentaire.

### Tags Proxmox

`ymmotom`, `agence`, `agence01`

- `ymmotom` : inclusion dans l'inventaire dynamique Ansible (filtre obligatoire)
- `agence` : groupe `tag_agence` — reçoit la configuration WireGuard client via Ansible
- `agence01` : ciblage spécifique (`--limit tag_agence01`)

### Cloud-init

Template : `terraform/templates/cloud-init-debian.yml.tftpl`

| Variable | Valeur |
|----------|--------|
| `hostname` | `agence-01` |
| `ssh_public_keys` | contenu de `var.sysadmin_ssh_public_keys` |

Utilisateur de connexion SSH créé par cloud-init : `sysadmin`.

### Post-déploiement

La configuration WireGuard (génération des clés, inscription comme peer sur OPNsense,
écriture de `wg0.conf`, démarrage du service) est intégralement appliquée par Ansible.

---

## Agence-02

Endpoint WireGuard du site 2. Réseau agence : `10.2.0.0/16`. IP tunnel : `10.254.0.12/32`.

Configuration identique à Agence-01, avec les valeurs propres au site 2 :

| Paramètre | Valeur |
|-----------|--------|
| `hostname` cloud-init | `agence-02` |
| Tags Proxmox | `ymmotom`, `agence`, `agence02` |
| IP tunnel WireGuard | `10.254.0.12/32` |
| Réseau agence routé | `10.2.0.0/16` |

---

## Ajouter une agence (03 a 12)

L'ajout d'une agence nécessite de modifier deux fichiers Terraform et deux fichiers
Ansible. La procédure est illustrée pour l'agence 03 — adapter les numéros pour
les agences suivantes.

### Plan d'adressage de référence

| Agence | site_id | Réseau local | IP tunnel WireGuard |
|--------|---------|-------------|---------------------|
| 01 | 1 | 10.1.0.0/16 | 10.254.0.11/32 |
| 02 | 2 | 10.2.0.0/16 | 10.254.0.12/32 |
| 03 | 3 | 10.3.0.0/16 | 10.254.0.13/32 |
| 04 | 4 | 10.4.0.0/16 | 10.254.0.14/32 |
| ... | ... | ... | ... |
| 12 | 12 | 10.12.0.0/16 | 10.254.0.22/32 |

### Etape 1 — Etendre locals.sites dans main.tf

Ouvrir `terraform/main.tf` et ajouter l'entrée `agence_03` dans le bloc `locals.sites` :

```hcl
agence_03 = {
  name            = "Agence 03"
  site_id         = 3
  target_node     = "node2"
  storage_id      = "local-lvm"
  internal_bridge = "YmmoTom"
  wan_bridge      = "vmbr0"
}
```

### Etape 2 — Ajouter la VM dans zone-agences.tf

Ouvrir `terraform/zone-agences.tf` et ajouter le bloc suivant à la suite des blocs
existants :

```hcl
# Agence 03 — Site 3 (réseau : 10.3.0.0/16, tunnel WG : 10.254.0.13)
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

### Etape 3 — Enregistrer le peer WireGuard dans Ansible

Ajouter l'agence dans la liste des peers WireGuard gérés par OPNsense.
Fichier cible : `ansible/roles/opnsense_wireguard/defaults/main.yml`

```yaml
- name: "Agence-03"
  inventory_hostname: "Agence-03"
  tunnel_ip: "10.254.0.13/32"
  allowed_ips: "10.3.0.0/16"
```

### Etape 4 — Creer les host_vars pour la nouvelle VM

Créer le fichier `ansible/inventory/host_vars/Agence-03/main.yml` :

```yaml
wireguard_peer_tunnel_ip: "10.254.0.13/32"
```

### Etape 5 — Appliquer

```bash
# Vérifier ce qui sera créé (doit afficher uniquement module.agence_03)
make tf-plan

# Provisionner la VM
make tf-apply

# Configurer WireGuard de bout en bout (agence + OPNsense)
ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_network.yml
ansible-playbook -i ansible/inventory/ ansible/playbooks/bastion_setup.yml --limit tag_agence03
```

---

## Points d'attention

| Point | Détail |
|-------|--------|
| Interface WAN uniquement | Intentionnel — les VMs agences n'ont pas de bridge interne Proxmox. Elles atteignent OPNsense via `vmbr0` et le reste du trafic passe par le tunnel WireGuard. Ajouter un bridge interne uniquement si l'agence doit héberger d'autres VMs derrière elle. |
| IP WAN dynamique | Attribuée par DHCP sur `vmbr0`. L'inventaire dynamique Proxmox la résout via le QEMU guest agent — aucune IP hardcodée dans l'inventaire. |
| ansible_user | L'inventaire dynamique fixe `ansible_user: root` par défaut. Le fichier `ansible/inventory/group_vars/tag_agence/main.yml` surcharge cette valeur vers `sysadmin` pour toutes les VMs agences. |
| Dimensionnement | 1 vCPU / 1024 Mo est suffisant pour un endpoint WireGuard pur. Augmenter si la VM doit héberger d'autres services (routage inter-VLAN, DNS local...). |
| Interdépendance OPNsense | Le tunnel WireGuard ne peut pas s'établir tant qu'OPNsense-Master n'est pas configuré et que son IP WAN n'est pas connue. Toujours déployer et configurer OPNsense avant de lancer le playbook WireGuard sur les agences. |
