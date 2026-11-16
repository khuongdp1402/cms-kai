# Báo cáo QA Kalo launch (2026-11-17)

Nhánh tích hợp `feat/kalo-launch`. Nguồn: sổ theo dõi SDD (`.superpowers/sdd/2026-11-16-kalo-launch/`, không commit) và báo cáo từng task. Số liệu được copy từ báo cáo gốc, không chạy lại trong task tài liệu (ngoài test landing).

## 1. Quy trình và số lượng

- 14 task kế hoạch (T0–T13) + `i18n-fix` + `sec-fix`; chạy theo đợt song song, mỗi task một worktree `feat/kalo-<task>`, gộp `--no-ff`.
- Mỗi task T1–T11 có reviewer độc lập (T3, T4 và rà soát bảo mật dùng model mạnh); tổng cộng **18 vòng sửa** theo review (T1: 1, T2: 1, T3: 1, T4: 2, T5: 1, T6: 1, T7: 3, T8: 1, T9: 1, T10: 2, T11: 2, sec-fix: review ban đầu + 2 vòng sửa, review lại vòng 2 approved). Mọi task kết thúc ở trạng thái "review clean" trước khi gộp.
- Phát hiện lớn do review: memo thanh toán gói không khớp với webhook (T4, Critical, đã sửa), mất tính năng cũ khi thay thanh bên (T7: tạo account, phím tắt, mở danh sách theo inbox/nhãn/nhóm; đã khôi phục), ghép slug tham lam có thể cộng tiền nhầm tenant (T4, đã sửa).
- `account.limits` của Chatwoot không có tác dụng → không áp dụng giới hạn gói, landing và tài liệu không quảng bá (ADR-018/019).

## 2. Kết quả kiểm thử (12A)

> **Lưu ý:** 12A chạy trên `1b184d5`, **trước khi gộp sec-fix (`68170d1`)**; sau đó chỉ chạy 369 spec liên quan. Cả bộ rspec/vitest sẽ chạy lại ở HEAD cuối và số liệu dưới đây được cập nhật (controller).

| Bộ | Kết quả |
|---|---|
| rspec (`script/ktech/rspec.sh qa spec`, loại `spec/enterprise`, timeout 150 s/ca) | **6245 ví dụ, 74 lỗi, 66 pending**; 74 lỗi đều có sẵn từ upstream (xem mục 4), do Kalo gây ra: 0 |
| vitest (`script/ktech/vitest.sh --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=3`) | **426 file, 4095 test, 0 lỗi**, 170 s |
| rubocop (55 file `.rb` trong diff) | không vi phạm |
| eslint/prettier | chỉ có lỗi prettier ở 9 file; đã `prettier --write` các file do Kalo tạo (commit `7ad9725`); còn 3 file upstream sẵn lỗi prettier ở base |
| Kiểm tĩnh | 238 khóa `KALO_` dùng trong code đều có trong `vi.json`, 0 khóa thừa; 9 route `kalo_*` và mọi `router.push` tồn tại; `rails routes -g kchat`/`console` đúng hợp đồng; `zeitwerk:check` ổn; `db:migrate:status` không còn down |
| Landing (`node --test landing-page/test/landing.test.mjs`) | 7/7 đạt sau task 13 |
| Sec-fix (vòng cuối, sau 12A) | 369 spec liên quan đạt (Casso, kchat, request v1, model, config, AI); rubocop sạch; review vòng 2: approved. Low ghi nhận: parse ISO của Ruby lỏng hơn SQL guard ở 6 trường hợp biên (không làm shop trả phí bị coi là hết hạn), `AiThrottle` nhớ store production |

Lỗi nhìn thấy trong QA và đã sửa: `overrides.spec.js` hỏng 468 ca khi gộp (LESSONS B16, `i18n-fix`, commit `04fdf8a`); KPI Console "Shop đang trả phí" đếm cả shop hết hạn/bị khóa (`shops_by_plan`, commit `1b184d5`, sửa test-first).

## 3. Rà soát bảo mật

Chi tiết: [reference/security-review-2026-11.md](../reference/security-review-2026-11.md). Critical 0, High 0, **Medium 4** (M-1 bypass throttle AI, M-2 `.env.production` không gitignore, M-3 backup đọc được/không mã hóa, M-4 payload Casso object bị bỏ qua), **Low 9**, **Info 8**.

- Đã sửa (có spec hồi quy): M-1..M-4, L-1, L-2 (fail closed), L-5 (throttle, Nginx `Forwarded`), L-6, L-8.
- Hoãn có chủ ý (copy từ ledger, Ruling 20):
  - **L-3** hết hạn vẫn gọi `send_qr`/`transition`/sửa sản phẩm: đúng thiết kế "hết hạn chỉ chặn tạo".
  - **L-4** đơn hàng không lọc theo inbox của agent: không vượt tenant; xem lại nếu cần cô lập theo nhóm.
  - **L-7** khách có thể làm cạn quota AI: đã có giới hạn theo account sau M-1; debounce và hạn mức theo user để sau.
  - **L-9** bridge dùng Postgres superuser chung với Rails: hạ tầng, cần role riêng; ghi vào backlog.
- Còn lại từ vòng sửa: HMAC/IP allowlist cho webhook Casso, unique index `tenant_slug`, lost update trong upstream `AccountsController#update`, `ai_tokens_balance` chưa bị trừ.
- Info còn mở: I-1 phân trang không chặn, I-2 hardening Nginx, I-4 image chứa `docs/`, I-8 lạm dụng trial khi mở signup.

## 4. Lỗi có sẵn từ upstream (74 spec rspec)

Chạy lại 30 file hỏng trên base `7a88e29` (worktree riêng): 73 lỗi giống hệt; lỗi thứ 74 (`spec/builders/agent_builder_spec.rb:47`) phụ thuộc thứ tự chạy, hỏng cả ở base. Nguyên nhân chính:

- **52 ca** trả HTTP 500 ở controller render layout: "Vite Ruby can't find entrypoints/v3app.js" (container không có bản dựng Vite test, `public/vite-test`).
- `upload_controller` ×8 (500 thay vì 422), `slack_uploads` ×4 (redirect không an toàn), `safe_fetch` ×4, `avatar_from_url_job` ×1 (ECONNREFUSED), `chatwoot_hub_spec` ×5 (gọi `hub.2.chatwoot.com`).
- Lẻ: `inboxes_controller:404`, `widget_tests_url`, `account_spec:118` (cột feature flag), `zalo_personal_spec:23`, `show_service_spec:39` (bridge/WebMock), `agent_builder_spec:47` (flake).
- `spec/enterprise`: 139 lỗi nạp file vì code enterprise đã bỏ; loại khỏi lần chạy. `widgets_controller_spec` treo ở base (cần timeout từng ca).
- Chưa triage; nằm trong backlog "Sau launch".

## 5. Chưa kiểm chứng trên trình duyệt thật (từ báo cáo task)

Toàn bộ test frontend dùng jsdom và API giả; chưa chạy với backend thật trước 12B. Các điểm cụ thể:

- Khung app (T7): vị trí popover bộ lọc inbox/nhãn/nhóm và `ComposeConversation` lồng nhau, chevron có thể đè huy hiệu chưa đọc, sheet "Thêm" trên mobile (xếp lớp, Copilot), phím tắt thật, `DropdownContainer` mở thật (spec dùng mock), đăng xuất. Chưa mang sang: số chưa đọc từng mục và tùy chọn sắp xếp của thanh bên cũ.
- Khung chat (T9): điền composer từ gợi ý AI, `OrderForm` teleport, thẻ đơn trong `Message.vue`, bố cục panel liên hệ, gợi ý AI chỉ 1 chip (API trả 1 câu).
- Đơn hàng/POS (T8): nhánh lỗi JSON của blob QR, focus trap/khôi phục focus ở ngăn chi tiết, bố cục các phần tử mới. Chưa có số đếm theo tab.
- Console (T11): redirect `/app/console`, `getCurrentUser.type === SuperAdmin` với người dùng thật, logout.
- Báo cáo/Marketing/Gói cước (T10): chạy với API giả; xác minh khóa kênh snake_case so với backend thật chỉ qua đọc code.
- Hạ tầng (T6): healthcheck Rails/Sidekiq/bridge, `rails-prod.sh`, certbot, `docker compose up` đầy đủ, job CI build chưa chạy thật.
- Toàn vẹn giao diện ở 400 px và độ tương phản thật của màn hình mới.

## 6. 12B — kiểm tra khói và trình duyệt thật: đang chạy, sẽ bổ sung

> Controller điền kết quả (smoke script trên stack thật, ảnh chụp desktop và 400 px) vào mục này khi `task-12b-report.md` có.

## 7. Kết luận

Tại thời điểm 12A (trước sec-fix) không có lỗi do Kalo gây ra trong rspec/vitest/rubocop; rà soát bảo mật đã xử lý mọi Medium, các bản sửa được kiểm bằng 369 spec liên quan (review vòng 2: approved) nhưng cả bộ chưa chạy lại sau khi gộp. Chưa đủ điều kiện mở bán cho tới khi: 12B không còn mục hỏng, chủ dự án cung cấp tên miền, máy chủ, Casso, SMTP (AI tùy chọn), kiểm staging mục "Chưa kiểm thử runtime", thử một giao dịch Casso thật nhỏ. Xem [go-live-checklist.md](../reference/go-live-checklist.md).
