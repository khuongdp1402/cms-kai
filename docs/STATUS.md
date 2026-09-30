# Tình trạng thực hiện

> File sống, cập nhật sau mỗi phiên làm việc. Đọc file này **đầu tiên** trước khi bắt tay vào việc.
> Trạng thái: `todo` · `in-progress` · `done` · `blocked` · `skipped`

**Phase hiện tại:** Phase B — KTech branding (ADR-007)
**Việc đang làm:** B-03 (Dịch nốt tiếng Việt: onboarding, settings, campaigns, automations, inboxMgmt đã dịch 316 chuỗi)
**Cập nhật lần cuối:** 2026-09-30

## Phase B — KTech branding

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| B-01 | Đổi tên, logo, theme Terracotta Sunset, ẩn banner Chatwoot | done | Đổi tên lúc nạp i18n (FE `brandMessages`, BE `Ktech::BrandedI18n`), logo và 30 icon, theme light/dark, ombre ở sidebar/nút/login. Kiểm chứng: `brand_audit.cjs` 9 trang × vi/en × light/dark không còn "chatwoot"; `check_contrast.mjs` 13/13 cặp ≥ 4.5; vitest 286/286; rspec 181/181 (initializers, mailers, super_admin) |
| B-02 | Hoàn thiện: màu mặc định widget/portal/avatar, tiếng Việt cho màn hình hằng ngày | done | Overlay `dashboard/i18n/ktech/vi.json` (626 chuỗi: sidebar, hồ sơ, danh sách chat, hộp thư, khung chat, liên hệ, tìm kiếm, thao tác hàng loạt, đăng nhập) + `widget/i18n/ktech/vi.json` (19 chuỗi khách thấy). Sửa từ dịch sai có sẵn ("Đại lý" → "Nhân viên"…). Test toàn vẹn overlay 1.878 + 54 ca |
| B-03 | Dịch nốt tiếng Việt: cài đặt inbox, tích hợp, cài đặt khác, help center, báo cáo | in-progress | Đã dịch đợt 1 (316 chuỗi: onboarding 64, generalSettings 72, campaign 39, automation 42, inboxMgmt 99); untranslated giảm từ 2.731 còn 2.415; bundle vite đã build lại sạch sẽ |

## Phase 0 — Chuẩn bị

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P0-01 | Setup tài liệu, CLAUDE.md, skills | done | CLAUDE.md, docs/, `.claude/settings.json` (superpowers, deny ghi DSF), `.mcp.json` + skill codegraph, index codegraph đã build |
| P0-02 | Ma trận tính năng | todo | |
| P0-03 | Chốt câu hỏi mở Q1–Q3 | blocked | Chờ chủ dự án trả lời (xem DECISIONS.md) |
| P0-04 | Remote upstream và quy trình merge | todo | |
| P0-05 | Môi trường dev local đầy đủ | done | Nhánh `feat/P0-05-docker-dev-env`. Sửa docker-compose: healthcheck, volume Postgres/Redis mount sai path, bridge dùng DB `chatwoot_dev` giống Rails, secret HMAC chung, bỏ mount `dist`, port host đổi được qua `KCHAT_*_PORT`. Sửa `vite.sh` bị treo ở prompt pnpm. Thêm `.gitattributes` ép LF, lệnh `make docker_*`, hướng dẫn ở `docs/reference/dev-setup.md`. Đã kiểm tra: 7 service healthy, `/api` ok, đăng nhập và `/api/v1/profile` ok, `/app/login` 200, HMAC Rails↔bridge 2 chiều đúng (sai secret trả 401), dữ liệu còn sau khi tạo lại container |
| P0-06 | Staging và CI | todo | Gồm cả dọn workflow Chatwoot thừa hưởng |
| P0-07 | Chiến lược nhánh git | in-progress | ADR-006 `proposed`; đã có `develop` (local, chưa push) và nhánh `feat/*` đầu tiên; chưa bật branch protection |
| P0-08 | Manifest K8s toàn stack | todo | Hiện `deploy/k8s/` chỉ có bridge |

## Phase 1 → 9

Chưa bắt đầu. Danh sách task ở [ROADMAP.md](ROADMAP.md). Khi bắt đầu phase nào thì copy bảng task của phase đó vào đây.

## Việc chen ngang

Việc ngoài kế hoạch mà chủ dự án yêu cầu thì ghi vào đây. Nếu làm thay đổi phạm vi hoặc thứ tự thì cập nhật cả ROADMAP.md.

| Ngày | Yêu cầu | Trạng thái | Ảnh hưởng tới plan |
|---|---|---|---|
| 2026-09-29 | Rà soát kế hoạch Antigravity, bổ sung phần còn thiếu, tách nhánh để làm việc | done | Thêm P0-07, P0-08, P1-09, P1-10, P4-08, P4-09, ADR-006, Q4–Q5. Giữ ADR-001 (CMS riêng, Chatwoot headless); bỏ phần rebrand dashboard cũ trong kế hoạch Antigravity |
| 2026-09-29 | Đổi hướng: giữ UI Chatwoot, rebrand KTech, giao diện ombre cam–nâu | in-progress | ADR-007 thay ADR-001; thêm Phase B, tạm dừng Phase 2–8 |

## Nhật ký

- **2026-09-30 (buổi 2):** Tiếp tục công việc của Claude Code trên `cms-kai-ktech`. Tối ưu `docker-compose.yaml` (VITE_RUBY_HOST mặc định localhost để Rails không bị trễ DNS 5s khi tắt Vite container, web response giảm xuống dưới 2s). Bắt đầu task B-03: dịch 316 chuỗi tiếng Việt mới cho Onboarding, General Settings, Campaigns, Automations và Inbox Management qua overlay `ktech/vi.json`, untranslated strings giảm từ 2.731 xuống 2.415; biên dịch lại bundle Vite sạch sẽ trên container.
- **2026-09-30 (buổi 1):** Merge B-01 vào `develop`. Hoàn thành B-02: màu mặc định terracotta cho widget/portal/avatar, overlay tiếng Việt 645 chuỗi không sửa file Crowdin.
- **2026-09-29**: Hoàn thành B-01 (KTech branding). Sửa thêm môi trường dev: Vite trong Docker không nhận thay đổi file (bật polling), worktree bị CRLF (LESSONS B5, B9, B10).
- **2026-09-29**: Chốt hướng ADR-007 và thiết kế Terracotta Sunset (phương án A). Tạo nhánh `feat/ktech-branding` từ `develop` cộng 3 commit Docker, không lấy `kchat-web` và `.agents/` của Antigravity.
- **2026-09-29**: Hoàn thành P0-05: stack Docker dev chạy đầy đủ và đã kiểm tra đầu-cuối. Sửa 6 lỗi cấu hình: CRLF, mount `dist`, volume sai path, lệch tên DB, Rails thiếu secret HMAC, pnpm treo; thêm port tuỳ chỉnh (xem LESSONS B5–B7).
- **2026-09-29**: Rà soát kế hoạch do Antigravity đề xuất, bổ sung các mục CRM/ERP, Zalo bridge, K8s và chiến lược nhánh vào roadmap. Làm trên nhánh `docs/roadmap-crm-zalo-k8s`.
- **2026-09-28**: Audit dự án, chốt phương án 2 (CMS riêng, Chatwoot headless), dựng bộ docs, CLAUDE.md, codegraph và superpowers.
