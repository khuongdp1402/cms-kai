#!/usr/bin/env bash
# Chạy vitest trong container dev. Dùng: script/ktech/vitest.sh [đường dẫn spec…]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
[ -f "$ROOT/.env" ] || cp "$ROOT/.env.example" "$ROOT/.env"
exec docker compose -p cms-kai -f "$ROOT/docker-compose.yaml" run --rm --no-deps --entrypoint "" \
  -e TZ=UTC rails sh -c 'pnpm vitest --no-watch --no-cache --no-coverage "$@"' sh "$@"
