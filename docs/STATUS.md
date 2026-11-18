# Tình trạng thực hiện

> File sống, cập nhật sau mỗi phiên làm việc. Đọc file này **đầu tiên** trước khi bắt tay vào việc.
> Trạng thái: `todo` · `in-progress` · `done` · `blocked` · `skipped`

**Phase hiện tại (2026-11-17): K — Kalo launch.** Mã nguồn xong và đã gộp vào `feat/kalo-launch`; đang ở **cổng go-live**: chờ chủ dự án cung cấp tên miền, máy chủ, Casso, khóa AgentGW, SMTP (xem [reference/go-live-checklist.md](reference/go-live-checklist.md)). Agent không tự triển khai. Kế hoạch: `docs/plans/2026-11-16-kalo-launch.md`. Báo cáo QA: [reports/2026-11-kalo-launch-qa.md](reports/2026-11-kalo-launch-qa.md).
**Cập nhật lần cuối:** 2026-11-17

### Kalo thật sự có (có backend và spec đạt)

- Hộp tin nhắn đa kênh và Zalo cá nhân (Chatwoot + bridge), khung app Kalo (rail 6 mục, tab bar mobile), tiếng Việt, thương hiệu Kalo (coral).
- Đơn hàng + POS nội bộ: sản phẩm, đơn, tạo đơn/gửi mã VietQR (sinh cục bộ) trong chat, chuyển trạng thái, đánh dấu đã nhận tiền bằng tay. Backend `Kchat::{Product,Order,OrderItem,PaymentEvent}`.
- Gói cước: dùng thử 14 ngày, hết hạn thì chặn tạo sản phẩm/đơn/AI; đối soát tự động tiền gói qua webhook Casso (`KALO <account_id|tenant_slug> [PLAN|TOKEN|SEED] [order_id]`), gán tay trong Console (ADR-019).
- Báo cáo (`kchat/reports/summary`), Marketing (chiến dịch sẵn của Chatwoot + ý tưởng nội dung/AI), trang Gói cước.
- Gợi ý trả lời AI qua `Ai::CustomLlmService` (AgentGW; không có khóa thì 503 và giao diện ẩn gợi ý).
- Kalo Console cho SuperAdmin: tổng quan, shop, giao dịch Casso.
- Landing có video; hạ tầng production (compose, Nginx, backup, hướng dẫn `reference/deploy.md`).

**Bằng chứng kiểm thử (cổng cuối, 2026-11-17, chạy ở `feat/kalo-launch` @`361a46f` + sửa wrapper `e42683a`):** rspec 6327 ví dụ, 74 lỗi, 66 pending; 74 lỗi **có sẵn từ upstream, không đụng tới** (loại `spec/enterprise`; phân loại bằng chạy lại trên base `7a88e29`: 73 lỗi giống hệt + `agent_builder_spec:47` phụ thuộc thứ tự); lần chạy đầu có thêm 6 lỗi do `DEFAULT_LOCALE=vi` trong `.env.example`, đã sửa ở `rspec.sh` (LESSONS B17); vitest 428 file / 4112 test, 0 lỗi; rubocop (69 file) và `zeitwerk:check` sạch; landing test 8/8; nginx, compose, contrast đạt; eslint/prettier chỉ còn lỗi ở file có sẵn từ base hoặc ngoài cấu hình app (xem báo cáo QA). **Rà soát bảo mật (12C):** Critical 0, High 0, Medium 4, Low 9, Info 8; Medium 4 và Low L-1, L-2, L-5, L-6, L-8 đã sửa có spec hồi quy (369 spec liên quan ở vòng cuối, sau đó cả bộ đã chạy ở cổng cuối; sửa qua review ban đầu + 2 vòng sửa, review lại vòng 2: approved, không còn mục mở; Low ghi nhận: bộ parse ISO của Ruby lỏng hơn SQL guard ở 6 trường hợp biên không làm shop trả phí bị coi là hết hạn, `AiThrottle` nhớ store production); còn lại ghi trong [reference/security-review-2026-11.md](reference/security-review-2026-11.md). **12B (khói + trình duyệt thật):** smoke script 44/44 trên stack thật (development), trình duyệt thật 0 lỗi console sau các vòng sửa F1-F8; chưa kiểm: simulate 404 ở server production, Sidekiq/realtime, AI ngoài 503, hoàn tất onboarding. Chi tiết: báo cáo QA mục 6.

### Mockup cũ đã bỏ (không có backend)

Các mục sau từng được ghi "hoàn thành" ở phiên bản trước nhưng chỉ là giao diện mẫu trong `landing-page/tenant-admin/` và `super-admin/` (LESSONS B12). Không phải tính năng của Kalo; không được quảng bá:
- Tích hợp POS ngoài (KiotViet, Sapo, Nhanh.vn), vận chuyển GHN/GHTK (cột hãng/mã vận đơn có trong dữ liệu nhưng chưa có API/giao diện ghi).
- Chiến dịch Zalo ZNS, SMS Brandname; quản lý quảng cáo Meta/TikTok (ROAS/CPA/Auto-Kill).
- Ví affiliate, chi trả hoa hồng tự động, Marketplace seeding.
- Pipeline video AI MMO, Brand OS (`#brand-strategy`, `#content-studio`, `#website-seo`), chỉ số MER/LTV:CAC là hằng số.
- Super Admin 10 phân hệ tĩnh (thay bằng Kalo Console thật; thư mục `landing-page/tenant-admin/` và `super-admin/` đã xóa), PWA/`sw.js`, nhánh AI "Chrome CDP :9222" (đã bỏ ở ADR-016).

### Phase K — bảng task

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| K-T0 | Nhánh, wrapper test `script/ktech/{rspec,vitest}.sh`, ADR-018 | done | Xong trước các đợt, không qua review |
| K-T1 | Thương hiệu và icon Kalo | done | Coral, 26 icon; vá 3 chỗ còn màu cobalt (`sdk.js`, `portal.rb`, `Avatar.vue`); 1 vòng sửa |
| K-T2 | Mô hình dữ liệu thương mại + VietQR | done | `kchat_*`, 66 spec; 1 vòng sửa (quantity, status giả, ownership, ký tự QR) |
| K-T3 | API sản phẩm/đơn/thanh toán | done | 127 spec; 1 vòng sửa (đơn 0đ, ảnh sản phẩm giới hạn, I18n, inbox) |
| K-T4 | Báo cáo, gói cước, Casso, Console API | done | 282 spec; 2 vòng sửa (memo không khớp, ref tham lam, từ khóa không chính xác → unmatched). Giới hạn gói không áp dụng (ADR-018/019) |
| K-T5 | Landing có video | done | 1 vòng sửa (bỏ lời hứa không kiểm chứng); task 13 bỏ `?plan=` và câu "Nhiều chi nhánh" |
| K-T6 | Hạ tầng production | done (chưa chạy thật) | compose, Nginx, certbot, backup; 1 vòng sửa; healthcheck/certbot/build chưa kiểm runtime |
| K-T7 | Khung app Kalo, 6 mục | done | 3 vòng sửa (khôi phục đăng xuất, bộ lọc inbox/label/team, popover); 189 vitest |
| K-T8 | Đơn hàng và POS (UI) | done | 1 vòng sửa (phân trang "Xem thêm", race, form); tab đếm số chưa có |
| K-T9 | Tạo đơn, QR, gợi ý AI trong chat | done | 1 vòng sửa (cache AI, a11y); backend thêm `contact_id` và `meta.paid_total` |
| K-T10 | Báo cáo, Marketing, Gói cước (UI) | done | 2 vòng sửa (race, khóa kênh snake_case) |
| K-T11 | Kalo Console (UI) | done | 2 vòng sửa (redirect, lỗi gán `description_ambiguous`) |
| K-i18n | Sửa spec overlay i18n (468 ca hỏng) | done | `overrides.spec.js` bỏ qua khóa `KALO_*` không có khóa Anh (LESSONS B16) |
| K-T12A | QA đầy đủ: rspec, vitest, lint, kiểm tĩnh | done | Số liệu 12A đã được thay bằng lần chạy cổng cuối (xem trên); sửa KPI Console `shops_by_plan` đếm cả shop hết hạn/khóa |
| K-T12C | Rà soát bảo mật (opus, chỉ đọc) | done | 0/0/4/9/8 |
| K-sec | Vá bảo mật từ 12C | done | M-1..M-4, L-1, L-2, L-5, L-6, L-8; review ban đầu + 2 vòng sửa (bypass `1%2E5`, `Forwarded`, throttle trước auth), review vòng 2 approved |
| K-T12B | Kiểm tra khói và trình duyệt thật | in-progress | Controller đang chạy; kết quả bổ sung vào báo cáo QA |
| K-T13 | Tài liệu và go-live checklist | done (tài liệu) | Phần triển khai thật **blocked** chờ chủ dự án (go-live checklist) |

Phần còn lại sau launch: xem mục "Sau launch" trong [ROADMAP.md](ROADMAP.md).

**Phase trước (đã đổi hướng):** Phase B KTech branding (bên dưới) bị thay bằng Kalo (ADR-017); Phase A–D "Nền tảng Multi-tenant SaaS KChat" ghi trước đây là mockup (mục trên).

## Phase B — KTech branding

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| B-01 | Đổi tên, logo, theme Terracotta Sunset, ẩn banner Chatwoot | done | Đổi tên lúc nạp i18n (FE `brandMessages`, BE `Ktech::BrandedI18n`), logo và 30 icon, theme light/dark, ombre ở sidebar/nút/login. Kiểm chứng: `brand_audit.cjs` 9 trang × vi/en × light/dark không còn "chatwoot"; `check_contrast.mjs` 13/13 cặp ≥ 4.5; vitest 286/286; rspec 181/181 (initializers, mailers, super_admin) |
| B-02 | Hoàn thiện: màu mặc định widget/portal/avatar, tiếng Việt cho màn hình hằng ngày | done | Overlay `dashboard/i18n/ktech/vi.json` (626 chuỗi: sidebar, hồ sơ, danh sách chat, hộp thư, khung chat, liên hệ, tìm kiếm, thao tác hàng loạt, đăng nhập) + `widget/i18n/ktech/vi.json` (19 chuỗi khách thấy). Sửa từ dịch sai có sẵn ("Đại lý" → "Nhân viên"…). Test toàn vẹn overlay 1.878 + 54 ca |
| B-03 | Dịch nốt tiếng Việt: cài đặt inbox, tích hợp, cài đặt khác, help center, báo cáo | in-progress | Đã dịch đợt 1 (316 chuỗi: onboarding 64, generalSettings 72, campaign 39, automation 42, inboxMgmt 99); untranslated giảm từ 2.731 còn 2.415; bundle vite đã build lại sạch sẽ |

## Phase 0 — Chuẩn bị

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P0-01 | Setup tài liệu, CLAUDE.md, skills | done | CLAUDE.md, docs/, `.claude/settings.json` (superpowers, deny ghi DSF), `.mcp.json` + skill codegraph, index codegraph đã build |
| P0-02 | Ma trận tính năng | todo | |
| P0-03 | Chốt câu hỏi mở Q1–Q3 | blocked | Chờ chủ dự án trả lời (xem DECISIONS.md) |
| P0-04 | Remote upstream và quy trình merge | todo | |
| P0-05 | Môi trường dev local đầy đủ | done | Nhánh `feat/P0-05-docker-dev-env`. Sửa docker-compose: healthcheck, volume Postgres/Redis mount sai path, bridge dùng DB `chatwoot_dev` giống Rails, secret HMAC chung, bỏ mount `dist`, port host đổi được qua `KCHAT_*_PORT`. Sửa `vite.sh` bị treo ở prompt pnpm. Thêm `.gitattributes` ép LF, lệnh `make docker_*`, hướng dẫn ở `docs/reference/dev-setup.md`. Đã kiểm tra: 7 service healthy, `/api` ok, đăng nhập và `/api/v1/profile` ok, `/app/login` 200, HMAC Rails↔bridge 2 chiều đúng (sai secret trả 401), dữ liệu còn sau khi tạo lại container |
| P0-06 | Staging và CI | todo | Gồm cả dọn workflow Chatwoot thừa hưởng |
| P0-07 | Chiến lược nhánh git | in-progress | ADR-006 `proposed`; đã có `develop` (local, chưa push) và nhánh `feat/*` đầu tiên; chưa bật branch protection |
| P0-08 | Manifest K8s toàn stack | todo | Hiện `deploy/k8s/` chỉ có bridge |

## Phase 1 → 9

Chưa bắt đầu. Danh sách task ở [ROADMAP.md](ROADMAP.md). Khi bắt đầu phase nào thì copy bảng task của phase đó vào đây.

## Việc chen ngang

Việc ngoài kế hoạch mà chủ dự án yêu cầu thì ghi vào đây. Nếu làm thay đổi phạm vi hoặc thứ tự thì cập nhật cả ROADMAP.md.

| Ngày | Yêu cầu | Trạng thái | Ảnh hưởng tới plan |
|---|---|---|---|
| 2026-11-16 | Quét toàn dự án, vá lỗi đã quét ra, tên miền cấu hình được, đặt lại tên/logo, vẽ lại giao diện trên Figma để duyệt | in-progress | ADR-016 (vá bảo mật Casso/Brand Growth/CORS/AI, nginx template `KCHAT_DOMAIN`) đã xong, 25 spec mới đạt. ADR-017 tên **Kalo**, gộp chat + quản trị shop thành 1 app; bản thiết kế v1 (thương hiệu, Kalo desktop 3 màn, POS, mobile 3 màn, Console 2 màn, landing) ở `docs/design/kalo/` (xem: `python3 -m http.server 4321 --bind 127.0.0.1` trong thư mục đó), đã được chủ dự án duyệt. Bổ sung 2026-11-16: bộ icon vẽ riêng (`brand/kalo-icons.svg`, 26 icon + 6 biểu tượng kênh + 7 hình sản phẩm), video giới thiệu 24 giây có nhạc (`video/kalo-brand-24s.mp4`, dựng lại bằng `video/build.sh`), trang giao diện thêm mục 7 Bộ icon và mục 8 Video, landing nhúng video. Bước tiếp: làm giao diện thật trong code (Kalo, POS, Console). Không dùng Figma/connector. Kế hoạch triển khai bằng sub-agent: `docs/plans/2026-11-16-kalo-launch.md` (14 task, 5 đợt), chờ chủ dự án duyệt. Còn lỗi có sẵn `account_spec.rb:118` (feature flag upstream) |
| 2026-11-16 | Kalo Task 6: hạ tầng triển khai production | done | `docker-compose.production.yaml` (image build sẵn, healthcheck, chỉ Nginx mở cổng), `deploy/nginx/templates/kalo.conf.template` (`KALO_DOMAIN`), `.env.production.example`, `script/ops/pg_backup.sh` + `pg_restore_test.sh`, `docs/reference/deploy.md`, kiểm tra `deploy/nginx/test.sh` + `deploy/compose_check.sh`; CI còn `run_foss_spec`, `frontend-fe`, `lint_pr` + `kalo_docker_build` (build only). Chưa chạy `docker compose build` đầy đủ và chưa deploy thật |  |
| 2026-11-16 | Kalo Task 4: báo cáo, gói cước, đối soát Casso, Console API | done | Nhánh `feat/kalo-reports-console`. Casso: tiền tố `KALO`, mọi giao dịch lưu `Kchat::PaymentEvent` (chỉ mục duy nhất `tid` chống trùng, spec song song 4 kết nối cộng 1 lần), bỏ `processed_casso_tids`. `Kchat::Entitlements` (dùng thử 14 ngày) chặn tạo sản phẩm, đơn và AI khi hết hạn (403 `subscription_expired`). `Kchat::Reports`, `GET kchat/reports/summary`, `GET kchat/subscription`, `/api/v1/console/{overview,accounts,payment_events}` (chỉ SuperAdmin). Giới hạn gói: cơ chế `limits` của Chatwoot không có tác dụng nên không áp dụng (xem ADR-018) |  |
| 2026-11-16 | Kalo Task 8: trang Đơn hàng và POS | done | Client `api/kchat/{products,orders}`, store `kchatOrders`/`kchatProducts`, `OrdersIndex` (tab trạng thái, chip, nút theo trạng thái), `OrderDrawer`, `OrderForm` (phát `created`, nhận `contactId`/`conversationId`), POS (`ProductGrid`, `PosCart`, QR lấy bằng blob, form thêm sản phẩm khi trống), `formatVnd`. 23 spec đạt với API giả; chưa chạy thử trên trình duyệt hay với backend thật |  |
| 2026-11-17 | Kalo Task 9: tạo đơn, gửi QR, gợi ý AI trong khung chat | done | `KaloComposerActions` (Tạo đơn, Mã QR) và `KaloAiSuggestions` gắn vào `ReplyBox`, `KaloOrderCard` gắn vào `Message.vue` (nhận `kchatOrderId`), `KaloContactOrders` (Mua hàng, Đơn gần đây) gắn vào `ContactPanel`; backend: `GET /orders?contact_id=` và `meta.paid_total`. Spec với API giả; chưa chạy thử trên trình duyệt |  |
| 2026-11-17 | Làm lại toàn bộ giao diện còn lại theo phong cách Kalo: khung chat chính (danh sách, hội thoại, panel khách), màn chào/onboarding, Cài đặt, `/super_admin`, các màn nhỏ; bỏ hẳn giao diện Chatwoot cũ, mượt và đơn giản hơn | done | Hoàn tất 2026-11-18, đã kiểm tay bằng Chrome thật (1280/400px, sáng/tối) và vitest cả bộ 476 file/4918 test xanh. Thêm sau QA: trang Nhận tiền (`settings/payment-kalo`, mã BIN ngân hàng CHƯA đối chiếu nguồn chính thức), lỗi JSON cho billing/AI, tiếng Việt cho báo cáo/bảo mật/đăng nhập, a11y, super admin tiếng Việt. Còn mở: C-37 (không cuộn tới tin chưa đọc, có sẵn từ upstream), tick Zalo chỉ 'đã gửi', Console 'Dùng thử' là do dữ liệu (thiếu `subscription_valid_until`), 15 controller spec super_admin cũ hỏng do thiếu Vite test build, legacy `billing/Index.vue` không còn route, component dịch trong `data()` có thể còn tiếng Anh sau reload (LESSONS B52). Chi tiết: Kế hoạch `docs/plans/2026-11-17-kalo-ui-phase2.md`. Đã gộp vào main: khung chat (danh sách, đầu hội thoại, màn chào, luồng tin, khung soạn, panel khách), Cài đặt, `/super_admin` (ADR-020), quét chữ Việt/thương hiệu; 330 spec chụp lại hành vi chat + bảng kiểm `docs/reference/chat-parity-{inventory,coverage}.md`. Vitest cả bộ xanh. Sửa kèm: `useKaloNav` nạp lại hộp thư/nhãn/nhóm (mất từ khi bỏ Sidebar cũ), transcript từ thanh lệnh, nút đăng xuất Zalo, sticker Zalo. Tick Zalo chỉ có 'đã gửi' (bridge không phát delivered/read). Chờ: kiểm tay trình duyệt toàn bộ; lỗi có sẵn C-37 (không cuộn tới tin chưa đọc) chờ chủ dự án quyết. Ghi nhận ban đầu: trang chào vẫn tiếng Anh "Welcome to KTech", khung chat và Cài đặt còn kiểu Chatwoot. Đang brainstorm phạm vi và chờ chủ dự án duyệt thiết kế trước khi làm. Cập nhật ROADMAP khi chốt phạm vi |
| 2026-09-29 | Rà soát kế hoạch Antigravity, bổ sung phần còn thiếu, tách nhánh để làm việc | done | Thêm P0-07, P0-08, P1-09, P1-10, P4-08, P4-09, ADR-006, Q4–Q5. Giữ ADR-001 (CMS riêng, Chatwoot headless); bỏ phần rebrand dashboard cũ trong kế hoạch Antigravity |
| 2026-09-29 | Đổi hướng: giữ UI Chatwoot, rebrand KTech, giao diện ombre cam–nâu | in-progress | ADR-007 thay ADR-001; thêm Phase B, tạm dừng Phase 2–8 |
| 2026-09-30 | Bổ sung xem Profile Zalo Cá nhân và chức năng Đăng xuất (Logout), kết nối lại QR | done | Hiển thị tab Cấu hình cho Zalo Personal, card hồ sơ (avatar, Zalo User ID, trạng thái), nút Đăng xuất Zalo có dialog xác nhận, banner trên tab Cài đặt |
| 2026-10-02 | Kiểm tra và thống kê toàn bộ dự án | done | Phát hiện 1 sót "Chatwoot Widget" ở `landing-page/tenant-admin/index.html:1330`; ROADMAP chưa cập nhật ADR-008→012; nhánh `develop` không còn tồn tại local/remote |
| 2026-10-22 | Kiểm tra và cập nhật toàn diện giao diện, bảng màu theo thiết kế & trend 2026–2027 (Glacier & Cobalt Studio) | done | Xóa toàn bộ tàn dư cam–nâu (`tailwind.config.js`, logo/icons, widget, portal, avatar), nâng cấp hệ màu Glacier & Cobalt Studio 2026–2027 (ADR-013), Tri-Typography (`Plus Jakarta Sans` + `Inter` + `JetBrains Mono`), Bento 2.0 & Dark/Light Mode đồng bộ cho cả 4 phân hệ |
| 2026-10-28 | [Mockup, đã bỏ] Mô hình hóa và tích hợp Hệ điều hành Phát triển Thương hiệu 5 Giai đoạn (Brand Growth OS) & Pipeline Video AI `mmo` vào chung `cms-kai` (Tenant Admin, Super Admin & Backend Core) | done | Thêm ADR-014; triển khai 3 phân hệ mới trên Tenant Admin (`#brand-strategy`, `#content-studio` kết nối `mmo` với cổng duyệt 2 bước, `#website-seo` CRO/CAPI/GEO), nâng cấp Full-Funnel Ads Guardrails (`#campaigns`) & Phễu 5 tầng (`#dashboard`); tích hợp quản trị cụm `mmo` & Brand OS vào Super Admin (`#aiPoolPage`, `#seedingPage`, `#plansPage`); thêm API `/api/v1/brand_growth/*` và spec |
| 2026-10-28 | [Phần lớn đã thay bởi ADR-016/019] Thương mại hóa hệ thống & Chuẩn hóa hạ tầng AI (`AgentGW Cloud` + `Muse.ai / Gemini Chrome CDP :9222`, bỏ `9router`), gia cố Casso Idempotency, bảo mật White-Label và lưu trữ bền vững | done | Thêm ADR-015; nâng cấp `Ai::CustomLlmService` gọi trực tiếp `agentgw.cloud/v1` (`agentgw-gpt-5.5`, `agentgw-opus-4-8`) + giám sát Chrome CDP `:9222` (`gemini.google.com/app`, `muse.ai`); gia cố `Casso::WebhookHandler` (bỏ `Account.first`, chống trùng `tid`); tắt telemetry `ChatwootHub`, khóa CORS; lưu trữ bền vững tại `storage/kchat_commercial_state.json` |

## Nhật ký

> Các mục từ 2026-10-01 đến 2026-10-28 mô tả giao diện mẫu và cấu hình cũ (Super Admin/Tenant Admin tĩnh, Brand OS, CDP :9222, `storage/kchat_commercial_state.json`); nhiều phần đã bị xóa hoặc thay (ADR-016, ADR-017). Đọc như lịch sử, không như hiện trạng.

- **2026-11-17:** Hoàn tất Kalo launch trên `feat/kalo-launch` (T0–T11, i18n-fix, 12A, 12C, vá bảo mật). 18 vòng sửa theo review. Tài liệu và go-live checklist (T13). 12B xong (smoke 44/44 trên stack thật, F1-F8 đã sửa). Cổng cuối 2026-11-17: rspec 6327 ví dụ / 74 lỗi có sẵn, vitest 428 file / 4112 test.
- **2026-11-16:** Quét dự án, ADR-016/017/018, kế hoạch Kalo launch, thiết kế được chủ dự án duyệt.

- **2026-10-28 (buổi 3):** Hoàn tất kế hoạch kỹ thuật thương mại hóa & tích hợp nền tảng AI thực tế (**ADR-015**):
  - **Hạng mục 3 — Nền tảng AI Chatbot & Brand Growth (`AgentGW` + `Muse.ai / Gemini CDP :9222`, Không dùng `9router`)**: Nâng cấp [`Ai::CustomLlmService`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/services/ai/custom_llm_service.rb) và [`config/llm.yml`](file:///Users/khuongdp/Projects/CMS/cms-kai/config/llm.yml) sử dụng thông tin xác thực từ `/Users/khuongdp/Projects/mmo/.env` (`https://agentgw.cloud/v1`, model `agentgw-gpt-5.5` cho Chatbot phản hồi nhanh và `agentgw-opus-4-8` cho kịch bản Brand Growth OS) kết hợp nền tảng chạy ngầm miễn phí ($0) qua Chrome CDP cổng `:9222` (`Google Gemini Web` & `Muse.ai`). Tích hợp bộ lọc `strip_think`, `extract_json` và kiểm duyệt tự động **Brand Brain Hard Bans** (`enforce_brand_guardrails`).
  - **Hạng mục 2 — Gia cố Thanh toán Casso VietQR (`Casso::WebhookHandler`)**: Nâng cấp [`Casso::WebhookHandler`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/services/casso/webhook_handler.rb) — xóa bỏ hoàn toàn fallback nguy hiểm `Account.first`, bổ sung kiểm tra chống trùng lặp giao dịch (**Idempotency**) theo mã `tid` ngân hàng (`processed_casso_tids` → `duplicate_ignored`), tự động phân loại nạp gói cước (`PLAN`), nạp `TOKEN` và `SEED`.
  - **Hạng mục 4 — Bảo mật & White-Label Triệt để**: Tắt mặc định toàn bộ kết nối telemetry ngoại vi trong [`lib/chatwoot_hub.rb`](file:///Users/khuongdp/Projects/CMS/cms-kai/lib/chatwoot_hub.rb) (`DISABLE_TELEMETRY=true`), cấu hình whitelist domain trong [`config/initializers/cors.rb`](file:///Users/khuongdp/Projects/CMS/cms-kai/config/initializers/cors.rb) qua `CORS_ALLOWED_ORIGINS`, và bảo vệ các route `/enterprise/api/v1/*` trong [`config/routes.rb`](file:///Users/khuongdp/Projects/CMS/cms-kai/config/routes.rb).
  - **Hạng mục 1 — Kết nối Giao diện với Dữ liệu Bền vững & AI Sống**: Nâng cấp [`landing-page/tenant-admin/app.js`](file:///Users/khuongdp/Projects/CMS/cms-kai/landing-page/tenant-admin/app.js), [`landing-page/tenant-admin/index.html`](file:///Users/khuongdp/Projects/CMS/cms-kai/landing-page/tenant-admin/index.html) và [`landing-page/super-admin/index.html`](file:///Users/khuongdp/Projects/CMS/cms-kai/landing-page/super-admin/index.html) kết nối trực tiếp với API `/api/v1/brand_growth/chat_reply`, `/save_profile`, `/ai_health` và lưu trữ trạng thái bền vững tại `storage/kchat_commercial_state.json`.

- **2026-10-28 (buổi 2):** Tích hợp toàn diện **Hệ Điều Hành Phát Triển Thương Hiệu 5 Giai Đoạn (Brand Growth OS) & Pipeline Video AI (`mmo` — Omni-Viral Studio)** vào chung hệ thống `cms-kai` (**ADR-014**):
  - **Tenant Admin (`landing-page/tenant-admin/`)**: Bổ sung cụm phân hệ **Phát Triển Thương Hiệu (Brand OS)** gồm: (1) `#brand-strategy` (Lộ trình 90 ngày tương tác trực tiếp, Bộ não định vị 3C/JTBD/USP, danh sách Từ vựng cấm Hard Bans đồng bộ toàn AI, Radar phân tích Ads đối thủ); (2) `#content-studio` (Thanh cân bằng nội dung 40-30-20-10, Cỗ máy nhân bản 1-to-10 tích hợp 3 chế độ Render 9:16 của `mmo` và Cổng kiểm soát duyệt 2 bước *Human-in-the-Loop* chặn tốn phí API + kích hoạt Auto-Seeding 30p đầu); (3) `#website-seo` (Kiểm toán trang đích 6 bước CRO & 5-Second Test, Cụm chủ đề SEO/GEO trích dẫn trên ChatGPT/Perplexity/AI Overviews, Giám sát Server-side CAPI `EMQ 9.3/10`); nâng cấp `#campaigns` (Ma trận thử nghiệm Creative `Angle × Hook 3s`, Phễu TOF/MOF/BOF, quy tắc tự động **Auto-Kill** cắt lỗ & **1-Click Scale +20%**) và `#dashboard` (Bánh đà tăng trưởng **MER `5.4x`**, **$\text{LTV} : \text{CAC}$ `4.2 : 1`**, Phễu chuyển đổi 5 tầng).
  - **Super Admin (`landing-page/super-admin/`)**: Sử dụng chung Super Admin hiện có để giám sát cụm **Omni-Viral Video Engine (`mmo`) & Muse.ai Chrome CDP Cluster** (`#aiPoolPage`), bảng **Giám sát Hiệu suất Brand Growth OS & Kiểm soát Ads toàn sàn** (`#seedingPage`) và cấu hình hạn mức Brand OS / Video MMO trong các gói cước (`#plansPage`).
  - **Backend Rails Core**: Xây dựng [`BrandGrowth::EngineService`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/services/brand_growth/engine_service.rb), [`Api::V1::BrandGrowthController`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/controllers/api/v1/brand_growth_controller.rb) (`/api/v1/brand_growth/overview`, `/repurpose`, `/approve_job`, `/ads_guardrail`) và request spec [`brand_growth_controller_spec.rb`](file:///Users/khuongdp/Projects/CMS/cms-kai/spec/requests/api/v1/brand_growth_controller_spec.rb).

- **2026-10-28:** Kiểm tra tổng thể và nâng cấp toàn diện giao diện, bảng màu theo xu hướng SaaS / AI **2026–2027 ("Glacier & Cobalt Studio" — ADR-013)**:
  - **Xử lý triệt để 7 điểm lệch màu cam–nâu còn sót trong CMS Core:** Cập nhật `ktech-ombre`, `ktech-ombre-strong`, `ktech-ombre-soft` trong `tailwind.config.js`; cập nhật bộ logo `public/brand-assets/{logo,logo_dark,logo_thumbnail}.svg` và `script/ktech/generate_brand_assets.cjs`; đổi màu mặc định `#C2410C` sang `#1E5EFF` tại `sdk.js`, `Website.vue`, `portal.rb`, `AudioRecorder.vue`; nâng cấp bảng màu đại diện trong `Avatar.vue` sang 6 cặp sắc độ Glacier/Cyan/Mint/Slate/Sapphire/Rose hiện đại.
  - **Nâng cấp Hệ màu & Typography 2026–2027 trên Landing Page, Tenant Admin & Super Admin:** Áp dụng dải màu *Glacier Cool Blue (`#D7EFFF`) + Electric Cobalt (`#1E5EFF`) + Bioluminescent Cyan-Teal (`#0891B2`)*, hiệu ứng viền khúc xạ ánh sáng (`inset 0 1px 0`), hệ font 3 lớp (`Plus Jakarta Sans` + `Inter` + `JetBrains Mono` `tabular-nums`), bổ sung công tắc **Dark/Light Mode** cho Tenant Admin và sửa nhãn `"Tích hợp Chatwoot Widget"` → `"Tích hợp KChat Live Box"`.
  - **Kiểm chứng:** `node script/ktech/check_contrast.mjs` đạt 13/13 cặp tương phản WCAG AA/AAA (`5.12:1` → `18.91:1`); quét toàn bộ source code không còn bất kỳ mã màu cam–nâu cũ nào.

- **2026-10-01 (buổi 2):** Hoàn thiện trọn gói hệ thống thanh toán tự động VietQR qua **Casso Open Banking** (ADR-009) & các phase SaaS mở rộng:
  - **Backend Rails Core**: Xây dựng service [`Casso::WebhookHandler`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/services/casso/webhook_handler.rb) và controller [`Api::V1::CassoController`](file:///Users/khuongdp/Projects/CMS/cms-kai/app/controllers/api/v1/casso_controller.rb) với các endpoint `/api/v1/casso/webhook`, `/api/v1/casso/status`, `/api/v1/casso/simulate`. Kiểm thử curl tự động kích hoạt gói thành công 100%.
  - **Landing Page Checkout**: Tích hợp Modal thanh toán VietQR với mã QR Napas 24/7 sinh tự động, đồng hồ đếm ngược 15:00, nút bắn webhook giả lập, và nút truy cập ngay vào Tenant Admin.
  - **Tenant Admin Dashboard**: Tích hợp Onboarding Wizard 4 bước khởi tạo (Thương hiệu → Kênh chat → AI Knowledge → Sẵn sàng); tích hợp modal VietQR cho gia hạn gói, nạp AI Token và Seeding Credits; tách hoàn toàn độc lập khỏi Super Admin.
  - **Super Admin Dashboard**: Triển khai đầy đủ 8 phân hệ (Tổng quan, Tenants, Gói cước, Thanh toán Casso, AI Pool, Kênh tích hợp, Ads & Seeding, Cài đặt hệ thống), công tắc Dark/Light Mode với lưu cấu hình, và Live Casso Webhook Log Stream với nút test bắn webhook real-time.
  - **ADR & Docs**: Cập nhật ADR-008 (Light Cool Blue theme) và ADR-009 (Casso VietQR Open Banking) vào `DECISIONS.md`.
- **2026-10-01 (buổi 1):** Chuyển đổi toàn diện giao diện sang tông màu Cool Blue `#D7EFFF` (ADR-008). Đồng bộ màu cho KTech Chat CMS (`theme/colors.js`, `_ktech-theme.scss`), biên dịch thành công bundle Vite asset cho container Rails với memory limit 4096MB. Tách riêng landing page và thêm Dark/Light mode toggle cho Super Admin.

- **2026-09-30 (buổi 2):** Tiếp tục công việc của Claude Code trên `cms-kai-ktech`. Tối ưu `docker-compose.yaml` (VITE_RUBY_HOST mặc định localhost để Rails không bị trễ DNS 5s khi tắt Vite container, web response giảm xuống dưới 2s). Bắt đầu task B-03: dịch 316 chuỗi tiếng Việt mới cho Onboarding, General Settings, Campaigns, Automations và Inbox Management qua overlay `ktech/vi.json`, untranslated strings giảm từ 2.731 xuống 2.415; biên dịch lại bundle Vite sạch sẽ trên container.
- **2026-09-30 (buổi 1):** Merge B-01 vào `develop`. Hoàn thành B-02: màu mặc định terracotta cho widget/portal/avatar, overlay tiếng Việt 645 chuỗi không sửa file Crowdin.
- **2026-09-29**: Hoàn thành B-01 (KTech branding). Sửa thêm môi trường dev: Vite trong Docker không nhận thay đổi file (bật polling), worktree bị CRLF (LESSONS B5, B9, B10).
- **2026-09-29**: Chốt hướng ADR-007 và thiết kế Terracotta Sunset (phương án A). Tạo nhánh `feat/ktech-branding` từ `develop` cộng 3 commit Docker, không lấy `kchat-web` và `.agents/` của Antigravity.
- **2026-09-29**: Hoàn thành P0-05: stack Docker dev chạy đầy đủ và đã kiểm tra đầu-cuối. Sửa 6 lỗi cấu hình: CRLF, mount `dist`, volume sai path, lệch tên DB, Rails thiếu secret HMAC, pnpm treo; thêm port tuỳ chỉnh (xem LESSONS B5–B7).
- **2026-09-29**: Rà soát kế hoạch do Antigravity đề xuất, bổ sung các mục CRM/ERP, Zalo bridge, K8s và chiến lược nhánh vào roadmap. Làm trên nhánh `docs/roadmap-crm-zalo-k8s`.
- **2026-09-28**: Audit dự án, chốt phương án 2 (CMS riêng, Chatwoot headless), dựng bộ docs, CLAUDE.md, codegraph và superpowers.
