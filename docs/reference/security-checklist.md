# docs/reference/security-checklist.md
# Security Checklist — KChat CMS (P1-08)

> Danh sách kiểm tra bảo mật. Cập nhật sau mỗi sprint.
> Trạng thái: ✅ Đã làm | ⚠️ Cần xem xét | ❌ Chưa làm | 🔒 Không áp dụng

## 1. Authentication & Authorization

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 1.1 | devise_token_auth - token rotation sau mỗi request | ✅ | `config/initializers/devise_token_auth.rb` |
| 1.2 | Token tự hết hạn (expiry) | ✅ | Cấu hình trong `devise_token_auth.rb` |
| 1.3 | Token revocation khi sign_out | ✅ | Chatwoot core |
| 1.4 | MFA (TOTP) hỗ trợ | ✅ | `devise-two-factor` gem |
| 1.5 | Brute force protection cho login | ✅ | Rack::Attack (5 req/5min) |
| 1.6 | Brute force protection cho MFA | ✅ | Rack::Attack (10 req/1min) |
| 1.7 | Pundit authorization trên tất cả controllers | ✅ | Kiểm tra `app/policies/` |
| 1.8 | JWT claims validation | ✅ | `jwt` gem ~> 2.10 |
| 1.9 | SSO (Google, SAML) redirect_uri whitelist | ⚠️ | Cần kiểm tra lại omniauth config |

## 2. Rate Limiting (Rack::Attack)

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 2.1 | Global IP throttle | ✅ | 3000 req/min (RACK_ATTACK_LIMIT) |
| 2.2 | Auth endpoints throttle | ✅ | Login, reset password, signup |
| 2.3 | API endpoints throttle | ✅ | Reports, contacts/search, transcripts |
| 2.4 | Widget API throttle | ✅ | Conversation, contact update |
| 2.5 | Allowlist trusted IPs | ✅ | RACK_ATTACK_ALLOWED_IPS env |
| 2.6 | Rack::Attack chỉ bật ở production | ✅ | `Rack::Attack.enabled = Rails.env.production?` |

## 3. CORS & Headers

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 3.1 | CORS origins từ whitelist (không dùng `*` ở production) | ✅ | `ALLOWED_ORIGINS` env — P1-02 |
| 3.2 | Action Cable allowed origins | ✅ | `ACTION_CABLE_ALLOWED_ORIGINS` env — P1-02 |
| 3.3 | Content-Security-Policy header | ✅ | `config/initializers/content_security_policy.rb` |
| 3.4 | Permissions-Policy header | ✅ | `config/initializers/permissions_policy.rb` |
| 3.5 | HSTS (Strict-Transport-Security) | ⚠️ | Cấu hình trên Nginx/Ingress, không phải Rails |
| 3.6 | X-Frame-Options / CSP frame-ancestors | ⚠️ | Kiểm tra lại CSP config |

## 4. Input & Data

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 4.1 | SQL Injection — ActiveRecord parameterized queries | ✅ | Rails mặc định |
| 4.2 | XSS — DOMPurify ở frontend | ✅ | `dompurify` trong package.json |
| 4.3 | File upload validation (type, size) | ✅ | ActiveStorage + `image_processing` |
| 4.4 | SSRF protection cho URL fetching | ✅ | `ssrf_filter` gem |
| 4.5 | CSV injection protection | ✅ | `csv-safe` gem |
| 4.6 | Email validation | ✅ | `valid_email2` gem |
| 4.7 | Strong parameters trên tất cả controllers | ✅ | Chatwoot convention |
| 4.8 | JSON Schema validation cho webhook payloads | ✅ | `json_schemer` gem |

## 5. Secrets & Configuration

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 5.1 | Secrets không commit vào git | ✅ | `.env` trong `.gitignore` |
| 5.2 | `ZALO_BRIDGE_SERVICE_SECRET` không hard-code | ✅ | P0-05: đọc từ ENV |
| 5.3 | `CHATWOOT_API_TOKEN` trong bridge không hard-code | ⚠️ | `server.js` có token mặc định — cần fix P1-10 |
| 5.4 | Secrets rotation plan | ❌ | Chưa có SOP |
| 5.5 | K8s secrets encrypted at rest | ⚠️ | Phụ thuộc cấu hình cluster |

## 6. Telemetry & Privacy

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 6.1 | Chatwoot Hub telemetry disabled | ✅ | P1-03: `kchat_hub_override.rb` |
| 6.2 | Version check disabled | ✅ | P1-03: sync_with_hub suppressed |
| 6.3 | Log filter cho sensitive params | ✅ | `filter_parameter_logging.rb` |
| 6.4 | Sentry không gửi PII | ⚠️ | Cần review Sentry before_send filter |

## 7. Infrastructure

| # | Item | Status | Ghi chú |
|---|------|--------|---------|
| 7.1 | Postgres password không dùng default `postgres` ở production | ❌ | K8s manifest cần dùng K8s Secret |
| 7.2 | Redis có password ở production | ⚠️ | REDIS_PASSWORD env cần set |
| 7.3 | Network policy K8s (chỉ cho phép traffic cần thiết) | ❌ | Chưa có NetworkPolicy manifest |
| 7.4 | Container image scan (Trivy/Snyk) | ❌ | Chưa tích hợp vào CI |
| 7.5 | Dependency audit (bundler-audit, npm audit) | ⚠️ | `bundle-audit` gem có, chưa chạy trong CI |

## Hành động cần làm tiếp theo

1. **[Ưu tiên cao]** Fix hard-code token trong `zalo-personal-bridge/server.js` (P1-10)
2. **[Ưu tiên cao]** Thay Postgres password trong K8s manifest bằng K8s Secret
3. **[Ưu tiên trung]** Tích hợp `bundler-audit` và `npm audit` vào CI pipeline
4. **[Ưu tiên trung]** Container image scan bằng Trivy trong CI
5. **[Ưu tiên thấp]** Review và tối ưu Sentry PII filtering
