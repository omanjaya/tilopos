#!/bin/bash
# TiloPOS Database Backup Script
# Usage: ./scripts/backup-db.sh [daily|weekly|monthly]

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tilopos}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tilopos}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_TYPE"

BACKUP_FILE="$BACKUP_DIR/$BACKUP_TYPE/tilopos_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting $BACKUP_TYPE backup..."

# Dump and compress
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-privileges --clean --if-exists \
  | gzip > "$BACKUP_FILE"

# Get file size
FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($FILESIZE)"

# Cleanup old backups
echo "[$(date)] Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR/$BACKUP_TYPE" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

# Optional: Upload to S3
if [ -n "${S3_BUCKET:-}" ]; then
  echo "[$(date)] Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$BACKUP_TYPE/" --quiet
  echo "[$(date)] S3 upload complete"
fi

echo "[$(date)] Backup process finished successfully"
