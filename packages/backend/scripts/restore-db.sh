#!/bin/bash
# TiloPOS Database Restore Script
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/db ./scripts/restore-db.sh <backup.dump|backup.dump.gpg>
#
# Restores a backup made by scripts/backup-db.sh (pg_dump custom format, optionally gpg-encrypted)
# into DATABASE_URL. Existing objects are dropped first (--clean --if-exists). Requires the
# explicit confirmation CONFIRM_RESTORE=yes because it overwrites the target database.

set -euo pipefail

FILE="${1:?Usage: restore-db.sh <backup.dump|backup.dump.gpg>}"
: "${DATABASE_URL:?DATABASE_URL is required}"
[ -f "$FILE" ] || { echo "Backup file not found: $FILE" >&2; exit 1; }
if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Refusing to overwrite the database without CONFIRM_RESTORE=yes" >&2
  exit 1
fi

DB_URL="${DATABASE_URL%%\?*}"
case "$DATABASE_URL" in *\?*) QUERY="${DATABASE_URL#*\?}" ;; *) QUERY="" ;; esac
KEEP=$(printf '%s' "$QUERY" | tr '&' '\n' | grep -E '^(sslmode|sslrootcert|connect_timeout|application_name)=' | paste -sd '&' - || true)
[ -n "$KEEP" ] && DB_URL="$DB_URL?$KEEP"

SOURCE="$FILE"
TMP_FILE=""
trap '[ -n "$TMP_FILE" ] && rm -f "$TMP_FILE"' EXIT
case "$FILE" in
  *.gpg)
    TMP_FILE=$(mktemp)
    gpg --batch --yes --decrypt --output "$TMP_FILE" "$FILE"
    SOURCE="$TMP_FILE"
    ;;
esac

pg_restore --list "$SOURCE" > /dev/null
echo "[$(date)] Restoring $FILE ..."
pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction \
  --dbname="$DB_URL" "$SOURCE"
echo "[$(date)] Restore finished"
