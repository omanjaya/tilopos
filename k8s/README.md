# Kubernetes Deployment

Kustomize manifests for TiloPOS. Render and apply with the kubectl built-in kustomize:

```bash
kubectl kustomize k8s/overlays/staging            # inspect
kubectl kustomize k8s/overlays/production | kubectl apply -f -
```

General deployment notes (env contract, migrations, release checklist) are in
[Docs/operations/deployment.md](../Docs/operations/deployment.md); backups in
[Docs/operations/backup-restore.md](../Docs/operations/backup-restore.md).

## Layout

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── serviceaccount.yaml          # tilopos-backend, no API token mounted
│   ├── configmap.yaml               # non-secret backend + web config (env contract)
│   ├── secrets.yaml.example         # TEMPLATE of the required Secrets (not applied)
│   ├── external-secret.example.yaml # External Secrets Operator example (not applied)
│   ├── backend/                     # Deployment (+ migrate init container), Service, HPA, PDB, uploads PVC (RWX)
│   ├── web/                         # nginx-unprivileged on 8080, Service, HPA, PDB
│   ├── redis/                       # StatefulSet: password, noeviction, AOF on a PVC
│   ├── backup/cronjob.yaml          # nightly pg_dump + uploads tar -> dedicated backup bucket
│   ├── networkpolicy.yaml           # default-deny ingress + allow ingress-nginx/monitoring
│   └── ingress.yaml                 # ingress-nginx + cert-manager
├── overlays/
│   ├── staging/                     # namespace tilopos-staging, prefix staging-, backups suspended
│   └── production/                  # namespace tilopos-production, prefix prod-
└── monitoring/                      # ServiceMonitor + PrometheusRule (Prometheus Operator CRDs)
```

## Prerequisites

- ingress-nginx (namespace `ingress-nginx`) and cert-manager with a `letsencrypt-prod` ClusterIssuer.
- PostgreSQL 15+ reachable from the cluster (managed service recommended; no Postgres manifest is shipped).
- An RWX-capable StorageClass for the `tilopos-uploads` PVC, **or** S3 for uploads (set `S3_ACCESS_KEY_ID`).
- A dedicated S3 bucket for backups (not the uploads bucket).
- RabbitMQ is optional; without `RABBITMQ_URL` the backend uses its in-process event bus.

## Secrets

The kustomization deliberately contains **no Secret**. Create these in each namespace before the first apply:

| Secret | Used by | Keys |
| --- | --- | --- |
| `tilopos-secrets` | backend, migrate init container, Redis, backup dump | see `base/secrets.yaml.example` (`DATABASE_URL`, `JWT_SECRET`, `REDIS_PASSWORD`, `METRICS_TOKEN`, gateway/SMTP/S3 credentials, ...) |
| `tilopos-backup` | backup CronJob upload | `BACKUP_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, optional `BACKUP_S3_ENDPOINT` |

Secret names are **not** prefixed by the overlays (they are not part of the kustomization).

Recommended: External Secrets Operator (`base/external-secret.example.yaml`) or Sealed Secrets, committed in your GitOps repo. Manual alternative:

```bash
kubectl -n tilopos-production create secret generic tilopos-secrets --from-env-file=prod-secrets.env
kubectl -n tilopos-production create secret generic tilopos-backup  --from-env-file=prod-backup.env
```

Never commit a filled-in `secrets.yaml` (it is gitignored) and never add one to `kustomization.yaml`.

## Environment contract

`base/configmap.yaml` + `tilopos-secrets` together must satisfy `packages/backend/src/config/env.validation.ts`:
`DATABASE_URL`, `JWT_SECRET` (>= 32 chars), `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `FRONTEND_URL`, `REDIS_HOST`,
and `PAYMENT_GATEWAY` (`midtrans` or `xendit`) with its keys. The pod crash-loops with a clear message
listing the missing keys otherwise.

Because overlays add a `namePrefix`, values that contain Service names are set per overlay:
`REDIS_HOST` (`prod-tilopos-redis`) and the web `BACKEND_UPSTREAM` (`http://prod-tilopos-backend`).

## Images

Base images are pinned; the app images default to tag `0.1.0`. Set the release tag (or digest) before applying:

```bash
cd k8s/overlays/production
kustomize edit set image ghcr.io/tilopos/backend=ghcr.io/tilopos/backend:1.2.3 \
                         ghcr.io/tilopos/web=ghcr.io/tilopos/web:1.2.3
```

## Migrations

The backend Deployment has a `migrate` init container that runs `prisma migrate deploy` with the same image.
Prisma takes a Postgres advisory lock, so concurrent pods wait for each other and later ones are no-ops.
The image's own `CMD` only starts the app.

## Health and metrics

- Backend: startup/liveness `GET /api/v1/health/live`, readiness `GET /api/v1/health/ready` on port 3001.
- Web: `GET /health` on port 8080 (answered by nginx, not the SPA).
- Metrics: `GET /api/v1/metrics` when `METRICS_ENABLED=true`, bearer `METRICS_TOKEN`. Apply
  `monitoring/prometheus-rules.yaml` in each environment namespace.

## Verify a deployment

```bash
kubectl -n tilopos-production get pods,svc,pvc,cronjob
kubectl -n tilopos-production logs deploy/prod-tilopos-backend -c migrate
kubectl -n tilopos-production logs -f deploy/prod-tilopos-backend
kubectl -n tilopos-production create job --from=cronjob/prod-tilopos-db-backup backup-smoke-test
```

## Security checklist

- [ ] Secrets come from a secret manager (not plain YAML in git)
- [ ] `JWT_SECRET` >= 32 random chars; strong `REDIS_PASSWORD`, `METRICS_TOKEN`
- [ ] NetworkPolicies enforced by the CNI (namespace labels match your ingress/monitoring namespaces)
- [ ] Images pinned to a version or digest and scanned
- [ ] Backup CronJob succeeded and a test restore was done this month
