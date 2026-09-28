# Lộ trình KChat CMS (A–Z)

> Mục tiêu: người dùng không bao giờ thấy giao diện Chatwoot. Xây một CMS mới (hiện đại, đẹp, dễ custom) dùng Chatwoot làm **backend headless**, đạt parity với toàn bộ tính năng core đang chạy được, rồi mở rộng.
>
> Tiến độ thực tế: [STATUS.md](STATUS.md) · Quyết định: [DECISIONS.md](DECISIONS.md) · Hiện trạng backend: [reference/backend-audit.md](reference/backend-audit.md)

Ký hiệu task: `P<phase>-<số>`. Ước lượng tính cho 2–3 dev frontend và 1 dev backend. Khi phạm vi thay đổi thì sửa file này và ghi lại lý do ở mục "Lịch sử thay đổi" cuối file.

## Kiến trúc đích

```
[KChat CMS]  cms.<domain>   SPA tĩnh (Vue 3 + TS + Vite), CDN/Nginx
     │ REST /api/v1, /api/v2, /platform/api/v1      │ WebSocket /cable
     ▼                                              ▼
[Chatwoot core, API-only]  api.<domain>   giữ gần upstream nhất có thể
     │                    └── code KChat trong namespace `kchat` (prepend_mod_with)
     ▼
[Postgres · Redis · Sidekiq · zalo-personal-bridge]
```

- Vị trí code: thư mục `kchat-web/` trong repo này, dùng pnpm workspace với `kchat-web/apps/cms`, `packages/api-client`, `packages/ui`. Chi tiết ở ADR-004.
- Stack (ADR-002): Vue 3 + TypeScript + Vite, shadcn-vue (Reka UI) + Tailwind v4, TanStack Query + Pinia, vee-validate + zod, TanStack Table/Virtual, TipTap, ECharts, vue-i18n, `@rails/actioncable`, Vitest + Playwright.
- Chiến lược chuyển đổi (ADR-003): strangler pattern. Thay từng module, dashboard cũ vẫn chạy song song để dự phòng tới khi đạt parity.

---

## Phase 0 — Chuẩn bị (1–2 tuần)

| ID | Việc | Kết quả |
|---|---|---|
| P0-01 | Setup tài liệu, CLAUDE.md, skills (codegraph, superpowers) | docs/ và .claude/ sẵn sàng |
| P0-02 | Ma trận tính năng: liệt kê mọi màn hình dashboard cũ và đánh dấu giữ / bỏ / tự viết lại | `docs/reference/feature-matrix.md` |
| P0-03 | Chốt các câu hỏi mở (Q1–Q3 trong DECISIONS.md) với chủ dự án | Cập nhật ADR |
| P0-04 | Thêm remote `upstream` Chatwoot, ghi quy trình merge bản vá bảo mật | `docs/reference/upstream-sync.md` |
| P0-05 | Dựng môi trường dev local đầy đủ (docker compose: pg, redis, rails, sidekiq, bridge) và seed | Hướng dẫn chạy trong docs |
| P0-06 | Khung staging và CI (lint, rspec, vitest) | Pipeline chạy xanh |

## Phase 1 — Làm cứng backend headless (2–3 tuần)

| ID | Việc |
|---|---|
| P1-01 | Bật chế độ `CW_API_ONLY_SERVER`, kiểm tra toàn bộ route non-API (dashboard, super_admin, portal, widget) chạy đúng như mong muốn |
| P1-02 | CORS: bỏ `origins '*'` cho `/api/*`, chuyển sang whitelist qua ENV; set `action_cable.allowed_request_origins` |
| P1-03 | Tắt telemetry và version-check của `ChatwootHub` |
| P1-04 | Route enterprise không có controller: gỡ hoặc che bằng feature flag để frontend không gọi vào endpoint 404 |
| P1-05 | Khung namespace `kchat` (controllers/services/policies) và pattern `prepend_mod_with` mẫu |
| P1-06 | Inventory API: sinh OpenAPI từ `swagger/`, đối chiếu với 58 client trong `app/javascript/dashboard/api/`, bổ sung phần thiếu |
| P1-07 | Contract test (rspec request specs) cho các endpoint CMS dùng |
| P1-08 | Rà soát bảo mật: token rotation, rate limit (rack-attack), CSRF/`forgery_protection_origin_check`, headers |

## Phase 2 — Nền tảng CMS (3–4 tuần)

| ID | Việc |
|---|---|
| P2-01 | Khởi tạo `kchat-web/` (pnpm workspace, Vite, TS strict, ESLint, Vitest, Playwright) |
| P2-02 | `packages/api-client`: type sinh từ OpenAPI, HTTP client xử lý header devise_token_auth và **token rotation khi có request song song** |
| P2-03 | `packages/ui`: design system KChat (token màu, typography, dark mode, component shadcn-vue), Histoire/Storybook |
| P2-04 | Auth: login, logout, quên mật khẩu, MFA, SSO (Google/Microsoft), chuyển account |
| P2-05 | App shell: sidebar, command palette, route guard theo quyền (administrator/agent), trang 403/404 |
| P2-06 | Realtime client: subscribe `RoomChannel`, xử lý toàn bộ event trong `action_cable_listener.rb`, reconnect và resync |
| P2-07 | i18n vi/en, format ngày giờ/số, Sentry, analytics |
| P2-08 | E2E khung với backend thật (docker compose trong CI) |

## Phase 3 — Inbox, phần cốt lõi (5–7 tuần)

| ID | Việc |
|---|---|
| P3-01 | Danh sách hội thoại: virtual scroll, tab mine/unassigned/all, filter nâng cao, custom views, unread count |
| P3-02 | Khung chat: render mọi loại message (text, attachment, template, sticker, reaction, email, CSAT, activity) |
| P3-03 | Composer: rich text, file đính kèm (direct upload), canned response, emoji, private note, @mention, ghi âm, draft |
| P3-04 | Hành động: assign agent/team, label, trạng thái (open/pending/snoozed/resolved), priority, macro, bulk actions |
| P3-05 | Sidebar contact: thông tin, custom attributes, lịch sử hội thoại, participants |
| P3-06 | Đặc thù Zalo Personal: sticker, reaction, typing, participants nhóm, sync lịch sử |
| P3-07 | Thông báo: notification center, web push, âm thanh, phím tắt |
| P3-08 | Search toàn cục (conversations, contacts, messages) |

## Phase 4 — CRM và Settings (4–6 tuần)

| ID | Việc |
|---|---|
| P4-01 | Contacts: list/filter/segment, chi tiết, notes, merge, import CSV, labels |
| P4-02 | Inbox settings: tạo và cấu hình từng kênh (web widget, email, Facebook, Instagram, WhatsApp, Telegram, Line, SMS/Twilio, TikTok, API, **Zalo Personal với QR connect**) |
| P4-03 | Agents, Teams, Inbox members, Assignment policies |
| P4-04 | Labels, Canned responses, Macros, Custom attributes |
| P4-05 | Automation rule builder |
| P4-06 | Webhooks, Integrations (Slack, Dyte, Linear, Notion, Shopify, Dialogflow…), Agent bots, Dashboard apps |
| P4-07 | Account settings, Profile, Notification settings, MFA, sessions |

## Phase 5 — Báo cáo, Campaign, Help Center (3–5 tuần)

| ID | Việc |
|---|---|
| P5-01 | Reports v2 (overview, agent, team, inbox, label), live reports, CSAT reports, export |
| P5-02 | Campaigns (ongoing / one-off / WhatsApp) |
| P5-03 | Help Center: portals, categories, articles (editor), bulk actions |

## Phase 6 — Các bề mặt khách hàng nhìn thấy (2–3 tuần)

| ID | Việc |
|---|---|
| P6-01 | Rebrand widget và SDK (bao gồm global `window.$chatwoot` / `chatwootSDK`, giữ alias để không phá tích hợp cũ) |
| P6-02 | Portal help center public, trang CSAT survey |
| P6-03 | Toàn bộ email template (mailer, devise, liquid), cấu hình `BRAND_NAME`/`LOGO` trong installation config |
| P6-04 | Quét và loại bỏ chữ "Chatwoot" ở mọi nơi người dùng cuối nhìn thấy (giữ file `LICENSE` theo MIT) |

## Phase 7 — Super Admin mới (2 tuần)

| ID | Việc |
|---|---|
| P7-01 | Quản lý accounts, users, installation config, platform apps, banners trong CMS dựa trên Platform API cộng endpoint `kchat` bổ sung |
| P7-02 | Tắt truy cập trang Administrate `/super_admin` ra ngoài |

## Phase 8 — QA và chuyển đổi (2–3 tuần)

| ID | Việc |
|---|---|
| P8-01 | Checklist parity 100% theo feature-matrix, mỗi dòng có test E2E |
| P8-02 | Load test inbox và realtime |
| P8-03 | Beta nội bộ, thu thập feedback, fix |
| P8-04 | Cutover: trỏ domain, tắt dashboard cũ với user thường (admin vẫn giữ để dự phòng trong N tuần) |
| P8-05 | Tắt hẳn dashboard cũ, dọn code |

## Phase 9 — Mở rộng (sau parity, chờ chủ dự án duyệt)

- Viết lại các tính năng enterprise mà dự án cần (AI Copilot, SLA, custom roles, audit logs, companies…).
- Kênh mới: Zalo OA hoàn chỉnh, Shopee, TikTok Shop.
- AI trả lời gợi ý và tóm tắt hội thoại (nối `custom_llm_service` vào luồng thật).

---

## Lịch sử thay đổi

| Ngày | Thay đổi | Lý do |
|---|---|---|
| 2026-09-28 | Tạo roadmap ban đầu | Chủ dự án chọn phương án 2 (CMS riêng, Chatwoot headless) |
