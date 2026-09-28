# Tham khảo từ ~/Projects/DSF (CHỈ ĐỌC)

> ⚠️ Chỉ đọc. Không sửa, không build, không chạy lệnh ghi, không gọi bất kỳ API/dịch vụ DSF nào. Xem LESSONS.md mục A1, A2 và B1.

## `~/Projects/DSF/dsf-chatwoot`: bản gốc mà repo này clone ra

- Có **đầy đủ lịch sử git** (remote `dsf-software/dsf-chatwoot`, **không fetch/pull**). Xem bằng `git --no-optional-locks log/show`. Dùng để hiểu lý do của các thay đổi Zalo mà repo này không có (repo này chỉ có 1 commit).
- Tài liệu có giá trị (không có trong repo này):
  - `ZALO_PERSONAL_IMPLEMENTATION_PLAN.md`: thiết kế Zalo Personal
  - `docs/zalo-integration-guide.md`: cấu hình, ENV, vận hành, giới hạn Zalo Personal/OA
  - `docs/huong-dan-ket-noi-kenh-chat.md`: hướng dẫn kết nối kênh chat
  - `AGENTS.md` (CLAUDE.md là symlink): quy ước code Chatwoot, đã đưa phần phù hợp vào CLAUDE.md của repo này
- Không có thư mục `enterprise/` (giống repo này).
- Có `Jenkinsfile` và `.windsurf/`. Chỉ tham khảo cách deploy, **không copy URL hay credentials**.

## Các dự án khác trong DSF (có thể tham khảo mẫu UI/kiến trúc)

`hospital-cms-fe`, `hospital-fe`, `hospital-saas-admin`, `Dsf-SalesAndAttendance-FE` (frontend); `Dsf-ApiGateway`, `Dsf-Identity`, `hospital-cms-be`… (backend). Chỉ tham khảo pattern, không import code hay gọi endpoint.

## Cách tham khảo an toàn

- Đọc bằng Read, `grep`, `find`, `git --no-optional-locks log/show/diff`.
- Muốn dùng lại ý tưởng thì viết lại trong repo này và ghi nguồn tham khảo vào PR hoặc docs. Không copy secrets hay endpoint.
