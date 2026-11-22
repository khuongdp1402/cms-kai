# Kế hoạch "Kế hoạch PR bằng AI + tự đăng bài lên Fanpage" (Phase AP)

> Ngày lập: 2026-11-22 · Trạng thái: `proposed`, chờ chủ dự án duyệt · ADR-031
> Liên quan: [2026-11-22-brand-launch-plan.md](2026-11-22-brand-launch-plan.md) (Phase BL, ADR-030)

## 1. Phạm vi đã chốt với chủ dự án (2026-11-22)

- Chủ dự án/shop **tự tạo Fanpage** trên Facebook, rồi kết nối vào Kalo.
- **AI lên kế hoạch PR:** lịch nội dung, trụ cột nội dung, caption, hashtag, kịch bản video, danh sách ảnh cần chụp, theo hồ sơ thương hiệu và danh mục sản phẩm của shop.
- **Duyệt rồi tự đăng:** AI soạn nháp. Người duyệt từng bài hoặc duyệt cả tuần. Đến giờ hệ thống tự đăng lên Fanpage.
- **Ảnh và video:** shop tải ảnh, video thật lên. Hệ thống ghép chữ, logo, màu thương hiệu theo template. AI viết kịch bản và danh sách cảnh để shop tự quay. **Chưa** tích hợp AI tạo ảnh/video.
- **Đợt đầu chỉ Facebook Page.** Instagram và TikTok làm sau.

## 2. Hiện trạng (`main` @`44abcc5`)

| Có sẵn | Hạn chế |
|---|---|
| Lịch nội dung `BrandGrowth::EngineService` (`state['calendar']`, tối đa 100 mục): chỉ có `title`, `channel`, `status` (`draft/scheduled/published`), `scheduled_for` (chỉ ngày) | Không có nội dung bài, ảnh, giờ đăng, không đăng thật. Trạng thái `published` do người tự chọn |
| `Ai::CustomLlmService` (AgentGW `agentgw-gpt-5.5` / `agentgw-opus-4-8`, hoặc Gemini): `build_system_prompt` theo hồ sơ thương hiệu, `enforce_brand_guardrails` lọc từ cấm | Chỉ tạo chữ |
| Danh mục sản phẩm `Kchat::Product` (ADR-029: mô tả, ảnh, nhóm, `pitch_template`) | – |
| Kênh Facebook Page đã nối có `page_access_token`; bình luận về hộp tin (ADR-021) | Bản cài đặt chưa có Meta App (BL-0). Quyền hiện có chưa gồm `pages_manage_posts` |
| Cách khoá dòng + chuyển trạng thái an toàn của chiến dịch (ADR-025) | Mẫu để làm luồng đăng bài |

## 3. Thiết kế

### 3.1. Luồng
```
Hồ sơ thương hiệu + sản phẩm + mục tiêu
        │  (AI: Kế hoạch PR)
        ▼
Kế hoạch tháng/tuần ──► Bài nháp (caption, hashtag, định dạng, "ảnh/video cần có")
                                 │  shop tải ảnh/video, ghép template, sửa chữ
                                 ▼
                          Chờ duyệt ──(người duyệt)──► Đã lên lịch
                                                          │  đến giờ (Sidekiq)
                                                          ▼
                                                 Đang đăng ──► Đã đăng (link bài, chỉ số)
                                                          └──► Lỗi (lý do + thử lại)
```

### 3.2. Dữ liệu
Bài đăng cần ảnh/video (ActiveStorage), giờ đăng chính xác, trạng thái tin cậy cho job, mã bài trên Facebook. Jsonb trong `custom_attributes` không đủ, nên thêm bảng:

| Bảng | Cột chính |
|---|---|
| `kchat_content_plans` | `account_id`, `title`, `goal` (`awareness/sales/launch/retention`), `starts_on`, `ends_on`, `posts_per_week`, `pillars` (jsonb: tên, tỉ lệ, mô tả), `brief` (jsonb, AI soạn), `status` (`draft/active/archived`) |
| `kchat_posts` | `account_id`, `content_plan_id`, `inbox_id` (Fanpage đã nối), `pillar`, `format` (`text/photo/album/video`), `caption`, `hashtags`, `cta`, `media_brief` (AI ghi ảnh/video cần có), `product_ids`, `scheduled_at` (giờ VN), `status` (`draft → pending_approval → approved → publishing → published / failed`), `approved_by_id`, `approved_at`, `external_post_id`, `permalink`, `published_at`, `error_code`, `error_message`, `attempts`, `metrics` (jsonb), `ai_generated` |
| ActiveStorage trên `Kchat::Post` | `media` (nhiều file, đúng thứ tự), và ảnh đã ghép template |

- Lịch nội dung cũ (`state['calendar']`) được chuyển sang `kchat_posts` (trạng thái `draft`) bằng migration dữ liệu. Endpoint calendar cũ đọc/ghi qua bảng mới để giao diện cũ không hỏng.

### 3.3. Đăng lên Facebook (`Kchat::Publishing::FacebookPublisher`)
| Định dạng | Graph API |
|---|---|
| Chữ (+ link) | `POST /{page_id}/feed` (`message`, `link`) |
| 1 ảnh | `POST /{page_id}/photos` (`url` hoặc file, `caption`) |
| Nhiều ảnh | Tải từng ảnh `POST /{page_id}/photos` với `published=false` → `POST /{page_id}/feed` với `attached_media` |
| Video | `POST /{page_id}/videos` (file lớn dùng upload theo phiên) |

- Dùng `page_access_token` của kênh đã nối. Cần quyền **`pages_manage_posts`** và `pages_read_engagement` (thêm vào `facebookScopes.js`, kết nối lại Fanpage một lần).
- **Hẹn giờ do Kalo giữ** (Sidekiq), không dùng hẹn giờ của Facebook. Nhờ vậy bài còn sửa được, gỡ duyệt được, và chỉ có một đường đăng duy nhất.
  - Job `Kchat::Publishing::PublishPostJob` được đặt `wait_until: scheduled_at` khi duyệt.
  - Cron mỗi phút quét bài `approved` đã tới giờ để không sót khi Sidekiq khởi động lại.
- **Không đăng trùng:** job chỉ chạy khi giành được `approved → publishing` trong khoá dòng (như ADR-025). Đã có `external_post_id` thì không gọi lại.
- **Lỗi:**
  - Token hết hạn, thiếu quyền, ảnh/video không hợp lệ: chuyển `failed` với mã lỗi rõ, không thử lại tự động.
  - Lỗi mạng hoặc 5xx: thử lại tối đa 3 lần (backoff).
  - Gói cước hết hạn lúc đăng: `failed` với `subscription_expired`.
  - Mỗi lần lỗi gửi thông báo trong app cho quản trị viên shop.
- **Chỉ số sau đăng:** job lấy reactions, comments, shares sau 24 giờ và 72 giờ, lưu `metrics`, hiện trên lịch. AI dùng số liệu này khi lập kế hoạch kỳ sau. Bình luận vẫn về hộp tin qua ADR-021.

### 3.4. AI lập kế hoạch PR (`Kchat::Publishing::PlanGenerator`)
- **Đầu vào:** hồ sơ thương hiệu, sản phẩm chọn từ danh mục (tên, giá, mô tả, ảnh), mục tiêu, thời gian, số bài mỗi tuần, các ngày đặc biệt (lễ, sale), giờ đăng ưu tiên.
- **Đầu ra** (JSON có kiểm cấu trúc):
  - Brief: thông điệp chính, khách hàng mục tiêu, trụ cột nội dung kèm tỉ lệ (ví dụ 40% giá trị/kiến thức, 30% sản phẩm, 20% khách hàng thật/feedback, 10% khuyến mãi).
  - Danh sách bài: ngày giờ, trụ cột, định dạng, caption, hashtag, CTA, sản phẩm liên quan, **`media_brief`** ("ảnh: sản phẩm X trên nền gỗ, ánh sáng tự nhiên, 1:1" hoặc kịch bản video: cảnh 1–5, lời thoại, độ dài, chữ trên màn hình).
- Mọi caption qua `enforce_brand_guardrails`. Bài nào dính từ cấm thì chưa gửi duyệt được.
- **Giờ đăng mặc định:** 11:30 và 20:00 (giờ VN), shop đổi được. Khi đã có từ 20 bài trở lên với chỉ số, gợi ý khung giờ theo tương tác thật của Fanpage.
- Có nút "Viết lại", "Đổi giọng", "Ngắn hơn" cho từng bài. Dùng model `DEFAULT_REASONING_MODEL` cho lập kế hoạch, `DEFAULT_CHAT_MODEL` cho sửa từng bài.
- Áp `Kchat::Entitlements` và throttle AI như các endpoint `brand_growth`.

### 3.5. Ảnh theo template (trên trình duyệt, không cần dịch vụ ngoài)
- 5 template đầu: **Sản phẩm mới**, **Khuyến mãi** (giá cũ/giá mới), **Feedback khách**, **Câu nói/mẹo**, **Thông báo**.
- Ghép ảnh shop tải lên với khung màu thương hiệu, logo, tiêu đề, giá. Xuất PNG tỉ lệ 1:1 hoặc 4:5, lưu vào bài.
- Kiểm định dạng và dung lượng ảnh/video theo giới hạn của Facebook trước khi cho duyệt.

### 3.6. Giao diện (Marketing → Lịch đăng bài)
1. **Lập kế hoạch:** form mục tiêu, thời gian, sản phẩm, số bài/tuần → "AI lập kế hoạch" → xem brief và danh sách bài → "Tạo bài nháp".
2. **Lịch:** xem tháng/tuần, màu theo trạng thái, kéo thả đổi giờ (chỉ bài chưa đăng), lọc theo Fanpage.
3. **Soạn bài (drawer):** caption, hashtag, ảnh/video (tải lên, sắp thứ tự, ghép template), **xem trước kiểu bài Facebook**, khung "Ảnh/video cần có" từ AI, kịch bản video.
4. **Chờ duyệt:** danh sách bài chờ, duyệt từng bài hoặc "Duyệt cả tuần", từ chối kèm ghi chú.
5. **Kết quả:** link bài, chỉ số, bài lỗi có nút "Thử lại".

Quyền: nhân viên soạn và gửi duyệt; **quản trị viên shop duyệt**. Dùng `KaloPageShell`, modal 3 vùng (ADR-022), chữ `KALO_PUBLISHING.*` trong `i18n/ktech/vi.json`.

### 3.7. Cờ chức năng
Thêm cờ `kalo_auto_posting` vào **cuối** `config/features.yml` (ADR-023), mặc định **tắt**. Super Admin bật cho từng shop khi Fanpage đã nối với đủ quyền.

## 4. Task

| ID | Việc | Kiểm chứng |
|---|---|---|
| AP-0 | **(Chủ dự án)** Meta App (BL-0) có `pages_manage_posts`, `pages_read_engagement`. Tạo Fanpage thử, chủ dự án là admin của cả app và page | Nối được Fanpage, gọi thử Graph API đăng bài ẩn |
| AP-1 | Bảng `kchat_content_plans`, `kchat_posts` + ActiveStorage, máy trạng thái, policy (nhân viên soạn, admin duyệt), chuyển dữ liệu lịch cũ, API CRUD + `submit`/`approve`/`reject`/`approve_week` | Rspec model, request, chuyển trạng thái đồng thời |
| AP-2 | `FacebookPublisher` (chữ, 1 ảnh, nhiều ảnh, video), phân loại lỗi | Rspec với Graph giả lập (WebMock) |
| AP-3 | `PublishPostJob` + cron quét bài tới giờ, khoá chống trùng, thử lại, kiểm gói cước, thông báo lỗi | Rspec job: chạy 2 lần chỉ đăng 1 lần; Sidekiq khởi động lại không sót |
| AP-4 | `PlanGenerator` + sửa từng bài bằng AI, lọc từ cấm | Rspec với LLM giả lập; kiểm JSON hỏng → báo lỗi rõ |
| AP-5 | **(Đổi 2026-11-22: kết nối studio `mmo`, ADR-032.)** API `/kchat/studio/*` (yêu cầu sản xuất, nhận việc, giao media, báo lỗi, đẩy video mới thành nháp), định dạng `reel`; phía mmo `channels/kalo.py` + `omni kalo ...`. Template canvas chỉ làm nếu vẫn cần | Rspec (Kalo) + pytest (mmo) |
| AP-6 | UI: lập kế hoạch, lịch tháng/tuần, drawer soạn bài + xem trước, hàng chờ duyệt, kết quả | Vitest; kiểm tay 1280px/400px, sáng/tối |
| AP-7 | Lấy chỉ số sau 24h/72h, hiện trên lịch, đưa vào AI kỳ sau | Rspec |
| AP-8 | Cờ `kalo_auto_posting`, thêm quyền vào `facebookScopes.js`, QA cả bộ rspec + vitest, **thử thật trên Fanpage của chủ dự án** (chữ, ảnh, nhiều ảnh, video, hẹn giờ, lỗi token) | Ghi kết quả vào STATUS |

**Thứ tự đề xuất:** AP-0 song song. BL-1 (hồ sơ thương hiệu mở rộng, logo) → AP-1 → AP-2 → AP-3 → AP-4 → AP-5 → AP-6 → AP-7 → AP-8, rồi quay lại BL-2…BL-8. Bước 2 của wizard BL ("9 bài đầu") sẽ tạo thẳng `kchat_posts`.
**Ước lượng:** khoảng 3 tuần cho 1 người full-stack, chưa tính thời gian chờ Meta.

## 5. Về duyệt app của Meta
- Ở chế độ **Development**, app đăng được lên các Fanpage mà người kết nối là admin/tester của app. Fanpage do chủ dự án tự tạo đáp ứng được điều này, nên **bắt đầu dùng thật được mà chưa cần App Review**.
- Muốn shop khác tự nối Fanpage của họ thì phải qua **App Review** cho `pages_manage_posts` và `pages_read_engagement` (cần video demo luồng AP-6), cùng xác minh doanh nghiệp.

## 6. Ngoài phạm vi đợt này
AI tạo ảnh/video; đăng Instagram/TikTok; chạy quảng cáo, boost bài; đăng vào Group; đăng lại bài cũ tự động.

## 7. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Token Fanpage hết hạn hoặc bị thu hồi quyền → bài không đăng | Lỗi `failed` rõ lý do + thông báo; nút "Kết nối lại" |
| Đăng trùng khi job chạy lại | Chuyển trạng thái trong khoá dòng, kiểm `external_post_id` |
| AI viết sai thông tin sản phẩm/giá | Bắt buộc duyệt; caption lấy giá từ danh mục sản phẩm, không để AI tự bịa giá |
| Đăng quá dày bị Facebook hạn chế | Giới hạn số bài/ngày mỗi Fanpage (mặc định tối đa 5) |
| Video lớn upload chậm | Upload theo phiên, kiểm dung lượng trước, thử lại |
