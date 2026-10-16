# Backup & Restore Runbook

Applies to production and staging. Owner: whoever is on call for TiloPOS infrastructure.

## What is backed up

| Data | How | Where |
| --- | --- | --- |
| PostgreSQL (all tenants) | `pg_dump --format=custom` nightly at 02:00 WIB | Dedicated backup bucket `s3://$BACKUP_S3_BUCKET/tilopos/<timestamp>/tilopos-<timestamp>.dump` |
| Local uploads (only when S3 is not used for uploads) | `tar -czf` of the uploads volume | Same folder, `uploads-<timestamp>.tar.gz` |
| Uploads in S3 (`S3_BUCKET`) | Not copied. Enable **bucket versioning** and, if required, cross-region replication on the uploads bucket. | - |
| Redis | Not backed up. It only holds queues, locks and cache; queued jobs are re-created by the app. | - |

Rules:

- The backup bucket is **separate** from the uploads bucket (`S3_BUCKET`). `backup-db.sh` refuses to upload when both names match.
- Backup credentials are write-only (`s3:PutObject` on the backup bucket). Restores use a separate read credential.
- Retention is an S3 lifecycle rule on the backup bucket (recommended: 30 daily, 12 monthly; object lock / versioning on).
- Timestamps are in Asia/Jakarta (the CronJob sets `timeZone: Asia/Jakarta`).

## Where backups run

- **Kubernetes:** CronJob `<prefix>-tilopos-db-backup` (`k8s/base/backup/cronjob.yaml`). It needs Secret `tilopos-backup` (keys in `k8s/base/secrets.yaml.example`). Staging has it suspended.
- **Single host / docker compose:** `packages/backend/scripts/backup-db.sh` from cron, e.g.

  ```bash
  # 02:00 WIB daily, Sunday weekly
  0 2 * * * cd /opt/tilopos/packages/backend && DATABASE_URL=... BACKUP_S3_BUCKET=tilopos-backups UPLOADS_DIR=/var/lib/docker/volumes/tilopos_uploads/_data ./scripts/backup-db.sh daily
  0 3 * * 0 cd /opt/tilopos/packages/backend && DATABASE_URL=... BACKUP_S3_BUCKET=tilopos-backups ./scripts/backup-db.sh weekly
  ```

  `pg_dump` / `pg_restore` must be the same or a newer major version than the server.

## Checking that backups work

Every week, and after every infrastructure change:

1. `kubectl -n tilopos-production get jobs -l app=tilopos-backup` shows a recent successful job.
2. The newest object in the backup bucket is less than 26 hours old and larger than the previous ones (roughly).
3. Once a month, do a **test restore** into a scratch database (procedure below, steps 3-6) and compare row counts.

Alert if the CronJob fails (`kube_job_status_failed{job_name=~".*tilopos-db-backup.*"} > 0`).

## Restore procedure

Use this for data loss, corruption, or a bad migration. Restoring replaces **every tenant's** data with the snapshot; anything written after the snapshot is lost unless re-entered. Get approval from the business owner first and announce downtime.

1. **Stop writers.** Scale the backend to zero so no POS writes land during the restore:

   ```bash
   kubectl -n tilopos-production scale deploy/prod-tilopos-backend --replicas=0
   ```

   (The HPA does not scale a Deployment that is at 0 replicas, so it stays down.)

   POS terminals keep queuing offline sales and will sync once the API is back.

2. **Take a safety dump of the current state** (even if it is broken) so the restore can be undone:

   ```bash
   DATABASE_URL=... BACKUP_DIR=/tmp/pre-restore ./scripts/backup-db.sh daily
   ```

3. **Download the snapshot** with a read-only credential:

   ```bash
   aws s3 cp s3://tilopos-backups/tilopos/<timestamp>/ ./restore/ --recursive
   ```

4. **Restore the database** (drops and recreates every object in the target DB):

   ```bash
   cd packages/backend
   TARGET_DATABASE_URL='postgresql://tilopos:***@db-host:5432/tilopos?sslmode=require' \
   CONFIRM_RESTORE=yes \
   ./scripts/restore-db.sh ../../restore/tilopos-<timestamp>.dump
   ```

   For a test restore, point `TARGET_DATABASE_URL` at a scratch database instead.

5. **Restore uploads** (only when uploads live on the PVC / local volume): run a pod that mounts the uploads PVC, copy the archive in, and extract it:

   ```bash
   UPLOADS_DIR=/app/packages/backend/uploads ./scripts/restore-db.sh <dump> uploads-<timestamp>.tar.gz
   ```

6. **Verify** before reopening:
   - `SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;` matches the migration of the release you will run. If the snapshot is older than the running release, the backend's `migrate` init container applies the missing migrations on start.
   - Row counts of `businesses`, `transactions`, `stock_levels` look plausible for the snapshot time.
   - Log in with a known account and open today's report for one outlet.

7. **Start writers again:**

   ```bash
   kubectl -n tilopos-production scale deploy/prod-tilopos-backend --replicas=3
   ```

8. Write down the incident: snapshot used, data window lost, tenants affected. Tell affected businesses which period they must re-check (payments reconciled with Midtrans/Xendit after the snapshot time must be matched manually).

## Restoring a single tenant

`pg_restore` restores whole tables. To recover one business, restore the snapshot into a scratch database (steps 3-4 with a scratch `TARGET_DATABASE_URL`) and copy that tenant's rows across with SQL filtered by `business_id`. Do this with a second person reviewing the statements.
