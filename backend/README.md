# Ymmo — Backend

## Présentation

Module backend de la plateforme Ymmo, fournissant l'API métier qui gère l'intégralité du cycle de vente et d'achat immobilier (résidentiel et professionnel). Il alimente le frontend et le module IA en données.

## Stack Technique

- **Framework** : Spring Boot
- **Langage** : Java
- **Base de données** : PostgreSQL

## Installation et Configuration

### Prérequis

<!-- Prérequis pour utiliser la partie backend-->

### Étapes d'installation

Créer la base de données via Docker :

```bash
docker-compose -f dc-postgresql.yml up -d
```

### Lancer le serveur de développement

<!-- Décrire le lancement du serveur de dev -->

## Schéma de la Base de Données

Voir le schéma complet dans [doc/schema_bdd.png](../doc/schema_bdd.png).

## Guide de l'API (Endpoints)

<!-- Documenter ici les endpoints REST exposés par l'API -->

## Conventions de nommage

- Variables : lowerCamelCase
- Fonctions : lowerCamelCase
- Base de données : snake_case
- Commentaires dans le code : Français
- Messages de commit : Anglais

## Tests

<!-- Détailler ici la stratégie de tests backend (unitaires, intégration, etc.) -->

## Structure du projet

<!-- Décrire ici l'arborescence et l'organisation des packages Java -->
