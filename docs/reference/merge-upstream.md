# Quy trình cập nhật (Merge Upstream) từ Chatwoot

Dự án KChat (cms-kai) được fork từ nền tảng mã nguồn mở Chatwoot. Để đảm bảo hệ thống luôn nhận được các bản vá bảo mật và tính năng mới từ Chatwoot mà không làm mất đi các tùy biến riêng (như Zalo Personal Bridge, CRM webhook), chúng ta cần tuân thủ quy trình sau.

## 1. Cấu hình Remote Upstream (Thực hiện một lần trên mỗi máy dev)

Mở terminal tại thư mục gốc của dự án và thêm remote gốc của Chatwoot:

```bash
git remote add upstream https://github.com/chatwoot/chatwoot.git
git fetch upstream
```

Để kiểm tra lại xem remote đã được thêm thành công chưa:
```bash
git remote -v
```

## 2. Quy trình Merge Upstream định kỳ (Hàng tháng / Quý)

Việc cập nhật (sync) từ upstream nên được thực hiện bởi Technical Lead hoặc người nắm rõ cấu trúc dự án.

**Bước 1: Tạo nhánh cập nhật mới từ `develop`**
```bash
git checkout develop
git pull origin develop
git checkout -b chore/sync-upstream-vX.Y.Z
```

**Bước 2: Fetch và Merge từ upstream**
```bash
git fetch upstream
# Merge tag version ổn định mới nhất (ví dụ v3.8.0)
git merge upstream/main
# Hoặc merge theo tag: git merge v3.8.0
```

**Bước 3: Xử lý Xung đột (Conflict Resolution)**
Xung đột thường sẽ xảy ra ở các file sau, cần đặc biệt lưu ý:
- `docker-compose.yaml`: Giữ lại các biến môi trường của KTech và service `zalo_personal_bridge`.
- `Gemfile` / `package.json`: Giữ các thư viện cài cắm thêm (như `ruby-openai`, `zca-js`, `puppeteer`).
- `db/schema.rb`: Rất dễ conflict, chạy `rails db:migrate` sau khi gỡ conflict bằng tay để gen lại.

**Bước 4: Kiểm tra lại (Smoke Test)**
- Build lại hệ thống bằng lệnh `make docker_setup`.
- Chạy toàn bộ test suite (`rspec`, `vitest`).
- Đăng nhập và test thử tính năng Zalo Bridge xem có bị ảnh hưởng bởi thay đổi cấu trúc bảng của Chatwoot không.

**Bước 5: Tạo Pull Request (PR)**
- Push nhánh `chore/sync-upstream-vX.Y.Z` lên Git server nội bộ.
- Đợi CI chạy và yêu cầu ít nhất 1 review từ thành viên khác trước khi merge vào `develop`.

## 3. Các quy tắc "Bất khả xâm phạm" (Do NOTs)

- **Tuyệt đối không sửa trực tiếp vào core models/controllers** của Chatwoot (như `app/models/conversation.rb`) nếu có thể dùng `Concern` hoặc `Callbacks/Webhooks` để mở rộng. Việc sửa trực tiếp Core sẽ biến mỗi lần Merge Upstream thành ác mộng.
- **Không push trực tiếp** lên nhánh `main` hoặc `develop`. Mọi thay đổi phải qua PR.
