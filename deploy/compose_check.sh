#!/usr/bin/env bash
# Validates docker-compose.production.yaml against .env.production.example.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="$(docker compose -f docker-compose.production.yaml --env-file .env.production.example config)"

for bad in zalo_oa_web_bridge zalo-oa-web-bridge; do
  if echo "$OUT" | grep -q "$bad"; then echo "FAIL: reference to $bad"; exit 1; fi
done
if grep -nE '([0-9]{1,3}\.){3}[0-9]{1,3}' docker-compose.production.yaml | grep -vE "127\.0\.0\.1|0\.0\.0\.0"; then
  echo "FAIL: hardcoded IP address in compose"; exit 1
fi
for svc in rails sidekiq zalo_personal_bridge postgres redis nginx; do
  echo "$OUT" | grep -qE "^  $svc:" || { echo "FAIL: service $svc missing"; exit 1; }
done
if echo "$OUT" | grep -qE '\./(app|config|lib)\b'; then echo "FAIL: source code mounted"; exit 1; fi
JSON="$(docker compose -f docker-compose.production.yaml --env-file .env.production.example config --format json)"
JSON="$JSON" python3 - <<'PY'
import json, os
services = json.loads(os.environ["JSON"])["services"]
publishers = sorted(k for k, v in services.items() if v.get("ports"))
assert publishers == ["nginx"], f"services publishing ports: {publishers}"
for name, s in services.items():
    assert "healthcheck" in s, f"{name}: no healthcheck"
    assert s.get("restart") == "unless-stopped", f"{name}: restart policy"
PY
echo "OK: compose config valid"
