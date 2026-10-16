#!/bin/bash
# TiloPOS Database Backup Script (VM / docker-compose installs; k8s uses k8s/base/backup/cronjob.yaml)
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/db ./scripts/backup-db.sh [daily|weekly|monthly]
#
# Required:  DATABASE_URL (credentials included; no silent localhost/postgres defaults)
# Optional:  BACKUP_DIR (default /var/backups/tilopos), RETENTION_DAYS (default 30),
#            BACKUP_GPG_RECIPIENT  -> encrypt the dump with gpg for this recipient,
#            BACKUP_S3_BUCKET      -> upload to a bucket dedicated to backups (NOT the uploads bucket),
#            BACKUP_S3_ENDPOINT    -> S3-compatible endpoint.
# Schedule it (e.g. cron: `0 2 * * * /opt/tilopos/scripts/backup-db.sh daily`). Restore with
# scripts/restore-db.sh.

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
case "$BACKUP_TYPE" in daily|weekly|monthly) ;; *) echo "Unknown backup type: $BACKUP_TYPE" >&2; exit 2 ;; esac

: "${DATABASE_URL:?DATABASE_URL is required}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tilopos}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TARGET_DIR="$BACKUP_DIR/$BACKUP_TYPE"
NAME="tilopos_${BACKUP_TYPE}_${TIMESTAMP}.dump"

# Prisma URLs may carry ?schema=...; libpq rejects unknown parameters, keep only the libpq ones.
DB_URL="${DATABASE_URL%%\?*}"
case "$DATABASE_URL" in *\?*) QUERY="${DATABASE_URL#*\?}" ;; *) QUERY="" ;; esac
KEEP=$(printf '%s' "$QUERY" | tr '&' '\n' | grep -E '^(sslmode|sslrootcert|connect_timeout|application_name)=' | paste -sd '&' - || true)
[ -n "$KEEP" ] && DB_URL="$DB_URL?$KEEP"

mkdir -p "$TARGET_DIR"
chmod 700 "$BACKUP_DIR"

# Work in a temp file and only move it into place after it has been verified, so a failed or
# truncated dump is never mistaken for a valid backup by retention or restore.
TMP_FILE=$(mktemp "$TARGET_DIR/.${NAME}.XXXXXX")
trap 'rm -f "$TMP_FILE" "$TMP_FILE.gpg"' EXIT

echo "[$(date)] Starting $BACKUP_TYPE backup..."
pg_dump --format=custom --no-owner --no-privileges --dbname="$DB_URL" --file="$TMP_FILE"
pg_restore --list "$TMP_FILE" > /dev/null   # verify the archive is readable

FINAL="$TARGET_DIR/$NAME"
if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$TMP_FILE.gpg" "$TMP_FILE"
  FINAL="$FINAL.gpg"
  mv "$TMP_FILE.gpg" "$FINAL"
else
  mv "$TMP_FILE" "$FINAL"
fi
chmod 600 "$FINAL"
echo "[$(date)] Backup complete: $FINAL ($(du -h "$FINAL" | cut -f1))"

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "[$(date)] Uploading to s3://$BACKUP_S3_BUCKET ..."
  aws ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} s3 cp "$FINAL" \
    "s3://$BACKUP_S3_BUCKET/tilopos/$BACKUP_TYPE/" --only-show-errors
  echo "[$(date)] S3 upload complete"
fi

# Retention only after a successful new backup, and only for completed files.
echo "[$(date)] Removing $BACKUP_TYPE backups older than $RETENTION_DAYS days..."
find "$TARGET_DIR" -maxdepth 1 -type f \( -name 'tilopos_*.dump' -o -name 'tilopos_*.dump.gpg' \) \
  -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Backup process finished successfully"
