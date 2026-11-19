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
## ADR-008 — Chuyển đổi toàn diện sang LIGHT Theme với tông màu Cool Blue (#D7EFFF) · `accepted` (2026-10-01)
- **Bối cảnh:** Chủ dự án yêu cầu không dùng màu cam–nâu cũ và không dùng giao diện nền tối (dark theme). Chỉ định mã màu chủ đạo Cool Blue: Hex `#D7EFFF`, RGB `215, 239, 255`, CMYK `16, 6, 0, 0`. Yêu cầu đồng bộ màu sắc và ngôn ngữ thiết kế trên toàn bộ các giao diện: Landing Page, Super Admin Dashboard, Tenant Admin và CMS.
- **Quyết định:**
  - Thiết kế bảng màu sáng hiện đại: nền `--bg: #F5F9FF`, bề mặt thẻ trắng `#FFFFFF`, điểm nhấn nhận diện thương hiệu Cool Blue `#D7EFFF`, nút CTA & Brand Blue `#2563EB` / `#1D4ED8`.
  - Triển khai **Landing Page** (`landing-page/`): Tách biệt hoàn toàn độc lập, không liên kết trực tiếp với Super Admin để tối ưu tốc độ tải trang, chống lag và bảo mật hệ thống quản trị.
  - Triển khai **Super Admin Dashboard** (`landing-page/super-admin/`): Bổ sung công tắc **Dark/Light Mode** tùy biến linh hoạt, lưu cấu hình vào `localStorage`, giao diện tối sử dụng nền Cool Dark Navy với điểm nhấn Cool Blue.
  - Triển khai **Tenant Admin** (`landing-page/tenant-admin/`): Bảng điều khiển cửa hàng/doanh nghiệp con với đầy đủ chức năng: Omnichannel hub, Cấu hình AI & nạp tài liệu riêng (RAG), Dịch vụ Seeding & Tương tác (Ads & Seeding chốt đơn), Tùy biến thương hiệu White-label (tên miền riêng, đổi logo, đổi màu chủ đạo), Quản lý gói cước & Mua lẻ add-ons.
  - Đồng bộ **CMS Dashboard** (`_ktech-theme.scss`, `theme/colors.js`): Thay thế hoàn toàn bảng màu terracotta cam–nâu sang Cool Blue `#D7EFFF` và `#2563EB`, đã biên dịch thành công bundle Vite asset cho container Rails.
- **Đánh đổi:** Tone màu sáng mang lại trải nghiệm thị giác thanh thoát, dễ đọc hơn cho nhân viên trực chat cả ngày, đồng thời chế độ Dark Mode trên Super Admin phục vụ nhu cầu làm việc ban đêm của admin nền tảng.

## ADR-009 — Tích hợp Cổng thanh toán VietQR tự động qua Casso Open Banking & Luồng kích hoạt Subscription đa khách hàng · `accepted` (2026-10-01)
- **Bối cảnh:** Khách hàng tại Việt Nam (Seller cá nhân & SME) ưu tiên chuyển khoản ngân hàng quét mã VietQR Napas 24/7 hơn thẻ tín dụng hay ví điện tử. Cần hệ thống đối soát giao dịch tự động 100%, không cần nhân viên đối soát thủ công, kích hoạt dịch vụ sau 1-3 giây.
- **Quyết định:**
  - Chọn **Casso** (`casso.vn`) làm nền tảng Open Banking Webhook tự động hóa thanh toán.
  - Quy chuẩn cú pháp chuyển khoản: `KCHAT <TENANT_SLUG> <MA_DON>` (Ví dụ: `KCHAT HANA 9812`).
  - **Backend Rails Core**:
    - Dịch vụ [`Casso::WebhookHandler`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/services/casso/webhook_handler.rb): Nhận webhook biến động số dư, xác thực token bảo mật `CASSO_SECURE_TOKEN`, tách cú pháp `KCHAT`, tự động map với Tenant Account, gia hạn ngày sử dụng (+30 ngày) hoặc cộng AI Token / Seeding Credits, ghi nhận log giao dịch idempotent (chống lặp TID).
    - Bộ điều khiển [`Api::V1::CassoController`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/controllers/api/v1/casso_controller.rb): Cung cấp các endpoint `/api/v1/casso/webhook`, `/api/v1/casso/status`, `/api/v1/casso/simulate`.
  - **Landing Page Checkout (`landing-page/`)**:
    - Tích hợp Modal thanh toán VietQR trực tiếp: khách hàng nhập thông tin shop → chọn gói (Starter/Growth/Enterprise) → sinh mã VietQR Napas chuẩn qua Casso API → kích hoạt và điều hướng ngay vào Tenant Admin.
  - **Tenant Admin Dashboard (`landing-page/tenant-admin/`)**:
    - Tích hợp Modal VietQR cho các luồng: Gia hạn gói định kỳ, nâng cấp gói, mua thêm AI Token lẻ, nạp tiền quỹ Seeding với đồng hồ đếm ngược 15:00 và nút test Webhook nhanh.
  - **Super Admin Dashboard (`landing-page/super-admin/`)**:
    - Trang Quản lý Thanh toán & Cổng Casso: Giám sát doanh thu tháng, tỷ lệ khớp lệnh (99.2%), tốc độ kích hoạt trung bình (1.8s), quản lý tài khoản ngân hàng nhận (MB Bank, Vietcombank), và Stream Webhook thời gian thực.
- **Đánh đổi:** Tiết kiệm chi phí trung gian thanh toán (chỉ trả phí dịch vụ cố định hàng tháng cho Casso, 0% phí chiết khấu giao dịch), trải nghiệm khách hàng mượt mà không cần nhập số thẻ tín dụng hay cài app phụ.

---

### ADR-010: Tích hợp Đa kênh POS & Vận Chuyển Trực Tiếp Trong Khung Chat (Omnichannel POS & Logistics)
- **Bối cảnh:** Khách hàng chốt đơn trên Zalo / Fanpage thường yêu cầu kiểm tra tồn kho và phí ship ngay lập tức. Nếu nhân viên phải chuyển qua lại giữa các tab KiotViet, Sapo, Nhanh.vn và app GHTK/GHN, tỷ lệ rớt đơn tăng cao.
- **Quyết định:**
  - Tích hợp 2 chiều với các phần mềm POS phổ biến tại Việt Nam: **KiotViet**, **Sapo**, **Nhanh.vn**.
  - Nhúng widget tạo đơn hàng nhanh và tính phí vận chuyển real-time trực tiếp trong Tenant Admin (`#pane-pos`):
    - Đồng bộ tồn kho tự động.
    - So sánh giá cước tức thì giữa GHTK (22.000 đ), GHN (25.000 đ), Viettel Post (28.000 đ).
    - Tạo đơn và in mã vận đơn tự động (`GHTK-HN-8921820`), đẩy thông báo tiến độ về cho khách hàng qua tin nhắn.
- **Đánh đổi:** Cần duy trì token API và đồng bộ webhook trạng thái đơn giao vận.

---

### ADR-011: Mạng Lưới Tiếp Thị Liên Kết (Affiliate & Referral) Với Chi Trả Tự Động VietQR 24/7
- **Bối cảnh:** Chi phí quảng cáo Facebook / TikTok ngày càng đắt đỏ. KChat cần cơ chế tăng trưởng tự thân (viral growth) qua mạng lưới KOC, Agency quảng cáo và chính các chủ shop đang sử dụng.
- **Quyết định:**
  - Thiết lập chính sách hoa hồng **20% trọn đời** (Lifetime Recurring Commission) cho mọi gói cước và add-on.
  - Cookie lưu trữ 60 ngày an toàn.
  - **Tenant Admin (`#pane-affiliate`)**: Cung cấp link giới thiệu cá nhân (`kchat.vn/?ref=hana88`), thống kê click, số shop đăng ký, số dư ví hoa hồng, và form yêu cầu rút tiền về tài khoản ngân hàng.
  - **Super Admin (`#affiliatesPage`)**: Quản lý danh bạ đối tác, xếp hạng CTV (Kim Cương 25%, Vàng 20%, Bạc 20%), và duyệt chi trả hoa hồng tức thì 24/7 qua cổng Casso Napas VietQR với 1 cú click (`btn-payout-approve`).
  - **Landing Page (`#affiliate`)**: Giới thiệu chính sách minh bạch, thu hút đối tác tiếp thị.

---

### ADR-012: Hoàn Thiện Nền Tảng Super Admin Toàn Diện & Dynamic Route Architecture
- **Bối cảnh:** Nền tảng SaaS đa doanh nghiệp cần một trung tâm điều hành Super Admin hoàn chỉnh, không chỉ dừng lại ở dashboard tổng quan mà phải quản trị sâu từng khía cạnh: phân tích tăng trưởng, cấp phát tài nguyên, bảo mật và gateway AI.
- **Quyết định:**
  - Triển khai đầy đủ 10 phân hệ nghiệp vụ độc lập:
    1. **Dashboard**: Giám sát KPI doanh thu, tăng trưởng tenant, trạng thái hệ thống.
    2. **Phân tích (Analytics)**: Báo cáo MRR (142.8M đ), ARR (1.71 tỷ đ), ARPU (575k đ), Churn Rate (1.2%), phễu chuyển đổi 4 bước (Funnel), và cơ cấu tin nhắn theo kênh (Zalo 54%, FB 28%, TikTok 12%, Web 6%).
    3. **Quản lý Tenant**: Cấp mới tenant tức thì qua modal form (`#createTenantModal`), quản trị chi tiết tài nguyên từng shop qua drawer (`#tenantDetailModal`), gia hạn nhanh +30 ngày, khóa/mở khóa tài khoản, đăng nhập ủy quyền (impersonate).
    4. **Tiếp thị (Affiliate)**: Duyệt chi hoa hồng Napas VietQR tức thì, đối soát đối tác.
    5. **Gói cước (Plans)**: Tùy biến giá và hạn mức tài nguyên (Starter 99k, Growth 299k, Enterprise 799k, Add-ons).
    6. **Thanh toán (Billing & Casso)**: Đối soát tự động VietQR Napas 24/7, stream webhook thời gian thực.
    7. **AI Pool Gateway**: Quản lý model routing (GPT-4o-mini, Claude 3.5 Sonnet, Gemini 1.5 Flash), kiểm tra latency ping động, cấu hình khóa API key. *(Lưu ý: Huấn luyện AI chuyên sâu theo tài liệu riêng của từng khách hàng được quy hoạch bổ sung ở giai đoạn tiếp theo theo yêu cầu của chủ dự án).*
    8. **Kênh tích hợp (Channels)**: Giám sát Zalo Personal Bridge (182 accounts online), Meta Graph API, TikTok Open Platform, SMS Brandname & ZNS Gateway.
    9. **Ads & Seeding Marketplace**: Quản trị dịch vụ tăng tương tác, chia sẻ doanh thu 15% với Agency.
    10. **Cài đặt (Settings)**: Tham số thương hiệu, bảo mật Casso Webhook, chu kỳ ân hạn tài khoản.
  - Hỗ trợ Hash Navigation (`#dashboard`, `#analytics`, `#tenants`, `#affiliates`, `#billing`, v.v.), Dark/Light Mode chuyển đổi mượt mà, và hệ thống Modal Dialog đồng bộ chuẩn UX/UI Cool Blue.

---

### ADR-013: Nâng Cấp Hệ Thống Giao Diện & Bảng Màu "Glacier & Cobalt Studio" (Trend 2026–2027) · `accepted` (2026-10-28)
- **Bối cảnh:** Sau khi chuyển đổi bước đầu sang Cool Blue (ADR-008), trong mã nguồn CMS Core vẫn còn sót 7 vị trí mang màu cam–nâu cũ (*Terracotta Sunset*: `ktech-ombre` trong `tailwind.config.js`, `logo.svg`/`logo_dark.svg`/`logo_thumbnail.svg`, `sdk.js`, `Website.vue`, `portal.rb`, `AudioRecorder.vue`, `Avatar.vue`) khiến nút chính và màn hình đăng nhập bị lệch màu với nền xanh. Đồng thời cần nâng cấp ngôn ngữ thiết kế của cả 4 phân hệ (CMS Core, Landing Page, Tenant Admin, Super Admin) lên chuẩn xu hướng SaaS / AI / FinTech 2026–2027.
- **Quyết định:**
  - Áp dụng hệ màu **Glacier & Cobalt Studio (2026–2027)**:
    - **Brand Signature Tint:** `#D7EFFF` (*Glacier Cool Blue* — giữ nguyên ADN của ADR-008).
    - **Primary Action (CTA):** `#1E5EFF` (*Electric Cobalt*) → Hover `#1749CC` → Deep `#103599`.
    - **AI & Automation Accent:** `#0891B2` / Soft `#CFFAFE` (*Bioluminescent Cyan-Teal* thay cho tím neon AI đại trà).
    - **FinTech / VietQR / POS Accent:** `#059669` / Soft `#D1FAE5` (*Emerald Mint*).
    - **Tactile Daylight Canvas & Abyssal Midnight Navy Dark Mode:** Nền sáng `#F6FAFF` giảm mỏi mắt khi trực chat 8–10h/ngày; nền tối `#080E1E` / `#122244` kèm viền khúc xạ ánh sáng (`inset 0 1px 0 rgba(255,255,255,0.85)`).
  - **Hệ Typography 3 lớp (Tri-Typography):** `Plus Jakarta Sans` (Display/Headings), `Inter` (UI & Hội thoại tiếng Việt), `JetBrains Mono` + `tabular-nums` (Số liệu tài chính, VietQR, mã vận đơn, độ trễ AI).
  - **Đồng bộ toàn diện:** Xóa sạch 100% mã màu cam–nâu cũ trong `tailwind.config.js`, `public/brand-assets/*.svg`, `sdk.js`, `Website.vue`, `portal.rb`, `AudioRecorder.vue`, `Avatar.vue`, `landing-page/index.html`; bổ sung Dark/Light Mode toggle cho cả **Tenant Admin** và xóa nhãn `"Chatwoot Widget"` còn sót.
- **Đánh đổi:** Đạt độ đồng nhất thị giác 100% trên cả 4 bề mặt sản phẩm và vượt chuẩn tương phản WCAG AA trên toàn bộ 13 cặp kiểm định (`5.12:1` → `18.91:1`).

---

### ADR-014: Tích Hợp Hệ Điều Hành Phát Triển Thương Hiệu 5 Giai Đoạn (Brand Growth OS) & Pipeline Video AI (`mmo`) Vào Chung Kiến Trúc KChat CMS · `accepted` (2026-10-28)
- **Bối cảnh:** Chủ dự án định hướng thương mại hóa `cms-kai` cho các tổ chức và cá nhân cần một nền tảng quản lý bán hàng và phát triển thương hiệu đa kênh toàn diện. Đồng thời, dự án tạo video AI đã được hợp nhất vào dự án [`mmo` (Omni-Viral Studio)](file:///Users/khuongdp/Projects/mmo). Nếu tách rời công cụ Marketing/Brand ra một hệ thống độc lập hoặc tách trang quản trị riêng sẽ gây phân mảnh dữ liệu phễu và tăng chi phí vận hành.
- **Quyết định:**
  - **Hợp nhất vào chung `cms-kai` (Sử dụng chung `Tenant Admin` cho khách hàng thuê bao và `Super Admin` cho chủ nền tảng):**
    1. **Trên `Tenant Admin` ([`landing-page/tenant-admin/index.html`](file:///Users/khuongdp/Projects/CMS/cms-kai/landing-page/tenant-admin/index.html)):** Bổ sung nhóm phân hệ **"Phát Triển Thương Hiệu (Brand OS)"** bao phủ trọn vẹn 5 giai đoạn:
       - **Định vị & Lộ trình 90 ngày (`#brand-strategy`):** Theo dõi tiến độ 4 chặng 90 ngày tương tác trực tiếp; Bộ não định vị 3C/JTBD, USP, Brand Archetype, danh sách Từ vựng cấm (Hard Bans) đồng bộ sang toàn bộ AI; Radar trinh sát quảng cáo đối thủ.
       - **Xưởng Nội dung Đa kênh & Video AI MMO (`#content-studio`):** Thống kê cân bằng nội dung `40-30-20-10`; Cỗ máy nhân bản `1-to-10 Repurposing` tích hợp 3 chế độ Render 9:16 của `mmo` (`Mode 1: Parallax 2.5D`, `Mode 2: Mascot Dex Lip-sync`, `Mode 3: Muse.ai Chrome CDP`) kèm **Cổng kiểm soát duyệt 2 bước (Human-in-the-Loop Gate)** chặn tốn phí API trước khi duyệt kịch bản và tự động kích hoạt Seeding mồi 30 phút đầu khi xuất bản.
       - **Trung tâm Website, CRO & SEO/GEO (`#website-seo`):** Kiểm toán trang đích 6 bước chuẩn chuyển đổi & bài test 5 giây (`5-Second Test`), quản lý cụm bài viết SEO + GEO (tối ưu trích dẫn trên ChatGPT, Perplexity, Google AI Overviews kèm Schema JSON-LD), và giám sát Server-side Tracking (`GA4`, `Meta CAPI`, `TikTok Events API` với điểm khớp EMQ `9.3/10`).
       - **Phòng Lab Quảng cáo Full-Funnel & Guardrails (`#campaigns`):** Quản trị phễu 3 tầng (`TOF / MOF / BOF`), ma trận thử nghiệm `Angle × Hook 3s`, công tắc bảo vệ ngân sách tự động (**Auto-Kill** khi chi tiêu $> 2\times \text{CPA}$ không ra đơn) và **1-Click Scale (+20%)** cho Winning Ads.
       - **Bánh Đà Tăng Trưởng & Phễu 5 Tầng (`#dashboard`):** Thống kê thời gian thực **MER (Blended ROAS `5.4x`)**, tỷ lệ vàng **$\text{LTV} : \text{CAC}$ (`4.2 : 1`)**, tỷ lệ khách mua lại & gửi Video UGC (`34.8%`).
    2. **Trên `Super Admin` ([`landing-page/super-admin/index.html`](file:///Users/khuongdp/Projects/CMS/cms-kai/landing-page/super-admin/index.html)):** Dùng chung trang quản trị chủ nền tảng hiện có, bổ sung:
       - Cụm giám sát **Hạ tầng Omni-Viral Video Engine (`mmo`) & Muse.ai Chrome CDP Cluster** tại `#aiPoolPage`.
       - Bảng **Giám sát Hiệu suất Brand Growth OS & Kiểm soát Ads toàn sàn (186/248 Tenants)** tại `#seedingPage`.
       - Cấu hình hạn mức **Brand Growth OS & Video MMO** theo từng gói cước (`Starter` / `Growth` / `Enterprise`) tại `#plansPage`.
    3. **Trên Backend Rails Core:** Xây dựng [`BrandGrowth::EngineService`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/services/brand_growth/engine_service.rb), [`Api::V1::BrandGrowthController`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/controllers/api/v1/brand_growth_controller.rb) (`/api/v1/brand_growth/overview`, `/repurpose`, `/approve_job`, `/ads_guardrail`) và request spec [`brand_growth_controller_spec.rb`](file:///Users/khuongdp/Projects/CMS/cms-kai/spec/requests/api/v1/brand_growth_controller_spec.rb).
- **Đánh đổi:** Tăng mạnh giá trị thương mại của gói thuê bao KChat (từ công cụ trực chat đơn thuần thành nền tảng tăng trưởng & bán hàng khép kín), giúp giữ chân khách hàng (giảm Churn) và mở thêm nguồn doanh thu bán lẻ Video/SEO/Seeding Credits trên cùng một hạ tầng quản trị.

---

### ADR-015: Chuẩn Hóa Hạ Tầng AI (`AgentGW Cloud` + `Muse.ai / Gemini Chrome CDP :9222`, Loại Bỏ `9router`) & Gia Cố Thương Mại Hóa (`Casso Idempotency`, Bảo Mật White-Label, Lưu Trữ Trạng Thái Bền Vững) · `accepted` (2026-10-28)
- **Bối cảnh:** Để đưa nền tảng KChat CMS & Brand Growth OS vào kinh doanh thực tế, chủ dự án yêu cầu: (1) Không sử dụng `9router`; thay thế bằng API của `AgentGW Cloud` (`https://agentgw.cloud/v1`, cấu hình từ `/Users/khuongdp/Projects/mmo/.env`) kết hợp nền tảng chạy ngầm miễn phí `Muse.ai` và `Google Gemini Web` qua Chrome CDP (`http://127.0.0.1:9222`); (2) Thực hiện toàn bộ các hạng mục kỹ thuật thương mại hóa trong kế hoạch kiểm toán.
- **Quyết định:**
  1. **Kiến trúc AI Đa tầng (`Ai::CustomLlmService` & `config/llm.yml`):**
     - **Tầng 1 (`agentgw`):** Kết nối trực tiếp `https://agentgw.cloud/v1/chat/completions` với `agentgw-gpt-5.5` (phản hồi nhanh cho Chatbot đa kênh) và `agentgw-opus-4-8` (suy luận sâu cho Brand Growth OS & kịch bản 1-ra-10); tích hợp bộ lọc `strip_think`, `extract_json` (port từ `mmo/src/omni_viral/providers/llm_client.py`) và bộ chặn **Brand Brain Hard Bans** (`enforce_brand_guardrails`).
     - **Tầng 2 (`muse_cdp` / `gemini_cdp`):** Giám sát và điều phối phiên Chrome CDP cổng `:9222` (`https://gemini.google.com/app` và `https://muse.ai/`) để chạy ngầm miễn phí ($0) cho sinh kịch bản, ảnh dọc 9:16 và video clip.
     - **Loại bỏ hoàn toàn `9router`** khỏi toàn bộ cấu hình và giao diện.
  2. **Gia cố Thanh toán Tự động Casso (`Casso::WebhookHandler`):**
     - Xóa bỏ `Account.first` fallback khi không khớp mã Tenant (`unmatched_account_recorded`).
     - Bổ sung cơ chế chống trùng lặp giao dịch (**Idempotency**) theo mã `tid` ngân hàng (`processed_casso_tids` → trả về `duplicate_ignored` nếu Casso gọi lại).
     - Phân loại tự động lệnh nạp `PLAN` (+30 ngày), `TOKEN` (+AI Tokens) và `SEED` (+Seeding Credits).
  3. **Bảo mật & White-Label Triệt để (`lib/chatwoot_hub.rb`, `config/initializers/cors.rb`, `config/routes.rb`):**
     - Ngắt mặc định toàn bộ kết nối telemetry/ping về `hub.2.chatwoot.com` (`DISABLE_TELEMETRY=true`).
     - Khóa CORS theo biến môi trường `CORS_ALLOWED_ORIGINS`.
     - Chặn các route `/enterprise/api/v1/*` khi không có controller thực thi để tránh lỗi 500 `RoutingError`.
  4. **Lưu trữ Trạng thái Bền vững (`storage/kchat_commercial_state.json`):** Đồng bộ dữ liệu Brand Brain, lịch sử Job 1-to-10, số dư AI Token và giao dịch Casso xuyên suốt giữa `Tenant Admin`, `Super Admin` và API Server.
- **Đánh đổi:** Đảm bảo an toàn tài chính tuyệt đối khi nhận webhook ngân hàng thật, loại bỏ phụ thuộc vào `9router`, và tận dụng tối đa tài nguyên AI sẵn có từ dự án `mmo`.

---

## ADR-016 — Vá bảo mật thương mại hóa, tên miền cấu hình được, thay một phần ADR-015 · `accepted` (2026-11-16)

- **Bối cảnh:** quét 2026-11-16 phát hiện: `/api/v1/casso/simulate` công khai cộng gói cước thật; webhook Casso chấp nhận mọi request khi thiếu token; gói cước kích hoạt khi chuyển thiếu tiền; ghép tenant theo `name` (không duy nhất); `/api/v1/brand_growth/*` không xác thực, `tenant` lấy từ tham số, trạng thái lưu file JSON dùng chung; nhánh "Muse/Gemini CDP :9222" thực chất vẫn gọi AgentGW; số liệu MER/ROAS/phễu là hằng số; whitelist CORS áp lên cả API public của widget.
- **Quyết định:**
  - Casso: bắt buộc `CASSO_SECURE_TOKEN` (thiếu thì từ chối mọi request), so sánh `secure_compare`; `simulate` chỉ có route ở development; chỉ ghép theo ID account hoặc `tenant_slug`; chuyển thiếu tiền → `underpaid_recorded`, không kích hoạt; khóa dòng account khi ghi để chống trùng `tid`. Thông tin ngân hàng lấy từ `CASSO_BANK_NAME`, `CASSO_ACCOUNT_NUMBER`, `CASSO_ACCOUNT_NAME`.
  - Brand Growth: chuyển vào `/api/v1/accounts/:account_id/brand_growth/*` (đăng nhập, đúng account; lưu hồ sơ và duyệt job cần quyền admin); lưu ở `account.custom_attributes['brand_growth']`; bỏ số liệu giả và endpoint `ads_guardrail` giả; `repurpose` gọi AI thật, AI chưa cấu hình trả 503; giới hạn 30 lần/phút/account (`BRAND_GROWTH_AI_LIMIT`).
  - AI: bỏ nhánh CDP :9222 (thay phần đó của ADR-015); key Gemini gửi bằng header; lỗi nhà cung cấp thì báo lỗi, không trả câu trả lời mẫu.
  - CORS: `/packs`, `/audio`, `/public/api` luôn `*`; API có xác thực chỉ theo `CORS_ALLOWED_ORIGINS` (production không đặt thì không mở cross-origin).
  - Nginx: `deploy/nginx/templates/kchat.conf.template`, tên miền qua `KCHAT_DOMAIN`; bỏ trang super-admin tĩnh không đăng nhập, bỏ proxy `/bridge/` công khai, bỏ wildcard subdomain theo tenant (Rails chưa hỗ trợ).
- **Hệ quả:** `landing-page/tenant-admin` đang gọi đường dẫn cũ `/api/v1/brand_growth/*` nên sẽ hỏng cho tới khi giao diện được làm lại (ADR-017).

## ADR-017 — Thương hiệu Kalo, gộp hộp chat và quản trị shop thành 1 app · `accepted` (2026-11-17)

- **Quyết định của chủ dự án:** 1 tên mẹ + tên phụ; khách hàng chính là shop online nhỏ; gộp hộp chat và Tenant Admin thành 1 app; tên quốc tế ngắn gọn gắn với "đôi cánh" và chữ K (Khương) → **Kalo** (K + *ala* = cánh + "alô"). Sản phẩm: **Kalo** (app cho shop), **Kalo POS**, **Kalo Live** (khung chat gắn website), **Kalo Console** (quản trị nội bộ).
- **Đã duyệt (2026-11-16):** màu phương án A (cam san hô ấm); menu 6 mục (Tin nhắn, Đơn hàng, Khách hàng, Marketing, Báo cáo, Cài đặt); chữ trên giao diện ngắn, hướng người dùng cuối, không thuật ngữ kỹ thuật; thứ tự vẽ Figma: bảng thương hiệu → Kalo desktop → Kalo mobile → Console → landing.
- **Đã làm:** thiết kế được duyệt và đã thi công trong code (Phase K). **Chưa xong (việc của chủ dự án, xem `reference/go-live-checklist.md`):** kiểm tra `kalo.vn`/`kalo.com.vn` ở nhà đăng ký (mới chỉ kiểm DNS sơ bộ) và tra nhãn hiệu "Kalo" trên NOIP. `BRAND_URL`, `WIDGET_BRAND_URL`, `TERMS_URL`, `PRIVACY_URL` để trống trong seed; OPS đặt sau khi có tên miền (checklist mục 8, 8b).

## ADR-018 — Quyết định kỹ thuật cho đợt Kalo launch · `accepted` (2026-11-16)

- **Thanh toán đơn của shop:** mã VietQR tạo cục bộ bằng gem `rqrcode`, không gọi dịch vụ ngoài. Shop bấm "Đã nhận tiền" bằng tay; tự đối soát qua Casso cho từng shop để sau.
- **Vận chuyển:** chưa nối GHN/GHTK. Cột `shipping_carrier` và `tracking_code` có trong mô hình dữ liệu nhưng chưa có API hay giao diện nào ghi chúng (đính chính 2026-11-17: trước đây ghi nhầm là shop nhập được hãng và mã vận đơn). POS ngoài (KiotViet, Sapo), Ads API, đăng bài tự động, video MMO: chưa làm.
- **Tiền tố chuyển khoản gói cước:** đổi từ `KCHAT` sang `KALO` (`KALO <account_id> PLAN`).
- **Tên module nội bộ:** vẫn là `Kchat` (bảng `kchat_*`, namespace `Api::V1::Accounts::Kchat`); tên thương hiệu hiển thị là Kalo qua `INSTALLATION_NAME`.
- **Giới hạn gói:** áp dụng bằng `account.limits` của Chatwoot nếu cơ chế đó có tác dụng thật; nếu không, bỏ dòng giới hạn khỏi landing.
  - **Kết quả kiểm tra (Task 4, 2026-11-16): `account.limits` KHÔNG được áp dụng.** `Account#usage_limits` luôn trả `ChatwootApp.max_limit` (100000) và bỏ qua cột `limits`; thử tài khoản `starter` có `limits: {agents: 2}` vẫn thêm được nhân viên thứ 3 (HTTP 200). Vì vậy `Casso::WebhookHandler` không ghi `limits` theo gói, và landing phải bỏ dòng giới hạn số nhân viên/kênh (hoặc làm riêng một task ghi đè `usage_limits`).
- **Dùng thử:** 14 ngày từ `account.created_at`. Hết hạn thì chặn tạo sản phẩm, đơn và gọi AI; vẫn xem và nhắn tin được.
- **Thi công:** kế hoạch `docs/plans/2026-11-16-kalo-launch.md`, nhánh `feat/kalo-launch`, mỗi task một worktree `feat/kalo-<task>`.

## ADR-019 — Quản lý giới hạn gói, hết hạn dùng thử và đối soát thanh toán · `accepted` (2026-11-17)

- **Bối cảnh:** gói cước Kalo trả bằng chuyển khoản, đối soát tự động qua Casso. Cơ chế `account.limits` của Chatwoot không có tác dụng (ADR-018). Cần quy tắc rõ để tiền không cộng nhầm tenant và để landing không hứa điều sản phẩm không làm.
- **Dùng thử và hết hạn:** 14 ngày tính từ `account.created_at` (không chỉnh được). Hết hạn (`Kchat::Entitlements`) thì chặn **tạo sản phẩm, tạo đơn và gọi AI** (403 `subscription_expired`); vẫn xem dữ liệu và nhắn tin. Trạng thái: `active` (còn hạn trả phí) → `trial` (còn trong 14 ngày đầu) → `expired`. Hạn gói trả phí lưu `custom_attributes.subscription_valid_until` (ISO 8601); giá trị hỏng được xem như "không có kỳ trả phí" thay vì lỗi 500.
- **Định dạng nội dung chuyển khoản (Casso):** `KALO <account_id|tenant_slug> [PLAN|TOKEN|SEED] [order_id]`. Trang Gói cước hiển thị đúng memo này.
  - Phân tích **fail-closed**: thiếu `CASSO_SECURE_TOKEN` thì từ chối mọi request; `tid` duy nhất (chỉ mục unique) chống trùng, ghi sự kiện và cộng tiền trong cùng transaction, khóa dòng account khi cộng; số tiền ≤ 0 hoặc `tid` rỗng bị loại.
  - Mọi giao dịch đều lưu `Kchat::PaymentEvent`. Không khớp account hoặc `tenant_slug` **trùng** (nhiều account cùng slug, không phân biệt hoa thường) → `unmatched`, không ai được cộng tiền; Console gán tay.
  - Từ khóa không chính xác (`TOKENS`, `SEEDS`, gõ sai) → `unmatched` hoặc `description_ambiguous` (Console trả 422 `description_ambiguous` khi gán), không tự rơi về PLAN. Riêng từ khóa gõ sai hẳn như `TOKN` vẫn có thể bị hiểu là PLAN (hoãn, xem backlog).
  - Chuyển thiếu tiền → `underpaid`, không kích hoạt. Trả đủ → +30 ngày; trả gấp đôi vẫn +30 ngày.
  - Payload Casso chấp nhận `data` là mảng, `data` là object (webhook v2) hoặc giao dịch ở cấp cao nhất; dạng khác trả 400 `invalid_payload` (log chỉ ghi hình dạng, không ghi nội dung). Throttle 120 request/phút/IP (`CASSO_WEBHOOK_LIMIT`), Nginx xóa header `Forwarded` để IP không bị giả.
- **Giới hạn theo gói KHÔNG được áp dụng, vì vậy KHÔNG được quảng bá:** số nhân viên, số kênh, hạn mức tin nhắn AI, số tài liệu, rule… Landing và tài liệu chỉ liệt kê tính năng, không liệt kê giới hạn. Muốn áp dụng phải làm riêng việc ghi đè `Account#usage_limits` (backlog "Sau launch").
- **AI:** `Ai::CustomLlmService` gọi AgentGW (OpenAI-compatible); không có khóa thì endpoint trả 503. Giới hạn 30 lần/phút/account đếm trong controller theo `Current.account.id`, cắt độ dài `message`/`topic`/`history` và tổng prompt ≤ 20.000 ký tự.
- **Hệ quả / đánh đổi:** `ai_tokens_balance` được nạp bởi `TOKEN` nhưng chưa bị trừ khi dùng; shop hết hạn vẫn gọi được `send_qr`/`transition` (L-3, chấp nhận ở bản launch); hạn mức AI chưa theo user (L-7). Shop mới tự đăng ký (khi bật signup) có thể tạo nhiều account để lấy trial lặp lại (I-8): cân nhắc trước khi mở signup công khai.

## Câu hỏi mở (chờ chủ dự án)

- **Q1:** Nhóm tính năng enterprise (Captain AI, SLA, Custom Roles, Audit Logs, Companies, SAML, Calls) cần cái nào? Cái nào cần thì phải tự viết backend, không được copy code enterprise của Chatwoot.
- **Q2:** Shopee, TikTok Shop và Zalo OA có nằm trong phạm vi parity không, hay để Phase 9?
- **Q3:** Quyền sở hữu: file `LICENSE-PROPRIETARY` ghi DSFSoft. Cần làm rõ quan hệ giữa KTech và DSFSoft trước khi đầu tư lớn. License MIT bắt buộc giữ file `LICENSE`.
- **Q4:** CRM/ERP của KTech: hệ thống nào, có tài liệu API không, xác thực kiểu gì, bên nào là nguồn gốc dữ liệu khách hàng? Chặn P4-08.
- **Q5:** Zalo Personal dùng `zca-js` (thư viện không chính thức), nên có rủi ro bị khóa tài khoản và vi phạm điều khoản Zalo. Chủ dự án có chấp nhận rủi ro này không, và mỗi account được phép gửi tối đa bao nhiêu tin/phút? Ảnh hưởng tới P1-09.


## ADR-020 — Super admin `/super_admin` dùng SCSS riêng theo style Kalo · `accepted` (2026-11-17)
- **Bối cảnh:** trang super admin là Rails/Administrate, không có Tailwind của app Vue; phần còn lại của Kalo dùng token trong `_ktech-theme.scss`.
- **Quyết định:** thêm `app/assets/stylesheets/administrate/kalo.scss` (nạp cuối `application.scss`), sao chép các token cần dùng (bảng màu coral, radius, bóng, font Be Vietnam Pro) thành biến CSS `--kalo-*`. Chỉ đổi lớp trình bày: layout, `_navigation`, `_nav_item`, `_settings_menu`, `_collection`, `_filters`, `_search`, `_flashes`, `index`, `show`, trang đăng nhập. Không đổi route, controller, dashboard.
- **Chữ:** nhãn giao diện nằm trong `config/locales/kalo_super_admin.{vi,en}.yml` (namespace `kalo_super_admin`), không ghi đè khóa `administrate.*`. Tên thương hiệu lấy từ `INSTALLATION_NAME`.
- **Menu:** rút gọn theo nhóm (Tổng quan, Khách hàng, Nền tảng, Hệ thống), chỉ gồm mục có controller chạy được. Bỏ widget hỗ trợ của Chatwoot khỏi `_javascript`.
- **Đánh đổi:** hai nguồn token (SCSS app và SCSS super admin) phải cập nhật song song khi đổi bảng màu.

## ADR-021 — Nâng cấp Quản trị Thương hiệu & Marketing Đa kênh cho Kalo · `accepted` (2026-11-19)
- **Bối cảnh:** Sau khi ra mắt Kalo, phần tư vấn & chốt đơn qua chat đã vận hành tốt nhưng marketer còn thiếu: giới hạn tốc độ gửi Zalo Cá nhân để tránh khóa tài khoản, gom bình luận Facebook/Instagram và ẩn SĐT chống cướp khách, gửi chiến dịch remarketing đa kênh có kiểm tra cửa sổ 24h Meta, lịch nội dung & sửa kịch bản AI từ Brand Studio, và báo cáo phễu chuyển đổi + UTM + đa thương hiệu.
- **Quyết định:**
  1. **Zalo Personal Rate Limiter (`zalo-personal-bridge`):** Áp dụng `SendRateLimiter` (token bucket burst 10, cửa sổ trượt 30 tin/phút/tài khoản, 150 tin/phút toàn pod) tại `OutboundWorker`; tin bị giới hạn giữ nguyên `status = 'queued'` không tăng `attempts` và không chặn các tài khoản khác trong cùng batch.
  2. **Comment-to-Inbox & Auto-Hide (`Kchat::SocialComments`):** Đăng ký thêm `feed` (Facebook Page) và `comments` (Instagram); lưu quy tắc tại `account.custom_attributes['social_comment_rules']`; tự động tạo hội thoại `source_type = 'social_comment'`, ẩn bình luận chứa SĐT Việt Nam hoặc từ khóa nhạy cảm, hỗ trợ Private Reply DM và trả lời trực tiếp comment thread từ Inbox.
  3. **Omnichannel Broadcasts (`Kchat::BroadcastsService` + `Kchat::SendBroadcastJob`):** Hỗ trợ chọn kênh, lọc nhãn khách hàng/hội thoại, cá nhân hóa `{{name}}`/`{{shop_name}}`, gắn nhãn chiến dịch + `utm_campaign` lên hội thoại để quy đổi doanh thu; riêng `Channel::FacebookPage` và `Channel::Instagram` bắt buộc kiểm tra cửa sổ tương tác 24h theo chính sách Meta.
  4. **Brand & Content Studio:** Bổ sung `positioning` vào `Ai::CustomLlmService#build_system_prompt`, cho phép sửa trực tiếp góc kịch bản (áp dụng lọc từ cấm `hard_bans`) và quản lý Lịch nội dung (`state['calendar']`, tối đa 100 mục).
  5. **Attribution & Marketing Reports:** Tự động trích `utm_source`/`utm_campaign` từ `referer` của hội thoại; tách 2 endpoint `/api/v1/accounts/:id/kchat/reports/{funnel,brands_overview}` và giữ nguyên 100% hợp đồng `/kchat/reports/summary` (ADR-018/B16).
- **Hệ quả:** Không phát sinh bảng DB mới (tái dùng `custom_attributes` và `additional_attributes` + query gộp trên `kchat_orders`, `conversations`, `inboxes`, `users`), tránh số liệu giả (B12) và giữ tương thích ngược hoàn toàn với các test hiện hữu.

## ADR-022 — Kiến trúc Giao diện Kalo UI/UX v3 (3-Tier Warm Alabaster Canvas, Dashboard Chất lượng Đầu ra, Collapsible Rail & Native MailHog Inspector) · `accepted` (2026-11-19)
- **Bối cảnh:** Sau khi chạy thực tế giao diện Kalo v2 (dựng trên nền Chatwoot), người dùng đánh giá bố cục giữa các màn còn rời rạc, nền lẫn với thẻ nội dung, input/modal kéo dãn 50/50 thiếu điểm tựa thị giác, chuỗi tin nhắn hệ thống quá dài trong khung chat, và thiếu dashboard tổng quan chất lượng đầu ra cũng như trình xem email hệ thống thống nhất cho Console/Super Admin.
- **Quyết định:**
  1. **Hệ bề mặt 3 tầng `80/15/5` (`_ktech-theme.scss`, `kalo.scss`):** Nâng cấp nền canvas ngoài sang Warm Alabaster `#F6F5F3`, bề mặt thẻ cấp 1 trắng tinh `#FFFFFF`, bề mặt lồng cấp 2 `#FAF8F6` cùng viền `#E6E0DC`/`#D4C9C2`; giữ nguyên toàn bộ bộ icon SVG duotone (`public/kalo-icons.svg`), bảng màu Coral/Terracotta (`#FF6B4A`/`#C93F24`), Console Indigo (`#231C40`/`#3B2F6B`) và font `Be Vietnam Pro`. Đạt 39/39 cặp tương phản WCAG AA/AAA.
  2. **Khung bố cục thống nhất & `KaloRail` đóng/mở (`KaloPageShell`, `KaloRail`, `Dialog`/`Modal`):** Chuẩn hóa vỏ trang `max-w-[1360px]` có header dính; thêm nút thu gọn/mở rộng thanh rail (`76px ↔ 224px`, phím tắt `$mod+\`, lưu qua `uiSettings.is_kalo_rail_expanded`, tự thu gọn trên `kalo_pos`); chuẩn hóa mọi modal/drawer thành 3 vùng cố định (Header dính + Thân cuộn nội bộ + Footer gọn nút phải) và làm sắc nét input/select/textarea/thanh cuộn `6px`.
  3. **Dashboard Tổng quan & Chất lượng Đầu ra (`Kchat::QualityOverviewReport`, `OverviewIndex.vue`):** Bổ sung mục `Tổng quan` làm mục đầu tiên trên `KaloRail`, tổng hợp doanh thu thực, tỷ lệ chuyển đổi Chat → Đơn, chất lượng CSKH (FRT `< 5p`, khách chờ `> 15p`), đầu ra nội dung & ẩn SĐT, bảng chất lượng/hoàn hủy theo SKU và hàng đợi xử lý tức thời — dùng 100% dữ liệu thật.
  4. **Tinh gọn luồng chat, chi tiết khách hàng & Bento Cài đặt:** Gom `>= 2` tin hệ thống liên tiếp bằng `KaloActivityGroup`; cân đối `ContactManageView`/`ContactDetails` tỷ lệ `5fr / 7fr`; thêm thanh timeline 4 bước trong `OrderDrawer` (sửa lỗi hiển thị QR); chuyển 7 liên kết báo cáo chi tiết từ `SettingsHub` về `ReportsIndex` để `SettingsHub` trở thành lưới Bento 6 nhóm + tìm kiếm tức thời.
  5. **Super Admin, Console & Hộp thư hệ thống (`ConsoleMailInspector.vue`, `Kchat::MailhogClient`):** Dọn bảng `/super_admin` (chữ dòng dữ liệu đen chuẩn, badge KPI tổng quan, phân trang `vi.views.pagination`); nối `SMTP_ADDRESS=mailhog` (`SMTP_PORT=1025`, `SMTP_ENABLE_STARTTLS_AUTO=false`) trong `docker-compose.yaml`; dựng giao diện 2 cột `/app/console/emails` (tìm kiếm, trích xuất Action Links, xem HTML qua `<iframe sandbox="">` chống XSS, xem plain text & SMTP headers) và thẻ `Sức khỏe hạ tầng & đối soát` trên Console Overview.
- **Hệ quả:** Toàn bộ 5 phân hệ (Kalo Shop App, Tổng quan Chất lượng, Kalo Console, Super Admin, MailHog Inspector) thống nhất ngôn ngữ thiết kế và bố cục trên cả desktop và mobile; mọi widget/công cụ nội bộ đều nối dữ liệu thật và cô lập HTML email an toàn qua `sandbox=""`.

## ADR-023 — Cờ chức năng Kalo theo shop dùng `feature_flags` của Chatwoot · `accepted` (2026-11-19)
- **Bối cảnh:** đặc tả guided UX (§4, §7) yêu cầu ẩn mặc định các nhóm chức năng nâng cao với shop mới, giữ các module chính, và cho Super Admin bật/tắt theo từng shop. Cần chọn chỗ lưu cờ: cờ Chatwoot (`Featurable`, FlagShihTzu) hay một khóa jsonb riêng (`custom_attributes['kalo_features']`).
- **Quyết định:**
  1. Dùng cờ Chatwoot: thêm 9 mục `kalo_*` vào CUỐI `config/features.yml`, cột `feature_flags_ext_1` (đang dùng 6/63 bit, sau khi thêm là 15/63). Chính (mặc định bật): `kalo_comments`, `kalo_campaigns`, `kalo_brand`, `kalo_ai_assistant`, `kalo_pos`. Nâng cao (mặc định tắt): `kalo_advanced_automation` (automation, macro, thuộc tính tùy chỉnh, bot, webhook, ứng dụng dashboard), `kalo_help_center`, `kalo_detailed_reports` (báo cáo kiểu Chatwoot: nhân viên, nhãn, nhóm, hộp thư, CSAT, SLA), `kalo_extra_channels` (SMS, Email, API, Telegram, Line, WhatsApp, Zalo OA bằng token).
  2. Shop mới nhận mặc định qua `ACCOUNT_LEVEL_FEATURE_DEFAULTS` (ConfigLoader tự thêm cờ mới khi `db:migrate`). Shop cũ: migration `20261119000001_backfill_kalo_feature_flags` chỉ dùng SQL và cố định vị trí bit ngay trong file (không phụ thuộc `Account` hay `Kchat::Features`), phép OR nên chạy lại không đổi gì: bật mọi cờ chính, và bật nhóm nâng cao mà shop đang dùng (có automation/macro/thuộc tính/bot/webhook/app; có portal; có hộp thư kênh bổ sung; có nhóm hoặc CSAT). Không bao giờ tắt cờ đang bật.
  3. Danh sách cờ và logic nằm ở `Kchat::Features` (`CORE`, `ADVANCED`, `states`, `update!`). `update!` chỉ ghi cột cờ (`update_columns`) nên shop có dữ liệu không hợp lệ vẫn bật/tắt được..
  4. Ẩn ở lớp giao diện: frontend đọc `features` trong payload tài khoản (`GET /api/v1/accounts/:id`, chỉ có các cờ đang bật). API backend của nhóm bị ẩn vẫn chạy.
  5. Super Admin: mục "Chức năng" trên trang tài khoản, form `PATCH /super_admin/accounts/:id/kalo_features` (có kiểm tra CSRF, ghi `Rails.logger.info` dòng `[kalo_features]`). Không qua form Administrate vì `selected_feature_flags=` ghi đè toàn bộ cờ.
- **Lý do không dùng jsonb riêng:** cờ Chatwoot đã có đường đi tới frontend (`accounts/isFeatureEnabledonAccount`, `meta.featureFlag` của route), mặc định cho shop mới và rake `feature_defaults`; dư bit nên không cần thêm cột.
- **Đánh đổi:** bit theo vị trí nên không được chèn giữa hay xóa mục khỏi `features.yml`. Shop admin không tự bật được (API cập nhật tài khoản không nhận `features`), phải nhờ Super Admin.

## ADR-024 — Console của shop, trang "Nền tảng" và ẩn chức năng theo cờ ở frontend · `accepted` (2026-11-19)
- **Bối cảnh:** đặc tả guided UX §7 tách hai khu: Super Admin (chủ nền tảng) và Console (chủ shop). Trước đây `/app/console/*` là trang của SuperAdmin; §4 yêu cầu ẩn mục theo cờ `kalo_*` (ADR-023) và sidebar có Bình luận, Chiến dịch, Thương hiệu riêng.
- **Quyết định:**
  1. "Console" là trang của shop: `/app/accounts/:id/console` (route `kalo_console`, thư mục `routes/dashboard/shopConsole/`). Quản trị viên thấy 5 phần: Cửa hàng (tên, ngôn ngữ qua `accounts/update`), Nhân viên và nhóm (mời trong KaloDrawer, "Thêm vào kênh" gọi `POST inbox_members` chỉ thêm, không gỡ), Gói và dùng thử (`kchat/subscription`), Nhận tiền (`kchat/payment_settings`), Kênh đã nối. Vai trò khác chỉ thấy link hồ sơ. Các trang Cài đặt cũ (nhân viên, nhóm, hộp thư, thông tin shop, gói, nhận tiền) vẫn chạy, nút quay lại về Console.
  2. Trang của chủ nền tảng đổi tên "Nền tảng", đường dẫn `/app/platform/{overview,shops,payments,emails}` (route `kalo_platform_*`), chỉ SuperAdmin. `/app/console[/:section]` cũ được guard đổi hướng: SuperAdmin sang mục tương ứng của Nền tảng, người khác sang Console của shop hiện tại. Lối vào: menu hồ sơ, sheet "Thêm" trên mobile và nav của `/super_admin`.
  3. Bảng route → cờ đặt một chỗ (`helper/kaloFeatures.js`, `requiredKaloFeatures`), đọc qua `useKaloFeatures` (lấy account id từ getter `getCurrentAccountId`, không cần router). Route bị ẩn mở trực tiếp hiện `KaloFeatureOff` qua `KaloFeatureGate` bọc `router-view` của `Dashboard.vue`; chưa tải xong tài khoản thì không hiện gì để tránh nháy trang.
  4. Sidebar theo §4: Bình luận (`kalo_comments`), Chiến dịch (`kalo_campaigns`), Thương hiệu (`kalo_brand`) là route riêng (`/marketing/{comments,campaigns,brand}`) bọc component cũ trong KaloPage. Trang Marketing cũ giữ lại cho bookmark, tab ẩn theo cờ. Hub Cài đặt chỉ còn Console (quản trị), nhãn và mẫu câu, tài khoản của tôi, nhóm nâng cao theo cờ.
- **Đánh đổi:** chỉ ẩn ở giao diện, API của nhóm bị tắt vẫn chạy (như ADR-023). Tên file component của Nền tảng vẫn là `Console*.vue` trong `routes/dashboard/platform/` để diff nhỏ.

## ADR-025 — Chiến dịch A–Z: nháp, nhóm khách và kết quả tính từ tin thật · `accepted` (2026-11-20)
- **Bối cảnh:** đặc tả guided UX §5 yêu cầu wizard 6 bước dùng `Kchat::BroadcastsService` có sẵn (chiến dịch lưu trong `account.custom_attributes['kchat_broadcasts']`, tối đa 30, gửi bằng `Kchat::SendBroadcastJob`, hẹn giờ bằng `wait_until`). Cần thêm nháp, mục tiêu, nhóm khách và số liệu kết quả mà không bịa số (B12).
- **Quyết định:**
  1. Giữ chỗ lưu jsonb hiện có. Bản ghi thêm `goal` (`sales|retention|launch`), `segment_id`, `started_at`; trạng thái thêm `draft`. `POST` với `draft: true` lưu nháp (chỉ cần tên), `PATCH /kchat/broadcasts/:id` sửa nháp, `draft: false` thì kiểm đủ và gửi/hẹn; `DELETE` chỉ xóa nháp. Lỗi khi gửi → `failed`.
  2. Nhóm khách = bộ lọc khách đã lưu của Chatwoot (`custom_filters` loại `contact`), chạy lại bằng `Contacts::FilterService` lúc xem trước và lúc gửi. `GET audience` trả số khách khớp và số khách mỗi hộp thư nhắn được (chỉ khách đã có `contact_inbox` ở hộp thư đó; Meta lọc 24 giờ), kèm khả năng kênh (`Kchat::Broadcasts::Channels`).
  3. Mỗi tin gửi đi được đánh dấu `messages.additional_attributes.kchat_broadcast_id`. `GET /kchat/broadcasts/:id` (`Kchat::Broadcasts::Results`) đếm: tin kênh từ chối sau đó (`status=failed`), đã xem (chỉ kênh có báo đọc: Messenger, Instagram, WhatsApp, TikTok, khung chat website; Zalo cá nhân trả `null`), khách nhắn lại sau khi gửi, đơn tạo sau khi gửi trong hội thoại của chiến dịch hoặc hội thoại có `utm_campaign` bằng mã chiến dịch, doanh thu đơn đã thanh toán.
  4. Từ cấm: `POST check_content` dùng đúng `enforce_brand_guardrails` mà dispatcher áp lúc gửi. Viết bằng AI dùng `brand_growth/chat_reply` (hồ sơ thương hiệu, throttle và chặn hết hạn sẵn có).
- **Đánh đổi:** vẫn giới hạn 30 chiến dịch và 500 khách mỗi lần gửi (dispatcher); kết quả tính khi mở, không lưu sẵn. Nhóm khách chỉ gồm khách có email/điện thoại/mã định danh (quy tắc của Chatwoot), nên khách Zalo chỉ có tên sẽ không vào nhóm khách, chỉ vào "mọi khách" hoặc theo nhãn.
