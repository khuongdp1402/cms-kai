# 📊 Báo Cáo Tiến Độ & Trạng Thái Hệ Thống (30/09/2026)

> **Dự án:** KChat CMS (KTech Ecosystem)  
> **Nhánh phát triển:** `feat/zalo-personal-profile-logout`  
> **Định hướng kiến trúc:** ADR-007 (Bộ nhận diện thương hiệu KTech "Terracotta Sunset", Chatwoot Core + Microservice Zalo Personal Bridge)  
> **Ngày báo cáo:** 30/09/2026  

---

## 1. Tóm Tắt Tình Trạng Hiện Tại (Executive Summary)

Hệ thống **KChat CMS** đang hoạt động ổn định trên môi trường Docker cục bộ, kết nối trực tiếp với backend Rails và microservice `zalo_personal_bridge`. Toàn bộ giao diện đã được chuyển đổi nhận diện thương hiệu KTech (Terracotta Sunset), hỗ trợ tiếng Việt toàn diện và tích hợp thành công tài khoản Zalo cá nhân thực tế với đầy đủ tính năng hiển thị hồ sơ, đăng xuất và quét lại mã QR.

| Hạng mục | Trạng thái | Đánh giá |
| :--- | :---: | :--- |
| **Hạ tầng Docker Local** | 🟢 **Healthy** | 5 container (`rails`, `zalo_personal_bridge`, `postgres`, `redis`, `mailhog`) hoạt động bình thường; tốc độ phản hồi trang web < 1s. |
| **Việt hóa (Task B-03)** | 🟡 **Đang hoàn thiện** | Đã hoàn tất đợt 1 với hơn 316 chuỗi tiếng Việt (Onboarding, Settings, Campaigns, Automations, Hộp thư đến). |
| **Kênh Zalo Cá Nhân** | 🟢 **Hoàn tất** | Đã kết nối tài khoản Zalo thực tế; hiển thị Avatar, Tên, ID, Trạng thái; có chức năng Đăng xuất và Quét lại QR. |
| **TikTok Business Messaging** | 🟢 **Sẵn sàng** | Backend và UI đã hỗ trợ sẵn, chờ cấu hình API Keys (`TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`). |
| **TikTok Shop / Shopee** | ⚪ **Kế hoạch Phase 9** | Đã có API Client cơ bản cho Shopee, nằm trong lộ trình mở rộng sau khi hoàn thành các kênh chính. |

---

## 2. Chi Tiết Các Công Việc Đã Thực Hiện

### 2.1. Nâng cấp Kênh Zalo Cá Nhân (Zalo Personal Inbox)
1. **Hiển thị Tab "Cấu hình" (Configuration Tab):**
   - Trước đây, khi truy cập vào Hộp thư Zalo Personal trong phần Cài đặt, hệ thống chỉ hiển thị tab *Cài đặt* và *Cộng tác viên*, thiếu tab *Cấu hình*.
   - Đã cập nhật logic điều kiện hiển thị tab trong [`Settings.vue`](file:///E:/Project/CMS/cms-kai-ktech/app/javascript/dashboard/routes/dashboard/settings/inbox/Settings.vue) để kích hoạt tab Cấu hình cho kênh `Channel::ZaloPersonal`.
2. **Xem Profile Zalo Cá nhân chi tiết:**
   - Xây dựng Card hiển thị hồ sơ tài khoản Zalo liên kết tại [`ZaloPersonal.vue`](file:///E:/Project/CMS/cms-kai-ktech/app/javascript/dashboard/routes/dashboard/settings/inbox/channel-configuration/ZaloPersonal.vue):
     - **Ảnh đại diện thực tế:** Avatar Zalo chất lượng cao kèm chấm xanh trạng thái hoạt động trực tuyến.
     - **Tên hiển thị Zalo:** Hiển thị tên thực tế của tài khoản (ví dụ: *Đỗ Phú Khương*).
     - **Zalo User ID:** Mã định danh duy nhất của tài khoản trên Zalo (`2220104625721386681`).
     - **Huy hiệu trạng thái:** "Đang hoạt động" (xanh lá) / "Đã ngắt kết nối" (đỏ) / "Cần xác thực lại" (cam).
     - **Lần đồng bộ gần nhất:** Thời gian chi tiết của lần heartbeat/kết nối cuối cùng.
3. **Banner tóm tắt trên tab Cài đặt chính:**
   - Ngay đầu tab *Cài đặt* của hộp thư, bổ sung một banner hiển thị Avatar, Tên tài khoản và trạng thái, kèm liên kết trực tiếp `Xem hồ sơ & Đăng xuất →` giúp người dùng dễ dàng định vị tài khoản.
4. **Chức năng Đăng xuất tài khoản Zalo (Logout / Disconnect):**
   - Bổ sung nút **"Đăng xuất tài khoản Zalo"** màu đỏ.
   - Khi bấm, hiển thị **Hộp thoại xác nhận (Confirmation Modal)** để giải thích rõ ràng và tránh thao tác bấm nhầm.
   - Khi xác nhận, hệ thống gọi API `DELETE /api/v1/accounts/:account_id/inboxes/:inbox_id/zalo_personal/connection`:
     - Backend gọi `ZaloPersonal::Connections::DisconnectService`.
     - Microservice `zalo_personal_bridge` ngắt kết nối phiên làm việc với Zalo Web.
     - Cập nhật trạng thái kênh về `disconnected`.
5. **Chức năng Quét lại mã QR (Reconnect / Thay đổi tài khoản):**
   - Cung cấp nút **"Quét mã QR kết nối lại"**.
   - Mở cửa sổ Modal quét mã QR với bộ đếm ngược 120s, tự động làm mới mã QR và tự động kích hoạt phiên khi quét thành công trên ứng dụng Zalo điện thoại.
6. **Đa ngôn ngữ (i18n):**
   - Bổ sung nhóm nhãn `ZALO_PERSONAL_SETTINGS` cho cả tiếng Việt ([`vi/inboxMgmt.json`](file:///E:/Project/CMS/cms-kai-ktech/app/javascript/dashboard/i18n/locale/vi/inboxMgmt.json)) và tiếng Anh ([`en/inboxMgmt.json`](file:///E:/Project/CMS/cms-kai-ktech/app/javascript/dashboard/i18n/locale/en/inboxMgmt.json)), loại bỏ xung đột key cũ.

---

### 2.2. Kiểm tra Kiến trúc & Tính Độc lập của Hạ tầng Zalo
- **Cơ chế hoạt động:**
  - Kênh Zalo Cá nhân hoạt động qua dịch vụ **`zalo_personal_bridge`** (Node.js/Fastify/TypeScript, cổng 5001).
  - Sử dụng thư viện `zca-js` mô phỏng giao thức Zalo Web (`chat.zalo.me`), cho phép nhận và gửi tin nhắn 2 chiều.
- **Tính độc lập với DSF:**
  - Toàn bộ mã nguồn bridge nằm trong thư mục [`zalo-personal-bridge/`](file:///E:/Project/CMS/cms-kai-ktech/zalo-personal-bridge).
  - Dữ liệu lưu trữ độc lập trong cơ sở dữ liệu PostgreSQL (`chatwoot_dev`) và cache Redis nội bộ của KTech.
  - **Khẳng định 100%:** Không sử dụng chung hạ tầng, không gọi bất kỳ API, gateway hay máy chủ trung gian nào của DSF.
- **Không phải Browser Extension:**
  - Bridge chạy ngầm 24/7 dưới dạng Docker container trên server, máy tính nhân viên tắt thì hệ thống vẫn nhận tin nhắn bình thường.

---

### 2.3. Rà soát Kênh Shopee & TikTok
- **TikTok:**
  - **TikTok Direct Messages (Business Messaging):** Đã được tích hợp sẵn trong core KTech ([`Channel::Tiktok`](file:///E:/Project/CMS/cms-kai-ktech/app/models/channel/tiktok.rb)). Chỉ cần điền `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` vào file cấu hình `.env` để kích hoạt giao diện kết nối qua OAuth.
  - **TikTok Shop:** Quản lý đơn hàng và tin nhắn sàn TikTok Shop chưa tích hợp (thuộc Phase 9).
- **Shopee:**
  - Hiện mới chỉ có SDK API Client cơ sở ([`lib/integrations/shopee/client.rb`](file:///E:/Project/CMS/cms-kai-ktech/lib/integrations/shopee/client.rb)), chưa có Channel model, webhook và UI cài đặt. Kênh Shopee được xếp vào lộ trình mở rộng sau (Phase 9).

---

### 2.4. Tối ưu Môi trường Vận hành & Build Giao diện
- Tối ưu hóa file [`docker-compose.yaml`](file:///E:/Project/CMS/cms-kai-ktech/docker-compose.yaml): cấu hình `VITE_RUBY_HOST` trỏ mặc định về `localhost`, triệt tiêu độ trễ tra cứu DNS 5 giây khi không bật dev server, giúp trang tải mượt mà.
- Đóng gói toàn bộ bundle Vite mới nhất (`4,844 modules transformed` thành công trong 3m 46s) và khởi động lại Rails container để nạp manifest mới.
- Kiểm thử tự động E2E bằng Browser Agent: Đã kiểm chứng giao diện đăng nhập, danh bạ và trang cấu hình Zalo Personal hiển thị đúng ảnh đại diện, tên người dùng và các nút thao tác.

---

## 3. Trạng Thái Các Dịch Vụ (Service Health Status)

```
CONTAINER ID   IMAGE                           COMMAND                  STATUS         PORTS
cms-kai-rails-1                chatwoot-rails:development      "docker-entrypoint.s…"   Up (healthy)   0.0.0.0:3000->3000/tcp
cms-kai-zalo_personal_bridge-1 zalo-personal-bridge:local      "docker-entrypoint.s…"   Up (healthy)   0.0.0.0:5001->5001/tcp
cms-kai-postgres-1             pgvector/pgvector:pg16          "docker-entrypoint.s…"   Up (healthy)   0.0.0.0:5432->5432/tcp
cms-kai-redis-1                redis:7.0-alpine                "docker-entrypoint.s…"   Up (healthy)   0.0.0.0:6379->6379/tcp
cms-kai-mailhog-1              mailhog/mailhog:latest          "MailHog"                Up             0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

---

## 4. Kế Hoạch Tiếp Theo (Next Steps)

1. **Gộp nhánh (Merge PR):** Tạo và merge Pull Request từ `feat/zalo-personal-profile-logout` vào nhánh `develop`.
2. **Tiếp tục Task B-03:** Hoàn tất bản dịch tiếng Việt cho các module còn lại (Trung tâm trợ giúp / Help Center, Báo cáo & Thống kê / Reports).
3. **Mở rộng Zalo Personal (nếu cần):**
   - Bổ sung thông báo khi tin nhắn Zalo bị thu hồi (Recall message).
   - Tối ưu hóa hiển thị video message và sticker Zalo.
4. **Chuẩn bị tích hợp Zalo OA Official (Phase 9):** Nghiên cứu tích hợp kênh Zalo OA chính thức qua Zalo Developers OpenAPI v3.
