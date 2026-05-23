# Terraform — Zone Infrastructure (Siège Social)

> Ce document décrit les ressources déployées dans `terraform/zone-infra.tf`.
> Pour l'architecture générale et le workflow Terraform, voir `terraform.md`.

---

## Vue d'ensemble

La zone Infrastructure est le cœur du réseau du siège social. Elle contient les
composants critiques qui doivent être opérationnels avant tout le reste.

```
zone-infra.tf
├── OPNsense-Master   → Routeur / pare-feu (template 9001)
└── Samba4-DC1        → Contrôleur de domaine Active Directory (template 9000)
```

---

## Inventaire des VMs

| VM | Template | CPU | RAM | Disque | Réseau |
|----|----------|-----|-----|--------|--------|
| OPNsense-Master | 9001 — OPNsense 26.1 | 2 cœurs | 4096 Mo | 20 Go | vtnet0 (LAN), vtnet1 (WAN) |
| Samba4-DC1 | 9000 — Debian 12 | 2 cœurs | 4096 Mo | 20 Go | VLAN 10 — 10.0.10.1/24 |

---

## OPNsense-Master

Routeur/pare-feu principal du siège. VM unique — la HA n'est pas requise dans le cadre du projet.

### Interfaces réseau

| Interface FreeBSD | Bridge Proxmox | Rôle | Mode |
|-------------------|---------------|------|------|
| vtnet0 | YmmoTom | LAN Trunk (VLANs internes) | Géré par OPNsense |
| vtnet1 | vmbr0 | WAN | DHCP |

> **Pourquoi deux interfaces ?**
> OPNsense doit avoir une patte LAN (réseau interne Proxmox) et une patte WAN (accès
> internet via le bridge physique `vmbr0`). L'IP WAN est attribuée en DHCP et découverte
> automatiquement par l'inventaire Ansible via le QEMU guest agent — aucune IP hardcodée.

### Tags Proxmox

`ymmotom`, `infra`, `router`

Le tag `router` est utilisé par l'inventaire dynamique Ansible pour créer automatiquement
le groupe `tag_router`. C'est ce groupe qui reçoit la configuration OPNsense via l'API REST.
Voir `docs/opnsense-pipeline.md` pour le détail complet.

### Post-déploiement

OPNsense ne supporte pas cloud-init. Sa configuration complète (règles firewall, DNS,
WireGuard, routes) est appliquée par Ansible via l'API REST OPNsense.

```bash
# Vérifier que la VM est visible dans l'inventaire avec la bonne IP WAN
cd ansible && ansible-inventory --host OPNsense-Master --ask-vault-pass

# Lancer la configuration
ansible-playbook -i inventory/ playbooks/opnsense_setup.yml --ask-vault-pass
```

---

## Samba4-DC1

Contrôleur de domaine Active Directory (Samba4). Premier serveur du VLAN Serveurs du siège.

### Interface réseau

| Interface | Bridge | VLAN | IP statique | Passerelle |
|-----------|--------|------|-------------|------------|
| eth0 | YmmoTom | 10 | 10.0.10.1/24 | 10.0.10.254 |

L'IP statique et la gateway sont injectées via cloud-init au premier démarrage.

### Cloud-init

Le module VM génère un snippet cloud-init depuis `templates/cloud-init-debian.yml.tftpl` :

| Variable | Valeur |
|----------|--------|
| `hostname` | `dc1` |
| `ssh_public_keys` | `var.sysadmin_ssh_public_keys` |

### Post-déploiement

La configuration Samba4 (promotion en AD DC, GPO, partages) est appliquée par Ansible.

---

## Ajouter une nouvelle VM dans cette zone

1. Déclarer la ressource dans `zone-infra.tf` en appelant le module `vm`
2. Référencer les valeurs du site via `local.sites.siege.*` (node, storage, bridge)
3. Vérifier avec `make tf-plan` avant d'appliquer

```hcl
module "ma_nouvelle_vm" {
  source = "./modules/vm"

  vm_name      = "Nom-VM"
  node_name    = local.sites.siege.target_node
  source_vm_id = 9000  # Template Debian
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
}
```

---

## Points d'attention

| Point | Détail |
|-------|--------|
| IP WAN d'OPNsense | Change à chaque redéploiement (DHCP). L'inventaire Ansible la résout automatiquement — aucune action manuelle. |
| Passerelle Samba4 | `10.0.10.254` est l'interface OPNsense sur le VLAN 10. OPNsense doit être opérationnel avant que Samba4 puisse atteindre l'extérieur. |
| Agences | Les agences 01 et 02 sont instanciées dans `zone-agences.tf`. Voir `docs/terraform/terraform-zone-agences.md` pour le détail. |
