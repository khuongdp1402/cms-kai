# Kế hoạch "Khởi tạo thương hiệu đa nền tảng" (Phase BL)

> Ngày lập: 2026-11-22 · Trạng thái: `proposed`, chờ chủ dự án duyệt · ADR-030
> Phạm vi do chủ dự án chốt: **thiết lập thông tin thương hiệu, rồi tạo fanpage/trang cho thương hiệu trên Facebook, Instagram, TikTok**. Không làm phần bản quyền hay nhãn hiệu.

## 1. Mục tiêu

Một shop (hoặc người của agency đang làm cho shop) vào Kalo và trong một lần ngồi có được:

1. **Hồ sơ thương hiệu đầy đủ:** tên, slogan, ngành hàng, sản phẩm chính, khách hàng mục tiêu, giọng văn, màu, logo, thông tin liên hệ.
2. **Bộ hồ sơ trang cho từng nền tảng** do AI soạn sẵn theo giới hạn của nền tảng đó: tên trang, gợi ý username, danh mục, bio ngắn, mô tả dài, nút hành động, ảnh đại diện và ảnh bìa đúng kích thước, bài ghim và 9 bài đầu tiên.
3. **Trang đã tạo xong trên Facebook, Instagram, TikTok** nhờ hướng dẫn từng bước, có nút sao chép từng trường.
4. **Trang đã nối vào Kalo**, để tin nhắn và bình luận về hộp tin, và thông tin fanpage được điền tự động ở những trường API cho phép.
5. **Điểm hoàn thiện hồ sơ** cho từng trang, kèm danh sách việc còn thiếu.

## 2. Giới hạn của nền tảng (đã kiểm tra tài liệu chính thức ngày 2026-11-22)

| Nền tảng | Tạo trang/tài khoản bằng API | Sửa hồ sơ bằng API | Đọc hồ sơ bằng API |
|---|---|---|---|
| Facebook Page | **Không có.** Pages API chỉ quản lý trang đã tồn tại, người dùng phải có quyền `MANAGE` trên trang | **Có** qua `POST /{page_id}`: `about` (Giới thiệu), `description`, `website`, `phone`, danh mục, ảnh bìa. Ảnh đại diện: chưa thấy trong tài liệu, cần thử khi làm | Có |
| Instagram (tài khoản chuyên nghiệp) | **Không có.** IG User: "Creating: not supported" | **Không có.** IG User: "Updating: not supported" (bio, tên, website, ảnh) | Có: `biography`, `name`, `username`, `website`, `profile_picture_url` |
| TikTok | Không thấy trong tài liệu | Không thấy trong tài liệu | Cần xác minh (Display API, phần thông tin người dùng) |

**Hệ quả cho thiết kế:** Kalo không tự bấm "tạo trang" thay người dùng được. Không dùng cách giả lập trình duyệt hay tự động hoá tài khoản cá nhân, vì vi phạm điều khoản và dễ bị khoá tài khoản. Thay vào đó:

- **Chuẩn bị** mọi thứ để việc tạo trang chỉ còn là dán và bấm.
- **Hướng dẫn** từng bước, có liên kết mở thẳng tới trang tạo của nền tảng.
- **Kết nối** sau khi tạo, rồi **tự điền** các trường Facebook cho phép.
- **Đọc lại** hồ sơ (Facebook, Instagram) để chấm điểm hoàn thiện và chỉ ra trường còn lệch so với bộ hồ sơ.

## 3. Hiện trạng trong code (`main` @`44abcc5`)

| Có sẵn | Ở đâu | Dùng lại thế nào |
|---|---|---|
| Hồ sơ thương hiệu 6 trường (`brand_name, positioning, usp, persona, tone, hard_bans`) | `BrandGrowth::EngineService` (lưu `account.custom_attributes['brand_growth']['profile']`), `BrandProfileForm.vue`, route `/marketing/brand` | Mở rộng thêm trường, giữ nguyên API cũ |
| AI viết nội dung theo hồ sơ thương hiệu, lọc từ cấm | `Ai::CustomLlmService` (AgentGW), `build_system_prompt`, `enforce_brand_guardrails` | Thêm tác vụ "soạn bộ hồ sơ trang" |
| Lịch nội dung (tối đa 100 mục) | `state['calendar']` | 9 bài đầu tiên được đưa vào lịch ở dạng nháp |
| Kết nối Facebook, Instagram, TikTok vào hộp tin | Kênh Chatwoot sẵn có + Console mục "Kênh đã nối" | Bước "Kết nối" trong wizard gọi đúng luồng này |
| Bình luận FB/IG về hộp tin, ẩn SĐT | `Kchat::SocialComments` (ADR-021) | Tự chạy sau khi nối trang |
| Danh sách thiết lập cho người mới, tour | ADR-026 | Thêm mục "Khởi tạo thương hiệu" vào checklist |
| Cờ chức năng theo shop | `kalo_brand` (ADR-023) | Wizard nằm sau cờ `kalo_brand`, không thêm cờ mới |

**Còn thiếu để chạy thật:**
- Bản cài đặt chưa cấu hình Meta App, nên Facebook/Instagram đang hiện "Sắp có" (commit `8a5fb0f`).
- Chưa có app TikTok (`TIKTOK_APP_ID`/`TIKTOK_APP_SECRET`).

Đây là việc cấu hình của chủ dự án (task BL-0).

## 4. Trải nghiệm người dùng: wizard 5 bước

Wizard nằm ở **Marketing → Thương hiệu → "Khởi tạo thương hiệu"**, lưu tiến độ, thoát ra vào lại được.

### Bước 1. Thông tin thương hiệu
- Giữ 6 trường cũ, thêm:
  - Nhận diện: `slogan`, `industry` (chọn từ danh sách ngành đã có ở ADR-029), `products_summary`, `brand_colors` (tối đa 3 mã màu), logo (ảnh vuông).
  - Liên hệ và vị trí: `phone`, `email`, `website`, `address`, `opening_hours`.
  - Mạng xã hội: `desired_handle` (username mong muốn).
- Nút "AI gợi ý" điền nháp slogan, định vị và giọng văn từ vài câu mô tả shop.

### Bước 2. Bộ hồ sơ trang (AI soạn, người sửa)
Mỗi nền tảng một thẻ. Mọi trường có bộ đếm ký tự theo giới hạn của nền tảng, sửa tay được, có nút "Viết lại".

| Trường | Facebook | Instagram | TikTok |
|---|---|---|---|
| Tên hiển thị | ✓ | ✓ | ✓ |
| Gợi ý username (3–5 phương án) | ✓ | ✓ | ✓ |
| Danh mục | ✓ (theo danh mục trang FB) | ✓ (danh mục tài khoản doanh nghiệp) | ✓ (danh mục Business) |
| Bio ngắn | Giới thiệu | Bio | Bio |
| Mô tả dài | ✓ | – | – |
| Nút hành động | Nhắn tin / Gọi / Mua | Liên hệ | Liên kết |
| Ảnh đại diện + ảnh bìa | Cắt sẵn từ logo + ảnh bìa nền màu thương hiệu | Ảnh đại diện | Ảnh đại diện |
| Bài ghim + 9 bài đầu | ✓ | ✓ | Ý tưởng 3 video đầu |

- Giới hạn ký tự, kích thước ảnh và danh mục được đặt trong **một file cấu hình** (`config/kalo/social_profile_specs.yml`). Nền tảng đổi quy định thì chỉ sửa file này. Số liệu được kiểm lại với tài liệu của nền tảng khi làm BL-2.
- Ảnh: cắt và đổi cỡ ở trình duyệt từ logo đã tải lên. Ảnh bìa dựng từ template (nền màu thương hiệu, logo, slogan). Không cần dịch vụ tạo ảnh AI.
- 9 bài đầu được đưa vào **Lịch nội dung** sẵn có ở trạng thái `draft`, gắn kênh tương ứng.

### Bước 3. Tạo trang (hướng dẫn từng bước)
Mỗi nền tảng một danh sách các bước. Bước nào cũng có nút sao chép nội dung cần dán và nút mở đúng trang của nền tảng.
- **Facebook:** mở trang tạo Trang của Facebook → dán tên, danh mục, giới thiệu → tải ảnh đại diện và ảnh bìa (nút tải xuống từ bước 2) → xong thì đánh dấu.
- **Instagram:** tạo tài khoản trong app Instagram → chuyển sang tài khoản chuyên nghiệp → **liên kết với Fanpage vừa tạo**, bước bắt buộc để Kalo nhận tin nhắn và bình luận → dán bio, website, ảnh.
- **TikTok:** tạo tài khoản → chuyển sang tài khoản Business → dán bio, ảnh, liên kết.
- Có mã QR để mở bước tương ứng trên điện thoại, vì Instagram và TikTok chủ yếu tạo bằng app.
- Ai đã có sẵn trang thì bấm "Tôi đã có trang" để chuyển thẳng sang bước 4.

### Bước 4. Kết nối vào Kalo
- Gọi đúng luồng kết nối kênh hiện có (Facebook Page, Instagram, TikTok), không viết luồng OAuth mới.
- Nối xong thì tin nhắn và bình luận tự về Hộp tin và trang Bình luận (ADR-021).
- Riêng Facebook: nút **"Áp dụng hồ sơ lên Fanpage"** ghi `about`, `description`, `website`, `phone` và ảnh bìa qua Graph API. Trước khi ghi có màn so sánh "hiện tại → mới", người dùng xác nhận mới ghi.

### Bước 5. Kiểm tra và hoàn thiện
- Đọc lại hồ sơ thật (Facebook: các trường trang; Instagram: `biography`, `website`, `profile_picture_url`; TikTok: tuỳ kết quả xác minh BL-2) và so với bộ hồ sơ.
- **Điểm hoàn thiện** cho từng trang (ví dụ 7/9) kèm danh sách việc còn thiếu: chưa có ảnh bìa, bio khác bản đã duyệt, chưa có website, chưa liên kết IG với Fanpage…
- Gợi ý bước tiếp: duyệt 9 bài đầu trong Lịch nội dung, bật quy tắc ẩn SĐT trong bình luận.
- Mục "Khởi tạo thương hiệu" trong checklist người mới (ADR-026) được đánh dấu xong khi có ít nhất một trang đã nối.

## 5. Thiết kế kỹ thuật

### 5.1. Dữ liệu
Theo cách ADR-021/025 đang làm (jsonb trong `account.custom_attributes`, khoá dòng khi ghi), không thêm bảng nếu không cần:

```
custom_attributes['brand_growth'] = {
  'profile'    => { ...6 trường cũ, slogan, industry, products_summary, brand_colors,
                    phone, email, website, address, opening_hours, desired_handle },
  'launch_kit' => {
    'status' => 'draft|approved',
    'platforms' => {
      'facebook'  => { 'fields' => {...}, 'steps_done' => [...], 'inbox_id' => 12,
                       'applied_at' => '…', 'audit' => { 'score' => 7, 'max' => 9, 'missing' => [...] } },
      'instagram' => { ... }, 'tiktok' => { ... }
    },
    'updated_at' => '…'
  },
  'calendar' => [...], 'jobs' => [...]
}
```

- **Ảnh** (logo, ảnh đại diện và ảnh bìa đã cắt): ActiveStorage. Thêm model nhỏ `Kchat::BrandAsset` (`account_id`, `kind`: `logo|avatar|cover`, `platform`, file đính kèm) vì jsonb không giữ được file. Đây là **bảng mới duy nhất**.
- Token trang dùng lại của kênh đã nối (`Channel::FacebookPage#page_access_token`), không lưu thêm.

### 5.2. Backend (namespace `kchat`, thêm vào `BrandGrowth` sẵn có)
| Thành phần | Việc |
|---|---|
| `BrandGrowth::EngineService` | Mở rộng `PROFILE_KEYS`, kiểm định dạng (SĐT VN, URL, mã màu) |
| `Kchat::BrandLaunch::KitService` | Gọi AI soạn bộ hồ sơ theo `social_profile_specs.yml`, cắt độ dài theo giới hạn, lọc từ cấm, lưu `launch_kit` |
| `Kchat::BrandLaunch::FacebookProfileSync` | Đọc trang hiện tại, `POST /{page_id}` các trường cho phép, ghi `applied_at`. Lỗi quyền thì báo rõ cần kết nối lại với quyền `pages_manage_metadata` |
| `Kchat::BrandLaunch::ProfileAudit` | Đọc hồ sơ FB/IG (và TikTok nếu có API), chấm điểm, trả danh sách thiếu |
| Controller `api/v1/accounts/:id/brand_growth/launch_kit` | `GET`, `PATCH` (sửa tay), `POST generate`, `POST platforms/:platform/steps`, `POST facebook/apply`, `POST audit`, upload `brand_assets` |
| Gói cước | `generate` dùng AI nên áp `Kchat::Entitlements` và throttle AI như các endpoint `brand_growth` khác |

### 5.3. Quyền Meta cần thêm
Luồng kết nối Facebook hiện xin quyền nhắn tin và bình luận. Để ghi hồ sơ trang cần thêm **`pages_manage_metadata`**, quyền này có thể đã có vì webhook `feed` cần nó. Kiểm lại trong `facebookScopes.js` khi làm BL-4. Instagram và TikTok không cần thêm quyền, vì chỉ đọc hồ sơ.

### 5.4. Frontend
- `routes/dashboard/marketing/brandLaunch/`: `BrandLaunchWizard.vue` + 5 component bước, `PlatformKitCard.vue`, `CopyField.vue`, `ImageCropper.vue` (canvas, không thêm thư viện nặng), `ProfileScore.vue`.
- Dùng `KaloPageShell`, modal 3 vùng, chữ `KALO_BRAND_LAUNCH.*` trong `i18n/ktech/vi.json`, Tailwind, theo ADR-022.
- Mobile: wizard dọc, mã QR ở bước 3.

## 6. Task

| ID | Việc | Kiểm chứng |
|---|---|---|
| BL-0 | **(Chủ dự án)** Tạo Meta App (Facebook Login for Business, Messenger, Instagram) và app TikTok, điền khoá vào `.env`, đăng ký webhook. Kiểm tra Facebook/Instagram không còn hiện "Sắp có" | Nối được 1 fanpage test |
| BL-1 | Mở rộng hồ sơ thương hiệu (trường mới, kiểm định dạng, form), model `Kchat::BrandAsset` + upload logo | Rspec service/request, vitest form |
| BL-2 | `social_profile_specs.yml`: giới hạn ký tự, kích thước ảnh, danh mục cho 3 nền tảng, đối chiếu tài liệu chính thức. Xác minh TikTok có API đọc hồ sơ hay không | File cấu hình + ghi nguồn trong `docs/reference/social-profile-specs.md` |
| BL-3 | `KitService` + endpoint `generate`/`PATCH`; 9 bài đầu đổ vào Lịch nội dung | Rspec với LLM giả lập, kiểm cắt độ dài và từ cấm |
| BL-4 | `FacebookProfileSync` + màn so sánh trước khi ghi, xử lý thiếu quyền | Rspec với Graph giả lập; thử thật trên fanpage test |
| BL-5 | `ProfileAudit` FB/IG (+ TikTok nếu có), điểm hoàn thiện | Rspec |
| BL-6 | UI wizard 5 bước: thẻ nền tảng, sao chép, cắt ảnh, ảnh bìa từ template, hướng dẫn tạo trang + QR, nối kênh, điểm hoàn thiện | Vitest, kiểm tay 1280px và 400px, sáng/tối |
| BL-7 | Thêm "Khởi tạo thương hiệu" vào checklist người mới (ADR-026) | Vitest |
| BL-8 | QA cả bộ rspec + vitest (CLAUDE.md), thử trọn luồng với fanpage và tài khoản IG/TikTok test | Ghi kết quả vào STATUS |

**Thứ tự:** BL-0 làm song song ngay. BL-1 → BL-2 → BL-3 → BL-6 (phần bước 1–3, chạy được kể cả khi chưa có Meta App) → BL-4 → BL-5 → BL-7 → BL-8.
**Ước lượng:** khoảng 2–3 tuần cho 1 người full-stack, chưa tính thời gian chờ BL-0.

## 7. Ngoài phạm vi
- Kiểm tra hay đăng ký bản quyền, nhãn hiệu (theo yêu cầu chủ dự án).
- Tự động tạo tài khoản bằng giả lập trình duyệt.
- Đăng bài tự động: làm ở Phase AP ([2026-11-22-auto-posting-plan.md](2026-11-22-auto-posting-plan.md)). Khi AP xong, 9 bài đầu của bước 2 được tạo thẳng thành bài nháp `kchat_posts` để duyệt và tự đăng lên Facebook.
- Quảng cáo Meta/TikTok.
- Tạo ảnh bằng AI.

## 8. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Chưa có Meta App, hoặc app chưa qua duyệt quyền nên chỉ nối được trang của người có vai trò trong app | BL-0 làm sớm. Bước 1–3 của wizard không phụ thuộc Meta App |
| Giới hạn ký tự hoặc giao diện tạo trang của nền tảng thay đổi | Gom vào `social_profile_specs.yml`. Hướng dẫn viết theo từng bước ngắn, dễ sửa |
| Facebook không cho đổi ảnh đại diện qua API | Ảnh đại diện luôn nằm trong bước hướng dẫn tải lên tay |
| Instagram chưa liên kết Fanpage nên không nối được | Bước bắt buộc trong hướng dẫn. Audit báo rõ nguyên nhân |
