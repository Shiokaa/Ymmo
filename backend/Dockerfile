# ============================================
# Stage 1 : Build avec Maven + JDK Alpine
# ============================================
FROM eclipse-temurin:26-jdk-alpine AS build

RUN apk add --no-cache maven

WORKDIR /app

# Copier uniquement le pom.xml d'abord pour profiter du cache Docker
# Les dépendances ne seront re-téléchargées que si le pom.xml change
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copier le code source et compiler
COPY src ./src
RUN mvn package -DskipTests -B \
    && mv target/*.jar app.jar

# ============================================
# Stage 2 : Runtime minimal avec JRE Alpine
# ============================================
FROM eclipse-temurin:26-jre-alpine

RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

# Copier le JAR depuis le stage de build
COPY --from=build /app/app.jar app.jar

# Créer le répertoire uploads
RUN mkdir -p /app/uploads && chown -R spring:spring /app

USER spring

EXPOSE 8080

# Optimisations JVM pour conteneur : respecter les limites mémoire du container
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-jar", "app.jar"]
