# KTech branding trên giao diện Chatwoot — Thiết kế

> Ngày: 2026-09-29 · Nhánh: `feat/ktech-branding` · Thay thế hướng ADR-001 (xem ADR-007)

## Mục tiêu

Dùng lại nguyên giao diện Chatwoot (dashboard, widget, survey, portal, email) nhưng:

1. Người dùng không còn thấy chữ "Chatwoot" ở bất kỳ đâu. Mọi chỗ hiển thị tên sản phẩm đều ra **KTech**.
2. Nhận diện mới "Terracotta Sunset": logo chữ K ghép bong bóng chat, bảng màu ombre cam đào → cam đất → nâu gạch, nền kem ấm dịu mắt, có cả light và dark mode.
3. Giữ khả năng merge bản vá từ Chatwoot upstream: không sửa file ngôn ngữ, hạn chế sửa component gốc.

**Tiêu chí hoàn thành**

- Quét text hiển thị (Playwright) trên các trang: đăng nhập, danh sách hội thoại, khung chat, cài đặt (inbox, agent, profile), báo cáo, widget, trang CSAT → không có "chatwoot" (không phân biệt hoa thường), ở cả tiếng Việt và tiếng Anh.
- Tab trình duyệt, favicon, manifest PWA và email gửi đi đều mang tên và logo KTech.
- Màu chủ đạo toàn app là dải terracotta, ở cả light và dark. Mọi cặp chữ/nền dùng cho nút và chữ thường đạt WCAG AA (≥ 4.5:1).
- Spec rspec và vitest mới chạy xanh. Spec có sẵn liên quan tới phần sửa (globalConfig, Branding, mailer) không bị hỏng.

## Ngoài phạm vi

- Đổi tên định danh trong code: `window.$chatwoot`, `chatwootSDK`, class `ChatwootApp`, package `@chatwoot/*`, tên bảng DB. Người dùng không nhìn thấy các tên này, còn đổi thì sẽ phá tích hợp đang chạy và gây conflict khi merge upstream.
- `kchat-web/` và các phần khác của Antigravity trên nhánh `feat/P0-05-docker-dev-env`.
- Logo chính thức: bộ logo lần này là bản tạm. Toàn bộ file nằm ở một chỗ để sau này thay.

## Thiết kế

### 1. Thay tên khi nạp bản dịch (frontend)

- Thêm `app/javascript/shared/helpers/brandMessages.js` với hàm `brandMessages(messages, brandName)`: duyệt đệ quy object messages, thay `/chatwoot/gi` bằng `brandName` trong mọi chuỗi. Hàm thuần, không đụng store.
- `brandName` lấy từ `window.globalConfig.INSTALLATION_NAME`. Cả 3 layout (`vueapp`, `widgets/show`, `survey/responses/show`) đều có sẵn `window.globalConfig`. Nếu không có giá trị thì giữ nguyên messages (không đoán tên).
- Áp dụng ở 4 entrypoint đang gọi `createI18n`: `dashboard.js`, `v3app.js`, `widget.js`, `survey.js`. Mỗi file chỉ đổi đúng một dòng: `messages: brandMessages(i18nMessages, installationName)`.
- Các banner gắn với dịch vụ của Chatwoot thì ẩn đi: `UpdateBanner` (báo có bản Chatwoot mới), `PaymentPendingBanner` (Chatwoot Cloud), changelog ở sidebar (`SidebarChangelogButton` / `SidebarChangelogCard`, nội dung lấy từ chatwoot.com). Ẩn bằng một cờ `isACustomBrandedInstance` (đã có trong store globalConfig), không xoá component.

### 2. Thay tên phía backend

- Thêm initializer `config/initializers/ktech_brand_i18n.rb`: prepend vào `I18n::Backend::Simple#translate` một bước xử lý: nếu kết quả là String **và** có chứa "chatwoot" (không phân biệt hoa thường) thì mới lấy `GlobalConfig.get_value('BRAND_NAME')` (Redis cache, có sẵn) rồi thay. Nhờ vậy các chuỗi thông thường không tốn thêm lần gọi Redis nào. Nếu `BRAND_NAME` rỗng thì giữ nguyên chuỗi. Áp dụng cho email, thông báo và lỗi API.
- Chuỗi viết cứng thì sửa trực tiếp, chỉ ở những chỗ người dùng nhìn thấy: `layouts/mailer/base.liquid` (brand_name mặc định), `devise/mailer/confirmation_instructions`, `application_mailer.rb` (tên người gửi mặc định), các mailer liquid nhắc "Chatwoot", trang super admin (navigation, đăng nhập). Tên class/module Ruby giữ nguyên.
- Danh sách chính xác lấy bằng lệnh `grep -rn "Chatwoot" app/views app/mailers`, lọc bỏ tên hằng/class. Checklist sẽ ghi trong plan.

### 3. Logo và icon

- Thiết kế SVG: ô vuông bo góc, gradient 135° `#FDBA74 → #EA580C → #7C2D12`, đuôi bong bóng chat ở góc dưới trái, chữ K màu trắng. Wordmark "KTech": chữ "K" màu `#431407`, chữ "Tech" gradient `#EA580C → #7C2D12`. Font Inter Bold, được chuyển thành path để không phụ thuộc font.
- File trong `public/brand-assets/`: `logo.svg` (nền sáng), `logo_dark.svg` (wordmark màu kem cho nền tối), `logo_thumbnail.svg` (chỉ biểu tượng).
- Favicon và icon PWA: xuất PNG từ `logo_thumbnail.svg` bằng `sharp` (chạy qua `npx`, không thêm dependency vào project), ghi đè đúng các tên file mà `vueapp.html.erb` và `manifest.json` đang dùng. Script lưu tại `script/ktech/generate_icons.mjs` để chạy lại khi đổi logo.
- `installation_config.yml` đã trỏ đúng các file này (INSTALLATION_NAME/BRAND_NAME = KTech), không cần sửa.

### 4. Màu sắc

- File mới `app/javascript/dashboard/assets/scss/_ktech-theme.scss`, import ngay sau `_next-colors.scss`:
  - Ghi đè `--blue-1..12` bằng dải terracotta (sáng: kem `#FFFBF7` → cam `#EA580C` ở bước 9 → nâu `#431407` ở bước 12; dark: nền nâu sẫm, bước 9 vẫn là cam). Toàn bộ màu `n-brand` / `n-blue` trong app đổi theo.
  - Ghi đè `--slate-*` và `--gray-*` bằng dải xám ấm (stone) để nền và viền ngả ấm, dịu mắt.
  - Ghi đè `--background-color`, `--surface-1/2` sang kem ấm (light) và nâu than (dark).
- `theme/colors.js`: `brand` và dải `woot` (hệ màu cũ) chuyển sang cùng dải terracotta, để các màn hình cũ chưa dùng `n-*` cũng đổi màu.
- Ombre, chỉ dùng ở 3 chỗ để không rối mắt:
  - nền sidebar: gradient dọc cam → nâu, chữ và icon màu kem;
  - nút chính: gradient `#C2410C → #7C2D12` (đoạn đậm, để chữ trắng đạt AA);
  - trang đăng nhập: nền ombre nhạt.
  Làm bằng class Tailwind tuỳ biến `bg-ktech-ombre*` khai báo trong `tailwind.config.js`. Chỉ sửa template tối thiểu ở `Sidebar.vue`, component Button và trang Login.
- Kiểm tra tương phản bằng script `script/ktech/check_contrast.mjs`: đọc các cặp màu và fail nếu dưới 4.5:1.

### 5. Kiểm tra

- **vitest:** `brandMessages` (lồng nhau, mảng, không phải chuỗi, không có brandName, không phân biệt hoa thường).
- **rspec:** initializer I18n (`I18n.t` một key có "Chatwoot" → ra "KTech"; key không có thì giữ nguyên; kết quả không phải String thì giữ nguyên) và mailer base (brand name mặc định).
- **Playwright** (script, chạy với stack Docker): đăng nhập bằng user seed, đi qua các trang trong tiêu chí hoàn thành ở cả `vi` và `en`, light và dark; quét `document.body.innerText` và `document.title` tìm "chatwoot"; chụp màn hình để chủ dự án duyệt.
- Chạy lại các spec có sẵn của các file đã sửa (`codegraph affected`).

## Rủi ro

- **Thay chuỗi đè lên chữ "chatwoot" trong URL hoặc hướng dẫn kỹ thuật** (ví dụ "cài `@chatwoot/sdk`"): chấp nhận. Nếu có chỗ hiển thị sai nghĩa thì thêm danh sách key được loại trừ trong `brandMessages`.
- **Màu viết cứng trong component** (không qua biến CSS) sẽ còn màu xanh. Tìm bằng Playwright screenshot và grep `#2781F6`/`blue-`, sửa từng chỗ.
- **Merge upstream:** các file sửa là 4 entrypoint (mỗi file một dòng), `theme/colors.js`, `tailwind.config.js`, một số template, mailer, và file mới. Conflict nếu có sẽ nhỏ và dễ giải quyết.
