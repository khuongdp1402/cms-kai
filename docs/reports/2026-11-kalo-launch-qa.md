# Báo cáo QA Kalo launch (2026-11-17)

Nhánh tích hợp `feat/kalo-launch`. Nguồn: sổ theo dõi SDD (`.superpowers/sdd/2026-11-16-kalo-launch/`, không commit) và báo cáo từng task. Số liệu kiểm thử ở mục 2 và 4 là của **lần chạy cổng cuối (2026-11-17)** trên `feat/kalo-launch` @`361a46f` + commit sửa `e42683a` (xem mục 2). Mục 3, 5, 6 lấy từ báo cáo task gốc.

## 1. Quy trình và số lượng

- 14 task kế hoạch (T0–T13) + `i18n-fix` + `sec-fix`; chạy theo đợt song song, mỗi task một worktree `feat/kalo-<task>`, gộp `--no-ff`.
- Mỗi task T1–T11 có reviewer độc lập (T3, T4 và rà soát bảo mật dùng model mạnh); tổng cộng **18 vòng sửa** theo review (T1: 1, T2: 1, T3: 1, T4: 2, T5: 1, T6: 1, T7: 3, T8: 1, T9: 1, T10: 2, T11: 2, sec-fix: review ban đầu + 2 vòng sửa, review lại vòng 2 approved). Mọi task kết thúc ở trạng thái "review clean" trước khi gộp.
- Phát hiện lớn do review: memo thanh toán gói không khớp với webhook (T4, Critical, đã sửa), mất tính năng cũ khi thay thanh bên (T7: tạo account, phím tắt, mở danh sách theo inbox/nhãn/nhóm; đã khôi phục), ghép slug tham lam có thể cộng tiền nhầm tenant (T4, đã sửa).
- `account.limits` của Chatwoot không có tác dụng → không áp dụng giới hạn gói, landing và tài liệu không quảng bá (ADR-018/019).

## 2. Kết quả kiểm thử (cổng cuối, 2026-11-17)

Chạy toàn bộ ở `feat/kalo-launch` @`361a46f` (đã gồm sec-fix, smoke và blockers) cộng commit `e42683a` (sửa wrapper rspec, xem dưới). Mỗi số dưới đây là của lần chạy này, không phải số cũ của 12A.

| Bộ | Kết quả |
|---|---|
| rspec (`script/ktech/rspec.sh final spec`, loại `spec/enterprise`, timeout 150 s/ca bằng helper tạm không commit) | **6327 ví dụ, 74 lỗi, 66 pending**, 1211 s. 74 lỗi đều có sẵn từ upstream (mục 4); do Kalo gây ra: 0 |
| vitest (`script/ktech/vitest.sh --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=3`) | **428 file, 4112 test, 0 lỗi**, 166 s |
| rubocop (69 file `.rb` trong `git diff --name-only 7a88e29..HEAD`, trừ `db/schema.rb`) | không vi phạm |
| `rails zeitwerk:check` | "All is good!" |
| eslint + prettier (126 file js/vue/mjs/cjs trong diff) | Lỗi còn lại đều không thuộc code app Kalo: `Message.vue`, `tailwind.config.js`, `generate_brand_assets.cjs` hỏng prettier từ base `7a88e29`; `landing-page/script.js` và `landing-page/test/landing.test.mjs` bị luật airbnb của app (`no-restricted-*`, `no-continue`; landing là trang tĩnh riêng, không dùng cấu hình này). `landing.test.mjs` đã chạy `prettier --write` (commit `a25443c`). 62 cảnh báo vue-i18n (khóa động) giữ nguyên |
| Landing (`node --test landing-page/test/landing.test.mjs`) | 8/8 đạt |
| `bash deploy/nginx/test.sh`, `bash deploy/compose_check.sh` | cả hai OK |
| `node script/ktech/check_contrast.mjs` | thoát 0 (mọi cặp đạt ngưỡng) |

Lần chạy đầu của cổng cuối (ở `900a77b`) có **80 lỗi**: 74 như dưới và thêm 6 ca do Kalo gây ra: `.env.example` đặt `DEFAULT_LOCALE=vi` (commit smoke), `rspec.sh` copy file đó thành `.env`, nên 6 spec upstream so khớp thông báo tiếng Anh nhận tiếng Việt (dyte, widget conversations, v2 accounts, omniauth, session ×2). Đã chạy riêng 6 ca (hỏng), sửa `script/ktech/rspec.sh` ép `-e DEFAULT_LOCALE=en` (commit `e42683a`), chạy lại 6 ca (đạt) rồi chạy lại cả bộ ở HEAD mới (74 lỗi). Ghi ở LESSONS B17. Cấu hình production vẫn mặc định `vi`.

Sec-fix (bối cảnh): 369 spec liên quan đạt ở vòng sửa cuối, review vòng 2: approved. Low ghi nhận: parse ISO của Ruby lỏng hơn SQL guard ở 6 trường hợp biên (không làm shop trả phí bị coi là hết hạn), `AiThrottle` nhớ store production.

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

Phân loại ở cổng cuối: chạy 34 file hỏng trên base `7a88e29` (worktree riêng, DB riêng, đã xóa sau đó): 73 lỗi, mọi lỗi đó có mặt trong 74 lỗi ở HEAD; lỗi thứ 74 (`spec/builders/agent_builder_spec.rb:47`) phụ thuộc thứ tự chạy (đạt khi chạy riêng, hỏng khi chạy sau `account_builder_spec`, cả ở base). Tập 74 lỗi ở HEAD giống tập của 12A. `onboarding_controller_spec` và `dashboard_controller_spec` thuộc nhóm 500 do thiếu bản dựng Vite. Nguyên nhân chính:

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

## 6. 12B: kiểm tra khói và trình duyệt thật

Nguồn: `.superpowers/sdd/2026-11-16-kalo-launch/task-12b-report.md` (nhánh `feat/kalo-smoke`, đã gộp vào launch). Chạy trên stack thật ở chế độ development, không phải production.

- **Dựng stack:** `bin/vite build` 33 s (4879 module, chỉ cảnh báo kích thước chunk); `db:chatwoot_prepare` 5 s trên DB và redis db riêng; Rails ở cổng 3300, sẵn sàng sau ~20 s. Đã dọn hết container/DB sau mỗi vòng.
- **Smoke script `script/smoke/kalo_smoke.sh`:** **44/44 bước đạt**, thoát 0 (vòng cuối sau các lần sửa; 43/43 ở vòng đầu, thêm 1 bước kiểm bucket báo cáo theo giờ Việt Nam). Bao phủ: đăng ký 2 tenant, đăng nhập, gói dùng thử, cài đặt thanh toán, sản phẩm, đơn, QR PNG, gửi QR vào hội thoại, chuyển trạng thái, báo cáo, webhook Casso (thiếu/sai token, khớp memo, trùng tid, payload object, payload sai, memo mơ hồ), AI 503 `ai_not_configured`, cô lập tenant, Console (403 với user thường, 200 với SuperAdmin).
- **Chưa kiểm:** `/api/v1/casso/simulate` chỉ tồn tại ở development nên script chạy với `SIMULATE_EXPECT=200`; ca 404 **chưa xác minh trên server chế độ production**. Cũng chưa chạy: server production và asset biên dịch sẵn, Sidekiq và realtime (ActionCable), AI với gateway thật (chỉ nhánh 503), Casso và email xác nhận thật, hoàn tất onboarding, phím tắt ngoài Alt+C, chuyển theme sáng/tối đầy đủ, Zalo bridge.
- **Trình duyệt thật** (puppeteer + Chrome headless, desktop 1440x900 và 400 px): đăng nhập, Đơn hàng (form, ngăn chi tiết có QR), POS (tiền mặt và QR), chat (thẻ đơn, tạo đơn, gửi QR), bộ lọc, Báo cáo, Marketing, Gói cước, Cài đặt, Console, landing có video. Sau các vòng sửa: 0 lỗi console, 0 pageerror, 0 request lỗi, không tràn ngang ở 400 px.
- **Lỗi tìm thấy khi chạy thật và trạng thái** (đánh số theo báo cáo 12B):
  - F1 (cao) `console/overview` trả 500 do regex ISO chứa `?` đụng bind `?`: **đã sửa** (`a3892c2`; cả bộ trước đó không bắt được vì chưa chạy lại sau khi gộp).
  - F2 (cao) chuỗi `KALO_*` chỉ có ở vi: user/installation không phải vi thấy khóa thô: **đã sửa** (`applyKaloFallback` deep-merge về tiếng Việt; `DEFAULT_LOCALE=vi` trong manifest production).
  - F3 Console không dùng được ở 400 px, tương phản kém: **đã sửa**.
  - F4 chấm đầu dòng ở danh sách Kalo: **đã sửa**.
  - F5 hộp thoại tạo đơn/chọn QR trong chat không có nền, bị cắt: **đã sửa**.
  - F6 báo cáo "hôm nay" theo UTC: **đã sửa** (mặc định `Asia/Ho_Chi_Minh`, API trả `today`).
  - F7 icon sai màu (gốc: sprite không áp style cho `<use>`): **đã sửa** (cả icon hai tông).
  - F8 onboarding: nút "Tiếp tục" chỉ báo lỗi chung, trường website bắt buộc trông như placeholder: **đã sửa** (dấu `*`, lỗi inline, ngôn ngữ mặc định vi). Các lựa chọn dropdown tiếng Anh là tài sản upstream, chưa đổi.
- **Mục mở còn lại:** F9 (Marketing hiện chiến dịch demo tiếng Anh, upstream), F10 (đăng ký web cần xác nhận email, cần SMTP), F11 (409 "Active session limit" sau ~25 phiên, upstream); `aria-invalid`/`aria-describedby` cho trường website (cần sửa `InlineInput` dùng chung); nút bật thông tin liên hệ ở mobile đè mép tin nhắn và nhãn "Thêm" lệch 4 px chưa xử lý; `DEFAULT_LOCALE=vi` chưa kiểm trong manifest `deploy/k8s`.
- **Ảnh chụp:** thư mục tạm `/private/tmp/claude-501/kalo-smoke-browser/screens/` (trước/sau: `before-*.png`, `before2-*.png`), không nằm trong repo; mục lục từng ảnh và nhận xét ở `task-12b-report.md`.

## 7. Kết luận

Ở cổng cuối (HEAD sau khi gộp sec-fix, smoke và blockers) không còn lỗi do Kalo gây ra: rspec 74 lỗi đều có sẵn từ upstream, vitest 428 file / 4112 test sạch, rubocop và zeitwerk sạch; 12B không còn mục hỏng ngoài các mục mở ở mục 6. Chưa đủ điều kiện mở bán cho tới khi: 12B không còn mục hỏng, chủ dự án cung cấp tên miền, máy chủ, Casso, SMTP (AI tùy chọn), kiểm staging mục "Chưa kiểm thử runtime", thử một giao dịch Casso thật nhỏ. Xem [go-live-checklist.md](../reference/go-live-checklist.md).
