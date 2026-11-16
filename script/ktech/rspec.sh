#!/usr/bin/env bash
# Chạy rspec trong container dev. Dùng: script/ktech/rspec.sh <track> <đường dẫn spec…>
# Mỗi <track> có một DB test riêng (chatwoot_test_<track>) nên nhiều worktree chạy song song không đè nhau.
# Dùng chung Postgres/Redis của project compose "cms-kai" (cần `docker compose up -d postgres redis` ở thư mục gốc).
# KALO_SKIP_SCHEMA=1 bỏ bước nạp lại schema khi không đổi migration.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TRACK="${1:?usage: rspec.sh <track> <spec paths...>}"
shift
[ -f "$ROOT/.env" ] || cp "$ROOT/.env.example" "$ROOT/.env"
DB="chatwoot_test_$(echo "$TRACK" | tr -c 'a-z0-9\n' '_')"
exec docker compose -p cms-kai -f "$ROOT/docker-compose.yaml" run --rm --no-deps --entrypoint "" \
  -e RAILS_ENV=test -e POSTGRES_HOST=postgres -e REDIS_URL=redis://redis:6379 -e POSTGRES_DATABASE="$DB" \
  -e KALO_SKIP_SCHEMA="${KALO_SKIP_SCHEMA:-0}" rails sh -c '
    if [ "$KALO_SKIP_SCHEMA" != "1" ]; then bundle exec rails db:create db:schema:load >/dev/null 2>&1; fi
    bundle exec rspec "$@"' sh "$@"
