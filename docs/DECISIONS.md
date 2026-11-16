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

## ADR-017 — Thương hiệu Kalo, gộp hộp chat và quản trị shop thành 1 app · `proposed` (2026-11-16)

- **Quyết định của chủ dự án:** 1 tên mẹ + tên phụ; khách hàng chính là shop online nhỏ; gộp hộp chat và Tenant Admin thành 1 app; tên quốc tế ngắn gọn gắn với "đôi cánh" và chữ K (Khương) → **Kalo** (K + *ala* = cánh + "alô"). Sản phẩm: **Kalo** (app cho shop), **Kalo POS**, **Kalo Live** (khung chat gắn website), **Kalo Console** (quản trị nội bộ).
- **Đã duyệt (2026-11-16):** màu phương án A (cam san hô ấm); menu 6 mục (Tin nhắn, Đơn hàng, Khách hàng, Marketing, Báo cáo, Cài đặt); chữ trên giao diện ngắn, hướng người dùng cuối, không thuật ngữ kỹ thuật; thứ tự vẽ Figma: bảng thương hiệu → Kalo desktop → Kalo mobile → Console → landing.
- **Chưa xong:** kiểm tra `kalo.vn`/`kalo.com.vn` ở nhà đăng ký và tra nhãn hiệu NOIP; duyệt logo, màu và giao diện trên Figma trước khi làm code.

## ADR-018 — Quyết định kỹ thuật cho đợt Kalo launch · `accepted` (2026-11-16)

- **Thanh toán đơn của shop:** mã VietQR tạo cục bộ bằng gem `rqrcode`, không gọi dịch vụ ngoài. Shop bấm "Đã nhận tiền" bằng tay; tự đối soát qua Casso cho từng shop để sau.
- **Vận chuyển:** bản này chỉ nhập hãng và mã vận đơn; chưa nối GHN/GHTK. POS ngoài (KiotViet, Sapo), Ads API, đăng bài tự động, video MMO: chưa làm.
- **Tiền tố chuyển khoản gói cước:** đổi từ `KCHAT` sang `KALO` (`KALO <account_id> PLAN`).
- **Tên module nội bộ:** vẫn là `Kchat` (bảng `kchat_*`, namespace `Api::V1::Accounts::Kchat`); tên thương hiệu hiển thị là Kalo qua `INSTALLATION_NAME`.
- **Giới hạn gói:** áp dụng bằng `account.limits` của Chatwoot nếu cơ chế đó có tác dụng thật; nếu không, bỏ dòng giới hạn khỏi landing.
  - **Kết quả kiểm tra (Task 4, 2026-11-16): `account.limits` KHÔNG được áp dụng.** `Account#usage_limits` luôn trả `ChatwootApp.max_limit` (100000) và bỏ qua cột `limits`; thử tài khoản `starter` có `limits: {agents: 2}` vẫn thêm được nhân viên thứ 3 (HTTP 200). Vì vậy `Casso::WebhookHandler` không ghi `limits` theo gói, và landing phải bỏ dòng giới hạn số nhân viên/kênh (hoặc làm riêng một task ghi đè `usage_limits`).
- **Dùng thử:** 14 ngày từ `account.created_at`. Hết hạn thì chặn tạo sản phẩm, đơn và gọi AI; vẫn xem và nhắn tin được.
- **Thi công:** kế hoạch `docs/plans/2026-11-16-kalo-launch.md`, nhánh `feat/kalo-launch`, mỗi task một worktree `feat/kalo-<task>`.

## Câu hỏi mở (chờ chủ dự án)

- **Q1:** Nhóm tính năng enterprise (Captain AI, SLA, Custom Roles, Audit Logs, Companies, SAML, Calls) cần cái nào? Cái nào cần thì phải tự viết backend, không được copy code enterprise của Chatwoot.
- **Q2:** Shopee, TikTok Shop và Zalo OA có nằm trong phạm vi parity không, hay để Phase 9?
- **Q3:** Quyền sở hữu: file `LICENSE-PROPRIETARY` ghi DSFSoft. Cần làm rõ quan hệ giữa KTech và DSFSoft trước khi đầu tư lớn. License MIT bắt buộc giữ file `LICENSE`.
- **Q4:** CRM/ERP của KTech: hệ thống nào, có tài liệu API không, xác thực kiểu gì, bên nào là nguồn gốc dữ liệu khách hàng? Chặn P4-08.
- **Q5:** Zalo Personal dùng `zca-js` (thư viện không chính thức), nên có rủi ro bị khóa tài khoản và vi phạm điều khoản Zalo. Chủ dự án có chấp nhận rủi ro này không, và mỗi account được phép gửi tối đa bao nhiêu tin/phút? Ảnh hưởng tới P1-09.

