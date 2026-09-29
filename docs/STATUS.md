# Tình trạng thực hiện

> File sống, cập nhật sau mỗi phiên làm việc. Đọc file này **đầu tiên** trước khi bắt tay vào việc.
> Trạng thái: `todo` · `in-progress` · `done` · `blocked` · `skipped`

**Phase hiện tại:** Phase 4–7 — hoàn thiện gần hết. Còn lại: P3-06, P5-02/03, P6-01/02/03, P8
**Việc đang làm:** —
**Cập nhật lần cuối:** 2026-09-29

## Phase 0 — Chuẩn bị

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P0-01 | Setup tài liệu, CLAUDE.md, skills | done | |
| P0-02 | Ma trận tính năng | done | `docs/FEATURES.md` |
| P0-03 | Chốt câu hỏi mở Q1–Q3 | blocked | Chờ chủ dự án |
| P0-04 | Remote upstream và quy trình merge | done | `docs/reference/merge-upstream.md` |
| P0-05 | Môi trường dev local đầy đủ | done | Docker stack đã test |
| P0-06 | Staging và CI | done | `ci.yml` |
| P0-07 | Chiến lược nhánh git | in-progress | ADR-006 proposed |
| P0-08 | Manifest K8s toàn stack | done | `deploy/k8s/` + `secrets.yaml.template` |

## Phase 1 — Làm cứng backend headless

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P1-01 | Bật CW_API_ONLY_SERVER | done | `.env.example` |
| P1-02 | CORS hardening | done | `cors.rb` với `ALLOWED_ORIGINS` |
| P1-03 | Tắt ChatwootHub telemetry | done | `kchat_hub_override.rb` |
| P1-04 | Feature flag enterprise routes | in-progress | Chờ biết routes thực tế |
| P1-05 | Namespace `kchat` | done | `BaseController`, `BaseService`, `ServiceResult` |
| P1-06 | API Inventory | done | `docs/reference/api-inventory.md` |
| P1-07 | Contract tests | done | Conversations + Contacts + Hub override + Guard |
| P1-08 | Rà soát bảo mật | done | `docs/reference/security-checklist.md` |
| P1-09 | Làm cứng Zalo Bridge | done | `send-rate-limiter.ts` |
| P1-10 | Dọn Zalo Bridge | done | `server.js` → `server.js.legacy` + `MIGRATION.md` |

## Phase 2 — Nền tảng CMS

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P2-01 | Khởi tạo workspace | done | pnpm, Vite, tsconfig, env.d.ts, .env.example |
| P2-02 | `packages/api-client` | done | Token rotation, typed methods |
| P2-03 | `packages/ui` design system | done | KButton, KInput, KAvatar, KBadge, KModal, KToast, KDropdown + tokens |
| P2-04 | Auth: login, logout, forgot password | done | Views + Pinia store |
| P2-05 | App shell: sidebar, router, error pages | done | AppLayout, Router với guards |
| P2-06 | Realtime ActionCable | done | `useRealtime.ts` |
| P2-07 | i18n vi/en | done | `useI18n.ts` với formatDate/formatNumber |
| P2-08 | E2E khung | todo | |

## Phase 3 — Inbox cốt lõi

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P3-01 | Danh sách hội thoại | done | Filter tabs, search, lazy load |
| P3-02 | Khung chat: render messages | done | Text, attachment, image |
| P3-03 | Composer | done | Trả lời + Ghi chú + File |
| P3-04 | Hành động: assign, status, labels | done | |
| P3-05 | Sidebar contact | done | |
| P3-06 | Đặc thù Zalo Personal | todo | Sticker, reaction, typing indicator |
| P3-07 | Thông báo | done | `NotificationsPanel.vue` |
| P3-08 | Search toàn cục | done | `GlobalSearch.vue` |

## Phase 4 — CRM và Settings

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P4-01 | Contacts list + detail | done | List + ContactDetailView (notes, conversations) |
| P4-02 | Inbox settings | done | `InboxesView.vue` |
| P4-03 | Agents + Teams | done | `AgentsView.vue` + `TeamsView.vue` |
| P4-04 | Labels | done | `LabelsView.vue` với color picker |
| P4-05 | Automations | done | `AutomationsView.vue` với toggle/delete |
| P4-06 | Webhooks + Integrations | done | `WebhooksView.vue` + `IntegrationsView.vue` |
| P4-07 | Profile | done | `ProfileView.vue` với edit + change password |
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
| P6-04 | Xóa chữ "Chatwoot" user-facing | done | `kchat_branding.rb` + replace en.yml/vi.yml |

## Phase 7 — Super Admin mới

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P7-01 | Super Admin UI trong CMS | done | `SuperAdminView.vue` với accounts/users/jobs |
| P7-02 | Chặn truy cập `/super_admin` | done | `super_admin_guard.rb` middleware + tests |

## Phase 8 — QA và chuyển đổi

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P8-01 | Parity checklist + E2E | todo | |
| P8-02 | Load test | todo | |
| P8-03 | Beta nội bộ | todo | |
| P8-04 | Cutover domain | todo | |
| P8-05 | Tắt dashboard cũ | todo | |

## Nhật ký

- **2026-09-29 (buổi 2):** Hoàn thành P2-03 UI Design System (7 components), P2-07 i18n, P3-07/08 Notifications+Search, P4-01→P4-07 đầy đủ settings views, P1-10 dọn bridge, P6-04 rebrand, P7-01/02 Super Admin UI + guard middleware.
- **2026-09-29 (buổi 1):** Implement Phase 1 backend hardening + Phase 2-5 frontend scaffold (30 files).
- **2026-09-28:** Khởi tạo dự án, setup docs, CI, Docker, K8s.
