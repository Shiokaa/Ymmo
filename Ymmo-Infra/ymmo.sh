#!/usr/bin/env bash
# Script principal d'automatisation Ymmo-Infra.
# Remplace le Makefile avec une interface en sous-commandes et des flags par outil.

set -euo pipefail

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Répertoires ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR/ansible"
PACKER_DIR="$SCRIPT_DIR/packer"
TF_DIR="$SCRIPT_DIR/terraform"
VENV_BIN="$SCRIPT_DIR/.venv/bin"
ANSIBLE_INVENTORY="inventory"
PACKER_VAR_FILE="variables.pkrvars.hcl"

# ─── Utilitaires ─────────────────────────────────────────────────────────────

log()  { echo -e "${GREEN}▶${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
err()  { echo -e "${RED}✗${NC}  $*" >&2; }
die()  { err "$*"; exit 1; }

check_venv() {
    [[ -f "$VENV_BIN/ansible-playbook" ]] \
        || die "Venv introuvable. Lance d'abord : $0 env venv"
}

# ─── Aide ────────────────────────────────────────────────────────────────────

usage() {
    echo -e "${BOLD}${BLUE}ymmo.sh${NC} — Automatisation Ymmo-Infra"
    echo ""
    echo -e "${BOLD}Usage :${NC} $0 <commande> [sous-commande] [options]"
    echo ""
    echo -e "${BOLD}${YELLOW}Environnement${NC}"
    echo "  env venv                           Créer le venv Python + installer les dépendances"
    echo ""
    echo -e "${BOLD}${YELLOW}Ansible${NC}"
    echo "  ansible update                     Mettre à jour les collections Galaxy"
    echo "  ansible inventory                  Afficher l'inventaire dynamique Proxmox"
    echo "  ansible ping       [options]       Tester la connectivité SSH vers tous les hôtes"
    echo "  ansible setup      [options]       Bootstrap OPNsense (configuration initiale)"
    echo "  ansible network    [options]       Configurer VLANs, DHCP et firewall OPNsense"
    echo "  ansible wireguard  [options]       Déployer WireGuard complet (OPNsense + agences)"
    echo "  ansible bastion    [options]       Reconfigurer le bastion uniquement"
    echo "  ansible samba4     [options]       Configurer Samba4 AD DC"
    echo "  ansible windows    [options]       Configurer les clients Windows (DNS + jonction AD)"
    echo "  ansible deploy     [options]       Enchaîner tous les playbooks (setup→windows)"
    echo ""
    echo -e "${BOLD}${YELLOW}Déploiement complet${NC}"
    echo "  full-deploy        [--auto-approve]  Tout déployer en une commande :"
    echo "                                       TF (infra) → Ansible (réseau/AD) → TF (client) → Ansible (jonction)"
    echo ""
    echo -e "${BOLD}${YELLOW}Packer${NC}"
    echo "  packer init                        Initialiser les plugins Packer"
    echo "  packer build debian   [--debug]    Construire le template Debian 12 (VM 9000)"
    echo "  packer build opnsense [--debug]    Construire le template OPNsense (VM 9001)"
    echo "  packer build windows  [--debug]    Construire le template Windows 11 25H2 (VM 9002)"
    echo ""
    echo -e "${BOLD}${YELLOW}Terraform${NC}"
    echo "  tf init                            Initialiser Terraform"
    echo "  tf plan            [options]       Planifier les changements"
    echo "  tf apply           [options]       Appliquer la configuration"
    echo "  tf destroy                         Supprimer l'infrastructure (confirmation requise)"
    echo "  tf clean                           Purger les fichiers Terraform locaux"
    echo ""
    echo -e "${BOLD}${YELLOW}Nettoyage${NC}"
    echo "  clean                              Supprimer packer_cache et fichiers Terraform"
    echo ""
    echo -e "${BOLD}Options Ansible :${NC}"
    echo "  --limit <hôte>       Limiter l'exécution à un hôte ou un groupe"
    echo "  --tags <tags>        N'exécuter que les tâches portant ces tags"
    echo "  --skip-tags <tags>   Ignorer les tâches portant ces tags"
    echo "  --debug              Mode verbeux (-vvv)"
    echo "  --check              Simulation — aucun changement appliqué"
    echo "  --diff               Afficher les différences fichier par fichier"
    echo "  --no-vault           Ne pas demander le mot de passe vault"
    echo ""
    echo -e "${BOLD}Options Packer :${NC}"
    echo "  --debug              Activer PACKER_LOG=1 et --on-error=ask"
    echo ""
    echo -e "${BOLD}Options Terraform :${NC}"
    echo "  --auto-approve       Appliquer sans confirmation interactive"
    echo "  --var-file <fichier> Fichier de variables (défaut : terraform.tfvars)"
}

# ─── Ansible ─────────────────────────────────────────────────────────────────

# Lance un ou plusieurs playbooks avec les flags utilisateur.
# Les playbooks sont listés en premier (sans --), les flags ensuite.
run_ansible() {
    local playbooks=()
    local extra_args=()
    local vault_arg="--ask-vault-pass"

    # Collecter les noms de playbooks jusqu'au premier flag
    while [[ $# -gt 0 && "$1" != --* ]]; do
        playbooks+=("playbooks/$1")
        shift
    done

    # Parser les flags
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --limit)      extra_args+=("--limit"      "$2"); shift 2 ;;
            --tags)       extra_args+=("--tags"       "$2"); shift 2 ;;
            --skip-tags)  extra_args+=("--skip-tags"  "$2"); shift 2 ;;
            --debug)      extra_args+=("-vvv");               shift   ;;
            --check)      extra_args+=("--check");            shift   ;;
            --diff)       extra_args+=("--diff");             shift   ;;
            --no-vault)   vault_arg="";                       shift   ;;
            *) die "Option inconnue : $1 (lance '$0 help' pour l'aide)" ;;
        esac
    done

    check_venv
    log "Playbook(s) : ${playbooks[*]}"

    cd "$ANSIBLE_DIR"
    "$VENV_BIN/ansible-playbook" \
        -i "$ANSIBLE_INVENTORY" \
        ${vault_arg:+"$vault_arg"} \
        ${extra_args[@]+"${extra_args[@]}"} \
        "${playbooks[@]}"
}

cmd_ansible() {
    local subcmd="${1:-}"
    [[ -n "$subcmd" ]] || { usage; exit 0; }
    shift

    case "$subcmd" in
        update)
            check_venv
            log "Mise à jour des collections Ansible Galaxy..."
            cd "$ANSIBLE_DIR"
            "$VENV_BIN/ansible-galaxy" collection install \
                -r collections/requirements.yml --upgrade
            ;;

        inventory)
            check_venv
            log "Inventaire dynamique Proxmox..."
            cd "$ANSIBLE_DIR"
            "$VENV_BIN/ansible-inventory" -i "$ANSIBLE_INVENTORY" --list
            ;;

        ping)
            check_venv
            local extra_args=()
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --limit) extra_args+=("--limit" "$2"); shift 2 ;;
                    --debug) extra_args+=("-vvv");          shift   ;;
                    *) die "Option inconnue : $1" ;;
                esac
            done
            log "Test de connectivité SSH vers tous les hôtes..."
            cd "$ANSIBLE_DIR"
            "$VENV_BIN/ansible" \
                -i "$ANSIBLE_INVENTORY" all -m ping \
                ${extra_args[@]+"${extra_args[@]}"}
            ;;

        setup)      run_ansible opnsense_setup.yml   "$@" ;;
        network)    run_ansible opnsense_network.yml  "$@" ;;
        wireguard)  run_ansible wireguard.yml         "$@" ;;
        samba4)     run_ansible samba4.yml            "$@" ;;
        windows)    run_ansible windows_client.yml    "$@" ;;

        # --limit Bastion est injecté en premier ; l'utilisateur peut le surcharger
        bastion)    run_ansible wireguard.yml --limit Bastion "$@" ;;

        deploy)
            # Déploiement complet en une commande : collections à jour puis
            # enchaînement de tous les playbooks (un seul prompt vault).
            check_venv
            log "Installation des collections Ansible Galaxy..."
            (cd "$ANSIBLE_DIR" && "$VENV_BIN/ansible-galaxy" collection install \
                -r collections/requirements.yml --upgrade)
            run_ansible \
                opnsense_setup.yml \
                opnsense_network.yml \
                wireguard.yml \
                samba4.yml \
                windows_client.yml \
                "$@"
            ;;

        *) die "Sous-commande ansible inconnue : '$subcmd'" ;;
    esac
}

# ─── Packer ──────────────────────────────────────────────────────────────────

cmd_packer() {
    local subcmd="${1:-}"
    [[ -n "$subcmd" ]] || { usage; exit 0; }
    shift

    case "$subcmd" in
        init)
            log "Initialisation des plugins Packer..."
            cd "$PACKER_DIR"
            packer init .
            ;;

        build)
            local template="${1:-}"
            [[ -n "$template" ]] || die "Usage : $0 packer build <debian|opnsense|windows> [--debug]"
            shift

            local debug=false
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --debug) debug=true; shift ;;
                    *) die "Option inconnue : $1" ;;
                esac
            done

            cd "$PACKER_DIR"

            case "$template" in
                debian)
                    log "Build template Debian 12..."
                    if $debug; then
                        PACKER_LOG=1 packer build \
                            -only=debian-12.proxmox-iso.debian-12 \
                            -on-error=ask \
                            -var-file="$PACKER_VAR_FILE" .
                    else
                        packer build \
                            -only=debian-12.proxmox-iso.debian-12 \
                            -var-file="$PACKER_VAR_FILE" .
                    fi
                    ;;
                opnsense)
                    log "Build template OPNsense..."
                    if $debug; then
                        PACKER_LOG=1 packer build \
                            -only=opnsense.proxmox-iso.opnsense \
                            -on-error=ask \
                            -var-file="$PACKER_VAR_FILE" .
                    else
                        packer build \
                            -only=opnsense.proxmox-iso.opnsense \
                            -var-file="$PACKER_VAR_FILE" .
                    fi
                    ;;
                windows)
                    log "Build template Windows 11 25H2..."
                    if $debug; then
                        PACKER_LOG=1 packer build \
                            -only=windows-11.proxmox-iso.windows-11 \
                            -on-error=ask \
                            -var-file="$PACKER_VAR_FILE" .
                    else
                        packer build \
                            -only=windows-11.proxmox-iso.windows-11 \
                            -var-file="$PACKER_VAR_FILE" .
                    fi
                    ;;
                *) die "Template inconnu : '$template'. Valeurs valides : debian, opnsense, windows" ;;
            esac
            ;;

        *) die "Sous-commande packer inconnue : '$subcmd'" ;;
    esac
}

# ─── Terraform ───────────────────────────────────────────────────────────────

cmd_tf() {
    local subcmd="${1:-}"
    [[ -n "$subcmd" ]] || { usage; exit 0; }
    shift

    cd "$TF_DIR"

    case "$subcmd" in
        init)
            log "Initialisation Terraform..."
            terraform init
            ;;

        plan)
            local var_file="terraform.tfvars"
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --var-file) var_file="$2"; shift 2 ;;
                    *) die "Option inconnue : $1" ;;
                esac
            done
            log "Planification Terraform (var-file : $var_file)..."
            terraform plan -var-file="$var_file"
            ;;

        apply)
            local auto_approve=false
            local var_file="terraform.tfvars"
            while [[ $# -gt 0 ]]; do
                case "$1" in
                    --auto-approve) auto_approve=true; shift ;;
                    --var-file)     var_file="$2";     shift 2 ;;
                    *) die "Option inconnue : $1" ;;
                esac
            done
            log "Application Terraform..."
            if $auto_approve; then
                terraform apply -auto-approve -var-file="$var_file"
            else
                terraform apply -var-file="$var_file"
            fi
            ;;

        destroy)
            warn "Cette action supprime toute l'infrastructure Proxmox !"
            terraform destroy
            ;;

        clean)
            log "Nettoyage des fichiers Terraform..."
            rm -rf .terraform/ .terraform.lock.hcl terraform.tfstate* ./*.plan
            log "Nettoyage Terraform terminé."
            ;;

        *) die "Sous-commande tf inconnue : '$subcmd'" ;;
    esac
}

# ─── Env ─────────────────────────────────────────────────────────────────────

cmd_env() {
    local subcmd="${1:-}"
    case "$subcmd" in
        venv)
            log "Création du venv Python..."
            python3 -m venv --copies "$SCRIPT_DIR/.venv"
            log "Installation des dépendances Python..."
            "$VENV_BIN/pip" install --upgrade pip
            "$VENV_BIN/pip" install -r "$SCRIPT_DIR/requirements.txt"
            log "Installation des collections Ansible Galaxy..."
            cd "$ANSIBLE_DIR"
            "$VENV_BIN/ansible-galaxy" collection install \
                -r collections/requirements.yml
            echo ""
            log "Venv prêt. Pour activer : source .venv/bin/activate"
            ;;
        *) die "Sous-commande env inconnue : '$subcmd'" ;;
    esac
}

# ─── Clean global ────────────────────────────────────────────────────────────

cmd_clean() {
    log "Nettoyage global..."
    rm -rf "$PACKER_DIR/packer_cache"
    rm -rf "$TF_DIR/.terraform/" \
           "$TF_DIR/.terraform.lock.hcl" \
           "$TF_DIR"/terraform.tfstate* \
           "$TF_DIR"/*.plan
    log "Nettoyage terminé."
}

# ─── Déploiement complet ─────────────────────────────────────────────────────

# Déploie toute l'infrastructure en une commande, en 4 phases ordonnées.
# Le phasage est imposé par une dépendance croisée : le client Windows obtient
# son IP via le DHCP d'OPNsense (configuré par Ansible), et le provider
# Terraform attend cette IP (guest agent) pour terminer la création de la VM.
cmd_full_deploy() {
    local auto_approve=false
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --auto-approve) auto_approve=true; shift ;;
            *) die "Option inconnue : $1 (full-deploy n'accepte que --auto-approve)" ;;
        esac
    done

    check_venv
    local tf_apply=(terraform apply -var-file="terraform.tfvars")
    $auto_approve && tf_apply+=(-auto-approve)

    log "═══ Phase 1/4 — Terraform : infrastructure (sans clients Windows) ═══"
    (cd "$TF_DIR" && "${tf_apply[@]}" -var="deploy_clients=false")

    log "═══ Phase 2/4 — Ansible : OPNsense, réseau/DHCP, WireGuard, Samba4 ═══"
    log "Installation des collections Ansible Galaxy..."
    (cd "$ANSIBLE_DIR" && "$VENV_BIN/ansible-galaxy" collection install \
        -r collections/requirements.yml --upgrade)
    run_ansible \
        opnsense_setup.yml \
        opnsense_network.yml \
        wireguard.yml \
        samba4.yml

    log "═══ Phase 3/4 — Terraform : client Windows (DHCP désormais actif) ═══"
    (cd "$TF_DIR" && "${tf_apply[@]}")

    log "═══ Phase 4/4 — Ansible : jonction du client au domaine AD ═══"
    run_ansible windows_client.yml

    log "═══ Déploiement complet terminé ✓ ═══"
}

# ─── Point d'entrée ──────────────────────────────────────────────────────────

main() {
    local cmd="${1:-}"
    [[ -n "$cmd" ]] || { usage; exit 0; }
    shift

    case "$cmd" in
        env)          cmd_env     "$@" ;;
        ansible)      cmd_ansible "$@" ;;
        packer)       cmd_packer  "$@" ;;
        tf)           cmd_tf      "$@" ;;
        full-deploy)  cmd_full_deploy "$@" ;;
        clean)        cmd_clean ;;
        help|-h|--help) usage ;;
        *) die "Commande inconnue : '$cmd'. Lance '$0 help' pour l'aide." ;;
    esac
}

main "$@"
