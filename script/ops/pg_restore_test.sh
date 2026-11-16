#!/usr/bin/env bash
# Restores the newest dump in $BACKUP_DIR into a temporary database and counts rows in `accounts`.
# Exits 0 only when the restore succeeds and the accounts table is readable. The temp database is always dropped.
# Env: PG_CONTAINER (default kalo-postgres-1), POSTGRES_USERNAME, BACKUP_DIR (default /var/backups/kalo).
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-kalo-postgres-1}"
: "${POSTGRES_USERNAME:?POSTGRES_USERNAME is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/kalo}"

LATEST="$(find "$BACKUP_DIR" -type f -name '*.dump' | sort | tail -n 1)"
[ -n "$LATEST" ] || { echo "pg_restore_test: no dump found in $BACKUP_DIR" >&2; exit 1; }

TMP_DB="kalo_restore_test_$$"
psql_admin() { docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USERNAME" -d postgres "$@"; }
cleanup() { psql_admin -qc "DROP DATABASE IF EXISTS $TMP_DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql_admin -qc "CREATE DATABASE $TMP_DB"
docker exec -i "$PG_CONTAINER" pg_restore --no-owner -U "$POSTGRES_USERNAME" -d "$TMP_DB" < "$LATEST"
COUNT="$(docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -tA -U "$POSTGRES_USERNAME" -d "$TMP_DB" -c 'SELECT count(*) FROM accounts')"
echo "pg_restore_test: $LATEST restored, accounts=$COUNT"
