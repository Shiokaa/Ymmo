# Ymmo — Backend

## Présentation

Module backend de la plateforme Ymmo, fournissant l'API métier qui gère l'intégralité du cycle de vente et d'achat immobilier (résidentiel et professionnel). Il alimente le frontend et le module IA en données.

## Stack Technique

- **Framework** : Spring Boot
- **Langage** : Java
- **Base de données** : PostgreSQL
- **Conteneurisation** : Docker

## Installation et Configuration

### Prérequis

Pour exécuter et développer sur ce projet, vous aurez besoin des outils suivants :
- **Java 26** (JDK)
- **Maven** (installé localement ou via votre IDE)
- **PostgreSQL** installé localement **OU** **Docker** (pour utiliser la base de données conteneurisée)

### Étapes d'installation

Commencez par vous placer dans le dossier `backend` et configurez vos variables d'environnement. Copiez le fichier `.env.example` fourni et renommez-le en `.env` à la racine du dossier `backend`. 

Voici le contenu de ce fichier (`.env.example`) :

```env
# Configuration de la base de données
# ATTENTION : Si vous utilisez la Méthode 1 (Docker), le DB_PORT doit impérativement rester à 5432 
# car c'est le port par défaut attendu par le conteneur `backend` dans le réseau interne.
DB_PORT=5432
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
DB_NAME=votre_nom_de_base_de_donnees

# Clé secrète pour les tokens JWT (doit être robuste en production)
JWT_SECRET=votre_cle_secrete_super_longue_et_aleatoire
```

Ensuite, préparez la base de données selon l'une des deux méthodes suivantes :

#### Méthode 1 : Via Docker (Recommandée)
Assurez-vous que Docker est démarré, puis exécutez la commande suivante à la racine du dossier `backend` pour lancer le conteneur PostgreSQL :
```bash
docker compose -f dc-postgresql.yml up -d
```

#### Méthode 2 : Installation Manuelle via PostgreSQL (Ligne de commande)
Si vous préférez installer la base de données manuellement sans Docker :
1. Connectez-vous à votre serveur PostgreSQL (via `psql` ou pgAdmin).
2. Créez une nouvelle base de données et un utilisateur :
```sql
CREATE DATABASE votre_nom_de_base_de_donnees;
CREATE USER votre_utilisateur WITH ENCRYPTED PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE votre_nom_de_base_de_donnees TO votre_utilisateur;
```
3. Assurez-vous que les informations dans votre fichier `.env` correspondent à celles créées ci-dessus.
*(Note : Flyway se chargera de créer les tables et d'insérer les données de test automatiquement au lancement du serveur).*

### Lancer le serveur de développement

Une fois la base de données prête et le fichier `.env` configuré, vous pouvez lancer l'application avec Maven :

```bash
mvn clean install
mvn spring-boot:run
```

## Schéma de la Base de Données

Voir le schéma complet dans [doc/schema_bdd.png](../doc/schema_bdd.png).

## Guide de l'API (Endpoints)

L'API est entièrement documentée via **Swagger** (OpenAPI 3). 
Une fois le serveur démarré, vous pouvez explorer et tester les différents endpoints via l'interface interactive.

- **Swagger UI** : [http://localhost:8080/api/swagger-ui/index.html](http://localhost:8080/api/swagger-ui/index.html)
- **OpenAPI JSON** : [http://localhost:8080/api/v3/api-docs](http://localhost:8080/api/v3/api-docs)

> **Note :** Étant donné que le `context-path` de l'application est défini sur `/api` dans `application.properties`, toutes les requêtes (y compris vers l'interface Swagger) doivent être préfixées par `/api`.

## Conventions de nommage

- Variables : lowerCamelCase
- Fonctions : lowerCamelCase
- Base de données : snake_case
- Commentaires dans le code : Français
- Messages de commit : Anglais

## Tests

<!-- Détailler ici la stratégie de tests backend (unitaires, intégration, etc.) -->

## Structure du projet

```plaintext
/backend
    ├── dc-postgresql.yml
    ├── Dockerfile
    ├── .dockerignore
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── pom.xml
    ├── README.md
    ├── src
    │   └── main
    │      ├── java
    │      │   └── com
    │      │       └── ymmo
    │      │           ├── configs
    │      │           │   ├── ApplicationConfiguration.java
    │      │           │   ├── JwtAuthenticationFilter.java
    │      │           │   ├── MvcConfig.java
    │      │           │   └── SecurityConfig.java
    │      │           ├── controllers
    │      │           │   ├── AgencyController.java
    │      │           │   ├── AuthenticationController.java
    │      │           │   ├── PropertyController.java
    │      │           │   └── UserController.java
    │      │           ├── dtos
    │      │           │   ├── agency
    │      │           │   │   ├── AgencyRequestDto.java
    │      │           │   │   └── AgencyResponseDto.java
    │      │           │   ├── authentication
    │      │           │   │   ├── LoginResponse.java
    │      │           │   │   ├── LoginUserDto.java
    │      │           │   │   └── RegisterUserDto.java
    │      │           │   ├── property
    │      │           │   │   ├── PropertyImageRequestDto.java
    │      │           │   │   ├── PropertyImageResponseDto.java
    │      │           │   │   ├── PropertyRequestDto.java
    │      │           │   │   └── PropertyResponseDto.java
    │      │           │   └── user
    │      │           │       ├── UserResponseDto.java
    │      │           │       ├── UserUpdatePasswordDto.java
    │      │           │       └── UserUpdateProfilDto.java
    │      │           ├── entities
    │      │           │   ├── Agency.java
    │      │           │   ├── PropertyImage.java
    │      │           │   ├── Property.java
    │      │           │   ├── StaffAgency.java
    │      │           │   └── User.java
    │      │           ├── enums
    │      │           │   ├── AgencyStatus.java
    │      │           │   ├── PropertyType.java
    │      │           │   └── UserRole.java
    │      │           ├── exceptions
    │      │           │   ├── BadRequestException.java
    │      │           │   ├── EmailAlreadyExistsException.java
    │      │           │   ├── ErrorResponse.java
    │      │           │   ├── GlobalExceptionHandler.java
    │      │           │   ├── InvalidCredentialsException.java
    │      │           │   ├── InvalidUuidException.java
    │      │           │   ├── IsCoverAlreadyExistsException.java
    │      │           │   └── ResourceNotFound.java
    │      │           ├── mappers
    │      │           │   ├── AgencyMapper.java
    │      │           │   ├── PropertyMapper.java
    │      │           │   └── UserMapper.java
    │      │           ├── repositories
    │      │           │   ├── AgencyRepository.java
    │      │           │   ├── PropertyImageRepository.java
    │      │           │   ├── PropertyRepository.java
    │      │           │   └── UserRepository.java
    │      │           ├── response
    │      │           │   └── GlobalResponse.java
    │      │           ├── services
    │      │           │   ├── AgencyService.java
    │      │           │   ├── AuthenticationService.java
    │      │           │   ├── FileUploadService.java
    │      │           │   ├── JwtService.java
    │      │           │   ├── PropertyService.java
    │      │           │   └── UserService.java
    │      │           ├── utils
    │      │           │   └── ConvertType.java
    │      │           └── Ymmo.java
    │      └── resources
    │          ├── application.properties
    │          └── db
    │              └── migration
    │                  ├── V1__init_schema.sql
    │                  └── V999__Insert_test_data.sql
    │   
    └── uploads
```