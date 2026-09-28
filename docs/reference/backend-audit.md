# Audit backend (2026-09-28)

Chatwoot OSS **4.16.1** (`VERSION_CW`), Rails 7.1, Vue 3. Repo có 1 commit ("initial commit — KChat CMS base").

## Bề mặt API

| Namespace | Dùng cho |
|---|---|
| `/api/v1/accounts/:account_id/*` | Toàn bộ nghiệp vụ core: conversations, messages, contacts, inboxes, agents, teams, labels, canned, macros, automation, campaigns, webhooks, integrations, portals/articles, custom attributes/filters, notifications, assignment policies, Zalo Personal |
| `/api/v1/profile` | Profile, MFA, sessions |
| `/api/v2/accounts/:id/*` | Reports, summary reports, live reports, year in review |
| `/platform/api/v1/*` | Quản trị multi-tenant: users, accounts, account_users, agent_bots |
| `/public/api/v1/*`, `/api/v1/widget/*` | Phía khách hàng (widget, API channel client) |
| `/super_admin` | Trang Administrate render bằng server, **không phải REST** |

- Tài liệu: `swagger/` (swagger.json + paths). Chưa chắc đã đầy đủ, cần đối chiếu với `app/javascript/dashboard/api/*.js` (58 file).
- Auth: devise_token_auth (header `access-token`, `client`, `uid`, `expiry`, token thay đổi theo request) hoặc `api_access_token` (`app/controllers/api/base_controller.rb`).

## Realtime

- `app/channels/room_channel.rb`: tham số `pubsub_token`, `account_id`, `user_id`. Stream theo `pubsub_token` của user và `account_<id>`.
- Event (`app/listeners/action_cable_listener.rb`): `notification.created/updated/deleted`, `account.cache_invalidated`, `message.created/updated`, `first.reply.created`, `conversation.created/read/status_changed/updated/unread_count_changed/typing_on/typing_off/contact_changed/mentioned`, `assignee.changed`, `team.changed`, `contact.created/updated/merged/deleted`, `presence.update`.

## Chế độ headless

- `CW_API_ONLY_SERVER=true` ảnh hưởng `config/routes.rb` (dòng 14), CORS và luồng signup (`accounts_controller.rb`).
- `config/initializers/cors.rb`: `origins '*'` và expose các header token. **Cần whitelist trước khi lên production.**
- ActionCable: `disable_request_forgery_protection = true`, `forgery_protection_origin_check = false`.

## Tính năng có route nhưng không có controller (không có `enterprise/`)

Captain (assistants, documents, copilot, custom tools, tasks, scenarios…), `sla_policies`, `applied_slas`, `custom_roles`, `audit_logs`, `companies`, `saml_settings`, `agent_capacity_policies`, `reporting_events`, `calls`/`whatsapp_calls`. Frontend vẫn có màn hình cho các tính năng này nên hiện đang lỗi. `ChatwootApp.enterprise?` trả về false.

## Module custom

| Module | Tình trạng |
|---|---|
| Zalo Personal (`app/models/channel/zalo_personal.rb`, `app/services/zalo_personal/*`, `app/jobs/zalo_personal/*`, `zalo-personal-bridge/`) | **Hoàn chỉnh**, có spec (7 file) và test ở bridge. Bridge dùng `zca-js` 2.1.2 (không chính thức, rủi ro ToS) |
| Zalo OA (`lib/integrations/zalo/processor.rb`, `webhooks/zalo_controller.rb`, UI `channels/Zalo.vue`) | Dở dang: chưa có model channel |
| Shopee (`lib/integrations/shopee/client.rb`, 70 dòng), TikTok (37 dòng) | Stub, không nối vào đâu |
| `app/services/ai/custom_llm_service.rb` | Stub, không nối vào đâu |

## Chỗ lộ thương hiệu Chatwoot

- Khoảng 100 chỗ trong `app/views`, `app/javascript/widget`, `app/javascript/portal`. Email: `app/views/mailers/**`, `app/views/devise/mailer/**`.
- Cấu hình: `INSTALLATION_NAME`, `BRAND_NAME`, `LOGO*` trong `config/installation_config.yml`. Frontend có helper `replaceInstallationName` (`shared/composables/useBranding`).
- `ChatwootHub` (`lib/chatwoot_hub.rb`) gửi telemetry và kiểm tra phiên bản về server của Chatwoot.
