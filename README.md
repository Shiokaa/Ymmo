# Ymmo

## Description

Ymmo est une solution centralisée conçue pour un groupe immobilier national basé à Aix-en-Provence. La plateforme digitalise l'intégralité du cycle de vente et d'achat (résidentiel et professionnel) pour le siège et ses 12 agences. L'outil sert d'interface unique pour les clients et les agents, tout en intégrant une couche d'Intelligence Artificielle pour l'analyse prédictive des tendances du marché.

## Objectifs Stratégiques

- **Centralisation** : Harmoniser la gestion des opérations immobilières sur l'ensemble du territoire français.
- **Analyse de Données** : Exploiter les données du marché via l'IA pour guider les décisions d'achat/vente et optimiser les prix.
- **Infrastructure Critique** : Déployer une architecture réseau sécurisée et évolutive (scalable) reliant le siège et les agences distantes.

## Stack Technique

| Composant       | Technologie          |
| --------------- | -------------------- |
| Frontend        | Angular (TypeScript) |
| Backend & API   | Spring Boot (Java)   |
| IA & Data       | Python               |
| Base de données | PostgreSQL           |
| Infrastructure  | Terraform / Ansible  |

## Structure du projet

```
Ymmo/
├── Ymmo-Web/    # Application web (frontend, backend, IA)
└── Ymmo-Infra/  # Infrastructure (Terraform, Ansible, Packer)
```

Chaque module possède son propre README avec les instructions d'installation et de configuration spécifiques :

- [Ymmo-Web/README.md](Ymmo-Web/README.md)
- [Ymmo-Infra/README.md](Ymmo-Infra/README.md)

## Architecture et Modélisation

### Schéma de la Base de Données

<!-- Insérer ici le schéma BDD -->

### Architecture logicielle

<!-- Décrire ici l'architecture logicielle globale -->

## Workflow de Développement

### Conventions de nommage

- Variables : lowerCamelCase
- Fonctions : lowerCamelCase
- Base de données : snake_case
- Commentaires dans le code : Français
- Messages de commit : Anglais

### Gestion des branches

- Branche de production : **main**
- Branche de développement : **dev**
  - `chore/` — Tâches de maintenance répétitives (ne touchent ni au code métier, ni aux tests)
  - `feat/` — Ajout d'une nouvelle fonctionnalité
  - `fix/` — Correction d'un bug
  - `refactor/` — Modification du code sans changement de comportement (nettoyage)
  - `docs/` — Mise à jour de documentation
  - `test/` — Ajout ou modification de tests
  - `style/` — Changements de formatage (n'affectent pas la logique du code)
  - `ci/` — Modifications liées à l'intégration continue / déploiement

### Convention de commit

Les messages de commit suivent le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description>
```

- **type** : le type de changement (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `ci`)
- **scope** _(optionnel)_ : le module ou la zone impactée (`doc`, `frontend`, `backend`, `ai`, `infra`, etc.)
- **description** : résumé court en anglais de la modification

#### Exemples

| Commit                                           | Explication                               |
| ------------------------------------------------ | ----------------------------------------- |
| `feat(frontend): add property search filter`     | Nouvelle fonctionnalité côté frontend     |
| `fix(backend): resolve null pointer on login`    | Correction de bug côté backend            |
| `chore(doc): restructure README files`           | Tâche de maintenance sur la documentation |
| `refactor(ai): simplify data pipeline`           | Refactorisation du module IA              |
| `docs: update installation guide`                | Mise à jour de documentation générale     |
| `test(backend): add unit tests for auth service` | Ajout de tests                            |
| `ci(infra): update terraform pipeline`           | Modification du pipeline CI/CD infra      |

### Tests

<!-- Détailler ici la stratégie de tests globale -->

## Déploiement (CI/CD)

### Environnements

<!-- Lister les environnements (dev, staging, prod, etc.) -->

### Pipeline

<!-- Décrire le pipeline CI/CD -->

## Troubleshooting (Dépannage)

<!-- Documenter les problèmes connus et leurs solutions -->
