# Terraform — Zone Infrastructure (Siège Social, Site 0)

> Ce document décrit les ressources déployées dans `terraform/zone-infra.tf`.
> Pour l'architecture générale, le workflow et le module VM, voir `terraform.md`.

---

## Vue d'ensemble

La zone Infrastructure héberge les composants critiques du siège social (site 0,
bloc `10.0.0.0/16`). Ces VMs doivent être opérationnelles avant les zones agences
et avant l'exécution des playbooks Ansible.

```
zone-infra.tf
├── OPNsense-Master   → Routeur / pare-feu principal (template 9001)
├── Samba4-DC1        → Contrôleur de domaine Active Directory (template 9000)
└── Bastion           → Jump host SSH / point d'entrée Ansible (template 9000)
```

Toutes les valeurs de site sont lues depuis `local.sites.siege` défini dans `main.tf`.

---

## Inventaire des VMs

| VM | Module Terraform | Template | CPU | RAM | Disque | IP |
|----|-----------------|----------|-----|-----|--------|----|
| OPNsense-Master | `module.opnsense_master` | 9001 — OPNsense 26.1 | 2 vCPU | 4096 Mo | 20 Go | WAN : DHCP sur vmbr0 |
| Samba4-DC1 | `module.samba4_dc1` | 9000 — Debian 12 | 2 vCPU | 4096 Mo | 20 Go | 10.0.10.1/24 |
| Bastion | `module.bastion` | 9000 — Debian 12 | 1 vCPU | 512 Mo | 20 Go | DHCP sur vmbr0 |

---

## OPNsense-Master

Routeur et pare-feu principal du siège. VM unique — la haute disponibilité n'est
pas requise dans le cadre du projet.

### Interfaces réseau

| Index | Bridge Proxmox | Rôle | Adresse |
|-------|---------------|------|---------|
| 0 (vtnet0) | YmmoTom | LAN Trunk — tronc de tous les VLANs internes | Configurée par OPNsense |
| 1 (vtnet1) | vmbr0 | WAN | DHCP |

L'interface LAN (vtnet0) est connectée au bridge interne `YmmoTom`. OPNsense gère
les sous-interfaces VLAN (10, 20, 30, 99...) directement dans son interface web.
L'IP WAN est attribuée en DHCP et découverte automatiquement par l'inventaire
dynamique Ansible via le QEMU guest agent — aucune IP WAN hardcodée.

### Tags Proxmox

`ymmotom`, `infra`, `router`

Le tag `ymmotom` est obligatoire pour que la VM apparaisse dans l'inventaire
dynamique Ansible (filtrage `proxmox.proxmox.yml`).
Le tag `router` crée automatiquement le groupe `tag_router` dans l'inventaire,
utilisé par les playbooks OPNsense.

### Cloud-init

Aucun. OPNsense (FreeBSD) ne supporte pas cloud-init. L'intégralité de la
configuration (règles firewall, interfaces VLAN, WireGuard, DNS, routes) est
appliquée après déploiement par Ansible via l'API REST OPNsense.

### Post-déploiement

```bash
# Vérifier que la VM est visible dans l'inventaire avec son IP WAN
ansible-inventory -i ansible/inventory/ --host OPNsense-Master

# Appliquer la configuration initiale
ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_setup.yml
ansible-playbook -i ansible/inventory/ ansible/playbooks/opnsense_network.yml
```

---

## Samba4-DC1

Contrôleur de domaine Active Directory (implémentation Samba4). Premier serveur
du VLAN Serveurs du siège.

### Interface réseau

| Bridge Proxmox | VLAN ID | IP statique | Passerelle |
|---------------|---------|-------------|------------|
| YmmoTom | 10 (SRV_SIEGE) | 10.0.10.1/24 | 10.0.10.254 |

L'IP statique et la gateway sont injectées par cloud-init au premier démarrage.
La gateway `10.0.10.254` est l'interface OPNsense sur le VLAN 10 — OPNsense doit
donc être opérationnel avant que Samba4 puisse joindre l'extérieur.

### Tags Proxmox

`ymmotom`, `samba4`, `ad-dc`, `infra`

Le tag `samba4` crée le groupe `tag_samba4` dans l'inventaire dynamique.

### Cloud-init

Template : `terraform/templates/cloud-init-debian.yml.tftpl`

| Variable | Valeur |
|----------|--------|
| `hostname` | `dc1` |
| `ssh_public_keys` | contenu de `var.sysadmin_ssh_public_keys` |

Le template cloud-init crée l'utilisateur `sysadmin` avec sudo sans mot de passe,
injecte les clés SSH autorisées, démarre le QEMU guest agent et configure
`/etc/sudoers.d/ansible` pour désactiver `use_pty` (compatibilité Ansible pipelining).

### Post-déploiement

La promotion en AD DC, la création des GPO et la configuration des partages Sysvol
sont appliquées par Ansible après provisionnement.

---

## Bastion

Jump host SSH minimal. Point d'entrée pour tous les playbooks Ansible ciblant
des hôtes sur les VLANs internes (`10.0.X.X`) non accessibles directement depuis
le control node.

### Interface réseau

| Bridge Proxmox | VLAN ID | Réseau | IP |
|---------------|---------|--------|----|
| vmbr0 | aucun | 192.168.10.0/24 (réseau physique hôte) | DHCP |

Connexion directe sur `vmbr0`, le même bridge physique que le WAN d'OPNsense.
Le bastion est donc joignable depuis le control node sans traverser le pare-feu interne.
Le tunnel WireGuard (`10.254.0.2/32`), configuré par Ansible après déploiement,
donne ensuite accès aux VLANs internes.

### Tags Proxmox

`ymmotom`, `bastion`, `infra`

Le tag `bastion` crée le groupe `tag_bastion` dans l'inventaire dynamique.

### Cloud-init

Template : `terraform/templates/cloud-init-debian.yml.tftpl`

| Variable | Valeur |
|----------|--------|
| `hostname` | `bastion` |
| `ssh_public_keys` | contenu de `var.sysadmin_ssh_public_keys` |

### Post-déploiement

Terraform injecte la clé SSH via cloud-init. La configuration WireGuard
(tunnel `10.254.0.2/32` vers OPNsense) est appliquée par Ansible :

```bash
# Vérifier la connectivité SSH directe (sans passer par le bastion)
ssh sysadmin@<ip-bastion>

# Configurer WireGuard sur le bastion
ansible-playbook -i ansible/inventory/ ansible/playbooks/bastion_setup.yml
```

Pour que tous les playbooks Ansible ciblant les VLANs internes passent par le
bastion, configurer `ProxyJump` dans `~/.ssh/config` :

```
Host 10.0.*
  ProxyJump sysadmin@<ip-bastion>
```

---

## Ajouter une VM dans cette zone

1. Ouvrir `terraform/zone-infra.tf` et ajouter un bloc `module` :

```hcl
module "ma_nouvelle_vm" {
  source = "./modules/vm"

  vm_name      = "Nom-VM"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9000
  memory       = 2048
  cpu_cores    = 2
  storage_id   = local.sites.siege.storage_id
  tags         = ["ymmotom", "mon-tag"]

  network_interfaces = [
    {
      bridge  = local.sites.siege.internal_bridge
      vlan_id = 10
    }
  ]

  ipv4_config = {
    address = "10.0.10.5/24"
    gateway = "10.0.10.254"
  }

  user_data_template = "${path.module}/templates/cloud-init-debian.yml.tftpl"
  user_data_vars = {
    hostname        = "ma-vm"
    ssh_public_keys = var.sysadmin_ssh_public_keys
  }
}
```

2. Vérifier le plan : `make tf-plan`
3. Appliquer : `make tf-apply`

---

## Points d'attention

| Point | Détail |
|-------|--------|
| Ordre de déploiement | OPNsense doit être démarré et sa configuration réseau appliquée avant que les VMs sur les VLANs internes puissent joindre leurs gateways. Terraform provisionne les VMs en parallèle — prévoir d'appliquer Ansible dans l'ordre : OPNsense → Bastion → reste. |
| IP WAN OPNsense | Change à chaque redéploiement (DHCP sur vmbr0). L'inventaire dynamique Proxmox (QEMU guest agent) la résout automatiquement. |
| Gateway Samba4 | `10.0.10.254` est l'interface OPNsense sur le VLAN 10. Si OPNsense est arrêté, Samba4 ne peut pas atteindre l'extérieur. |
| Bastion — WireGuard | Le tunnel WireGuard (`10.254.0.2/32`) n'est pas configuré par Terraform. Tant que le playbook Ansible n'a pas tourné, le bastion n'est accessible que via `vmbr0` en direct. |
| lifecycle.ignore_changes | Le snippet cloud-init n'est uploadé qu'au premier déploiement. Pour forcer un re-upload (changement de clé SSH par exemple), détruire et recréer la VM ou supprimer le snippet Proxmox manuellement. |
