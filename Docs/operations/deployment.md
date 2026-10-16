# Deployment Guide

TiloPOS ships two images, both built from the **repository root** (the workspace lockfile lives there):

```bash
docker build -f packages/backend/Dockerfile -t ghcr.io/tilopos/backend:<version> .
docker build -f packages/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t ghcr.io/tilopos/web:<version> .
```

There is no automated CD yet. CI (`.github/workflows/ci.yml`) lints, tests and builds the images but does not push or deploy them.

## Configuration contract

The backend validates its environment at boot (`packages/backend/src/config/env.validation.ts`) and exits if it is wrong.

| Variable | When required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | always | Prisma URL (`?schema=public`, add `sslmode=require` for remote DBs) |
| `JWT_SECRET` | always | >= 32 chars in production |
| `JWT_EXPIRES_IN` | always | e.g. `7d` |
| `CORS_ORIGIN` | production | comma-separated origins, `*` rejected |
| `FRONTEND_URL` | production | used in e-mail links |
| `REDIS_HOST` (+`REDIS_PASSWORD`) | production | queues, cron locks, cache; server must use `maxmemory-policy noeviction` |
| `PAYMENT_GATEWAY` | production | `midtrans` (needs `MIDTRANS_SERVER_KEY`, `MIDTRANS_ENV=production`) or `xendit` (needs `XENDIT_API_KEY`, `XENDIT_WEBHOOK_TOKEN`); `mock` is refused |
| `TRUST_PROXY` | optional | set to `1` behind ingress/nginx |
| `METRICS_ENABLED`, `METRICS_TOKEN` | optional | Prometheus at `/api/v1/metrics` |
| `TZ` | recommended | `Asia/Jakarta` (set in the images) |

The full list with defaults is in `packages/backend/.env.example`. Docker compose reads the root `.env.example`; Kubernetes splits it into `k8s/base/configmap.yaml` (non-secret) and the Secret described in `k8s/base/secrets.yaml.example`.

Web `VITE_*` variables are **build-time** only. At runtime the web container only reads `BACKEND_UPSTREAM` (the backend URL used by its `/api`, `/uploads` and `/socket.io` proxy).

## Database migrations

Migrations are applied **once per release, before the new backend version serves traffic**:

- docker compose: the one-shot `migrate` service (`npx prisma migrate deploy`); `backend` waits for it.
- Kubernetes: the `migrate` init container in the backend Deployment. `prisma migrate deploy` holds a Postgres advisory lock, so pods starting together serialize and the rest are no-ops.

Never use `prisma db push` or `prisma migrate reset` against a shared database. `migrate reset` also runs the destructive demo seed and therefore requires `ALLOW_DESTRUCTIVE_SEED=true`.

## Single host (docker compose)

```bash
cp .env.example .env        # fill every [prod] value
npm run docker:prod         # docker compose up --build
```

- Web on `${WEB_PORT:-80}`; backend bound to `127.0.0.1:${PORT:-3001}` (reach it through the web proxy or your own reverse proxy with TLS).
- Optional logging stack: `docker compose -f docker-compose.yml -f docker-compose.elk.yml up -d` (see comments in `docker-compose.elk.yml`).
- Schedule `packages/backend/scripts/backup-db.sh` (see [backup-restore.md](./backup-restore.md)).

## Kubernetes

See [k8s/README.md](../../k8s/README.md). In short:

1. Provide Postgres (managed service recommended) and an RWX storage class, or S3 for uploads.
2. Create Secrets `tilopos-secrets` and `tilopos-backup` in the namespace (External Secrets / Sealed Secrets preferred).
3. Set the image tags (`kustomize edit set image ...`) and apply: `kubectl kustomize k8s/overlays/production | kubectl apply -f -`.
4. Optionally apply `k8s/monitoring/prometheus-rules.yaml` in the same namespace.

## Release checklist

- [ ] CI green on the release commit.
- [ ] New env variables added to `.env.example` files, the ConfigMap and the Secret template.
- [ ] Migration reviewed; backup from the last 24 h verified.
- [ ] Images tagged with the version (no `latest`) and pushed.
- [ ] After deploy: `/api/v1/health/ready` returns 200, login works, one test sale on a staging outlet.
- [ ] CHANGELOG updated and a git tag created.
