# Quyết định kiến trúc (ADR)

> Mỗi quyết định gồm: bối cảnh, quyết định, đánh đổi, trạng thái (`proposed` / `accepted` / `superseded`).

## ADR-001 — CMS riêng, Chatwoot làm backend headless · `superseded` bởi ADR-007 (2026-09-29)
- **Bối cảnh:** không muốn người dùng nhận ra giao diện Chatwoot, và cần khả năng custom mạnh.
- **Quyết định:** xây CMS frontend mới hoàn toàn, chỉ giao tiếp với Chatwoot qua REST và ActionCable.
- **Đánh đổi:** khối lượng lớn (dashboard cũ khoảng 1.000 file Vue, 234 nghìn dòng). Đổi lại được toàn quyền kiểm soát UX và branding.

## ADR-002 — Stack frontend: Vue 3 + TypeScript + Vite · `proposed`
- **Lý do:** port được gần như nguyên 58 API client, logic ActionCable, helper render message và UI Zalo từ dashboard cũ. Đây là phần dễ lỗi nhất nên port lại giúp giảm rủi ro. Không cần SSR vì đây là app nội bộ.
- **Thư viện:** shadcn-vue (Reka UI), Tailwind v4, TanStack Query, Pinia, vee-validate + zod, TanStack Table/Virtual, TipTap, ECharts, vue-i18n, Vitest, Playwright.
- **Đánh đổi:** hệ sinh thái nhỏ hơn React/Next.js.

## ADR-003 — Chuyển đổi theo strangler pattern · `proposed`
- Thay từng module, dashboard cũ chạy song song để dự phòng. Chỉ tắt màn hình cũ khi dòng tương ứng trong feature-matrix đã có test E2E xanh.

## ADR-004 — Vị trí code frontend: `kchat-web/` trong repo này · `proposed`
- Chung repo giúp contract API và frontend thay đổi trong cùng một PR, CI chạy E2E với backend cùng commit.
- **Đánh đổi:** repo nặng hơn. Có thể tách repo sau nếu team frontend độc lập.

## ADR-005 — Code custom backend trong namespace `kchat`, mở rộng bằng `prepend_mod_with` · `proposed`
- Hạn chế sửa file core của Chatwoot để vẫn merge được bản vá upstream (xem `config/initializers/01_inject_enterprise_edition_module.rb`).

## ADR-006 — Chiến lược nhánh git · `proposed` (2026-09-29)
- **Bối cảnh:** repo vừa chứa Chatwoot core (cần nhận bản vá upstream) vừa chứa code KChat (CMS mới, namespace `kchat`, bridge). Nếu làm thẳng trên `main` thì khó tách bản ổn định với việc đang làm dở.
- **Quyết định:**
  - `main`: bản ổn định, chỉ nhận merge từ `develop` hoặc `hotfix/*`, deploy production.
  - `develop`: nhánh tích hợp, deploy staging.
  - `feat/<task-id>-<mô-tả>` (ví dụ `feat/P2-01-kchat-web-scaffold`), `fix/*`, `docs/*`: tách từ `develop`, merge lại bằng PR khi CI xanh.
  - `upstream-sync`: chỉ dùng để merge bản vá từ remote `upstream` (Chatwoot), review riêng rồi mới đưa vào `develop` (quy trình ở P0-04).
- **Đánh đổi:** thêm một bước merge `develop → main`, đổi lại `main` luôn deploy được và việc cập nhật upstream không trộn với code tính năng.

## ADR-007 — Giữ giao diện Chatwoot, đổi thương hiệu sang KTech · `accepted` (2026-09-29)
- **Bối cảnh:** viết lại CMS riêng (ADR-001) là khối lượng rất lớn: dashboard cũ khoảng 1.000 file Vue, lộ trình ước lượng khoảng 25 tuần. Lần thử làm nhanh bằng agent khác ra code không build được. Chủ dự án chọn đổi hướng.
- **Quyết định:** dùng lại nguyên dashboard, widget, survey, portal và email của Chatwoot. Đổi toàn bộ tên hiển thị sang KTech, làm bộ nhận diện "Terracotta Sunset" (ombre cam–nâu, light và dark). Đổi tên lúc nạp bản dịch (frontend: `brandMessages`, backend: bọc `I18n.t`), không sửa file ngôn ngữ. Đổi màu bằng cách ghi đè biến CSS trong `_ktech-theme.scss`.
- **Đánh đổi:** UX vẫn theo khuôn Chatwoot và bị giới hạn bởi cấu trúc component gốc. Đổi lại ra sản phẩm dùng được ngay, và vẫn merge được bản vá upstream. Các ADR-002/003/004 (stack và cách chuyển đổi của CMS riêng) không còn áp dụng.
- Spec: [superpowers/specs/2026-09-29-ktech-branding-design.md](superpowers/specs/2026-09-29-ktech-branding-design.md).

---

## Câu hỏi mở (chờ chủ dự án)

- **Q1:** Nhóm tính năng enterprise (Captain AI, SLA, Custom Roles, Audit Logs, Companies, SAML, Calls) cần cái nào? Cái nào cần thì phải tự viết backend, không được copy code enterprise của Chatwoot.
- **Q2:** Shopee, TikTok Shop và Zalo OA có nằm trong phạm vi parity không, hay để Phase 9?
- **Q3:** Quyền sở hữu: file `LICENSE-PROPRIETARY` ghi DSFSoft. Cần làm rõ quan hệ giữa KTech và DSFSoft trước khi đầu tư lớn. License MIT bắt buộc giữ file `LICENSE`.
- **Q4:** CRM/ERP của KTech: hệ thống nào, có tài liệu API không, xác thực kiểu gì, bên nào là nguồn gốc dữ liệu khách hàng? Chặn P4-08.
- **Q5:** Zalo Personal dùng `zca-js` (thư viện không chính thức), nên có rủi ro bị khóa tài khoản và vi phạm điều khoản Zalo. Chủ dự án có chấp nhận rủi ro này không, và mỗi account được phép gửi tối đa bao nhiêu tin/phút? Ảnh hưởng tới P1-09.
