# Lộ trình KChat CMS (A–Z)

> **Cập nhật 2026-09-29 (ADR-007):** dự án đổi hướng sang **giữ giao diện Chatwoot và đổi thương hiệu thành KTech**. Việc đang làm là task B-01 bên dưới. Các phase 2–8 (viết CMS riêng) tạm dừng. Các task backend và vận hành ở Phase 0, Phase 1, P4-08/09 (CRM) và Phase 9 vẫn còn hiệu lực.

## Phase K — Kalo launch (mã nguồn xong 2026-11-17, chờ go-live)

Kế hoạch chi tiết: [plans/2026-11-16-kalo-launch.md](plans/2026-11-16-kalo-launch.md). Đổi thương hiệu sang Kalo, thêm Đơn hàng, POS, Báo cáo, Console, landing có video, hạ tầng triển khai. Thay thế hướng Phase B (KTech/cobalt).

**Đợt 2 giao diện (2026-11-18, xong):** khung chat, Cài đặt, `/super_admin`, trang Nhận tiền, rà tiếng Việt; kế hoạch [plans/2026-11-17-kalo-ui-phase2.md](plans/2026-11-17-kalo-ui-phase2.md). Việc để đợt sau: đăng nhập/đăng ký/onboarding/popup nhỏ, tick 'đã xem' cho Zalo (cần bridge phát delivered/read), cuộn tới tin chưa đọc (C-37), đối chiếu mã BIN ngân hàng với danh sách NAPAS, dịch các component dùng `data()`.

- **Done:** T0–T11, sửa spec i18n, QA 12A, rà soát bảo mật 12C và vá bảo mật (xem bảng ở [STATUS.md](STATUS.md)), T13 phần tài liệu.
- **In-progress:** T12B (kiểm tra khói trên stack thật + trình duyệt thật).
- **Blocked (chờ chủ dự án):** triển khai thật. Danh sách việc cần chủ dự án: [reference/go-live-checklist.md](reference/go-live-checklist.md).
- Báo cáo QA: [reports/2026-11-kalo-launch-qa.md](reports/2026-11-kalo-launch-qa.md).

### Sau launch (backlog, đã hoãn có chủ ý)

| Hạng mục | Nguồn / lý do |
|---|---|
| Tự đối soát tiền đơn hàng của shop qua Casso riêng từng shop | ADR-018; hiện shop bấm "Đã nhận tiền" tay (I-6) |
| Nối GHN/GHTK; thêm API/giao diện ghi `shipping_carrier`/`tracking_code` (cột đã có, chưa ai ghi) | ADR-018, M-4 |
| M-3: chuyển khoản dư tiền gói cước chỉ cộng 30 ngày, có thể nâng gói âm thầm, không có tín hiệu hoàn tiền (hiện đối chiếu tay ở Console) | Rà soát cuối nhánh |
| M-5: đơn POS (đã trả, nguồn `pos`) nằm mãi ở tab "Cần giao" | Rà soát cuối nhánh |
| M-6: đơn COD ở `shipping` không hủy/trả được, tồn kho không hoàn lại | Rà soát cuối nhánh |
| M-2: bộ kiểm chữ ký HMAC v2 cho webhook Casso nếu Casso bỏ header `Secure-Token` | Rà soát cuối nhánh |
| **Áp dụng giới hạn theo gói** (ghi đè `Account#usage_limits`; Chatwoot bỏ qua `account.limits`) | ADR-018/019; chưa có thì không được quảng bá giới hạn |
| Chặn từ khóa làm slug tenant (`plan`, `token`, `seed`, slug kết thúc `-plan`/`_token`); từ khóa gõ sai `TOKN` rơi về PLAN | Task 4 follow-up |
| Cho phép ghi đè `order_type` khi gán tay sự kiện `description_ambiguous` ở Console | Task 4 follow-up |
| L-3: chính sách tài khoản hết hạn cho `send_qr`, `qr`, `transition`, sửa sản phẩm (hiện chỉ chặn tạo) | Review bảo mật, hoãn có chủ ý |
| L-4: lọc Đơn hàng theo inbox của agent, hạn chế `mark_paid`/`cancel` cho admin | Review bảo mật |
| L-7: hạn mức AI theo user, debounce gợi ý AI, trừ `ai_tokens_balance` | Review bảo mật |
| L-9: user Postgres riêng, ít quyền cho Zalo bridge; Rails không dùng superuser | Review bảo mật (hạ tầng) |
| Webhook Casso: chữ ký HMAC v2 + timestamp và/hoặc allowlist IP ở Nginx; lưu sự kiện `invalid` để Console thấy | L-5 còn lại, M-4 gợi ý |
| Unique index `lower(custom_attributes->>'tenant_slug')` và nơi đặt slug có kiểm tra | L-2 còn lại |
| Tách lớp `subscription_*` khỏi `custom_attributes`; sửa lost update trong upstream `AccountsController#update` | L-1 còn lại |
| Phân trang tab đếm số đơn (API chưa có `meta` theo trạng thái), clamp `page` (I-1) | Task 8, I-1 |
| Hợp nhất 3 hàm định dạng tiền: `formatVnd` (đơn), `formatMoney` (báo cáo), `formatMoney` (Console) | Task 8/10/11 |
| Triage 74 spec lỗi có sẵn từ upstream (52 vì thiếu bản dựng Vite test, còn lại upload/slack/safe_fetch/hub/avatar/zalo) và dọn `spec/enterprise` | 12A |
| CI đẩy image lên registry (`kalo_docker_build.yml` chỉ build) | Task 6 |
| Hardening Nginx (I-2), loại `.superpowers/` `docs/` khỏi image (I-4), giới hạn signup nhiều account lấy trial (I-8, khi mở signup) | Review bảo mật |
| Kiểm chứng runtime hạ tầng (healthcheck, certbot, full `compose up`) trên staging | deploy.md mục 10 |
| Tích hợp POS ngoài (KiotViet, Sapo), Ads API, đăng bài tự động, SMS Brandname/ZNS, video MMO, affiliate | Ngoài phạm vi launch |

## Phase B — KTech branding trên giao diện Chatwoot

| ID | Việc | Kết quả |
|---|---|---|
| B-01 | Đổi tên hiển thị sang KTech, logo và icon mới, theme Terracotta Sunset (light/dark), ẩn banner của Chatwoot | Spec `docs/superpowers/specs/2026-09-29-ktech-branding-design.md`, nhánh `feat/ktech-branding` |
| B-02 | Màu mặc định widget/portal/avatar theo thương hiệu; tiếng Việt cho các màn hình dùng hằng ngày qua overlay `ktech/vi.json` | Nhánh `feat/ktech-branding-polish` |
| B-03 | Dịch nốt tiếng Việt cho cài đặt, tích hợp, help center, báo cáo (khoảng 2.700 chuỗi) | Overlay, không sửa file Crowdin |

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
| P0-06 | Khung staging và CI (lint, rspec, vitest). Tắt hoặc viết lại các workflow thừa hưởng từ Chatwoot (`.github/workflows/publish_*_docker.yml` đang push lên `chatwoot/chatwoot`, `.circleci/`) | Pipeline chạy xanh, build image KChat vào registry của KTech |
| P0-07 | Chiến lược nhánh git (ADR-006): `main` / `develop` / `feat/*` / `upstream-sync`, bật branch protection | `docs/reference/branching.md` |
| P0-08 | Manifest K8s cho **toàn bộ stack**, không chỉ bridge: Rails web, Sidekiq, zalo-personal-bridge, kchat-web, migration job, ingress `api.`/`cms.`; Postgres 16 + pgvector và Redis (managed hoặc StatefulSet); secrets, HPA, probe | `deploy/k8s/<service>/`, staging chạy được từ manifest |

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
| P1-09 | Làm cứng Zalo Personal Bridge: media 2 chiều (ảnh, file, video, voice) với giới hạn kích thước và retry; chống khóa tài khoản (giới hạn tốc độ gửi theo account, giãn cách, cảnh báo khi Zalo trả lỗi bất thường); reconnect và khôi phục session sau restart; metrics và alert (`prom-client`) |
| P1-10 | Dọn Zalo Personal Bridge: bỏ `server.js` cũ (Dockerfile đã chạy `dist/main.js`), thống nhất package manager (hiện dùng npm `package-lock.json`, CLAUDE.md ghi pnpm), bổ sung test contract giữa bridge và Rails. Tách quyền sở hữu schema: bảng `zalo_integrations`, `zalo_threads`, `zalo_outbound_deliveries`… của bridge đang bị dump vào `db/schema.rb` dù Rails không dùng (chuyển sang schema Postgres riêng hoặc loại khỏi dump) |

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
| P4-08 | Tích hợp CRM/ERP KTech (backend, namespace `kchat`): đồng bộ contact 2 chiều, tự tạo lead từ hội thoại mới hoặc theo label, lưu mapping ID ngoài trong custom attributes, gửi qua Sidekiq có retry và idempotency. Cần spec API CRM/ERP trước (Q4) |
| P4-09 | UI tích hợp CRM trong CMS: cấu hình kết nối, xem lead/đơn hàng liên quan trong sidebar contact, trạng thái đồng bộ và log lỗi |

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
| 2026-09-29 | Thêm Phase B, tạm dừng Phase 2–8 | ADR-007: chủ dự án chọn giữ giao diện Chatwoot và đổi thương hiệu thay vì viết CMS mới |
| 2026-09-29 | Thêm P0-07 (chiến lược nhánh), P0-08 (K8s toàn stack), P1-09/P1-10 (làm cứng và dọn Zalo bridge), P4-08/P4-09 (tích hợp CRM/ERP KTech); mở rộng P0-06 (dọn CI thừa hưởng từ Chatwoot) | Rà soát kế hoạch do Antigravity đề xuất: giữ ADR-001, chỉ lấy các mục roadmap còn thiếu |
| 2026-11-17 | Phase K: mã nguồn xong, thêm backlog "Sau launch" | Kết thúc đợt Kalo launch; việc hoãn lấy từ ledger SDD và rà soát bảo mật |
| 2026-11-18 | Đợt 2 giao diện Kalo xong, thêm việc đợt sau | Lột giao diện Chatwoot khỏi chat, Cài đặt, super admin; ghi các việc còn lại |
