# syntax=docker/dockerfile:1
#
# TiloPOS backend image.
# Build from the REPOSITORY ROOT so the workspace lockfile is used:
#   docker build -f packages/backend/Dockerfile -t tilopos/backend .
#
# Migrations are NOT run by this image's CMD. Run them once per release:
#   - docker compose: the `migrate` service (see docker-compose.yml)
#   - Kubernetes: the `migrate` init container / Job (see k8s/base/backend)
#   - manually: docker run --rm --env-file .env <image> npx prisma migrate deploy

ARG NODE_IMAGE=node:22.23.3-alpine3.24

# ---- deps: full install (dev deps needed for nest build) ---------------------
FROM ${NODE_IMAGE} AS deps
RUN apk add --no-cache openssl
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/web/package.json packages/web/
# Root `prepare` (husky) is a git-hook installer; not needed in images.
RUN npm pkg delete scripts.prepare && npm ci --workspace=@tilo/backend --include-workspace-root=false

# ---- build -------------------------------------------------------------------
FROM deps AS build
COPY packages/backend packages/backend
WORKDIR /repo/packages/backend
RUN npx prisma generate && npm run build

# ---- prod-deps: runtime dependencies only (includes prisma CLI + @aws-sdk) ----
FROM ${NODE_IMAGE} AS prod-deps
RUN apk add --no-cache openssl
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/web/package.json packages/web/
COPY packages/backend/prisma packages/backend/prisma
# Root `prepare` (husky) is a git-hook installer; not needed in images.
RUN npm pkg delete scripts.prepare && npm ci --workspace=@tilo/backend --include-workspace-root=false --omit=dev \
  && mkdir -p packages/backend/node_modules \
  && cd packages/backend && npx prisma generate \
  && npm cache clean --force

# ---- runtime -----------------------------------------------------------------
FROM ${NODE_IMAGE} AS production
RUN apk add --no-cache openssl tzdata
ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    PORT=3001
WORKDIR /app

# The base image ships the unprivileged `node` user (UID/GID 1000).
# k8s manifests run with runAsUser/fsGroup 1000 to match.
COPY --from=prod-deps --chown=node:node /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /repo/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build --chown=node:node /repo/packages/backend/dist ./packages/backend/dist
COPY --from=build --chown=node:node /repo/packages/backend/prisma ./packages/backend/prisma
COPY --chown=node:node packages/backend/package.json ./packages/backend/package.json

WORKDIR /app/packages/backend
RUN mkdir -p logs uploads && chown -R node:node logs uploads

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health/live" > /dev/null || exit 1

CMD ["node", "dist/main"]
