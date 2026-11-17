# Kalo UI đợt 2: lột bỏ giao diện Chatwoot còn lại

> Nguồn yêu cầu: chủ dự án 2026-11-17 ("lột bỏ hoàn toàn giao diện cũ của Chatwoot, mượt, đơn giản mà hiệu quả hơn"). Đã chốt: làm thẳng trong code (không mockup), dựng lại giao diện và giữ logic/store/API cũ. Phạm vi: khung chat chính, Cài đặt của shop, `/super_admin`. Ngoài phạm vi đợt này: login/đăng ký/onboarding/popup nhỏ (ghi vào ROADMAP làm đợt sau).

## Ràng buộc chung

- Style chuẩn đã duyệt: coral, font và token trong `_ktech-theme.scss` + bộ icon `KaloIcon`. Chỉ Tailwind, không CSS riêng, không chuỗi trần (i18n `KALO_*` trong `i18n/ktech/vi.json`, tiếng Việt, không thuật ngữ kỹ thuật).
- Giữ nguyên store, API, props/emit của component cũ. Không sửa file lõi Chatwoot khi tránh được; ưu tiên component mới `Kalo*` rồi đổi chỗ gắn.
- Mỗi task chạy spec của vùng mình, cuối đợt chạy cả bộ vitest/rspec (LESSONS B16). Nhìn bằng trình duyệt thật ở 1280px và 400px, 0 lỗi console.
- Không commit/push khi chưa được yêu cầu.

## Rà soát chống mất chức năng (bắt buộc)

- **Task 0 (làm trước task 1 và 2):** lập bảng kiểm chức năng hiện có của khung chat và Cài đặt, ghi ở `docs/reference/chat-parity-inventory.md`: mỗi dòng là một chức năng (gửi tin, ghi chú riêng, đính kèm, emoji, câu trả lời mẫu `/`, @nhắc tên, gán nhân viên/nhóm, đổi trạng thái, hoãn, nhãn, lọc, tìm kiếm, phím tắt, kéo thả, cuộn tải thêm, realtime, thông báo, trạng thái đang gõ, chọn nhiều + thao tác hàng loạt, panel khách, thuộc tính, tin nhắn email/Zalo/web widget...) cùng file nguồn, spec hiện có, và cách kiểm tay.
- Task 1 và 2 không được xóa chức năng nào trong bảng. Mỗi task nộp lại bảng đã đánh dấu (giữ nguyên / đổi vị trí / bỏ có chủ đích kèm lý do). Mục bỏ có chủ đích phải do mình duyệt.
- Spec cũ của các component bị đổi phải còn chạy qua (không xóa hay làm yếu spec để cho xanh). Thêm spec cho mỗi chức năng "đổi vị trí".
- Reviewer mỗi task kiểm bảng đối chiếu, không chỉ đọc diff. Cuối đợt có một lượt kiểm tay bằng trình duyệt thật theo bảng.

## Tasks


1. **Khung chat chính.** `ConversationCard`, danh sách + tab (Của tôi / Chưa giao / Tất cả), `ConversationHeader`, `MessagesView`/bong bóng tin nhắn, `ReplyBox`, panel khách (`ContactPanel`), màn chào khi chưa có hội thoại (`OnboardingView`: hiện đang tiếng Anh "Welcome to KTech"). Bố cục 3 cột gọn, trạng thái rỗng thân thiện.
2. **Cài đặt của shop.** `SettingsHub`/`SettingsLayout`/`SettingsWrapper` và các trang con dùng nhiều nhất: kênh/hộp thư, nhân viên, nhãn, câu trả lời mẫu, tài khoản, gói cước. Trang con ít dùng chỉ đổi khung và màu, không viết lại.
3. **Super admin `/super_admin`.** Layout `app/views/layouts/super_admin`, `_navigation`, `_collection`, `index/show` theo style Kalo (Tailwind không có ở trang Rails nên dùng SCSS riêng của trang này, ghi vào ADR). Menu rút gọn chỉ những mục đang dùng, chữ tiếng Việt.
4. **Rà i18n và thương hiệu.** Quét các chuỗi tiếng Anh/"KTech"/"Chatwoot" còn sót trên các màn trên, đặt `INSTALLATION_NAME=Kalo` cho dev, bổ sung bộ test chặn chuỗi trần.

Thứ tự: 1 và 3 chạy song song (không chung file), 2 sau 1 (chung `vi.json`, layout), 4 cuối. Mỗi task: implementer + reviewer, theo quy trình subagent-driven đã dùng.

## Rủi ro đã biết

- Chat là vùng lõi của Chatwoot, nhiều component lồng nhau: thay giao diện có thể làm mất tính năng ẩn (phím tắt, kéo thả, ghi chú riêng). Task 1 phải liệt kê chức năng cũ trước và đối chiếu sau.
- Trang super admin do gem Administrate sinh ra: chỉ đổi lớp trình bày, không đổi route/controller.
