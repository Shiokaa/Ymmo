# ──────────────────────────────────────────────
# Makefile - Automatisation Ymmo (Cross-Platform)
# ──────────────────────────────────────────────

# Détection de l'OS
ifeq ($(OS),Windows_NT)
    PYTHON = python
    VENV_BIN = .venv/Scripts
    DEBUG_PREFIX = set PACKER_LOG=1 &&
    RM = -rm -rf
else
    PYTHON = python3
    VENV_BIN = .venv/bin
    DEBUG_PREFIX = PACKER_LOG=1
    RM = rm -rf
endif

# Dossiers
PACKER_DIR = packer
TF_DIR = terraform
VAR_FILE = variables.pkrvars.hcl

.PHONY: help venv init build-debian debug-debian build-opnsense debug-opnsense tf-init tf-plan tf-apply tf-destroy tf-clean ansible-update ansible-inventory ansible-opnsense-setup ansible-opnsense-network ansible-wireguard ansible-ping ansible-deploy clean

help:
	@echo "--- Commandes Environnement ---"
	@echo "  make venv                    - Cree l'environnement virtuel (Python)"
	@echo "  ⚠️  ATTENTION : Ansible doit etre execute sous Linux ou WSL !"
	@echo ""
	@echo "--- Commandes Ansible ---"
	@echo "  make ansible-update          - Met a jour les collections Ansible Galaxy"
	@echo "  make ansible-inventory       - Affiche l'inventaire dynamique Proxmox"
	@echo "  make ansible-ping            - Teste la connectivite SSH vers tous les hotes"
	@echo "  make ansible-opnsense-setup  - Configure OPNsense (bootstrap initial)"
	@echo "  make ansible-opnsense-network - Configure VLANs, DHCP et firewall OPNsense"
	@echo "  make ansible-wireguard       - Deploie WireGuard complet (OPNsense + agences)"
	@echo "  make ansible-deploy          - Enchaine tous les playbooks (setup + network + wireguard)"
	@echo ""
	@echo "--- Commandes Packer ---"
	@echo "  make init           - Initialise les plugins Packer"
	@echo "  make build-debian   - Cree le template Debian 12"
	@echo "  make debug-debian   - Build Debian avec logs"
	@echo "  make build-opnsense - Cree le template OPNsense"
	@echo "  make debug-opnsense - Build OPNsense avec logs"
	@echo ""
	@echo "--- Commandes Terraform ---"
	@echo "  make tf-init        - Initialise Terraform"
	@echo "  make tf-plan        - Planifie les changements"
	@echo "  make tf-apply       - Applique la configuration"
	@echo "  make tf-destroy     - Supprime l'infrastructure"
	@echo ""
	@echo "--- Nettoyage ---"
	@echo "  make clean          - Purge les fichiers temporaires"

# --- Environnement ---

venv:
	@echo "--- Creation de l'environnement virtuel ---"
ifeq ($(OS),Windows_NT)
	$(PYTHON) -m venv .venv
else
	$(PYTHON) -m venv --copies .venv
endif
	@echo "--- Installation des dependances ---"
	./$(VENV_BIN)/pip install --upgrade pip
	./$(VENV_BIN)/pip install -r requirements.txt
	@echo "--- Installation des collections Ansible Galaxy ---"
	cd ansible && ../$(VENV_BIN)/ansible-galaxy collection install -r collections/requirements.yml
	@echo "--- Environnement pret ---"
ifeq ($(OS),Windows_NT)
	@echo "Pour activer (Git Bash) : source .venv/Scripts/activate"
	@echo "Pour activer (PS)       : .\.venv\Scripts\Activate.ps1"
else
	@echo "Pour activer : source .venv/bin/activate"
endif

# --- Ansible ---
ANSIBLE_DIR = ansible
ANSIBLE_INVENTORY = inventory
ANSIBLE_PLAYBOOKS = playbooks

ansible-update:
	@echo "--- Mise a jour des collections Ansible Galaxy ---"
	cd $(ANSIBLE_DIR) && ansible-galaxy collection install -r collections/requirements.yml --upgrade

ansible-inventory:
	@echo "--- Inventaire dynamique Proxmox ---"
	cd $(ANSIBLE_DIR) && ansible-inventory -i $(ANSIBLE_INVENTORY) --list

ansible-ping:
	@echo "--- Test de connectivite SSH ---"
	cd $(ANSIBLE_DIR) && ansible -i $(ANSIBLE_INVENTORY) all -m ping

ansible-opnsense-setup:
	@echo "--- Configuration initiale OPNsense ---"
	cd $(ANSIBLE_DIR) && ansible-playbook -i $(ANSIBLE_INVENTORY) $(ANSIBLE_PLAYBOOKS)/opnsense_setup.yml --ask-vault-pass

ansible-opnsense-network:
	@echo "--- Configuration reseau OPNsense (VLANs, DHCP, firewall) ---"
	cd $(ANSIBLE_DIR) && ansible-playbook -i $(ANSIBLE_INVENTORY) $(ANSIBLE_PLAYBOOKS)/opnsense_network.yml --ask-vault-pass

ansible-wireguard:
	@echo "--- Deploiement WireGuard complet (OPNsense + agences) ---"
	cd $(ANSIBLE_DIR) && ansible-playbook -i $(ANSIBLE_INVENTORY) $(ANSIBLE_PLAYBOOKS)/wireguard.yml --ask-vault-pass

ansible-deploy:
	@echo "--- Deploiement complet : setup + network + wireguard (mot de passe vault demande une seule fois) ---"
	cd $(ANSIBLE_DIR) && ansible-playbook -i $(ANSIBLE_INVENTORY) \
		$(ANSIBLE_PLAYBOOKS)/opnsense_setup.yml \
		$(ANSIBLE_PLAYBOOKS)/opnsense_network.yml \
		$(ANSIBLE_PLAYBOOKS)/wireguard.yml \
		--ask-vault-pass

# --- Packer ---

init:
	@echo "--- Initialisation de Packer ---"
	cd $(PACKER_DIR) && packer init .

build-debian:
	@echo "--- Lancement du build Debian 12 ---"
	cd $(PACKER_DIR) && packer build -only=debian-12.proxmox-iso.debian-12 -var-file=$(VAR_FILE) .

debug-debian:
	@echo "--- Lancement du build Debian DEBUG ---"
	cd $(PACKER_DIR) && $(DEBUG_PREFIX) packer build -only=debian-12.proxmox-iso.debian-12 -on-error=ask -var-file=$(VAR_FILE) .

build-opnsense:
	@echo "--- Lancement du build OPNsense ---"
	cd $(PACKER_DIR) && packer build -only=opnsense.proxmox-iso.opnsense -var-file=$(VAR_FILE) .

debug-opnsense:
	@echo "--- Lancement du build OPNsense DEBUG ---"
	cd $(PACKER_DIR) && $(DEBUG_PREFIX) packer build -only=opnsense.proxmox-iso.opnsense -on-error=ask -var-file=$(VAR_FILE) .

# --- Terraform ---

tf-init:
	@echo "--- Initialisation de Terraform ---"
	cd $(TF_DIR) && terraform init

tf-plan:
	@echo "--- Planification Terraform ---"
	cd $(TF_DIR) && terraform plan -var-file=terraform.tfvars

tf-apply:
	@echo "--- Application Terraform ---"
	cd $(TF_DIR) && terraform apply -auto-approve

tf-destroy:
	@echo "--- Destruction de l'infrastructure ---"
	cd $(TF_DIR) && terraform destroy

tf-clean:
	@echo "--- Nettoyage Terraform ---"
	$(RM) $(TF_DIR)/.terraform/ $(TF_DIR)/.terraform.lock.hcl $(TF_DIR)/terraform.tfstate* $(TF_DIR)/*.plan

# --- Global ---

clean: tf-clean
	@echo "--- Nettoyage global ---"
	$(RM) $(PACKER_DIR)/packer_cache
