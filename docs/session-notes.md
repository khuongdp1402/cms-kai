# 📋 CMS-KAI — Ghi chép Yêu cầu & Quyết định

> File này ghi lại các yêu cầu, phát hiện và quyết định kỹ thuật trong quá trình phát triển cms-kai.
> Cập nhật lần cuối: 2026-09-28

---

## ⚠️ Nguyên tắc bắt buộc

> **KHÔNG được chỉnh sửa source bên `DSF/dsf-chatwoot`.**
> Mọi thay đổi chỉ được thực hiện trên repo `cms-kai`.
> `dsf-chatwoot` chỉ được dùng để tham khảo, so sánh.

---

## 🗓️ 2026-09-28

### Kiểm tra tổng quan hệ thống

**Yêu cầu:** Kiểm tra các kênh có thể kết nối trong hệ thống.

**Kết quả:**
- Hệ thống hỗ trợ **16 kênh** tổng cộng.
- 8 kênh kết nối trực tiếp từ onboarding: Website, WhatsApp, Instagram, Facebook, TikTok, Telegram, LINE, Zalo Personal.
- 6 kênh cần setup thêm: Gmail, Outlook, SMS, API, Voice, Other Email.
- 2 kênh có model backend nhưng chưa trong onboarding UI: Twitter/X, Twilio SMS.

---

### Phân tích Zalo Personal

**Yêu cầu:** Kiểm tra chức năng Zalo cá nhân — hiện tại cần bổ sung gì, có dùng kênh nào hay custom riêng không.

**Kết quả:**
- Zalo Personal là **kênh custom hoàn toàn**, không dùng channel có sẵn.
- Kiến trúc 2 thành phần: Rails App + `zalo-personal-bridge` (Node.js/TypeScript).
- Thư viện cốt lõi: **`zca-js` v2.1.2** (unofficial reverse-engineered Zalo Web API).
- Tính năng đã có: QR login, nhận/gửi tin, nhóm, quote, mention, sticker, reaction, thu hồi, typing, sync contacts/history, multi-session, HMAC security.
- **Thiếu sót cần bổ sung:**
  1. Message recall từ bridge chưa emit event về Rails (chỉ log).
  2. Sticker catalog trống (hardcode `[]`).
  3. Kênh Zalo OA Official chưa có (chỉ có Personal).
  4. Video message chưa xử lý riêng, fallback về image.
  5. Group member join/leave chưa sync vào Chatwoot.

---

### So sánh cms-kai vs DSF/dsf-chatwoot

**Yêu cầu:** So sánh 2 dự án, kiểm tra có phần nào trỏ sang API bên DSF không.

**Kết quả:**
- `cms-kai` là **fork/clone từ `dsf-chatwoot`**, code logic giống nhau 100%.
- Chỉ có **6 điểm khác biệt nhỏ** (branding, domain, hostname trong comments).
- **Phát hiện:** `config/initializers/loki_logger.rb` hardcode label `app: 'dsf-chatwoot'` → log của cms-kai bị gắn nhầm tag DSF.
- **Không có** trỏ API HTTP sang endpoint DSF.
- DSF có thêm (cms-kai không có):
  - `zalo-oa-web-bridge/` — Bridge Zalo OA dùng Puppeteer (approach cũ, rủi ro)
  - `zalo-chatwoot-extension/` — Browser extension lấy cookie Zalo
  - Tài liệu: `AGENTS.md`, `Jenkinsfile`, `ZALO_PERSONAL_IMPLEMENTATION_PLAN.md`

---

### Fix đã thực hiện

| # | File | Thay đổi |
|---|------|----------|
| 1 | `config/initializers/loki_logger.rb` | Đổi label Loki `app: 'dsf-chatwoot'` → `app: 'cms-kai'` |

---

## 📌 Backlog / Việc cần làm

- [ ] Fix message recall: bridge emit `message.recalled` event về Rails.
- [ ] Bổ sung sticker catalog thực tế từ Zalo API.
- [ ] Xử lý video message riêng biệt (không fallback về image).
- [ ] Sync group member join/leave vào Chatwoot.
- [ ] Đánh giá tính khả thi Zalo OA Official API (chính thức).
- [ ] Thêm Jenkinsfile / CI pipeline cho cms-kai.
