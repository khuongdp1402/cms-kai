#!/usr/bin/env bash
# Dumps the Kalo database (pg_dump -Fc) into $BACKUP_DIR/YYYY-MM-DD/ and keeps the newest 14 days.
# Env: PG_CONTAINER (default kalo-postgres-1), POSTGRES_USERNAME, POSTGRES_DATABASE, BACKUP_DIR (default /var/backups/kalo).
# Cron example: 15 2 * * * cd /opt/kalo && set -a && . ./.env.production && set +a && script/ops/pg_backup.sh
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-kalo-postgres-1}"
: "${POSTGRES_USERNAME:?POSTGRES_USERNAME is required}"
: "${POSTGRES_DATABASE:?POSTGRES_DATABASE is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/kalo}"
KEEP_DAYS=14

DAY_DIR="$BACKUP_DIR/$(date +%Y-%m-%d)"
mkdir -p "$DAY_DIR"
FILE="$DAY_DIR/${POSTGRES_DATABASE}_$(date +%H%M%S).dump"

if ! docker exec "$PG_CONTAINER" pg_dump -Fc -U "$POSTGRES_USERNAME" "$POSTGRES_DATABASE" > "$FILE.partial"; then
  rm -f "$FILE.partial"
  echo "pg_backup: pg_dump failed" >&2
  exit 1
fi
[ -s "$FILE.partial" ] || { rm -f "$FILE.partial"; echo "pg_backup: empty dump" >&2; exit 1; }
mv "$FILE.partial" "$FILE"

# Retention: keep the newest $KEEP_DAYS dated directories.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '????-??-??' | sort -r | tail -n +$((KEEP_DAYS + 1)) | while read -r old; do
  rm -rf "$old"
done

echo "pg_backup: wrote $FILE"
