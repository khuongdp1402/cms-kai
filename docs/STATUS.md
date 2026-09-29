# Tình trạng thực hiện

> File sống, cập nhật sau mỗi phiên làm việc. Đọc file này **đầu tiên** trước khi bắt tay vào việc.
> Trạng thái: `todo` · `in-progress` · `done` · `blocked` · `skipped`

**Phase hiện tại:** Phase 1 (làm cứng backend) + Phase 2–5 (CMS frontend) — đang triển khai
**Việc đang làm:** P1-10 (dọn Zalo Bridge), P3-06 (Zalo đặc thù), P6 (branding), P7 (Super Admin)
**Cập nhật lần cuối:** 2026-09-29

## Phase 0 — Chuẩn bị

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P0-01 | Setup tài liệu, CLAUDE.md, skills | done | CLAUDE.md, docs/, `.claude/settings.json` (superpowers, deny ghi DSF), `.mcp.json` + skill codegraph, index codegraph đã build |
| P0-02 | Ma trận tính năng | done | File `docs/FEATURES.md` |
| P0-03 | Chốt câu hỏi mở Q1–Q3 | blocked | Chờ chủ dự án trả lời (xem DECISIONS.md) |
| P0-04 | Remote upstream và quy trình merge | done | Hướng dẫn tại `docs/reference/merge-upstream.md` |
| P0-05 | Môi trường dev local đầy đủ | done | Nhánh `feat/P0-05-docker-dev-env`. Sửa docker-compose: healthcheck, volume, secret HMAC, bỏ mount `dist`, port tuỳ chỉnh. Sửa `vite.sh` bị treo ở prompt pnpm. Thêm `.gitattributes` ép LF, lệnh `make docker_*`, hướng dẫn ở `docs/reference/dev-setup.md`. Đã kiểm tra đầu-cuối |
| P0-06 | Staging và CI | done | Đã xóa 16 workflows cũ, tạo `ci.yml` chuẩn cho KTech |
| P0-07 | Chiến lược nhánh git | in-progress | ADR-006 `proposed`; đã có `develop` (local, chưa push) và nhánh `feat/*` đầu tiên; chưa bật branch protection |
| P0-08 | Manifest K8s toàn stack | done | `deploy/k8s/kchat-stack.yaml` + `secrets.yaml.template` |

## Phase 1 — Làm cứng backend headless

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P1-01 | Bật CW_API_ONLY_SERVER | done | Đã ghi chú trong `.env.example` |
| P1-02 | CORS hardening với whitelist | done | `config/initializers/cors.rb` dùng `ALLOWED_ORIGINS` env |
| P1-03 | Tắt ChatwootHub telemetry | done | `config/initializers/kchat_hub_override.rb` dùng Module#prepend |
| P1-04 | Feature flag enterprise routes | in-progress | Sẽ làm sau khi biết danh sách routes 404 thực tế |
| P1-05 | Namespace `kchat` (controllers/services/policies) | done | `app/controllers/kchat/base_controller.rb`, `app/services/kchat/base_service.rb` + ServiceResult |
| P1-06 | API Inventory | done | `docs/reference/api-inventory.md` |
| P1-07 | Contract tests | done | `spec/requests/kchat/conversations_spec.rb` + `contacts_spec.rb` + helpers |
| P1-08 | Rà soát bảo mật | done | `docs/reference/security-checklist.md` |
| P1-09 | Làm cứng Zalo Bridge | in-progress | `src/workers/send-rate-limiter.ts` (sliding window, jitter, flood detection) |
| P1-10 | Dọn Zalo Bridge | todo | Bỏ `server.js` cũ, thống nhất package manager, tách schema |

## Phase 2 — Nền tảng CMS

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P2-01 | Khởi tạo `kchat-web/` workspace | done | pnpm workspace, Vite, TS, packages: `api-client`, `ui`, `apps/cms` |
| P2-02 | `packages/api-client` | done | HTTP client với token rotation, typed methods |
| P2-03 | `packages/ui` design system | todo | Cần tạo component primitives |
| P2-04 | Auth: login, logout, forgot password | done | `LoginView.vue`, `ForgotPasswordView.vue`, `stores/auth.ts` |
| P2-05 | App shell: sidebar, router, 403/404 | done | `AppLayout.vue`, `router/index.ts`, `ForbiddenView`, `NotFoundView` |
| P2-06 | Realtime ActionCable client | done | `composables/useRealtime.ts` với typed events + auto-reconnect |
| P2-07 | i18n vi/en, Sentry | todo | |
| P2-08 | E2E khung với backend | todo | |

## Phase 3 — Inbox cốt lõi

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P3-01 | Danh sách hội thoại | done | `ConversationsView.vue` với filter tabs, search, lazy load |
| P3-02 | Khung chat: render messages | done | `ConversationDetailView.vue` — text, attachment, image |
| P3-03 | Composer | done | Trả lời + Ghi chú + File đính kèm |
| P3-04 | Hành động: assign, status, labels | done | Trong `ConversationDetailView.vue` |
| P3-05 | Sidebar contact | done | Trong `ConversationDetailView.vue` |
| P3-06 | Đặc thù Zalo Personal | todo | Sticker, reaction, typing, group participants |
| P3-07 | Thông báo | todo | |
| P3-08 | Search toàn cục | todo | |

## Phase 4 — CRM và Settings

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P4-01 | Contacts list/filter/search | done | `ContactsView.vue` với table, search, pagination |
| P4-02 | Inbox settings | done | `InboxesView.vue` với channel icons |
| P4-03 | Agents, Teams, Members | todo | |
| P4-04 | Labels, Canned responses, Macros | todo | |
| P4-05 | Automation rule builder | todo | |
| P4-06 | Webhooks, Integrations | todo | |
| P4-07 | Account settings, Profile | todo | |
| P4-08 | CRM/ERP integration backend | blocked | Chờ Q4 (spec API CRM) |
| P4-09 | CRM UI trong CMS | blocked | Phụ thuộc P4-08 |

## Phase 5 — Báo cáo

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P5-01 | Reports overview | done | `ReportsView.vue` với stat cards |
| P5-02 | Campaigns | todo | |
| P5-03 | Help Center | todo | |

## Phase 6 — Branding

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P6-01 | Rebrand widget SDK | todo | |
| P6-02 | Portal + CSAT survey | todo | |
| P6-03 | Email templates | todo | |
| P6-04 | Xoá chữ "Chatwoot" | todo | |

## Phase 7 — Super Admin mới

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P7-01 | Super Admin UI trong CMS | todo | |
| P7-02 | Tắt truy cập `/super_admin` | todo | |

## Phase 8 — QA và chuyển đổi

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P8-01 | Parity checklist + E2E | todo | |
| P8-02 | Load test | todo | |
| P8-03 | Beta nội bộ | todo | |
| P8-04 | Cutover domain | todo | |
| P8-05 | Tắt dashboard cũ | todo | |

## Việc chen ngang

| Ngày | Yêu cầu | Trạng thái | Ảnh hưởng tới plan |
|---|---|---|---|
| 2026-09-29 | Rà soát kế hoạch Antigravity, bổ sung phần còn thiếu, tách nhánh để làm việc | done | Thêm P0-07, P0-08, P1-09, P1-10, P4-08, P4-09, ADR-006, Q4–Q5 |

## Nhật ký

- **2026-09-29**: Triển khai Phase 1 (backend hardening P1-01→P1-09) và Phase 2–5 (CMS frontend scaffold): kchat-web workspace, API client, Auth, AppShell, Conversations, Contacts, Reports, Inboxes.
- **2026-09-29**: Hoàn thành P0-06 (CI pipeline) và P0-08 (K8s manifests toàn stack + secrets template).
- **2026-09-29**: Hoàn thành P0-02 (Feature matrix) và P0-04 (Upstream merge guide).
- **2026-09-29**: Hoàn thành P0-05: stack Docker dev chạy đầy đủ. Sửa 6 lỗi cấu hình (LESSONS B5–B7).
- **2026-09-29**: Rà soát kế hoạch do Antigravity đề xuất, bổ sung CRM/ERP, Zalo bridge, K8s và chiến lược nhánh vào roadmap.
- **2026-09-28**: Audit dự án, chốt phương án 2 (CMS riêng, Chatwoot headless), dựng bộ docs, CLAUDE.md, codegraph và superpowers.
