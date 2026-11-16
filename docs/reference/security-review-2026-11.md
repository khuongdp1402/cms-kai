# Rà soát bảo mật Kalo launch (2026-11-17)

Phạm vi: diff `7a88e29..db70ea6` của `feat/kalo-launch` và code liên quan; chỉ đọc, không chạy app. Bản đầy đủ có các bước khai thác nằm ở `.superpowers/sdd/2026-11-16-kalo-launch/security-review.md` (không commit); đây là bản rút gọn. Sửa trong nhánh `feat/kalo-sec-fix` (2 vòng review, 369 spec đạt ở vòng cuối), gộp ở `68170d1`.

**Tổng:** Critical 0, High 0, Medium 4, Low 9, Info 8. Không có lỗ hổng vượt tenant hay bypass xác thực khai thác từ xa.

| ID | Mức | Trạng thái | Nội dung |
|---|---|---|---|
| M-1 | Medium | fixed | Bypass throttle AI theo account (số 0 đứng đầu, `1%2E5`…) và prompt không giới hạn. Nay đếm trong controller theo `Current.account.id`, giới hạn message ≤ 2.000, topic ≤ 300, history 6 × 2.000 ký tự, prompt tổng ≤ 20.000. Chưa có hạn mức theo user và chưa trừ `ai_tokens_balance` |
| M-2 | Medium | fixed | `.env.production` không bị gitignore; đã thêm `.env.production*`, `.env.staging*`, `backups/`, `*.sql.gz` |
| M-3 | Medium | fixed | Backup DB/storage 0644 và không mã hóa; nay `umask 077`, thư mục 0700, file 0600, hướng dẫn mã hóa `age`/`gpg` trong `deploy.md` |
| M-4 | Medium | fixed | Payload Casso `data: {…}` (v2) bị bỏ qua nhưng trả 200; nay nhận mọi dạng hợp lệ, dạng sai trả 400 |
| L-1 | Low | fixed (phần của Kalo) | Lost update `custom_attributes` ở `PaymentSettings`; nay `with_lock`. Còn trong upstream `AccountsController#update` (ngoài phạm vi) |
| L-2 | Low | fixed (fail closed) | `tenant_slug` trùng → không ai được cộng tiền, ghi `unmatched`. Chưa có unique index; chưa có chỗ đặt slug có kiểm tra |
| L-3 | Low | deferred | Hết hạn vẫn gọi được `send_qr`, `qr`, `transition`, sửa sản phẩm. Hoãn: thiết kế "hết hạn chỉ chặn tạo" (ADR-019) |
| L-4 | Low | deferred | Đơn hàng không lọc theo inbox của agent, mọi agent trong account thấy mọi đơn. Hoãn: không vượt tenant, xem lại nếu cần cô lập theo nhóm |
| L-5 | Low | fixed (một phần) | Throttle `casso_webhook/ip` 120/phút, Nginx xóa `Forwarded`, key theo `remote_ip`. Còn: HMAC v2 + timestamp, allowlist IP Casso (replay chỉ chặn bằng `tid` duy nhất) |
| L-6 | Low | fixed | `extend_days` chặn 1..365; ép kiểu `timestamptz` chỉ trong `CASE` với regex ISO 8601 chặt, giá trị hỏng không làm 500 |
| L-7 | Low | deferred | Khách spam tin làm cạn quota AI của shop. Hoãn: đã có giới hạn 30/phút/account (M-1); debounce gợi ý và hạn mức theo user để sau |
| L-8 | Low | fixed | Push relay qua Chatwoot hub bật mặc định; nay `ENABLE_PUSH_RELAY_SERVER=false` trong compose và `.env.production.example` |
| L-9 | Low | deferred | Bridge Zalo dùng chung Postgres superuser với Rails. Hoãn: hạ tầng, cần tạo role riêng (ghi ở backlog) |
| I-1 | Info | open | Phân trang offset không chặn trên → 500 với `page` rất lớn |
| I-2 | Info | open | Nginx: thiếu `server_tokens off`, HSTS `includeSubDomains`, header frame cho apex; `landing-page/test/` bị phục vụ công khai (vô hại) |
| I-3 | Info | accepted | ActionCable chấp nhận mọi Origin (upstream); xác thực bằng `pubsub_token`, không khai thác được |
| I-4 | Info | open | Image Docker chứa `.superpowers/`, `docs/`, `.claude/` (không có secret) |
| I-5 | Info | accepted | Logic thanh toán: trả gấp đôi vẫn +30 ngày; trả gói thấp hơn hạ gói; `underpaid` cộng dồn không tự áp dụng; `TOKEN` nạp nhưng chưa trừ |
| I-6 | Info | accepted | `mark_paid` tay cho đơn `transfer_qr` không phải xác minh ngân hàng |
| I-7 | Info | accepted | `content_attributes.kchat_order_id` do agent đặt được; đơn vẫn lấy theo account nên không lộ chéo tenant |
| I-8 | Info | open | Khi bật signup có thể tạo nhiều account để lấy trial 14 ngày lặp lại; cần giới hạn trước khi mở signup công khai |

Phát hiện thêm trong vòng review sửa lỗi (đã xử lý): throttle ngoài chạy trước xác thực có thể khóa AI của người khác (đã bỏ), `req.ip` tin header `Forwarded` (nginx xóa, dùng `remote_ip`), phân tích `valid_until` hỏng gây 500 và Casso retry vô hạn (đã bắt lỗi, regex chặt).

Đã kiểm "Verified OK": Casso fail-closed + `secure_compare`, idempotency theo `tid`, `simulate` chỉ ở development, Console chỉ SuperAdmin, cô lập tenant ở mọi truy vấn orders/products/contacts, ảnh sản phẩm whitelist + 5 MB không fetch URL, QR sinh cục bộ, reports không nội suy chuỗi, CORS mặc định đóng, chỉ Nginx mở cổng, không `v-html` ở component Kalo mới, không secret trong bundle/lịch sử git.
