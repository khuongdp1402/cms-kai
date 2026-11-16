#!/usr/bin/env bash
# Kalo live API smoke test. Drives a running Rails server with curl; exits non-zero on the first failed assertion.
#
# Required env:
#   BASE_URL        e.g. http://localhost:3300
#   CASSO_TOKEN     the server's CASSO_SECURE_TOKEN (also accepted as SECURE_TOKEN)
#   SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD   an existing SuperAdmin (for the Console steps)
# Optional env:
#   RAILS_RUNNER    command prefix that runs `rails runner` against the SAME database as the server.
#                   Used for two things the public API cannot do: confirm the freshly signed-up user's email
#                   and create a web-widget inbox + conversation. Default: docker exec into kalo-smoke-rails.
#   SIMULATE_EXPECT expected HTTP status of POST /api/v1/casso/simulate (default 404; the route only exists in
#                   RAILS_ENV=development, so a development server answers 200 - set SIMULATE_EXPECT=200 there).
# Server prerequisites: ENABLE_ACCOUNT_SIGNUP true (InstallationConfig, not only the env var), CASSO_* set,
# AGENTGW_API_KEY unset (the AI step expects 503 ai_not_configured).
#
# SAFETY: this script creates accounts, confirms users through rails runner and posts a Casso credit, and it
# LEAVES its test accounts, orders and payment events in the database. Run it only against a throwaway dev
# database. It refuses any BASE_URL that is not localhost / 127.0.0.1 / 0.0.0.0 unless I_KNOW=1 is set.
# (no `set -u`: macOS bash 3.2 treats empty arrays as unbound; pipefail is fine)
set -o pipefail

BASE_URL="${BASE_URL:?set BASE_URL}"
# Exact host match (a plain `http://localhost*` prefix would also accept http://localhost.evil.com).
LOCAL_URL_RE='^http://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:[0-9]+)?(/.*)?$'
if ! [[ "$BASE_URL" =~ $LOCAL_URL_RE ]]; then
  [ "${I_KNOW:-}" = 1 ] || { echo "refusing non-local BASE_URL; set I_KNOW=1 to override" >&2; exit 2; }
fi
CASSO_TOKEN="${CASSO_TOKEN:-${SECURE_TOKEN:?set CASSO_TOKEN}}"
SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:?set SUPERADMIN_EMAIL}"
SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:?set SUPERADMIN_PASSWORD}"
# Values interpolated into the Ruby runner and python snippets must be harmless.
case "$SUPERADMIN_EMAIL" in *[!A-Za-z0-9._+@-]*) echo "unsafe SUPERADMIN_EMAIL" >&2; exit 2 ;; esac
RAILS_RUNNER="${RAILS_RUNNER:-docker exec -i kalo-smoke-rails bundle exec rails runner}"
SIMULATE_EXPECT="${SIMULATE_EXPECT:-404}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
STEP=0; PASS=0
RUN_ID="$(date +%s)$RANDOM"

ok()   { STEP=$((STEP+1)); PASS=$((PASS+1)); printf '%2d OK   %s\n' "$STEP" "$1"; }
fail() { STEP=$((STEP+1)); printf '%2d FAIL %s\n' "$STEP" "$1"; shift; [ $# -gt 0 ] && printf '        %s\n' "$@"; printf '\n%d passed, 1 failed (stopped at step %d)\n' "$PASS" "$STEP"; exit 1; }

# need_id <name> <value>: server-derived ids go into Ruby and python snippets, so they must be plain integers.
need_id() { case "$2" in ''|*[!0-9]*) fail "$1 is a plain integer id" "got: $(printf '%s' "$2" | head -c 80)" ;; esac; }

# json <file> <python expression over d>  -> prints the value ("" on error)
json() { python3 -c 'import json,sys
try:
    d=json.load(open(sys.argv[1])); v=eval(sys.argv[2])
    print("" if v is None else v)
except Exception: print("")' "$1" "$2"; }

# req METHOD PATH [json-body] [extra curl args...]; sets CODE and BODY (file). Auth headers in $AUTH (array).
AUTH=()
req() {
  local method="$1" path="$2" body="${3:-}"; shift 3 2>/dev/null || shift $#
  local args=(-s -o "$WORK/body" -D "$WORK/headers" -w '%{http_code}' -X "$method" "${AUTH[@]}" -H 'Accept: application/json')
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' --data "$body")
  CODE="$(curl "${args[@]}" "$@" "$BASE_URL$path")"
  BODY="$WORK/body"
}
expect() { # expect <label> <status> [python assertion over d] 
  [ "$CODE" = "$2" ] || fail "$1" "expected HTTP $2, got $CODE" "body: $(head -c 400 "$BODY")"
  if [ -n "${3:-}" ]; then
    [ "$(json "$BODY" "$3")" = "True" ] || fail "$1" "assertion failed: $3" "body: $(head -c 600 "$BODY")"
  fi
  ok "$1"
}
header() { grep -i "^$1:" "$WORK/headers" | head -1 | cut -d: -f2- | tr -d ' \r\n'; }
set_auth() { # from last response headers
  AUTH=(-H "access-token: $(header access-token)" -H "client: $(header client)" -H "uid: $(header uid)" -H "expiry: $(header expiry)" -H "token-type: Bearer")
}

EMAIL="smoke+$RUN_ID@smoke.test"; PASSWORD='Smoke123!Pass'
EMAIL2="smoke2+$RUN_ID@smoke.test"

echo "Kalo smoke against $BASE_URL (run $RUN_ID)"

# 1. sign up (unauthenticated web signup only returns the email; the user must confirm before signing in)
req POST /api/v1/accounts "{\"account_name\":\"Smoke Shop $RUN_ID\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"user_full_name\":\"Smoke Owner\",\"locale\":\"vi\"}"
expect "signup account 1" 200 "d.get('email')=='$EMAIL'"
req POST /api/v1/accounts "{\"account_name\":\"Other Shop $RUN_ID\",\"email\":\"$EMAIL2\",\"password\":\"$PASSWORD\",\"user_full_name\":\"Other Owner\",\"locale\":\"vi\"}"
expect "signup account 2" 200

# 2. confirm the new users and the SuperAdmin (email confirmation is normally done through a mailed link)
$RAILS_RUNNER "%w[$EMAIL $EMAIL2 $SUPERADMIN_EMAIL].each { |e| User.find_by!(email: e).confirm }" >/dev/null 2>&1 \
  && ok "confirm users via rails runner" || fail "confirm users via rails runner" "RAILS_RUNNER=$RAILS_RUNNER"

# 3. sign in
signin() { # signin <email> <password> -> sets AUTH, CODE, BODY
  AUTH=(); req POST /auth/sign_in "{\"email\":\"$1\",\"password\":\"$2\"}"
  [ "$CODE" = 200 ] && set_auth
}
signin "$EMAIL" "$PASSWORD"
expect "sign in account 1 (devise token headers)" 200 "len(d['data']['accounts'])>=1"
[ -n "$(header access-token)" ] && ok "access-token header present" || fail "access-token header present"
ACC="$(json "$BODY" "d['data']['accounts'][0]['id']")"; need_id ACC "$ACC"
USER_AUTH=("${AUTH[@]}")
K="/api/v1/accounts/$ACC/kchat"

# 4. subscription: trial, memo
req GET "$K/subscription"
expect "GET subscription is trial with memo 'KALO $ACC PLAN'" 200 "d['status']=='trial' and d['memo']=='KALO $ACC PLAN' and d['plan'] is None and d['days_left']>0"

# 5. payment settings
req PATCH "$K/payment_settings" '{"bank_bin":"970422","bank_name":"MB Bank","account_number":"0123456789","account_name":"SMOKE SHOP"}'
expect "PATCH payment_settings (bin 970422)" 200 "d['bank_bin']=='970422'"
req PATCH "$K/payment_settings" '{"bank_bin":"12345"}'
[ "$CODE" = 422 ] && ok "payment_settings rejects 5-digit bin (422)" || fail "payment_settings rejects 5-digit bin" "got $CODE: $(head -c 300 "$BODY")"

# 6. product, order
req POST "$K/products" '{"name":"Ao thun smoke","price":150000,"sku":"SMK-1","stock":50}'
[ "$CODE" = 200 ] || [ "$CODE" = 201 ] || fail "POST product" "got $CODE: $(head -c 300 "$BODY")"
[ "$(json "$BODY" "d['price']==150000 and d['stock']==50")" = True ] && ok "POST product ($CODE)" || fail "POST product values" "$(head -c 300 "$BODY")"
PID="$(json "$BODY" "d['id']")"
need_id PID "$PID"
req POST "$K/orders" "{\"source\":\"manual\",\"payment_method\":\"transfer_qr\",\"shipping_fee\":20000,\"items\":[{\"product_id\":$PID,\"quantity\":2},{\"name\":\"Phi goi qua\",\"unit_price\":5000,\"quantity\":1}]}"
[ "$CODE" = 200 ] || [ "$CODE" = 201 ] || fail "POST order (transfer_qr)" "got $CODE: $(head -c 400 "$BODY")"
ORDER_ID="$(json "$BODY" "d['id']")"; TOTAL="$(json "$BODY" "d['total']")"; need_id ORDER_ID "$ORDER_ID"; need_id TOTAL "$TOTAL"
[ "$(json "$BODY" "d['status']=='pending_payment' and d['total']==325000 and d['number']>=1001")" = True ] \
  && ok "POST order: pending_payment, total 325000 (2x150000 + 5000 + 20000 ship), number>=1001" \
  || fail "POST order values" "body: $(head -c 500 "$BODY")"

# 7. QR image
curl -s -o "$WORK/qr.png" -D "$WORK/qrh" -w '%{http_code}' "${AUTH[@]}" "$BASE_URL$K/orders/$ORDER_ID/qr" >"$WORK/qrcode"
[ "$(cat "$WORK/qrcode")" = 200 ] || fail "GET order qr" "HTTP $(cat "$WORK/qrcode")"
grep -qi '^content-type: image/png' "$WORK/qrh" || fail "GET order qr content-type" "$(grep -i content-type "$WORK/qrh")"
[ "$(head -c 8 "$WORK/qr.png" | xxd -p)" = "89504e470d0a1a0a" ] && ok "GET order qr is image/png with PNG magic ($(wc -c <"$WORK/qr.png" | tr -d ' ') bytes)" || fail "QR has PNG magic"

# 8. conversation for send_qr (web widget inbox + contact + conversation created through rails runner)
CONV="$($RAILS_RUNNER "
a = Account.find($ACC)
inbox = a.inboxes.find_by(name: 'Smoke Widget') || Inbox.create!(account: a, name: 'Smoke Widget', channel: Channel::WebWidget.create!(account: a, website_url: 'https://smoke.test'))
contact = a.contacts.create!(name: 'Khach Smoke', phone_number: '+84901234567')
ci = ContactInbox.create!(contact: contact, inbox: inbox, source_id: SecureRandom.uuid)
conv = Conversation.create!(account: a, inbox: inbox, contact: contact, contact_inbox: ci)
puts \"CONV=#{conv.display_id}\"
" 2>/dev/null | grep '^CONV=' | cut -d= -f2)"
need_id CONV "$CONV"
ok "create widget inbox + conversation via rails runner (display_id $CONV)" || fail "create conversation via rails runner"
req POST "$K/orders/$ORDER_ID/send_qr" "{\"conversation_id\":$CONV}"
expect "POST send_qr into conversation $CONV" 201 "d.get('id') is not None"
ATTACH="$($RAILS_RUNNER "m = Account.find($ACC).conversations.find_by!(display_id: $CONV).messages.where(message_type: :outgoing).last; puts \"ATT=#{m.attachments.count}\"" 2>/dev/null | grep '^ATT=' | cut -d= -f2)"
[ "$ATTACH" = 1 ] && ok "outgoing message has the QR attachment" || fail "outgoing message has QR attachment" "attachments=$ATTACH"

# 9. mark paid + report revenue
req POST "$K/orders/$ORDER_ID/transition" '{"event":"mark_paid"}'
expect "transition mark_paid" 200 "d['status']=='paid' and d['paid_at'] is not None"
req POST "$K/orders/$ORDER_ID/transition" '{"event":"mark_paid"}'
[ "$CODE" = 422 ] && ok "second mark_paid is rejected (422 invalid_transition)" || fail "second mark_paid rejected" "got $CODE"
req GET "$K/reports/summary?range=today"
expect "reports summary range=today revenue == order total ($TOTAL)" 200 "d['revenue']==$TOTAL and d['orders_count']>=1"
# new accounts have no reporting_timezone: buckets use Vietnam time (UTC+7), not UTC
[ "$(json "$BODY" "d['daily'][-1]['date']==__import__('datetime').datetime.now(__import__('datetime').timezone(__import__('datetime').timedelta(hours=7))).date().isoformat()")" = True ] \
  && ok "reports daily bucket is today in Vietnam time" || fail "reports daily bucket is today in Vietnam time" "daily=$(json "$BODY" "d['daily']")"

# 10. Casso webhook
CW='/api/v1/casso/webhook'
TID="SMK$RUN_ID"
PAY="{\"data\":[{\"tid\":\"$TID\",\"description\":\"MBVCB.1.KALO $ACC PLAN.CT tu KHACH\",\"amount\":699000,\"when\":\"2026-11-17 10:00:00\"}]}"
AUTH=(); req POST "$CW" "$PAY"
expect "casso webhook without token -> 401" 401
req POST "$CW" "$PAY" -H 'Secure-Token: wrong-token'
expect "casso webhook with wrong token -> 401" 401
req POST "$CW" "$PAY" -H "Secure-Token: $CASSO_TOKEN"
expect "casso webhook memo 'KALO $ACC PLAN' 699000 -> 200 matched" 200 "d['processed_count']==1 and d['results'][0]['status']=='matched_and_activated'"
AUTH=("${USER_AUTH[@]}"); req GET "$K/subscription"
expect "subscription now active / growth" 200 "d['status']=='active' and d['plan']=='growth'"
VALID1="$(json "$BODY" "d['valid_until']")"
AUTH=(); req POST "$CW" "$PAY" -H "Secure-Token: $CASSO_TOKEN"
expect "same tid again -> duplicate_ignored" 200 "d['results'][0]['status']=='duplicate_ignored'"
AUTH=("${USER_AUTH[@]}"); req GET "$K/subscription"
[ "$(json "$BODY" "d['valid_until']")" = "$VALID1" ] && ok "duplicate did not extend valid_until ($VALID1)" || fail "duplicate did not extend valid_until" "before=$VALID1 after=$(json "$BODY" "d['valid_until']")"
AUTH=(); req POST "$CW" "{\"data\":{\"tid\":\"${TID}B\",\"description\":\"KALO $ACC PLAN\",\"amount\":699000,\"when\":\"2026-11-17 11:00:00\"}}" -H "Secure-Token: $CASSO_TOKEN"
expect "casso webhook with data as a single object -> 200 processed" 200 "d['processed_count']==1 and d['results'][0]['status']=='matched_and_activated'"
req POST "$CW" '{"data":"not-a-transaction"}' -H "Secure-Token: $CASSO_TOKEN"
expect "malformed payload -> 400 invalid_payload" 400 "d['error']=='invalid_payload'"
req POST "$CW" "{\"data\":[{\"tid\":\"SMKX$RUN_ID\",\"description\":\"KALO $ACC TOKENS\",\"amount\":50000,\"when\":\"2026-11-17 12:00:00\"}]}" -H "Secure-Token: $CASSO_TOKEN"
[ "$CODE" = 200 ] && [ "$(json "$BODY" "d['results'][0]['status']!='matched_and_activated'")" = True ] && ok "ambiguous memo 'TOKENS' is not auto-applied ($(json "$BODY" "d['results'][0]['status']"))" || fail "ambiguous memo not applied" "$CODE $(head -c 300 "$BODY")"
req POST /api/v1/casso/simulate "{\"account_ref\":\"$ACC\",\"amount\":1}"
[ "$CODE" = "$SIMULATE_EXPECT" ] && ok "casso simulate -> $SIMULATE_EXPECT" || fail "casso simulate -> $SIMULATE_EXPECT" "got $CODE"
req GET /api/v1/casso/status
expect "casso status is public" 200 "'account_number' in d"

# 11. AI endpoint without a configured gateway
AUTH=("${USER_AUTH[@]}"); req POST "/api/v1/accounts/$ACC/brand_growth/chat_reply" '{"message":"Xin chao"}'
expect "AI chat_reply -> 503 ai_not_configured" 503 "d['error']=='ai_not_configured'"
req POST "/api/v1/accounts/$ACC/brand_growth/repurpose" '{"topic":"khuyen mai"}'
expect "AI repurpose -> 503 ai_not_configured" 503 "d['error']=='ai_not_configured'"

# 12. tenant isolation and auth
signin "$EMAIL2" "$PASSWORD"
expect "sign in account 2" 200
ACC2="$(json "$BODY" "d['data']['accounts'][0]['id']")"; need_id ACC2 "$ACC2"
[ "$ACC2" != "$ACC" ] && ok "account 2 has its own id ($ACC2)" || fail "account 2 has its own id"
req GET "/api/v1/accounts/$ACC/kchat/orders/$ORDER_ID"
[ "$CODE" = 401 ] || [ "$CODE" = 404 ] && ok "account 2 token on account 1 order path -> $CODE (denied)" || fail "cross-tenant via account-1 path" "got $CODE"
req GET "/api/v1/accounts/$ACC2/kchat/orders/$ORDER_ID"
expect "account 2 token cannot GET account 1's order via own path -> 404" 404
req GET "/api/v1/accounts/$ACC2/kchat/orders"
expect "account 2 order list is empty" 200 "len(d['payload'])==0"
AUTH=(); req GET "$K/orders"
expect "unauthenticated GET orders -> 401" 401

# 13. Console
AUTH=("${USER_AUTH[@]}")
for ep in overview accounts payment_events; do
  req GET "/api/v1/console/$ep"; expect "console/$ep as normal user -> 403" 403
done
signin "$SUPERADMIN_EMAIL" "$SUPERADMIN_PASSWORD"
expect "sign in SuperAdmin" 200
req GET /api/v1/console/overview
expect "console/overview as SuperAdmin -> 200" 200 "d['shops']>=2 and d['shops_by_plan']['growth']>=1"
req GET /api/v1/console/accounts
expect "console/accounts as SuperAdmin -> 200" 200 "isinstance(d['payload'],list)"
req GET /api/v1/console/payment_events
expect "console/payment_events as SuperAdmin -> 200, shows the Casso events" 200 "any(e['tid']=='$TID' for e in d['payload'])"

printf '\nALL %d STEPS PASSED (account %s, order %s, conversation %s)\n' "$STEP" "$ACC" "$ORDER_ID" "$CONV"
echo "EMAIL=$EMAIL ACCOUNT=$ACC ORDER=$ORDER_ID PASSWORD=$PASSWORD" > "${KALO_SMOKE_OUT:-/dev/null}"
