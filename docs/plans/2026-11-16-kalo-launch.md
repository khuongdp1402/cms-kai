# Kalo — kế hoạch triển khai lên chạy kinh doanh

> **Cho agent thực thi:** BẮT BUỘC dùng `superpowers:subagent-driven-development`. Mỗi task do một sub-agent mới làm, một reviewer mới duyệt trước khi sang task kế. Các bước dùng checkbox `- [ ]`.

**Mục tiêu:** Đưa Kalo (app cho shop: tin nhắn, đơn hàng, POS, khách, marketing, báo cáo) và Kalo Console (quản trị nội bộ) từ bản thiết kế đã duyệt thành sản phẩm chạy thật, kèm landing có video và quy trình triển khai.

**Kiến trúc:** Giữ nền Chatwoot (Rails + Vue 3) theo ADR-007. Backend thêm module `Kchat` (sản phẩm, đơn hàng, thanh toán, báo cáo, console) trong bảng riêng tiền tố `kchat_`. Frontend thêm khung điều hướng 6 mục và các trang mới vào dashboard hiện có, dùng Tailwind và bộ icon `KaloIcon`. Landing là trang tĩnh. Mọi thứ chạy bằng Docker Compose sau Nginx.

**Công nghệ:** Rails 7.1, Ruby 3.4.4, Postgres 16, Redis, Sidekiq, Vue 3 `<script setup>`, Tailwind, Vitest, RSpec, Docker Compose, Nginx.

**Spec:** [ADR-017 trong DECISIONS.md](../DECISIONS.md), bản thiết kế đã duyệt [docs/design/kalo/index.html](../design/kalo/index.html) (mở bằng `python3 -m http.server 4321 --bind 127.0.0.1` trong thư mục đó), bản vá bảo mật ADR-016.

## Ràng buộc chung

Mọi task phải tuân thủ (copy từ CLAUDE.md, LESSONS.md và thiết kế đã duyệt):
- `~/Projects/DSF/` chỉ đọc, không gọi bất kỳ API/dịch vụ DSF nào. Không dùng connector hay dịch vụ gắn với tài khoản Claude (Figma, Artifact, Docs…): chỉ làm việc trên máy.
- Ruby: RuboCop 150 cột, `class A::B` dạng compact, strong params, mã nghiệp vụ riêng trong namespace `Kchat`. Không sửa file Chatwoot khi có thể mở rộng. Không guard hay fallback "phòng xa", cấu hình thiếu thì báo lỗi rõ.
- Vue: Composition API `<script setup>`, tên component PascalCase, chỉ Tailwind (không CSS riêng/scoped/inline), không chuỗi cứng (i18n, khóa mới đặt trong `app/javascript/dashboard/i18n/ktech/vi.json` dưới khóa cấp 1 riêng của task).
- Code và commit bằng tiếng Anh (Conventional Commits `type(scope): subject`), tài liệu bằng tiếng Việt. Mọi commit kết thúc bằng dòng `Co-Authored-By` theo hướng dẫn trong phiên. Không push.
- Tiền là số nguyên VND, không có số thập phân. Hiển thị `403.000đ`. Giờ ISO 8601.
- Chữ trên giao diện: động từ ngắn ("Tạo đơn", "Gửi mã QR", "Kết nối Zalo"), không thuật ngữ kỹ thuật (webhook, API, CDP, ROAS, MER), mỗi màn hình một hành động chính, màn hình trống có đúng một câu và một nút.
- Màu và độ tương phản: nút chính `#C93F24` chữ trắng (4,98:1), logo `#FF6B4A`, nền `#FFF8F5`, chữ `#1F1714`, chữ phụ `#6E625B`. Mọi cặp chữ/nền ≥ 4,5:1. Font Be Vietnam Pro tải từ máy (không gọi Google Fonts).
- Lệnh chạy test chỉ qua hai wrapper ở Task 0. Sau khi tạo worktree phải chạy `file docker/entrypoints/rails.sh`, nếu có CRLF thì làm theo LESSONS B5. Không dùng `git checkout --` hay `git restore` để hoàn tác một phần file (LESSONS B10).
- Xong mỗi task: cập nhật dòng tương ứng trong `docs/STATUS.md`. Gặp lỗi hoặc bài học thì ghi vào `docs/LESSONS.md` ngay.

## Điểm cần chú ý khi review (không task nào tự nhiên test tới)

Mỗi dòng có test được gắn vào task sở hữu (ghi trong task).
1. Người dùng account A gọi `GET/PATCH` đơn hoặc sản phẩm của account B phải nhận 404, không rò dữ liệu. (Task 3)
2. Hai khách mua cùng lúc sản phẩm chỉ còn 1 cái: một đơn thành công, một đơn nhận `insufficient_stock`, kho không âm; số đơn không trùng. (Task 2)
3. Casso gửi lại cùng một giao dịch song song: chỉ cộng một lần (ràng buộc duy nhất trên `tid` ở DB). (Task 4)
4. Tên sản phẩm có dấu tiếng Việt và emoji: nội dung chuyển khoản trong mã QR phải là ASCII không dấu, tối đa 25 ký tự. (Task 2)
5. Số lượng bằng 0 hoặc âm, giá âm, tổng đơn vượt 9.999.999.999đ: trả 422, không tạo đơn. (Task 2)
6. Tài khoản hết hạn dùng thử: không tạo được đơn/sản phẩm mới và không gọi được AI, nhưng vẫn xem được và vẫn nhắn tin. (Task 4)

---

## Hợp đồng API (mọi task backend và frontend dùng chung)

Tiền tố `/api/v1/accounts/:account_id/kchat`. Xác thực như API tài khoản hiện có (devise token hoặc `api_access_token`). Tạo/xem/chuyển trạng thái: mọi người trong account. Xóa sản phẩm và sửa cài đặt thanh toán: chỉ administrator. Lỗi dạng `{ "error": "<mã>" }`.

**Product:** `{ id, name, sku, price, stock, active, image_url }` — `stock` là `null` nếu không theo dõi kho.
- `GET /products?query=&active=` · `POST /products` `{name, price, sku?, stock?, active?, image?}` · `PATCH /products/:id` · `DELETE /products/:id`

**Order:** `{ id, number, status, source, payment_method, contact:{id,name,phone}|null, conversation_id|null, items:[{id,product_id|null,name,unit_price,quantity}], subtotal, shipping_fee, total, shipping_address, shipping_carrier, tracking_code, paid_at|null, created_at }`
- `status`: `pending_payment | paid | shipping | completed | cancelled`. `source`: `chat | pos | manual`. `payment_method`: `transfer_qr | cod | cash | card`. `number` bắt đầu 1001, tăng dần trong từng account.
- `GET /orders?status=&query=&page=` · `GET /orders/:id`
- `POST /orders` `{contact_id?, conversation_id?, source, payment_method, shipping_address?, shipping_fee?, items:[{product_id?, name?, unit_price?, quantity}]}`. Dòng có `product_id` lấy tên và giá từ sản phẩm; dòng tự do bắt buộc có `name` và `unit_price`. Đơn `payment_method: cash|card` tạo thẳng ở trạng thái `paid`.
- `POST /orders/:id/transition` `{event}` — `mark_paid` (`pending_payment`→`paid`), `ship` (`paid`→`shipping`, hoặc `pending_payment`→`shipping` khi `cod`), `complete` (`shipping`→`completed`, với `cod` ghi `paid_at`), `cancel` (`pending_payment|paid`→`cancelled`, hoàn lại kho). Sai trạng thái: 422 `invalid_transition`.
- `POST /orders/:id/send_qr` `{conversation_id}` → 201 là message JSON của Chatwoot (tin nhắn gửi đi có ảnh QR). Cần `payment_method: transfer_qr`; thiếu cài đặt thanh toán: 422 `payment_settings_missing`. Hội thoại không thuộc account: 404.
- `GET /orders/:id/qr` → `image/png`.

**Cài đặt thanh toán:** `GET|PATCH /payment_settings` `{bank_bin, bank_name, account_number, account_name}` (lưu trong `account.custom_attributes['payment']`).

**Báo cáo:** `GET /reports/summary?range=today|7d|month` → `{ range, revenue, orders_count, new_contacts, waiting_messages, channels:[{channel,orders,share_pct}], daily:[{date,revenue}], top_products:[{name,sold,revenue,stock}] }`. `revenue` là tổng `total` của đơn `paid|shipping|completed` tính theo `paid_at` trong khoảng.

**Gói cước:** `GET /subscription` → `{ plan, status, valid_until, days_left, bank:{bank,account_number,account_name}, memo, prices:{starter,growth,enterprise} }`. `status`: `trial | active | expired`. `memo` dạng `KALO <account_id> PLAN`.

**Làm rõ sau Task 3 (đã thực thi, các task frontend dùng theo đây):**
- Danh sách trả `{ "payload": [...], "meta": {...} }`: `GET /products` → `meta: {count}`; `GET /orders` → `meta: {count, current_page, per_page}` (25 đơn mỗi trang, mới nhất trước, `query` khớp số đơn, tên khách, tên dòng hàng).
- `conversation_id` trong đơn hàng (nhận vào và trả ra) là `display_id` của hội thoại (số mà dashboard dùng), không phải khóa DB.
- Người không đủ quyền nhận 401 (đúng cách Chatwoot đang làm), không phải 403. Lỗi kiểm tra dữ liệu khác: 422 `{error:'validation_failed', message}`.
- `PATCH /payment_settings` kiểm tra trên giá trị sau khi gộp: lần đầu cấu hình phải gửi đủ cả bốn trường; `bank_bin` đúng 6 chữ số, `account_number` 6–19 chữ số.
- `send_qr` thêm mã lỗi 422: `invalid_amount` (tổng 0đ), `order_not_payable` (đơn không ở `pending_payment`), `conversation_contact_mismatch`; ảnh sản phẩm chỉ nhận png/jpeg/gif/webp ≤ 5 MB.
- **Gói cước / Console (Task 4):** trong thời gian dùng thử `subscription.plan` là `null` và `valid_until` là ngày hết dùng thử; `channels` trong báo cáo tính theo loại kênh của hộp thư (không có thì theo `source` của đơn); `waiting_messages` = số hội thoại đang mở có `waiting_since`; danh sách Console cũng trả `{payload, meta}`; `assign` chỉ nhận sự kiện `unmatched` (nếu khác: 422 `event_not_assignable`); trạng thái sự kiện: `matched | underpaid | unmatched | applied`; hết hạn dùng thử: 403 `subscription_expired` khi tạo sản phẩm, đơn hoặc gọi AI.
- **Giới hạn gói (số nhân viên, số kênh) KHÔNG được áp dụng** (`Account#usage_limits` của Chatwoot bỏ qua `account.limits`). Giao diện và landing không được nêu giới hạn này.

**Console** (tiền tố `/api/v1/console`, chỉ `SuperAdmin`, người khác nhận 403):
- `GET /overview` → `{ shops, revenue_month, expiring_7d, unmatched_payments, recent_payments:[…], shops_by_plan:{starter,growth,enterprise} }`
- `GET /accounts?query=&filter=all|trial|expiring|locked&page=` · `PATCH /accounts/:id` `{locked?, extend_days?}`
- `GET /payment_events?status=` · `POST /payment_events/:id/assign` `{account_id}`

---

## Cơ cấu thực hiện bằng sub-agent

| Đợt | Chạy song song | Điều kiện bắt đầu |
|---|---|---|
| 0 | Lead (không dùng sub-agent): Task 0 | — |
| 1 | Task 1 (thương hiệu), Task 2 (dữ liệu), Task 5 (landing), Task 6 (hạ tầng) | Task 0 xong |
| 2 | Task 3 (API đơn hàng), Task 4 (báo cáo, gói cước, console), Task 7 (khung app) | Task 2 và Task 1 đã gộp |
| 3 | Task 8 (đơn hàng + POS), Task 9 (tích hợp chat), Task 10 (báo cáo, marketing, gói cước), Task 11 (Console) | Task 3, 4, 7 đã gộp |
| 4 | Task 12 (kiểm thử tích hợp, bảo mật), Task 13 (tài liệu, cổng go-live) | Mọi task trước đã gộp |

**Quy tắc điều phối (lead):**
- Mỗi task một worktree: `git worktree add ../kalo-wt/<task> -b feat/kalo-<task> feat/kalo-launch`.
- File dùng chung chỉ một task được sửa: `config/routes.rb` (Task 3 và 4, Task 4 làm sau Task 3), `dashboard.routes.js` (Task 7), `i18n/ktech/vi.json` (mỗi task chỉ thêm khóa cấp 1 của riêng mình), `Gemfile` (Task 2).
- Sau mỗi task: reviewer độc lập đọc diff + chạy test; đạt thì lead gộp `--no-ff` vào `feat/kalo-launch` rồi chạy lại bộ test của các task đã gộp. Không đạt thì trả lại cùng sub-agent kèm góp ý.
- Sub-agent chỉ nhận nội dung task của mình, phần Ràng buộc chung và Hợp đồng API.
- Việc cần thông tin hoặc quyết định của chủ dự án (tên miền, máy chủ, tài khoản Casso, khóa AI): dừng và báo lead, không tự đoán.

---

### Task 0: Chuẩn bị nhánh, wrapper test, ADR (lead, đợt 0)

**Files:**
- Create: `script/ktech/rspec.sh`, `script/ktech/vitest.sh`
- Modify: `docs/DECISIONS.md` (thêm ADR-018), `docs/reference/dev-setup.md`, `docs/ROADMAP.md`, `docs/STATUS.md`

**Interfaces:**
- Produces: `script/ktech/rspec.sh <track> <đường dẫn spec…>` và `script/ktech/vitest.sh <đường dẫn spec…>`; mọi task dùng hai lệnh này.

- [ ] **Step 1:** Chủ dự án xác nhận được commit local (CLAUDE.md quy định chỉ commit khi được phép). Sau đó tạo `feat/kalo-launch` từ nhánh hiện tại, chia công việc đang treo thành 3 commit: `fix(security): …` (Casso, Brand Growth, CORS, rack-attack, AI service, routes, specs), `docs: …` (ADR-016/017, STATUS, LESSONS, kế hoạch này), `feat(design): kalo brand board, icons and promo video` (thư mục `docs/design/kalo/`, trừ `fonts/` và `video/` đưa vào cùng commit nếu < 5 MB tổng). Kiểm tra `.gitignore` để không đưa `.env` hay `storage/` vào.
- [ ] **Step 2:** `rspec.sh` chạy `docker compose -p cms-kai -f <gốc worktree>/docker-compose.yaml run --rm --no-deps --entrypoint "" -e RAILS_ENV=test -e POSTGRES_HOST=postgres -e REDIS_URL=redis://redis:6379 -e POSTGRES_DATABASE=chatwoot_test_<track> rails sh -c "…"`, tự `db:create db:schema:load` nếu DB `<track>` chưa có, rồi `bundle exec rspec <paths>`. Mỗi track một DB để chạy song song không đè nhau. `vitest.sh` chạy `pnpm vitest --no-watch --no-coverage <paths>` trong cùng image (xác nhận pnpm có trong image, nếu không thì cài qua corepack trong Dockerfile dev và ghi vào dev-setup.md).
- [ ] **Step 3:** Kiểm chứng: `script/ktech/rspec.sh main spec/services/casso spec/services/ai` đạt (25 ví dụ trở lên); `script/ktech/vitest.sh app/javascript/shared/helpers/specs/brandMessages.spec.js` đạt.
- [ ] **Step 4:** Ghi ADR-018 vào DECISIONS.md với các quyết định của kế hoạch này: (a) thanh toán đơn của shop dùng mã VietQR tạo cục bộ bằng gem `rqrcode`, không gọi dịch vụ ngoài; (b) đối soát đơn của shop làm thủ công bằng nút "Đã nhận tiền" ở bản này, tự đối soát qua Casso cho từng shop để sau; (c) vận chuyển ở bản này chỉ nhập hãng và mã vận đơn, chưa nối GHN/GHTK; (d) tiền tố chuyển khoản gói cước đổi từ `KCHAT` sang `KALO`; (e) tên module nội bộ vẫn là `Kchat`; (f) giới hạn gói (số nhân viên, số kênh) áp dụng nếu cơ chế `limits` của Chatwoot dùng được, nếu không thì bỏ ý đó khỏi landing. Cập nhật ROADMAP (thêm phase K — Kalo launch) và STATUS.
- [ ] **Step 5:** Commit `chore: add kalo launch plan wrappers and ADR-018`.

---

### Task 1: Nền thương hiệu và icon (đợt 1)

**Files:**
- Modify: `theme/colors.js`, `tailwind.config.js`, `app/javascript/dashboard/assets/scss/_ktech-theme.scss`, `script/ktech/generate_brand_assets.cjs`, `script/ktech/check_contrast.mjs`, `public/brand-assets/*`, nơi đặt `INSTALLATION_NAME` (tìm bằng grep `KTech` trong `config/` và `lib/`), `app/javascript/dashboard/i18n/ktech/vi.json`
- Create: `app/javascript/dashboard/components-next/icon/KaloIcon.vue`, `public/kalo-icons.svg` (sao chép từ `docs/design/kalo/brand/kalo-icons.svg`), `public/fonts/be-vietnam-pro/*` (từ `docs/design/kalo/fonts/`), spec cho `KaloIcon`
- Test: `app/javascript/dashboard/components-next/icon/specs/KaloIcon.spec.js`

**Interfaces:**
- Produces: `<KaloIcon name="qr" />` với `name` là tên icon bỏ tiền tố `i-` (xem `kalo-icons.svg`), nhận `class` để đặt cỡ, đặt biến CSS `--ia` để đổi màu mảng nhạt; scale màu `woot` trong Tailwind theo palette coral (500 = `#C93F24`, 400 = `#FF6B4A`, 75 = `#FFE9E1`, 25 = `#FFF8F5`, các bậc còn lại đơn điệu); tên hiển thị của sản phẩm là "Kalo".

- [ ] **Step 1: Test.** `KaloIcon.spec.js`: `mounts KaloIcon with name qr and renders use href "/kalo-icons.svg#i-qr"`; `throws a clear error for an unknown name`.
- [ ] **Step 2:** Chạy `script/ktech/vitest.sh app/javascript/dashboard/components-next/icon` — FAIL.
- [ ] **Step 3:** Viết `KaloIcon.vue` (`<svg><use :href="..."/></svg>`, danh sách tên hợp lệ lấy từ file sprite trong một hằng số xuất ra để test). Đổi scale `woot`, thêm `fontFamily.sans = ['Be Vietnam Pro', …]` với `@font-face` trỏ `public/fonts`. Cập nhật `_ktech-theme.scss` theo palette; xóa các biến cobalt/glacier.
- [ ] **Step 4:** Sinh lại logo, favicon, icon app từ `docs/design/kalo/brand/kalo-mark.svg` bằng `generate_brand_assets.cjs` (logo sáng, logo tối, thumbnail, favicon 16/32/96, apple-touch 180).
- [ ] **Step 5:** Đổi tên hiển thị sang "Kalo" ở `INSTALLATION_NAME` và mọi chuỗi overlay còn chữ "KTech". Thêm vào `overrides.spec.js` ca `no visible string contains "KTech" or "Chatwoot"`.
- [ ] **Step 6:** Cập nhật `check_contrast.mjs` thêm các cặp: trắng/`#C93F24` ≥ 4,5; `#C93F24`/`#FFF6F2` ≥ 4,5; `#1F1714`/`#FFF8F5` ≥ 4,5; `#6E625B`/`#FFFFFF` ≥ 4,5; `#0E7C61`/`#FFFFFF` ≥ 4,5; `#B45309`/`#FFFFFF` ≥ 4,5. Chạy `node script/ktech/check_contrast.mjs` — thoát mã 0.
- [ ] **Step 7:** Chạy lại vitest của `icon` và `i18n/ktech` — PASS. Commit `feat(brand): kalo coral theme, logo and icon component`.

---

### Task 2: Mô hình dữ liệu thương mại và mã VietQR (đợt 1)

**Files:**
- Modify: `Gemfile` (thêm `rqrcode`)
- Create: `db/migrate/<timestamp>_create_kchat_commerce.rb`, `app/models/kchat.rb` (đặt `table_name_prefix = 'kchat_'`), `app/models/kchat/{product,order,order_item,payment_event}.rb`, `app/policies/kchat/{product,order}_policy.rb`, `lib/kchat/viet_qr.rb`
- Test: `spec/models/kchat/{product,order,order_item,payment_event}_spec.rb`, `spec/lib/kchat/viet_qr_spec.rb`

**Interfaces:**
- Produces:
  - Bảng `kchat_products(account_id, name, sku, price, stock, active)`, `kchat_orders(account_id, contact_id, conversation_id, number, status, source, payment_method, subtotal, shipping_fee, total, shipping_address, shipping_carrier, tracking_code, paid_at)` với chỉ mục duy nhất `(account_id, number)`, `kchat_order_items(order_id, product_id, name, unit_price, quantity)`, `kchat_payment_events(account_id null, tid, amount, description, status, raw jsonb, received_at)` với chỉ mục duy nhất `tid`.
  - `Kchat::Order.create_with_items!(account:, attributes:, items:) -> Kchat::Order`; lỗi `Kchat::Order::InsufficientStock` (có `#product_id`); `Kchat::Order#transition!(event) -> self`; lỗi `Kchat::Order::InvalidTransition`.
  - `Kchat::VietQr.payload(bin:, account_number:, amount:, memo:) -> String` và `Kchat::VietQr.png(payload) -> String` (nhị phân PNG).

- [ ] **Step 1: Test model.** `order_spec.rb`: `assigns numbers 1001, 1002 per account independently`; `rejects zero or negative quantity and negative price`; `rejects total above 9_999_999_999`; `decrements stock of tracked products and leaves untracked products alone`; `two threads buying the last unit: one succeeds, one raises InsufficientStock, stock is 0`; `cancel restores stock`; `cash order is created as paid with paid_at set`; `cod complete sets paid_at`; `invalid transition raises InvalidTransition` cho mọi cặp ngoài bảng trong Hợp đồng API.
- [ ] **Step 2: Test VietQR.** `viet_qr_spec.rb`: payload bắt đầu bằng `000201010212` và chứa `5303704`, `5802VN`, `0010A000000727`, `0208QRIBFTTA`, trường `54` đúng số tiền; 4 ký tự cuối bằng CRC16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF) của phần đứng trước cộng `6304`; `memo "Đơn #1042 áo thun 😀"` thành ASCII không dấu, bỏ ký tự lạ, cắt còn ≤ 25 ký tự; `png` trả chuỗi bắt đầu bằng `\x89PNG`.
- [ ] **Step 3:** Chạy `script/ktech/rspec.sh models spec/models/kchat spec/lib/kchat` — FAIL.
- [ ] **Step 4:** Viết migration và model. Đánh số đơn và trừ kho trong cùng transaction, khóa `account.with_lock` khi cấp `number`, khóa dòng sản phẩm bằng `lock!` theo thứ tự `id` tăng dần để tránh deadlock. Policy: mọi người trong account xem/tạo/chuyển trạng thái, administrator xóa sản phẩm.
- [ ] **Step 5:** Viết `VietQr`. Cấu trúc payload (thứ tự trường): `00` `02` `01`; `01` `02` `12`; `38` = `00` `10` `A000000727` + `01` `LL` (`00` `06` `<bin>` + `01` `LL` `<số tài khoản>`) + `02` `08` `QRIBFTTA`; `53` `03` `704`; `54` `LL` `<số tiền>`; `58` `02` `VN`; `62` `LL` (`08` `LL` `<memo>`); `63` `04` `<CRC>`. Mỗi `LL` là độ dài hai chữ số của giá trị đứng sau.
- [ ] **Step 6:** Chạy lại — PASS; `bundle exec rubocop` trên file mới sạch. Commit `feat(kchat): commerce models and local vietqr generator`.

---

### Task 3: API sản phẩm, đơn hàng, thanh toán (đợt 2)

**Files:**
- Modify: `config/routes.rb` (khối `namespace :kchat` trong `resources :accounts`)
- Create: `app/controllers/api/v1/accounts/kchat/{products,orders,payment_settings}_controller.rb`, `app/views/api/v1/accounts/kchat/{products,orders}/*.json.jbuilder`
- Test: `spec/requests/api/v1/accounts/kchat/{products,orders,payment_settings}_spec.rb`

**Interfaces:**
- Consumes: mô hình và `Kchat::VietQr` của Task 2.
- Produces: toàn bộ endpoint sản phẩm, đơn hàng, `transition`, `send_qr`, `qr`, `payment_settings` đúng Hợp đồng API.

- [ ] **Step 1: Test.** `orders_spec.rb`: `agent of account A gets 404 for order of account B` (cả `show`, `transition`, `send_qr`); `create with product_id copies name and price`; `free item without unit_price returns 422`; `insufficient_stock returns 422 with product_id`; `send_qr creates an outgoing message with an attachment on the given conversation and sets content_attributes.kchat_order_id to the order id`; `send_qr returns payment_settings_missing when settings empty`; `send_qr with conversation of another account returns 404`; `transition mark_paid then ship then complete`; `invalid_transition returns 422`. `products_spec.rb`: `agent cannot delete product, administrator can`; `price below 0 returns 422`. `payment_settings_spec.rb`: `agent can read but not update`.
- [ ] **Step 2:** Chạy `script/ktech/rspec.sh orders spec/requests/api/v1/accounts/kchat` — FAIL.
- [ ] **Step 3:** Viết controller kế thừa `Api::V1::Accounts::BaseController`, dùng Pundit, strong params; lỗi domain ánh xạ sang mã trong Hợp đồng bằng `rescue_from`. `send_qr` dựng tin nhắn gửi đi qua builder tin nhắn có sẵn của Chatwoot, nội dung gồm số tiền và nội dung chuyển khoản `DH<number>`, đính kèm ảnh từ `Kchat::VietQr.png`.
- [ ] **Step 4:** Chạy lại — PASS; RuboCop sạch. Commit `feat(kchat): products, orders and payment settings api`.

---

### Task 4: Báo cáo, gói cước, đối soát Casso, Console API (đợt 2, làm sau Task 3 vì chung `routes.rb`)

**Files:**
- Modify: `config/routes.rb`, `app/services/casso/webhook_handler.rb`, `app/controllers/api/v1/casso_controller.rb`, `spec/services/casso/webhook_handler_spec.rb`, `spec/requests/api/v1/casso_controller_spec.rb`, `app/controllers/api/v1/accounts/brand_growth_controller.rb`
- Create: `app/controllers/api/v1/accounts/kchat/{reports,subscriptions}_controller.rb`, `app/controllers/api/v1/console/{base,overview,accounts,payment_events}_controller.rb`, `app/services/kchat/{reports,entitlements}.rb`
- Test: `spec/services/kchat/{reports,entitlements}_spec.rb`, `spec/requests/api/v1/console/*_spec.rb`, `spec/requests/api/v1/accounts/kchat/{reports,subscriptions}_spec.rb`

**Interfaces:**
- Consumes: `Kchat::Order`, `Kchat::PaymentEvent` (Task 2).
- Produces: `Kchat::Entitlements.status(account) -> :trial | :active | :expired` (dùng thử 14 ngày từ `account.created_at`); `Kchat::Entitlements.require_active!(account)` ném `Kchat::Entitlements::Expired` → 403 `subscription_expired`; các endpoint Báo cáo, Gói cước, Console đúng Hợp đồng API.

- [ ] **Step 1: Test Casso.** Sửa spec cũ sang tiền tố `KALO` (`KALO 12 PLAN 9812`); thêm: `every transaction is stored as a PaymentEvent, including unmatched and underpaid`; `two concurrent identical tids credit once (RecordNotUnique treated as duplicate_ignored)`; `activating starter sets limits agents 2 and inboxes 3, growth agents 5, enterprise unlimited`.
- [ ] **Step 2: Test còn lại.** `entitlements_spec.rb`: `trial for 14 days, then expired without payment, active with future valid_until`. `reports_spec.rb`: `revenue counts paid, shipping, completed orders by paid_at and ignores pending and cancelled`; `daily has one entry per day of the range, zero-filled`; `channels share_pct sums to 100 when there are orders`. `console/*_spec.rb`: `agent and administrator get 403, SuperAdmin gets 200`; `assign payment event credits the account once and marks the event applied`; `PATCH locked true suspends the account`.
- [ ] **Step 3:** Chạy `script/ktech/rspec.sh reports spec/services/casso spec/services/kchat spec/requests/api/v1` các file trên — FAIL.
- [ ] **Step 4:** Handler: tạo `PaymentEvent` trước khi cộng, chỉ mục duy nhất `tid` là nguồn chống trùng (bỏ danh sách `processed_casso_tids`); tiền tố `KALO`; đặt `account.limits` theo gói nếu Chatwoot áp giới hạn đó, kiểm tra bằng cách thử thêm nhân viên thứ 3 vào gói `starter` trong spec, nếu cơ chế không có tác dụng thì ghi vào DECISIONS và báo lead để sửa landing. `Entitlements.require_active!` gắn vào `POST products`, `POST orders` (Task 3) và các action AI của `BrandGrowthController`. `casso#status` đọc thêm `CASSO_BANK_NAME`, `CASSO_ACCOUNT_NUMBER`, `CASSO_ACCOUNT_NAME` (đã có).
- [ ] **Step 5:** Viết `Kchat::Reports` (một câu truy vấn gộp cho mỗi phần, không N+1), các controller Báo cáo, Gói cước, Console (`Console::BaseController` kiểm `current_user.is_a?(SuperAdmin)`).
- [ ] **Step 6:** Chạy lại — PASS; chạy cả `spec/requests/api/v1/accounts/kchat` của Task 3 để chắc không vỡ. Commit `feat(kchat): reports, subscription, entitlements, console api, casso event log`.

---

### Task 5: Landing Kalo có video (đợt 1)

**Files:**
- Delete: `landing-page/tenant-admin/`, `landing-page/super-admin/`, `landing-page/sw.js`, `landing-page/manifest.json`
- Modify: `landing-page/index.html`, `landing-page/style.css`, `landing-page/script.js`
- Create: `landing-page/assets/kalo-brand-24s.mp4`, `landing-page/assets/kalo-brand-poster.jpg`, `landing-page/fonts/*`, `landing-page/favicon.svg`, `landing-page/test/landing.test.mjs`
- Reference: phần 6 của `docs/design/kalo/index.html`

**Interfaces:**
- Produces: trang tĩnh không cần build, mọi tài nguyên dùng đường dẫn tương đối; liên kết "Đăng nhập" và nút gói cước trỏ tới `https://app.<tên miền gốc>` (tính trong `script.js` từ `location.hostname`, bỏ tiền tố `www.`), nút gói cước thêm `/app/auth/signup?plan=<starter|growth|enterprise>`.

- [ ] **Step 1: Test** (`node --test landing-page/test/landing.test.mjs`): `index.html contains no "localhost", "KChat", "KTech", "Chatwoot", "simulate"`; `every src and href that is relative points to an existing file`; `the three plan prices are 299.000đ, 699.000đ and 1.990.000đ and match PLAN_PRICES in app/services/casso/webhook_handler.rb`; `the video element has the poster and an mp4 source`; `script.js computes app url "https://app.example.vn" for hostname "www.example.vn"` (xuất hàm `appUrl(hostname)`).
- [ ] **Step 2:** Chạy test — FAIL.
- [ ] **Step 3:** Dựng landing từ phần 6 của bản thiết kế, thêm khối video giữa phần đầu trang và bảng giá, đoạn "Cách hoạt động" 3 bước (Kết nối kênh → Trả lời và lên đơn → Nhận tiền và giao hàng), câu hỏi thường gặp 5 mục, chân trang. Bỏ modal thanh toán giả lập. Nội dung chỉ nêu tính năng có thật ở bản này (chưa nêu tự động giao GHN/GHTK, chưa nêu đối soát tự động đơn của shop). Bỏ dòng giới hạn số kênh/nhân viên nếu Task 4 báo cơ chế không áp dụng được.
- [ ] **Step 4:** Chạy test — PASS; mở bằng server cục bộ và chụp màn hình desktop và 400px để xem không tràn ngang. Commit `feat(landing): kalo marketing site with promo video`.

---

### Task 6: Hạ tầng triển khai (đợt 1)

**Files:**
- Modify: `docker-compose.production.yaml`, `deploy/nginx/templates/kchat.conf.template` (đổi tên `kalo.conf.template`, gốc landing `/usr/share/nginx/html`), `.github/workflows/*` (giữ `run_foss_spec.yml`, `frontend-fe.yml`, `lint_pr.yml`; xóa các workflow đẩy image lên `chatwoot/chatwoot` hoặc không dùng; thêm job build image Kalo), `.env.example`
- Create: `.env.production.example`, `script/ops/pg_backup.sh`, `script/ops/pg_restore_test.sh`, `docs/reference/deploy.md`, `deploy/nginx/test.sh`

**Interfaces:**
- Produces: một lệnh `docker compose -f docker-compose.production.yaml --env-file .env.production up -d` dựng Rails, Sidekiq, Zalo bridge, Postgres (pgvector), Redis, Nginx; biến cấu hình bắt buộc liệt kê đủ trong `.env.production.example` (`KALO_DOMAIN`, `FRONTEND_URL`, `SECRET_KEY_BASE`, `POSTGRES_*`, `REDIS_*`, `CASSO_SECURE_TOKEN`, `CASSO_BANK_NAME`, `CASSO_ACCOUNT_NUMBER`, `CASSO_ACCOUNT_NAME`, `CORS_ALLOWED_ORIGINS`, `INSTALLATION_NAME=Kalo`, `AGENTGW_BASE_URL`, `AGENTGW_API_KEY`, `ZALO_BRIDGE_SERVICE_SECRET`, SMTP, `ACTIVE_STORAGE_SERVICE`).

- [ ] **Step 1: Test.** `deploy/nginx/test.sh` dựng chứng chỉ tự ký, render template với `KALO_DOMAIN=test.vn` và chạy `nginx -t` — thoát 0. Một script kiểm `docker compose -f docker-compose.production.yaml --env-file .env.production.example config` — thoát 0 và không còn tham chiếu service không tồn tại (`zalo_oa_web_bridge`) hay địa chỉ IP nội bộ cứng.
- [ ] **Step 2:** Chạy — FAIL. Sửa compose production: bỏ mount mã nguồn (`./app`, `./config`, `./lib`), image build sẵn (LESSONS B6), healthcheck cho mọi service, `restart: unless-stopped`, volume Postgres và `storage`, mạng nội bộ chỉ Nginx mở cổng 80/443, bridge và Postgres không mở ra ngoài, không đặt khóa bí mật trong file compose.
- [ ] **Step 3:** `pg_backup.sh`: `pg_dump -Fc` vào thư mục có ngày, giữ 14 bản, thoát mã khác 0 khi lỗi. `pg_restore_test.sh`: khôi phục bản mới nhất vào DB tạm và đếm bảng `accounts` — thoát 0. Chạy thử cả hai với container Postgres cục bộ.
- [ ] **Step 4:** Viết `docs/reference/deploy.md` (Việt): yêu cầu máy chủ, DNS (A cho `<tên miền>`, `www`, `app`), cấp chứng chỉ Let's Encrypt (certbot), điền `.env.production`, lệnh khởi động, `db:chatwoot_prepare`, tạo SuperAdmin, cài webhook Casso (URL `https://app.<miền>/api/v1/casso/webhook` kèm header `Secure-Token`), backup theo cron, quy trình cập nhật và quay lui, bảng kiểm trước go-live.
- [ ] **Step 5:** Chạy lại các kiểm tra — PASS. Commit `chore(deploy): production compose, nginx template, backup scripts and runbook`.

---

### Task 7: Khung app Kalo, điều hướng 6 mục (đợt 2)

**Files:**
- Create: `app/javascript/dashboard/components-next/sidebar/KaloRail.vue`, `KaloTabBar.vue`, `app/javascript/dashboard/routes/dashboard/{orders,pos,marketing,reports}/routes.js` (mỗi trang một component tạm hiển thị tiêu đề), `app/javascript/dashboard/routes/dashboard/settings/SettingsHub.vue`, spec cho từng component
- Modify: `app/javascript/dashboard/routes/dashboard/dashboard.routes.js`, `app/javascript/dashboard/routes/dashboard/Dashboard.vue`, `app/javascript/dashboard/i18n/ktech/vi.json` (khóa `KALO_NAV`)

**Interfaces:**
- Consumes: `KaloIcon` (Task 1).
- Produces: tên route `kalo_orders`, `kalo_pos`, `kalo_marketing`, `kalo_reports`, `kalo_settings_hub` (đường dẫn `accounts/:accountId/orders`, `pos`, `marketing`, `reports`, `settings/hub`); mục "Tin nhắn" trỏ route hội thoại hiện có, "Khách" trỏ route danh bạ hiện có; mọi trang cũ của Chatwoot (campaigns, help center, báo cáo cũ, cài đặt inbox, tích hợp…) truy cập được qua `SettingsHub` dưới dạng danh sách liên kết.

- [ ] **Step 1: Test.** `KaloRail.spec.js`: `renders exactly six items in order Tin nhắn, Đơn hàng, Khách, Marketing, Báo cáo, Cài đặt`; `marks the item matching the current route as active`; `shows unread count on Tin nhắn from the store getter and hides it at 0`; `POS is not a nav item`. `KaloTabBar.spec.js`: `shows four primary items plus Thêm on screens under 768px and opens a sheet with the rest`.
- [ ] **Step 2:** Chạy `script/ktech/vitest.sh app/javascript/dashboard/components-next/sidebar` — FAIL.
- [ ] **Step 3:** Viết hai component, thay `Sidebar.vue` trong `Dashboard.vue` bằng chúng (giữ `Sidebar.vue` nguyên, không xóa). Đăng ký route tạm. Nhãn lấy từ i18n khóa `KALO_NAV`.
- [ ] **Step 4:** Chạy lại cả thư mục `routes/dashboard` — PASS; `pnpm eslint` trên file mới sạch. Commit `feat(app): kalo navigation rail, tab bar and settings hub`.

---

### Task 8: Trang Đơn hàng và POS (đợt 3)

**Files:**
- Create: `app/javascript/dashboard/api/kchat/{products,orders}.js`, `app/javascript/dashboard/store/modules/kchat/{products,orders}.js`, `app/javascript/dashboard/routes/dashboard/orders/{OrdersIndex,OrderDrawer,OrderForm}.vue`, `app/javascript/dashboard/routes/dashboard/pos/{PosIndex,ProductGrid,PosCart}.vue`, spec cho từng file
- Modify: `routes/dashboard/{orders,pos}/routes.js` (thay component tạm), `i18n/ktech/vi.json` (khóa `KALO_ORDERS`, `KALO_POS`)

**Interfaces:**
- Consumes: Hợp đồng API (sản phẩm, đơn, transition, send_qr); route của Task 7.
- Produces: store `kchatOrders` getters `getOrders`, `getOrderById(id)`, actions `fetch({status,query,page})`, `create(payload)`, `transition({id,event})`; store `kchatProducts` tương tự; component `OrderForm` phát sự kiện `created(order)` (Task 9 dùng lại).

- [ ] **Step 1: Test.** `orders.spec.js` (store): `transition updates the order in place`; `fetch passes status and query`. `OrdersIndex.spec.js`: `lists orders with status chips and the row action matching the status` (chờ thanh toán → "Gửi QR", đã nhận tiền → "Giao hàng"); `empty state shows one sentence and one button "Tạo đơn"`. `PosCart.spec.js`: `adds a product once and increments on second tap`; `total equals sum of price × quantity`; `paying by cash posts payment_method cash and shows "Đã nhận tiền"`; `QR payment shows the QR image and a button Đã nhận tiền`. `OrderForm.spec.js`: `cannot submit without items`; `shows insufficient_stock as "Không đủ hàng"`.
- [ ] **Step 2:** Chạy `script/ktech/vitest.sh app/javascript/dashboard/routes/dashboard/orders app/javascript/dashboard/routes/dashboard/pos app/javascript/dashboard/store/modules/kchat` — FAIL.
- [ ] **Step 3:** Viết client, store, trang theo bản thiết kế phần 2.2 và 3 (bảng đơn có tab trạng thái; POS lưới sản phẩm và giỏ bên phải, chạm là thêm). Sản phẩm không có ảnh dùng hình mẫu theo `KaloIcon`/hình sản phẩm của bộ icon. Form thêm sản phẩm nhanh trong POS khi shop chưa có sản phẩm nào (màn hình trống).
- [ ] **Step 4:** Chạy lại — PASS; eslint sạch. Commit `feat(app): orders and pos pages`.

---

### Task 9: Tích hợp vào khung chat (đợt 3)

**Files:**
- Modify: `app/javascript/dashboard/components/widgets/conversation/` (thanh công cụ trình soạn tin: tìm bằng codegraph `ReplyBox`), `app/javascript/dashboard/routes/dashboard/conversation/contact/` (bảng thông tin khách), `i18n/ktech/vi.json` (khóa `KALO_CHAT`)
- Create: `app/javascript/dashboard/components/widgets/conversation/KaloOrderCard.vue`, `KaloAiSuggestions.vue`, spec cho từng file, `api/kchat/brandGrowth.js`

**Interfaces:**
- Consumes: `OrderForm` và store `kchatOrders` (Task 8); `POST /api/v1/accounts/:id/brand_growth/chat_reply` `{message, history}` → `{reply, guardrail_triggered, blocked_phrases}` (ADR-016).
- Produces: nút "Tạo đơn" và "Mã QR" trong trình soạn tin, thẻ đơn hiển thị trong hội thoại, khối "Mua hàng" và "Đơn gần đây" ở bảng khách, hai gợi ý trả lời bằng AI.

- [ ] **Step 1: Test.** `KaloOrderCard.spec.js`: `shows number, status chip, items and total`; `Gửi mã QR button calls send_qr with the current conversation id and disables itself while sending`. `KaloAiSuggestions.spec.js`: `requests a suggestion with the last incoming message and up to 6 history items`; `shows nothing and no error toast when the API returns 503 ai_not_configured`; `clicking a suggestion fills the composer without sending`. Spec bảng khách: `shows total spent and the last 3 orders of the contact`.
- [ ] **Step 2:** Chạy vitest các thư mục trên — FAIL.
- [ ] **Step 3:** Viết component và nối vào trình soạn tin (tối thiểu thay đổi file Chatwoot, dùng slot hoặc component bọc nếu có). Thẻ đơn dựng từ tin nhắn do `send_qr` tạo, nhận ra qua `content_attributes.kchat_order_id` (do Task 3 đặt).
- [ ] **Step 4:** Chạy lại — PASS; eslint sạch. Commit `feat(chat): create order, send qr and ai suggestions in conversation`.

---

### Task 10: Báo cáo, Marketing, Gói cước (đợt 3)

**Files:**
- Create: `routes/dashboard/reports/{ReportsIndex,SalesChart,ChannelShare,TopProducts}.vue`, `routes/dashboard/marketing/{MarketingIndex,ContentIdeas}.vue`, `routes/dashboard/settings/billing/BillingPage.vue`, `api/kchat/{reports,subscription}.js`, spec cho từng file
- Modify: `routes/dashboard/{reports,marketing}/routes.js`, `routes/dashboard/settings/settings.routes.js` (thêm route `kalo_billing`), `i18n/ktech/vi.json` (khóa `KALO_REPORTS`, `KALO_MARKETING`, `KALO_BILLING`)

**Interfaces:**
- Consumes: `GET /reports/summary`, `GET /subscription`, `POST /brand_growth/repurpose` `{topic}` → job `{id, topic, angles:[{angle,hook,body,cta}], status}`, `POST /brand_growth/approve_job` `{job_id, job_action: approve|reject}`; chiến dịch Chatwoot hiện có.

- [ ] **Step 1: Test.** `ReportsIndex.spec.js`: `switching Hôm nay, 7 ngày, Tháng này refetches with range today, 7d, month`; `shows 0đ and an empty-state sentence when there are no orders`. `SalesChart.spec.js`: `renders one bar per day and highlights today`. `MarketingIndex.spec.js`: `tab Chiến dịch renders the existing campaigns list; tab Ý tưởng nội dung submits the topic and lists three angles with Duyệt and Bỏ qua buttons`; `AI not configured shows one sentence, not an error trace`. `BillingPage.spec.js`: `shows plan, days left, bank account and memo "KALO <id> PLAN"`; `expired status shows the renew button as primary`.
- [ ] **Step 2:** Chạy vitest các thư mục trên — FAIL.
- [ ] **Step 3:** Viết trang theo bản thiết kế phần 2.3. Biểu đồ cột dùng thẻ HTML và Tailwind, không thêm thư viện biểu đồ. Trang Marketing không hiển thị chỉ số ROAS, MER hay các số liệu chưa có nguồn thật.
- [ ] **Step 4:** Chạy lại — PASS; eslint sạch. Commit `feat(app): reports, marketing and billing pages`.

---

### Task 11: Kalo Console (đợt 3)

**Files:**
- Create: `routes/dashboard/console/{routes.js,ConsoleLayout.vue,ConsoleOverview.vue,ConsoleShops.vue,ConsolePayments.vue}`, `api/kchat/console.js`, spec cho từng file
- Modify: `routes/dashboard/dashboard.routes.js` chỉ thêm một dòng nhập route console (Task 7 đã sở hữu file này, nên task này chạy sau khi Task 7 gộp), `i18n/ktech/vi.json` (khóa `KALO_CONSOLE`)

**Interfaces:**
- Consumes: Console API (Hợp đồng API); `getCurrentUser.type`.
- Produces: các route `kalo_console_overview`, `kalo_console_shops`, `kalo_console_payments` dưới `/app/console/*`; người dùng không phải `SuperAdmin` bị đưa về trang chủ.

- [ ] **Step 1: Test.** `routes.spec.js`: `non-SuperAdmin is redirected from every console route`. `ConsolePayments.spec.js`: `unmatched event offers Ghép shop with an account picker and calls assign once`; `underpaid events show a warning chip`. `ConsoleShops.spec.js`: `filter tabs map to filter=all|trial|expiring|locked`; `Khóa shop asks for confirmation before PATCH`. `ConsoleOverview.spec.js`: `shows five KPI numbers from /overview`.
- [ ] **Step 2:** Chạy `script/ktech/vitest.sh app/javascript/dashboard/routes/dashboard/console` — FAIL.
- [ ] **Step 3:** Viết trang theo bản thiết kế phần 5 (tông tím than riêng cho Console, định nghĩa bằng token Tailwind mới `console-*` trong `tailwind.config.js`, không CSS riêng).
- [ ] **Step 4:** Chạy lại — PASS; eslint sạch. Commit `feat(console): overview, shops and payments pages`.

---

### Task 12: Kiểm thử tích hợp, bảo mật, hiệu năng cơ bản (đợt 4)

**Files:**
- Create: `script/smoke/kalo_smoke.sh`, `docs/reports/2026-11-kalo-launch-qa.md`
- Modify: file bất kỳ có lỗi tìm thấy (kèm test hồi quy)

**Interfaces:**
- Consumes: toàn bộ nhánh `feat/kalo-launch`.

- [ ] **Step 1:** Chạy toàn bộ `script/ktech/rspec.sh full spec/` và `script/ktech/vitest.sh` (không tham số), `pnpm eslint`, `bundle exec rubocop`. Ghi số liệu thật vào báo cáo; lỗi có sẵn của Chatwoot (ví dụ `spec/models/account_spec.rb:118`) ghi riêng, lỗi do thay đổi mới thì sửa bằng test hồi quy trước.
- [ ] **Step 2:** `kalo_smoke.sh` dựng stack bằng compose production với `.env.production.example` cộng giá trị thử, rồi bằng `curl`: đăng ký account → tạo sản phẩm → đặt cài đặt thanh toán → tạo đơn `transfer_qr` → `GET qr` trả PNG → `mark_paid` → `GET reports/summary?range=today` có `revenue` bằng tổng đơn → gửi webhook Casso có và không có `Secure-Token` (200 và 401) → `simulate` trả 404. Script thoát 0 khi mọi bước đúng.
- [ ] **Step 3:** Chạy `/security-review` trên cả nhánh; mỗi phát hiện xác thực được có test hồi quy và bản sửa. Kiểm: không khóa bí mật trong repo (`git grep` theo mẫu khóa), mọi route `kchat` và `console` có kiểm quyền, header `Secure-Token` so sánh hằng thời gian, CORS production không còn `*` cho API xác thực.
- [ ] **Step 4:** Đo thử với dữ liệu mẫu 5.000 đơn và 2.000 khách: `GET orders` trang 1 và `reports/summary?range=month` mỗi cái dưới 500 ms trên máy dev; nếu chậm thì thêm chỉ mục và ghi lại.
- [ ] **Step 5:** Viết báo cáo QA (Việt): kết quả từng bước, số test, việc còn lại. Commit `test(kalo): integration smoke script and qa report`.

---

### Task 13: Tài liệu, cổng go-live (đợt 4; phần cuối chờ chủ dự án)

**Files:**
- Modify: `docs/STATUS.md`, `docs/ROADMAP.md`, `CLAUDE.md` (cập nhật mục "Architecture notes" và tên thương hiệu), `docs/BUSINESS-PLAN.md` (chỉ sửa chỗ nêu tính năng chưa có thật)
- Create: `docs/reference/go-live-checklist.md`

- [ ] **Step 1:** Cập nhật tài liệu cho đúng hiện trạng sau các task (việc đã `done` có spec chạy qua, việc chưa có ghi `todo` hoặc `mockup`).
- [ ] **Step 2:** Viết `go-live-checklist.md` với các mục cần chủ dự án cung cấp, mỗi mục nêu rõ ai làm: (1) đăng ký tên miền và trỏ DNS; (2) máy chủ và quyền SSH; (3) tài khoản ngân hàng nhận tiền gói cước và tài khoản Casso, đặt `Secure-Token`; (4) khóa AgentGW; (5) SMTP gửi email; (6) tra cứu nhãn hiệu "Kalo" trên NOIP và tên miền; (7) thử một giao dịch Casso số tiền nhỏ trước khi mở bán.
- [ ] **Step 3: Dừng ở đây và báo chủ dự án.** Việc đưa lên máy chủ thật chỉ làm sau khi các mục trên có đủ và chủ dự án đồng ý; agent không tự triển khai, không tự mua hay đăng ký gì.
- [ ] **Step 4:** Commit `docs: kalo launch status, roadmap and go-live checklist`.

---

## Tự kiểm tra kế hoạch

- **Phủ spec:** thương hiệu và icon (Task 1), Kalo desktop và mobile (7, 8, 9, 10), POS (8), Console (4, 11), landing và video (5), vá bảo mật đã làm (ADR-016) có test hồi quy ở Task 4 và 12, tên miền cấu hình được (6), triển khai (6, 13).
- **Chưa làm trong kế hoạch này (cố ý):** tự đối soát tiền đơn hàng của shop, nối GHN/GHTK, nối POS ngoài (KiotViet, Sapo), Ads API, đăng bài tự động, chạy video MMO. Landing và tài liệu không được nêu các tính năng này như đã có.
- **Rủi ro lớn nhất:** Task 3 và 9 chạm vào khung chat của Chatwoot; Task 7 thay thanh điều hướng. Reviewer phải kiểm tra Zalo cá nhân, hộp thư và danh bạ vẫn hoạt động (chạy bộ vitest và rspec hiện có của các thư mục đó).
