# syntax=docker/dockerfile:1
#
# TiloPOS web image (static SPA served by unprivileged nginx on port 8080).
# Build from the REPOSITORY ROOT so the workspace lockfile is used:
#   docker build -f packages/web/Dockerfile -t tilopos/web .
#
# VITE_* values are baked in at BUILD time (Vite inlines them); setting them on the
# running container has no effect. Pass them with --build-arg.
# The backend upstream used by the /api and /socket.io proxy is read at START time
# from BACKEND_UPSTREAM (default http://backend:3001, the docker compose service).

ARG NODE_IMAGE=node:22.23.3-alpine3.24
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30.5-alpine3.24

FROM ${NODE_IMAGE} AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/web/package.json packages/web/
# Root `prepare` (husky) is a git-hook installer; not needed in images.
RUN npm pkg delete scripts.prepare && npm ci --workspace=@tilo/web --include-workspace-root=false

COPY packages/web packages/web
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_API_URL=
ARG VITE_WS_URL=
ARG VITE_CDN_URL=
ARG VITE_SUPPORT_EMAIL=
ARG VITE_SUPPORT_WHATSAPP=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_CDN_URL=${VITE_CDN_URL} \
    VITE_SUPPORT_EMAIL=${VITE_SUPPORT_EMAIL} \
    VITE_SUPPORT_WHATSAPP=${VITE_SUPPORT_WHATSAPP}
WORKDIR /repo/packages/web
RUN npm run build

FROM ${NGINX_IMAGE} AS production
# nginx-unprivileged runs as UID 101 and listens on 8080 (no root, no port < 1024).
ENV BACKEND_UPSTREAM=http://backend:3001 \
    TZ=Asia/Jakarta
COPY --from=build --chown=101:101 /repo/packages/web/dist /usr/share/nginx/html
# Rendered by the image entrypoint (envsubst) into /etc/nginx/conf.d/default.conf.
COPY packages/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health > /dev/null || exit 1
