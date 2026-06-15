# ============================================
# Stage 1 : build de l'application Angular
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Dépendances d'abord (cache Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Code source + build de production
COPY . .
RUN npm run build

# ============================================
# Stage 2 : service statique via nginx
# ============================================
FROM nginx:alpine

# Fichiers compilés (sortie de l'application builder Angular)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Config nginx avec fallback SPA (routing Angular)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
