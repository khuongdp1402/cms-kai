# Quyết định kiến trúc (ADR)

> Mỗi quyết định gồm: bối cảnh, quyết định, đánh đổi, trạng thái (`proposed` / `accepted` / `superseded`).

## ADR-001 — CMS riêng, Chatwoot làm backend headless · `accepted` (2026-09-28)
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

---

## Câu hỏi mở (chờ chủ dự án)

- **Q1:** Nhóm tính năng enterprise (Captain AI, SLA, Custom Roles, Audit Logs, Companies, SAML, Calls) cần cái nào? Cái nào cần thì phải tự viết backend, không được copy code enterprise của Chatwoot.
- **Q2:** Shopee, TikTok Shop và Zalo OA có nằm trong phạm vi parity không, hay để Phase 9?
- **Q3:** Quyền sở hữu: file `LICENSE-PROPRIETARY` ghi DSFSoft. Cần làm rõ quan hệ giữa KTech và DSFSoft trước khi đầu tư lớn. License MIT bắt buộc giữ file `LICENSE`.

## ADR-020 — Super admin `/super_admin` dùng SCSS riêng theo style Kalo · `accepted` (2026-11-17)
- **Bối cảnh:** trang super admin là Rails/Administrate, không có Tailwind của app Vue; phần còn lại của Kalo dùng token trong `_ktech-theme.scss`.
- **Quyết định:** thêm `app/assets/stylesheets/administrate/kalo.scss` (nạp cuối `application.scss`), sao chép các token cần dùng (bảng màu coral, radius, bóng, font Be Vietnam Pro) thành biến CSS `--kalo-*`. Chỉ đổi lớp trình bày: layout, `_navigation`, `_nav_item`, `_settings_menu`, `_collection`, `_filters`, `_search`, `_flashes`, `index`, `show`, trang đăng nhập. Không đổi route, controller, dashboard.
- **Chữ:** nhãn giao diện nằm trong `config/locales/kalo_super_admin.{vi,en}.yml` (namespace `kalo_super_admin`), không ghi đè khóa `administrate.*`. Tên thương hiệu lấy từ `INSTALLATION_NAME`.
- **Menu:** rút gọn theo nhóm (Tổng quan, Khách hàng, Nền tảng, Hệ thống), chỉ gồm mục có controller chạy được. Bỏ widget hỗ trợ của Chatwoot khỏi `_javascript`.
- **Đánh đổi:** hai nguồn token (SCSS app và SCSS super admin) phải cập nhật song song khi đổi bảng màu.
