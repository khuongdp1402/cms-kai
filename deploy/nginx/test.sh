#!/usr/bin/env bash
# Renders deploy/nginx/templates/kalo.conf.template with KALO_DOMAIN=test.vn using the official nginx image
# and validates it with `nginx -t` against a throwaway self-signed certificate.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOMAIN="test.vn"
IMAGE="${NGINX_IMAGE:-nginx:1.27-alpine}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

[ -f "$ROOT/deploy/nginx/templates/kalo.conf.template" ] || { echo "FAIL: kalo.conf.template missing"; exit 1; }

mkdir -p "$WORK/live/$DOMAIN"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$DOMAIN" \
  -keyout "$WORK/live/$DOMAIN/privkey.pem" -out "$WORK/live/$DOMAIN/fullchain.pem" 2>/dev/null

RENDERED="$(docker run --rm \
  --add-host rails:127.0.0.1 \
  -e KALO_DOMAIN="$DOMAIN" \
  -v "$ROOT/deploy/nginx/templates:/etc/nginx/templates:ro" \
  -v "$WORK:/etc/letsencrypt:ro" \
  "$IMAGE" sh -c '/docker-entrypoint.d/20-envsubst-on-templates.sh >/dev/null && nginx -t >&2 && nginx -T 2>/dev/null')"

echo "$RENDERED" | grep -q 'server_name test.vn www.test.vn;' || { echo "FAIL: apex server_name not rendered"; exit 1; }
echo "$RENDERED" | grep -q 'server_name app.test.vn;' || { echo "FAIL: app server_name not rendered"; exit 1; }
echo "$RENDERED" | grep -q 'root /usr/share/nginx/html;' || { echo "FAIL: landing root missing"; exit 1; }
echo "$RENDERED" | grep -q 'casso/(webhook|status)' || { echo "FAIL: casso location missing"; exit 1; }
echo "$RENDERED" | grep -q 'Upgrade \$http_upgrade' || { echo "FAIL: websocket upgrade missing"; exit 1; }
if echo "$RENDERED" | grep -v "^ *#" | grep -qiE "KCHAT_DOMAIN|KALO_DOMAIN|\$\{"; then echo "FAIL: unsubstituted domain variable"; exit 1; fi
echo "OK: nginx template renders and nginx -t passes"
