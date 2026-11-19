# Kế hoạch triển khai: khung thống nhất, hướng dẫn người mới, giá trị cốt lõi

> Đặc tả (nguồn chuẩn): [2026-11-19-kalo-guided-ux-spec.md](2026-11-19-kalo-guided-ux-spec.md). Chủ dự án duyệt ngày 2026-11-19.
> Mốc nền: commit `b1e393c`.
> Quy trình: mỗi task có một implementer chạy trong worktree riêng tách từ `main`, sau đó một reviewer đối chiếu với đặc tả, rồi kiểm tra trên trình duyệt thật, rồi mới gộp vào `main`. Cuối mỗi đợt chạy cả bộ vitest. Rspec chạy cho các thư mục đã đụng và chạy cả bộ ở cuối.
> Brief chung cho agent: `.superpowers/sdd/2026-11-17-ui2/common-brief.md`.

## Ràng buộc chung

- **Không mất chức năng.** Bảng kiểm `docs/reference/chat-parity-*.md` và 330 spec chụp lại hành vi chat phải còn xanh. Chức năng bị ẩn theo cờ vẫn phải chạy khi được bật.
- **Code phía giao diện:**
  - Vue `<script setup>`, chỉ dùng Tailwind.
  - Không để chuỗi trần. Khóa i18n đặt trong namespace riêng của từng task, file `i18n/ktech/vi.json`.
  - Icon dùng `KaloIcon`.
- **Hiển thị:**
  - Đủ cả chế độ sáng và tối.
  - Kiểm ở 1280px và 400px.
  - Tương phản tối thiểu 4.5:1.
- **Ghi chép:**
  - Số mục LESSONS theo dải riêng của từng task để không trùng.
  - Không task nào sửa `docs/STATUS.md` hay `docs/ROADMAP.md`. Controller cập nhật hai file này.

## Task

| Task | Nội dung (mục của đặc tả) | Namespace i18n | Dải LESSONS | Phụ thuộc |
|---|---|---|---|---|
| **T1** | Khung chung (§2): `components-next/layout/{KaloAppShell,KaloPage,KaloPageHeader,KaloCard,KaloDrawer}` + sidebar mới (thu gọn chỉ icon + tooltip, menu con ẩn khi thu gọn và mở rộng khi bấm, nút ở chỗ giao header/sidebar, `⌘\`, lưu theo user; drawer "Thêm" trên mobile). Chuyển sang khung: Tổng quan, Đơn hàng, Khách, Cài đặt | `KALO_SHELL` | B60–B64 | mốc nền |
| **T2a** | Backend cờ chức năng (§4, §7): cờ `kalo_*` trên `Account` (feature_flags), mặc định cho shop mới (ẩn nhóm nâng cao), API trả cờ, trang tài khoản trong Super Admin có công tắc bật/tắt theo shop, rspec | `kalo_super_admin` (Rails) | B65–B69 | mốc nền |
| **T5a** | Backend trợ lý AI (§6): `POST /api/v1/accounts/:id/kchat/assistant` dùng `Ai::CustomLlmService`, prompt hệ thống gồm tài liệu hướng dẫn Kalo (file trong repo) + tóm tắt số liệu tuần từ `Kchat::Reports`, `Kchat::AiThrottle`, hết dùng thử thì 403, không có khóa thì 503, rspec | — | B70–B74 | mốc nền |
| **T2b** | Phân quyền frontend (§7): Console cho chủ shop ở `/app/accounts/:id/console` (cửa hàng, nhân viên và nhóm có "thêm vào kênh", gói và dùng thử, nhận tiền, kênh); trang nền tảng cũ `/app/console/*` đổi tên "Nền tảng", chỉ SuperAdmin; sidebar và Cài đặt ẩn mục theo cờ; sidebar mặc định theo §4 (thêm Bình luận, Chiến dịch, Thương hiệu) | `KALO_CONSOLE_SHOP` | B75–B79 | T1, T2a |
| **T3** | Hướng dẫn (§3): danh sách thiết lập (Tổng quan + huy hiệu sidebar + mobile), tour khoanh vùng `driver.js` qua `data-tour` (Tin nhắn, Đơn hàng, POS, Marketing/Chiến dịch), menu "Hướng dẫn" để xem lại tour, trang trống không có dữ liệu giả, banner dùng thử (API luôn trả trạng thái dùng thử), các sửa nhỏ của QA ngày 2026-11-19 | `KALO_GUIDE` | B80–B84 | T1, T2b |
| **T4** | Chiến dịch A–Z (§5): wizard 6 bước dùng `Kchat::BroadcastsService` + attribution; bước kết quả không hiện số liệu giả | `KALO_CAMPAIGN_FLOW` | B85–B89 | T1, T2b |
| **T5b** | Giao diện trợ lý AI (§6): nút ở chân sidebar, drawer chat; khi không có AI thì ẩn | `KALO_ASSISTANT` | B90–B94 | T1, T5a |
| **T6** | Chuyển các màn còn lại sang khung + QA vai khách mới cho tới ≥ 8/10 | `KALO_SHELL2` | B95–B99 | tất cả |

Đợt chạy: (T1 ∥ T2a ∥ T5a) → (T2b) → (T3 ∥ T4 ∥ T5b) → T6.
