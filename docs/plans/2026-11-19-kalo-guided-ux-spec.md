# Kalo: khung giao diện thống nhất, hướng dẫn người mới và tập trung giá trị cốt lõi

> Trạng thái: **chờ chủ dự án duyệt**. Chưa sửa code.
> Ngày: 2026-11-19. Bổ sung cho bản v3 (`2026-11-19-kalo-ui-v3-master-design.md`). Chỗ nào hai bản khác nhau thì bản này thắng.
> Đã chốt với chủ dự án (2026-11-19):
> - Super Admin là công cụ của chủ nền tảng. Console là khu khách tự quản lý cửa hàng và nhóm của mình.
> - Chức năng khó hoặc ít dùng thì ẩn mặc định, chủ nền tảng bật lại cho từng shop ở Super Admin. Không xóa code.
> - Trước khi làm, nền đang có (v3 UI, bình luận, broadcast, lịch nội dung, UTM) phải được rà soát và commit thành một mốc.

## 1. Mục tiêu và cách đo

Một chủ shop nhỏ, không rành kỹ thuật, trong 15 phút đầu phải tự làm được 4 việc mà không cần ai giúp:

1. Nối được một kênh bán hàng.
2. Trả lời một khách.
3. Tạo đơn và gửi mã QR.
4. Lên được một chiến dịch đầu tiên.

Cách đo: một agent đóng vai khách mới, chạy trên trình duyệt thật ở 1280px và 400px.

- Thời gian đầu: điểm dễ dùng hiện là 6/10. Mục tiêu là ≥ 8/10.
- Không bước nào bị kẹt.
- Không còn chữ tiếng Anh.
- Không còn dữ liệu giả.

## 2. Khung giao diện chung (mọi màn hình)

Mọi màn hình chỉ được dùng một khung. Không tự chia bố cục riêng.

```
┌──────────┬──────────────────────────────────────────────────────┐
│ Sidebar  │ Header trang: [Tiêu đề + mô tả 1 dòng]   [Nút chính] │
│          ├───────────┬──────────────────────────┬───────────────┤
│          │ Trái      │ Giữa (nội dung chính)    │ Phải          │
│          │ (lọc,     │ các card trên nền canvas │ (chi tiết,    │
│          │ danh sách)│                          │ hướng dẫn)    │
└──────────┴───────────┴──────────────────────────┴───────────────┘
              Popup tạo/sửa/xem chi tiết = Drawer trượt từ phải
```

**Component dùng chung, đặt ở `components-next/layout/`:**

| Component | Vai trò |
|---|---|
| `KaloAppShell` | Gồm Sidebar và vùng Main. |
| `KaloPage` | Gồm header trang và ba slot `left`, `main`, `right`. Cột trái và cột phải là tùy chọn. Trên mobile, cột trái và phải chuyển thành drawer. |
| `KaloPageHeader` | Tiêu đề ở trái, một dòng mô tả. Mọi nút hành động gom về một cụm bên phải, tối đa một nút chính. |
| `KaloCard` | Nhóm thông tin. Gồm tiêu đề card, nội dung, chân card tùy chọn. |
| `KaloDrawer` | Là popup chuẩn: header dính, thân cuộn, chân có nút. Rộng 460px trên desktop, toàn màn hình trên mobile. |

Chỉ dùng hộp thoại ở giữa màn hình cho việc xác nhận xóa.

**Nền:** canvas ấm, card trắng có viền, theo token của bản v3 chương 2.

**Sidebar:**
- **Nút thu gọn/mở rộng** nằm ở chỗ giao giữa header và sidebar, tức góc trên bên phải của sidebar, ngang hàng header. Phím tắt `⌘\`. Trạng thái lưu theo người dùng.
- **Khi thu gọn:** chỉ còn icon, không có chữ. Hover hoặc focus vào icon thì hiện tooltip tên chức năng.
- **Menu con:** khi thu gọn thì không hiện. Bấm vào mục có menu con thì sidebar mở rộng ra và hiện menu con. Khi mở rộng, menu con xổ ngay dưới mục cha.
- **Mobile:** giữ thanh tab dưới. Mục "Thêm" mở dạng drawer có nền mờ và nút đóng.

Chuyển dần từng màn sang khung này. Màn nào đã chuyển phải qua spec và kiểm tra trình duyệt mới được tính xong.

## 3. Hướng dẫn người mới (onboarding)

1. **Danh sách thiết lập.** Có ở card đầu trang Tổng quan và một huy hiệu trên sidebar, hiện cả trên mobile. Có năm bước:
   - Nối kênh.
   - Thêm sản phẩm.
   - Cài nhận tiền.
   - Tạo đơn và gửi QR.
   - Mời nhân viên.

   Mỗi bước tự đánh dấu xong dựa trên dữ liệu thật. Có nút "Bỏ qua" và "Ẩn".
2. **Tour khoanh vùng theo từng chức năng.** Lần đầu vào một chức năng (Tin nhắn, Đơn hàng, POS, Marketing, Chiến dịch), màn hình tối đi, chỉ vùng cần làm sáng lên, kèm thẻ "Bước 1/4", và các nút Tiếp, Quay lại, Bỏ qua.
   - Tour đã xem thì lưu theo người dùng. Có thể xem lại ở menu "Hướng dẫn".
   - Dùng thư viện `driver.js` (nhẹ, MIT). Nội dung các bước viết bằng i18n.
   - Mỗi bước gắn với một `data-tour="..."` trên giao diện để tour không vỡ khi đổi CSS.
3. **Trang trống.** Mọi trang trống có một câu tiếng Việt và một nút hành động. Không dùng ảnh hay dữ liệu giả.
4. **Banner dùng thử.** "Còn X ngày dùng thử · Xem gói" hiện trên sidebar và thanh tab. API luôn trả trạng thái dùng thử, kể cả khi chưa cấu hình ngân hàng.

## 4. Sắp xếp chức năng quanh giá trị cốt lõi

**Sidebar của shop (mặc định):**

| Nhóm | Mục | Có backend chưa |
|---|---|---|
| Vận hành | Tổng quan | có |
| | Tin nhắn đa kênh (Zalo cá nhân, Facebook/Instagram, website) | có. Facebook/Instagram cần app Meta đã duyệt |
| | Bình luận (ẩn bình luận xấu, trả lời riêng) | có trong nền chưa commit, cần rà |
| | Khách hàng (phân nhóm) | có |
| | Đơn hàng, POS | có |
| Tăng trưởng | Chiến dịch (luồng A–Z, xem mục 5) | có một phần |
| | Thương hiệu (hồ sơ thương hiệu, lịch nội dung, ý tưởng bằng AI) | có trong nền chưa commit, cần rà |
| | Báo cáo | có |
| Chân sidebar | Trợ lý AI, Cài đặt, Thông báo, Hồ sơ | |

**Ẩn mặc định, Super Admin bật lại cho từng shop:**
- Thao tác cho người rành: automation, macro, thuộc tính tùy chỉnh, bot, webhook, ứng dụng dashboard.
- Chức năng chuyên sâu: Help Center, báo cáo chi tiết kiểu Chatwoot (nhân viên, nhãn, nhóm, CSAT, SLA), Zalo OA bằng token, kênh SMS/Email/API/Telegram/Line/WhatsApp.
- Chức năng chưa có backend như Captain, SLA, custom roles: ẩn hẳn, giống hiện nay.

**Không làm ở đợt này, vì cần backend hoặc đối tác chưa có:**
- **Hỗ trợ SEO.** Chỉ làm phần AI gợi ý tiêu đề, mô tả và từ khóa cho bài viết hoặc sản phẩm trong mục Thương hiệu. Không làm công cụ đo thứ hạng.
- **Chạy quảng cáo qua Ads API, đăng bài tự động lên mạng xã hội, ZNS/SMS Brandname.** Ghi vào ROADMAP và cần quyết định riêng.

## 5. Chiến dịch theo từng bước (A–Z)

Một wizard dạng drawer hoặc trang có 6 bước, trên cùng là thanh tiến độ:

1. **Mục tiêu:** bán hàng, chăm sóc khách cũ, ra mắt sản phẩm.
2. **Khách nhận:** chọn nhóm khách đã phân, hiện số người.
3. **Nội dung:**
   - Nếu có AI thì AI viết theo hồ sơ thương hiệu, có xem trước.
   - Kiểm tra từ cấm theo `hard_bans` đã có.
4. **Kênh và lịch gửi:** Zalo cá nhân có giới hạn tốc độ, Facebook/Instagram theo điều kiện của Meta. Gửi ngay hoặc hẹn giờ.
5. **Xem lại và gửi.**
6. **Kết quả:** đã gửi, đã xem nếu kênh có, trả lời, đơn phát sinh theo UTM.

Tận dụng `Kchat::BroadcastsService` và attribution trong nền chưa commit.

Bước nào kênh không hỗ trợ thì ghi rõ. Ví dụ: Zalo không có trạng thái "đã xem", nên không hiện số liệu giả (LESSONS B12).

## 6. Trợ lý AI

Một nút "Trợ lý AI" ở chân sidebar, mở drawer chat. Trợ lý làm ba việc:
- Hỏi cách dùng Kalo, trả lời theo tài liệu hướng dẫn nội bộ đặt trong prompt.
- Viết nội dung: bài đăng, tin nhắn chiến dịch, mô tả sản phẩm, gợi ý SEO.
- Tóm tắt số liệu tuần, lấy từ API báo cáo có sẵn.

Dùng `Ai::CustomLlmService` và giới hạn `Kchat::AiThrottle` hiện có. Không có khóa AI thì nút tự ẩn. Hết hạn dùng thử thì báo 403 như các chức năng AI khác.

## 7. Phân quyền: Super Admin và Console

| | Super Admin (chủ nền tảng) | Console (chủ shop) |
|---|---|---|
| Đường dẫn | `/super_admin` (Rails) và các trang nền tảng chuyển từ `/app/console/{overview,shops,payments,emails}` | `/app/accounts/:id/console` |
| Nội dung | Mọi shop, gói và hạn, giao dịch Casso, bật/tắt chức năng theo shop, cấu hình AI, hộp mail kiểm tra | Thông tin cửa hàng, nhân viên và nhóm (gồm "thêm vào kênh"), gói và hạn dùng thử, nhận tiền, kênh đã nối |
| Ai thấy | `SuperAdmin` | Quản trị viên của shop. Nhân viên chỉ thấy hồ sơ của mình |

**Chuyển đổi:**
- Trang `/app/console/*` hiện tại (chỉ dành cho SuperAdmin) chuyển vào Super Admin. Có thể giữ trong app Vue nhưng đổi tên thành "Nền tảng", và chỉ hiện với SuperAdmin.
- Các phần cửa hàng trong "Cài đặt" của shop gom thành Console.
- **Bật/tắt chức năng theo shop:** dùng cờ `feature_flags` sẵn có của Chatwoot (`Account#enable_features`), thêm các cờ `kalo_*`. Super Admin sửa ở trang tài khoản. Frontend ẩn mục theo cờ.

## 8. Thứ tự làm (mỗi bước là một đợt có review và kiểm tra trình duyệt)

0. **Mốc nền.** Rà soát, chạy cả bộ test, commit 109 file đang dở (đang chạy).
1. **Khung chung.** `KaloAppShell`, `KaloPage`, `KaloDrawer`, sidebar mới (tooltip, menu con, nút ở chỗ giao). Chuyển trước các màn Tổng quan, Đơn hàng, Khách, Cài đặt.
2. **Phân quyền và cờ chức năng.** Tách Super Admin và Console, ẩn mặc định các chức năng nâng cao, Super Admin bật/tắt theo shop.
3. **Hướng dẫn.** Danh sách thiết lập, tour khoanh vùng, trang trống, banner dùng thử. Kèm các sửa nhỏ từ đợt QA người dùng mới ngày 2026-11-19.
4. **Chiến dịch A–Z.**
5. **Trợ lý AI.**
6. **Chuyển các màn còn lại sang khung.** Chạy lại QA người dùng mới cho tới khi đạt ≥ 8/10.

## 9. Rủi ro

- Đổi khung bao quanh khu chat có thể làm mất phím tắt hoặc DOM mà spec chụp lại hành vi đang giữ. Bảng kiểm `chat-parity-*` vẫn áp dụng.
- Tour phụ thuộc giao diện. Gắn `data-tour` và có spec kiểm tra mỗi bước tìm thấy phần tử cần khoanh.
- Phần chưa commit có thể còn lỗi. Bước 0 phải xong trước.
