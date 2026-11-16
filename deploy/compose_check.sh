#!/usr/bin/env bash
# Validates docker-compose.production.yaml against .env.production.example.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yaml}"

OUT="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production.example config)"

for bad in zalo_oa_web_bridge zalo-oa-web-bridge; do
  if echo "$OUT" | grep -q "$bad"; then echo "FAIL: reference to $bad"; exit 1; fi
done
if grep -nE "([0-9]{1,3}\.){3}[0-9]{1,3}" "$COMPOSE_FILE" | grep -vE "127\.0\.0\.1|0\.0\.0\.0"; then
  echo "FAIL: hardcoded IP address in compose"; exit 1
fi
for svc in rails sidekiq zalo_personal_bridge postgres redis nginx; do
  echo "$OUT" | grep -qE "^  $svc:" || { echo "FAIL: service $svc missing"; exit 1; }
done
if grep -q 'entrypoints/rails.sh' "$COMPOSE_FILE"; then echo "FAIL: dev entrypoint rails.sh referenced"; exit 1; fi
JSON="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production.example config --format json)"
PWD_DIR="$PWD" JSON="$JSON" python3 - <<'PY'
import json, os
services = json.loads(os.environ["JSON"])["services"]
publishers = sorted(k for k, v in services.items() if v.get("ports"))
assert publishers == ["nginx"], f"services publishing ports: {publishers}"
for name, s in services.items():
    for v in s.get("volumes", []):
        src = v.get("source", "")
        for d in ("app", "config", "lib"):
            assert not (src == f"{os.environ['PWD_DIR']}/{d}" or src.startswith(f"{os.environ['PWD_DIR']}/{d}/")), f"{name}: source code mounted ({src})"
    assert "healthcheck" in s, f"{name}: no healthcheck"
    assert s.get("restart") == "unless-stopped", f"{name}: restart policy"
PY
echo "OK: compose config valid"
