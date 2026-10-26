# ============================================================
# TROSV frontend - multi-stage build: node build -> nginx serve.
#
# Base images: Debian 13 "trixie" (latest stable) - glibc-based, khop voi
# moi truong dev/CI Linux. Nginx tren Debian khong co wget -> healthcheck
# dung curl (cai o runtime stage).
#
# VITE_* variables are baked into the bundle at BUILD time (import.meta.env
# is replaced by Vite, not read at runtime). Pass them as build args when
# the defaults do not match your deployment:
#   docker compose build --build-arg VITE_API_URL=https://api.example.com frontend
# ============================================================

# ---- Build stage ----------------------------------------------------------
# Node 22 = LTS dang duoc support (Node 20 het EOL 4/2026).
FROM node:22-trixie AS build

# Declared so compose build args actually reach `npm run build`. Docker
# silently drops undeclared args, which would bake the localhost fallbacks
# from src/config/env.ts into the bundle - fine for the dev stack only.
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_REVERB_APP_KEY=my-app-key
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=8080
ARG VITE_REVERB_SCHEME=http

WORKDIR /app

# Dependency layer first for cache between builds.
COPY package.json package-lock.json .npmrc* ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ---- Runtime stage: nginx serving the SPA ---------------------------------
FROM nginx:1.29-trixie

# Healthcheck dung curl (nginx Debian khong kem wget nhu alpine).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN rm /etc/nginx/conf.d/default.conf
# Template + envsubst: NGINX_DNS_RESOLVER (default = Docker embedded DNS)
# is substituted at container start -> /etc/nginx/conf.d/app.conf.
# podman rootless overrides it with the network gateway via compose env.
ENV NGINX_DNS_RESOLVER=127.0.0.11
COPY nginx.conf.template /etc/nginx/templates/app.conf.template
# Relative include paths resolve against the nginx prefix (/etc/nginx),
# NOT conf.d/ - so the shared snippet lives here.
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -sf http://127.0.0.1/ >/dev/null || exit 1
