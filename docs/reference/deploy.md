# Triển khai production Kalo

> Task 6 (kế hoạch Kalo launch). Một máy chủ chạy Docker Compose: Rails, Sidekiq, Zalo bridge, Postgres (pgvector), Redis, Nginx. Chỉ Nginx mở cổng 80/443; Postgres, Redis và bridge nằm trong mạng nội bộ.

## 1. Yêu cầu máy chủ

- Ubuntu 22.04+ (hoặc tương đương), tối thiểu 4 vCPU, 8 GB RAM, 80 GB SSD.
- Docker Engine 24+ và plugin Compose v2, `git`, `certbot`.
- Mở cổng 80 và 443. Không mở 5432, 6379, 5001, 3000.
- Máy build image cần ~6 GB RAM trống (build frontend). Có thể build ở CI rồi `docker load`.

## 2. DNS

Tạo 3 bản ghi A trỏ về IP máy chủ:

| Tên | Loại | Giá trị |
|---|---|---|
| `<tên miền>` | A | IP máy chủ |
| `www.<tên miền>` | A | IP máy chủ |
| `app.<tên miền>` | A | IP máy chủ |

Chờ DNS lan truyền (`dig +short app.<tên miền>`) trước khi xin chứng chỉ.

## 3. Chứng chỉ Let's Encrypt

Một chứng chỉ cho cả ba tên, lưu ở `/etc/letsencrypt/live/<tên miền>/` (đường dẫn Nginx đang dùng). Quy trình để gia hạn không phụ thuộc cổng 80 bị Nginx giữ:

1. Cấp lần đầu bằng `--standalone` **trước khi bật Nginx** (cổng 80 phải trống; các service khác khởi động trước, mục 5):
   ```bash
   sudo mkdir -p /var/www/certbot
   sudo certbot certonly --standalone \
     -d <tên miền> -d www.<tên miền> -d app.<tên miền> \
     --cert-name <tên miền> --agree-tos -m <email quản trị>
   ```
2. Bật Nginx, rồi chạy **một lần** lệnh sau để cấu hình gia hạn chuyển sang webroot:
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot \
     -d <tên miền> -d www.<tên miền> -d app.<tên miền> --cert-name <tên miền>
   ```
3. Cron hoặc systemd timer chạy hằng ngày:
   ```bash
   certbot renew --deploy-hook "docker compose -f /opt/kalo/docker-compose.production.yaml exec nginx nginx -s reload"
   ```
   Kiểm tra bằng `certbot renew --dry-run`.

## 4. Lấy mã nguồn và điền cấu hình

```bash
git clone <repo> /opt/kalo && cd /opt/kalo
cp .env.production.example .env.production
chmod 600 .env.production
```

Điền mọi giá trị `CHANGE_ME` trong `.env.production` (file này không bao giờ commit). Dùng chuỗi chữ-số cho mật khẩu vì chúng được nhúng vào URL.

| Biến | Cách tạo / ghi chú |
|---|---|
| `KALO_DOMAIN` | Tên miền gốc, ví dụ `kalo.vn` |
| `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` | `https://app.<tên miền>` |
| `SECRET_KEY_BASE` | `openssl rand -hex 64` |
| `POSTGRES_*`, `REDIS_PASSWORD` | `openssl rand -hex 24` cho mật khẩu |
| `CASSO_SECURE_TOKEN` | Chuỗi ngẫu nhiên, dán cùng giá trị vào Casso (mục 8) |
| `CASSO_BANK_NAME/ACCOUNT_NUMBER/ACCOUNT_NAME` | Tài khoản nhận tiền hiển thị trên mã QR |
| `AGENTGW_BASE_URL`, `AGENTGW_API_KEY` | Cổng AI do KTech cấp |
| `ZALO_BRIDGE_SERVICE_SECRET` | `openssl rand -hex 32` (>= 32 ký tự) |
| `ZALO_BRIDGE_ENCRYPTION_KEYS` | `openssl rand -hex 32`. Đổi sau khi đã có phiên Zalo sẽ làm mất phiên đã lưu |
| `SMTP_*`, `MAILER_SENDER_EMAIL` | Tài khoản SMTP gửi mail thật |
| `ACTIVE_STORAGE_SERVICE` | `local` (volume `storage_data`) |

Thiếu biến bắt buộc thì Compose dừng ngay với thông báo tên biến. Kiểm tra: `bash deploy/compose_check.sh`.

## 5. Khởi động lần đầu

```bash
docker compose -f docker-compose.production.yaml --env-file .env.production build
docker compose -f docker-compose.production.yaml --env-file .env.production up -d postgres redis
docker compose -f docker-compose.production.yaml --env-file .env.production run --rm rails bundle exec rails db:chatwoot_prepare
docker compose -f docker-compose.production.yaml --env-file .env.production up -d
docker compose -f docker-compose.production.yaml --env-file .env.production ps
```

Tất cả service phải ở trạng thái `healthy`. Alias cho gọn: `alias kc='docker compose -f docker-compose.production.yaml --env-file .env.production'`.

Landing page được Nginx phục vụ từ thư mục `landing-page/` (mount chỉ đọc). Kiểm tra nhanh: `curl -I https://<tên miền>` và `curl https://app.<tên miền>/health`.

## 6. Tạo SuperAdmin

`SuperAdmin` là lớp con của `User` (kế thừa bảng đơn, cột `type = 'SuperAdmin'`), nên tạo một `User` với `type: "SuperAdmin"` (giống `db/seeds.rb`). Mật khẩu đọc từ biến môi trường, không gõ trong dòng lệnh:

```bash
read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD     # nhập mật khẩu mạnh, không hiện ra màn hình
kc exec -e ADMIN_PASSWORD rails bundle exec rails runner '
  u = User.new(name: "Admin", email: "admin@<tên miền>", password: ENV.fetch("ADMIN_PASSWORD"),
               password_confirmation: ENV.fetch("ADMIN_PASSWORD"), type: "SuperAdmin")
  u.skip_confirmation!
  u.save!
  Redis::Alfred.delete(Redis::Alfred::CHATWOOT_INSTALLATION_ONBOARDING)
  puts "#{u.class} #{u.email} created"
'
unset ADMIN_PASSWORD
```

**Làm bước này ngay sau lần boot đầu, trước khi mở site ra internet (DNS/firewall).** `db/seeds.rb` bật cờ onboarding trong Redis, nên cho tới khi có SuperAdmin thì `/installation/onboarding` công khai và ai cũng tạo được SuperAdmin. Đoạn lệnh trên xoá cờ; ngoài ra code đã trả 404 cho endpoint này khi đã tồn tại SuperAdmin. Kiểm: `curl -s -o /dev/null -w '%{http_code}\n' https://app.<tên miền>/installation/onboarding` phải in `404` (nếu in `200` hoặc `302` thì chưa có SuperAdmin hoặc chưa deploy bản vá, dừng lại).

Mật khẩu phải đủ mạnh theo quy tắc của Devise/Chatwoot (có chữ hoa, chữ thường, số, ký tự đặc biệt), nếu không `save!` báo lỗi. Đăng nhập tại `https://app.<tên miền>/super_admin`. Đổi mật khẩu ngay sau lần đầu. **Đoạn lệnh này chưa được chạy thử trên một instance thật** (xem mục 10).

## 7. Backup theo cron

```bash
sudo install -d -m 700 -o "$USER" /var/backups/kalo   # chỉ chủ sở hữu được vào thư mục
# 02:15 mỗi ngày (chạy bằng user riêng, không phải root dùng chung)
15 2 * * * cd /opt/kalo && set -a && . ./.env.production && set +a && BACKUP_DIR=/var/backups/kalo script/ops/pg_backup.sh >> /var/log/kalo-backup.log 2>&1
```

- `script/ops/pg_backup.sh`: `umask 077`, `pg_dump -Fc` vào `/var/backups/kalo/YYYY-MM-DD/` (thư mục 0700, file `.dump` 0600), giữ 14 ngày, thoát mã khác 0 khi lỗi. Dump chứa dữ liệu mọi tenant (token đăng nhập, thông tin ngân hàng, khách hàng) nên không để file đọc được bởi user khác.
- `script/ops/pg_restore_test.sh`: khôi phục bản mới nhất vào DB tạm, đếm bảng `accounts`, rồi xóa DB tạm. Chạy hằng tuần bằng chính user đã tạo backup (file 0600 chỉ user đó đọc được).
- Volume `storage_data` (tệp tải lên) không nằm trong dump; sao lưu riêng, cũng với `umask 077` để tarball là 0600:

  ```bash
  ( umask 077; docker run --rm -v kalo_storage_data:/s alpine tar czf - -C /s . > /var/backups/kalo/storage-$(date +%F).tgz )
  ```

  Không dùng `-v /var/backups/kalo:/b` với `tar czf /b/...` vì file tạo bởi root trong container sẽ có quyền theo umask của container (0644).
- Backup cùng ổ đĩa chưa phải backup: sao chép ra máy khác (rsync/rclone), nhưng **mã hóa trước khi gửi ra ngoài** và cất khóa ở nơi khác.

### Mã hóa backup trước khi đưa ra ngoài

Dùng khóa công khai để máy chủ chỉ cần giữ public key; khóa riêng (giải mã) cất ở nơi khác (password manager, máy của người vận hành, két offline), không để cùng máy chủ hay cùng nơi lưu backup.

Với `age` (khuyến nghị):

```bash
# một lần, trên máy KHÔNG phải server: tạo cặp khóa, cất kalo-backup.key nơi an toàn
age-keygen -o kalo-backup.key          # in ra "Public key: age1..."
# trên server, chỉ cần public key
RECIPIENT=age1xxxxxxxx...              # public key ở trên
for f in /var/backups/kalo/*/*.dump /var/backups/kalo/storage-*.tgz; do
  [ -e "$f.age" ] || ( umask 077; age -r "$RECIPIENT" -o "$f.age" "$f" )
done
rclone copy /var/backups/kalo remote:kalo-backups --include '*.age'   # chỉ đẩy file đã mã hóa
# khôi phục (trên máy có khóa riêng):
age -d -i kalo-backup.key -o kalo.dump kalo_020000.dump.age
```

Với `gpg`:

```bash
# một lần: nhập public key của người vận hành (khóa riêng giữ ở máy khác)
gpg --import kalo-backup-pub.asc
for f in /var/backups/kalo/*/*.dump /var/backups/kalo/storage-*.tgz; do
  [ -e "$f.gpg" ] || ( umask 077; gpg --batch --yes --trust-model always -r backup@<tên miền> -o "$f.gpg" -e "$f" )
done
# khôi phục (trên máy có khóa riêng):
gpg -d -o kalo.dump kalo_020000.dump.gpg
```

Sau khi đã mã hóa và đẩy đi, bản `.age`/`.gpg` cũng phải 0600 (umask 077 ở trên đã lo). Thử giải mã một bản mỗi tháng để chắc khóa còn dùng được.

## 8. Webhook Casso

Trong Casso, thêm webhook:

- URL: `https://app.<tên miền>/api/v1/casso/webhook`
- Header: `Secure-Token: <giá trị CASSO_SECURE_TOKEN>`

Nginx cũng cho phép `/api/v1/casso/webhook` và `/api/v1/casso/status` qua tên miền gốc, nhưng cấu hình Casso nên dùng URL `app.` ở trên.

## 9. Cập nhật và quay lui

Cập nhật:

```bash
cd /opt/kalo
script/ops/pg_backup.sh                 # luôn backup trước
git fetch && git checkout <tag hoặc commit>
kc build
kc run --rm rails bundle exec rails db:migrate
kc up -d
kc ps
```

Quay lui:

1. `git checkout <tag/commit trước>` rồi `kc build && kc up -d`.
2. Nếu migration đã chạy và không đảo ngược được: dừng `rails sidekiq`, khôi phục dump:
   `docker exec -i kalo-postgres-1 pg_restore --clean --if-exists --no-owner -U $POSTGRES_USERNAME -d $POSTGRES_DATABASE < /var/backups/kalo/<ngày>/<file>.dump`, rồi `kc up -d`.
3. Gắn tag image (`KALO_IMAGE=kalo-rails:<tag>`) trước khi build để giữ bản cũ.

Cập nhật template Nginx: sửa `deploy/nginx/templates/kalo.conf.template`, chạy `bash deploy/nginx/test.sh`, rồi `kc up -d --force-recreate nginx`.

## 10. Chưa kiểm thử runtime

Các mục sau mới chỉ được kiểm tra tĩnh (`docker compose config`, `nginx -t`, script backup trên Postgres cục bộ), **chưa chạy thật**. Phải kiểm chứng trên staging trước go-live:

- Healthcheck của Rails, Sidekiq và Zalo bridge, cùng `docker/entrypoints/rails-prod.sh`.
- Đoạn lệnh tạo SuperAdmin (mục 6): viết theo `db/seeds.rb`, chưa chạy thử trên instance thật.
- Cấp và gia hạn chứng chỉ certbot (mục 3), gồm bước chuyển sang webroot và deploy-hook.
- Chạy đầy đủ `docker compose up -d` với image build thật.
- Job CI build image (`kalo_docker_build.yml`).

## 11. Bảng kiểm trước go-live

- [ ] DNS A cho `<tên miền>`, `www`, `app` đã trỏ đúng; chứng chỉ cấp xong, `certbot renew --dry-run` thành công.
- [ ] `.env.production` đủ giá trị, quyền `600`, không còn `CHANGE_ME`, không nằm trong git.
- [ ] `bash deploy/compose_check.sh` và `bash deploy/nginx/test.sh` đều OK.
- [ ] `kc ps` mọi service `healthy`; `nmap`/`ss` từ ngoài chỉ thấy 80 và 443.
- [ ] `curl https://<tên miền>` ra landing; `https://app.<tên miền>` ra màn hình đăng nhập; `wss://app.<tên miền>/cable` kết nối được.
- [ ] SuperAdmin đã tạo, mật khẩu mặc định/tạm đã đổi; `ENABLE_ACCOUNT_SIGNUP` đúng ý định; `DEFAULT_LOCALE=vi` (trang đăng nhập và Console lấy ngôn ngữ từ biến này).
- [ ] Webhook Casso gửi thử trả 200; chuyển khoản thử khớp đơn.
- [ ] Gửi mail thử (đặt lại mật khẩu) đến hộp thư thật.
- [ ] Kết nối Zalo thử: quét QR, nhận và gửi một tin.
- [ ] Backup chạy tay thành công, `pg_restore_test.sh` thoát 0, cron đã cài, bản sao ngoài máy chủ đã có.
- [ ] Tường lửa (ufw) chỉ cho 22, 80, 443; SSH bằng khóa.
