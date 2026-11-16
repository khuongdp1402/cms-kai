# Go-live checklist Kalo

> Việc đưa Kalo lên máy chủ thật **chỉ làm khi chủ dự án đồng ý và các mục dưới đây đã có đủ**. **Agent không tự triển khai, không tự mua hay đăng ký gì**; chủ dự án quyết định từng bước. Kỹ thuật chi tiết (lệnh Docker, Nginx, certbot, backup): [deploy.md](deploy.md). Ký hiệu người làm: **CDA** = chủ dự án, **OPS** = người vận hành máy chủ, **DEV** = lập trình viên.

Thứ tự đề xuất: mục 1-8 chuẩn bị, mục 9-10 cấu hình, mục 11-12 kiểm trên staging, mục 13 mở dần, mục 14-15 vận hành.

## 1. Tên miền và DNS

| Việc | Ai | Cách kiểm |
|---|---|---|
| Chọn và mua tên miền | CDA | Có quyền quản lý DNS ở nhà đăng ký |
| Kiểm tra `kalo.vn` / `kalo.com.vn` còn đăng ký được | CDA | **Lưu ý:** mới chỉ kiểm DNS sơ bộ (`dig`/whois), chưa hỏi nhà đăng ký; đừng coi là còn trống cho tới khi mua được. Nếu không có, đổi tên miền thì phải đổi lại mọi chỗ `<tên miền>` dưới đây |
| Tạo 3 bản ghi A trỏ IP máy chủ: `<tên miền>` (apex, landing), `www.<tên miền>`, `app.<tên miền>` | CDA/OPS | `dig +short <tên miền>`, `dig +short www.<tên miền>`, `dig +short app.<tên miền>` đều ra IP máy chủ |

## 2. Nhãn hiệu

| Việc | Ai | Cách kiểm |
|---|---|---|
| Tra cứu nhãn hiệu "Kalo" (và "Kalo POS", "Kalo Live") trên cổng tra cứu của Cục Sở hữu trí tuệ (NOIP) | CDA | Có ghi chú kết quả (có trùng/gần giống hay không) trước khi chi tiền cho tên miền và quảng bá. Quyết định có nộp đơn đăng ký hay không là của CDA |

## 3. Máy chủ

| Việc | Ai | Cách kiểm |
|---|---|---|
| Thuê máy chủ: Ubuntu 22.04+, tối thiểu 4 vCPU, 8 GB RAM, 80 GB SSD (như `deploy.md` mục 1); cấp quyền SSH bằng khóa cho OPS | CDA | `ssh` bằng khóa vào được; tắt đăng nhập mật khẩu |
| Cài Docker Engine 24+, plugin Compose v2, `git`, `certbot`; tường lửa `ufw` chỉ cho 22, 80, 443 | OPS | `docker compose version`; `sudo ufw status`; từ ngoài chỉ thấy 80 và 443 (`nmap <IP>`) |
| Máy build image cần ~6 GB RAM trống (build frontend) hoặc build ở CI rồi `docker load` | OPS/DEV | Build xong không bị OOM |

## 4. File `.env.production`

OPS tạo trên server, không bao giờ commit (đã nằm trong `.gitignore`; kiểm `git check-ignore -v .env.production`):

```bash
cd /opt/kalo
cp .env.production.example .env.production
chmod 600 .env.production
```

Các lệnh `kc …` dưới đây dùng alias (chạy trong `/opt/kalo`): `alias kc='docker compose -f docker-compose.production.yaml --env-file .env.production'`.

Điền **mọi** biến, không còn `CHANGE_ME` (`grep -n CHANGE_ME .env.production` phải rỗng). Dùng chuỗi chữ-số cho mật khẩu vì được nhúng vào URL.

| Biến | Giá trị / cách tạo | Ai |
|---|---|---|
| `KALO_DOMAIN` | Tên miền gốc, ví dụ `kalo.vn` | CDA |
| `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` | `https://app.<tên miền>` | OPS |
| `INSTALLATION_NAME` | `Kalo` (và sửa dòng đã có trong DB, mục 8) | OPS |
| `ENABLE_ACCOUNT_SIGNUP` | Để `false`. **Đặt `true` ở đây KHÔNG mở đăng ký**: Rails đọc `InstallationConfig` trong DB trước, `installation_config.yml` đã nạp dòng `false` khi seed. Chỉ lệnh ở mục 10 (hoặc Super Admin → Settings) mới bật được | CDA |
| `ENABLE_PUSH_RELAY_SERVER` | giữ `false` (riêng tư: tránh đẩy nội dung tin khách qua hạ tầng Chatwoot) | OPS |
| `SECRET_KEY_BASE` | `openssl rand -hex 64` | OPS |
| `POSTGRES_DATABASE`, `POSTGRES_USERNAME` | giữ giá trị mẫu hoặc đặt tên khác | OPS |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` | OPS |
| `REDIS_PASSWORD` | `openssl rand -hex 24` | OPS |
| `CASSO_SECURE_TOKEN` | `openssl rand -hex 32`; dán **cùng giá trị** vào Casso (mục 5) | OPS |
| `CASSO_BANK_NAME`, `CASSO_ACCOUNT_NUMBER`, `CASSO_ACCOUNT_NAME` | Ngân hàng nhận tiền gói cước (mã/tên theo VietQR), số tài khoản, tên chủ tài khoản, hiển thị trên mã QR | CDA |
| `AGENTGW_BASE_URL`, `AGENTGW_API_KEY` | Do bên cấp cổng AI đưa (mục 6) | CDA |
| `ZALO_BRIDGE_SERVICE_SECRET` | `openssl rand -hex 32` (>= 32 ký tự) | OPS |
| `ZALO_BRIDGE_ACTIVE_KEY_ID` | `k1` | OPS |
| `ZALO_BRIDGE_ENCRYPTION_KEYS` | `openssl rand -hex 32`. **Đổi sau khi đã có phiên Zalo sẽ làm mất phiên đã lưu**; sao lưu giá trị này ở nơi an toàn | OPS |
| `MAILER_SENDER_EMAIL`, `SMTP_DOMAIN`, `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Tài khoản SMTP thật (mục 7) | CDA |
| `ACTIVE_STORAGE_SERVICE` | `local` (volume `storage_data`) | OPS |

Kiểm: `bash deploy/compose_check.sh` in `OK: compose config valid`; thiếu biến bắt buộc thì Compose dừng và nêu tên biến.

## 5. Casso và tài khoản ngân hàng

| Việc | Ai | Cách kiểm |
|---|---|---|
| Mở (hoặc chọn) tài khoản ngân hàng **riêng** nhận tiền gói cước | CDA | Có số tài khoản, tên chủ tài khoản đúng như ghi vào `.env.production` |
| Tạo tài khoản Casso, liên kết tài khoản ngân hàng đó | CDA | Casso hiện được giao dịch của tài khoản |
| Thêm webhook trong Casso: URL `https://app.<tên miền>/api/v1/casso/webhook`, header `Secure-Token: <giá trị CASSO_SECURE_TOKEN>` | CDA/OPS | Gửi thử từ Casso, Rails trả 200. Nếu nút "thử" của Casso gửi payload khác dạng thật thì Rails có thể trả **400 `invalid_payload`**: không phải lỗi cấu hình; xem `kc logs rails \| grep -i casso` (log chỉ ghi hình dạng `data=<Class> keys=<n>`, không ghi nội dung) và dùng giao dịch thật nhỏ để kiểm |
| **Thử chuyển khoản thật số tiền nhỏ** trước khi mở bán | CDA | Đăng nhập một shop thử, vào trang **Gói cước**, chép đúng nội dung chuyển khoản hiển thị (dạng `KALO <mã shop> PLAN`), chuyển tiền đúng giá gói. Hạn dùng tăng 30 ngày; trong Console → Giao dịch thấy sự kiện `matched`. Chuyển thử sai nội dung thì phải thấy `unmatched` và gán tay được ở Console |

Lưu ý: mỗi giao dịch có mã `tid` duy nhất; Casso gọi lại cùng `tid` không cộng 2 lần. Token lộ nghĩa là có người cộng tiền giả được: giữ bí mật, đổi định kỳ (đổi ở cả `.env.production` và Casso rồi `kc up -d`).

## 6. Khóa AI (AgentGW)

| Việc | Ai | Cách kiểm |
|---|---|---|
| Xin khóa AgentGW, điền `AGENTGW_BASE_URL`, `AGENTGW_API_KEY` | CDA | Trong một shop thử, mở một hội thoại có tin khách: thanh gợi ý trả lời hiện ra |
| **AI là tùy chọn:** không có khóa thì các endpoint AI trả 503 và giao diện ẩn gợi ý; phần còn lại của Kalo chạy bình thường | CDA | Quyết định có bán tính năng AI ngay hay không |

Có mức giới hạn 30 lần gọi AI/phút/shop và giới hạn độ dài nội dung; chi phí vẫn do CDA chịu, theo dõi hóa đơn AgentGW những tuần đầu.

## 7. SMTP

| Việc | Ai | Cách kiểm |
|---|---|---|
| Chọn nhà cung cấp SMTP, tạo `MAILER_SENDER_EMAIL` trên tên miền, thêm SPF/DKIM theo hướng dẫn nhà cung cấp | CDA/OPS | Kiểm điểm thư bằng một hộp Gmail: thư không vào spam |
| Gửi thử email đặt lại mật khẩu đến hộp thư thật | OPS | Nhận được thư, đường dẫn trỏ `https://app.<tên miền>` |

## 8. Thương hiệu trong DB cũ

`config/installation_config.yml` chỉ nạp giá trị khi tạo DB mới. Với DB đã có, `INSTALLATION_NAME` (có thể còn `KTech`), `BRAND_NAME`, `BRAND_URL`, `WIDGET_BRAND_URL` (đang `https://ktech.vn`, hiện chữ "Powered by" trong email và khung chat khách) phải sửa tay, **sau khi có tên miền**:

```bash
kc exec rails bundle exec rails runner '
  domain = "<tên miền>"
  { "INSTALLATION_NAME" => "Kalo", "BRAND_NAME" => "Kalo",
    "BRAND_URL" => "https://#{domain}", "WIDGET_BRAND_URL" => "https://#{domain}" }.each do |name, value|
    c = InstallationConfig.find_or_initialize_by(name: name)
    c.value = value
    c.save!
  end
  GlobalConfig.clear_cache
  puts InstallationConfig.where(name: %w[INSTALLATION_NAME BRAND_NAME BRAND_URL WIDGET_BRAND_URL]).map { |c| [c.name, c.value].join("=") }
'
```

Ai làm: OPS. Cách kiểm: lệnh in 4 dòng đúng giá trị; tiêu đề tab đăng nhập là "Kalo"; email đặt lại mật khẩu ghi "Kalo". `kc restart rails sidekiq` nếu giao diện còn chữ cũ. Màu widget/portal cũ đã lưu (`#1e5eff`) trong DB cũ không tự đổi; shop mới dùng màu coral.

## 9. SuperAdmin đầu tiên

OPS chạy đoạn lệnh ở `deploy.md` mục 6 (tạo một `User` có `type: "SuperAdmin"`; mật khẩu đọc từ biến môi trường `ADMIN_PASSWORD`, không gõ trong dòng lệnh). Mật khẩu mạnh, đổi ngay sau lần đăng nhập đầu. **Thứ tự bắt buộc:** tạo SuperAdmin ngay sau lần boot đầu, TRƯỚC khi mở site ra internet, vì sau seed trang `/installation/onboarding` công khai cho tới khi có SuperAdmin (đoạn lệnh đã xoá cờ Redis; code cũng trả 404 khi đã có SuperAdmin). Kiểm: `curl -s -o /dev/null -w '%{http_code}\n' https://app.<tên miền>/installation/onboarding` phải in `404`. Đoạn lệnh chưa chạy thử trên instance thật: kiểm trên staging. Cách kiểm: đăng nhập `https://app.<tên miền>/super_admin` và vào được Kalo Console (`/app/console`, chỉ hiện với SuperAdmin).

## 10. Mở đăng ký tài khoản

`ENABLE_ACCOUNT_SIGNUP` mặc định `false`. **Thứ tự ưu tiên:** `GlobalConfig` đọc dòng `InstallationConfig` trong DB trước; `installation_config.yml` đã nạp `false` khi seed nên biến `ENABLE_ACCOUNT_SIGNUP=true` trong `.env.production` **không** mở đăng ký. Chỉ lệnh dưới đây (hoặc Super Admin → Settings) mới có tác dụng; dòng tạo mới có `locked=true` nên có thể không hiện là chỉnh sửa được trong Super Admin, dùng lệnh runner; landing trỏ tới `/app/auth/signup` nên **chỉ bật khi đã qua staging và thử với shop thí điểm**. Bật bằng Super Admin → Settings, hoặc:

```bash
kc exec rails bundle exec rails runner '
  c = InstallationConfig.find_or_initialize_by(name: "ENABLE_ACCOUNT_SIGNUP"); c.value = true; c.save!; GlobalConfig.clear_cache'
```

Ai: CDA quyết định, OPS chạy. Cách kiểm: `https://app.<tên miền>/app/auth/signup` hiện form (khi `false` thì không). **Cân nhắc trước khi mở công khai:** một người có thể tạo nhiều account để lấy dùng thử 14 ngày liên tục (chưa có chống lạm dụng, review bảo mật I-8).

## 10b. Quyết định giá và tài khoản cũ (CDA)

- **Quyết định giá:** ba gói (299.000đ / 699.000đ / 1.990.000đ) hiện **chỉ khác giá, chưa khác tính năng hay giới hạn** (landing liệt kê giống nhau). Chủ dự án chọn trước khi bán: (a) bán đồng giá một gói, (b) bật giới hạn thật (cần phát triển, xem backlog), hoặc (c) giữ nguyên như hiện tại và chấp nhận điều đó. Không đổi giá khi chưa có quyết định.
- **Tài khoản cũ hơn 14 ngày không có kỳ trả phí là `expired` ngay lúc go-live** (chặn tạo sản phẩm, đơn, AI). Tài khoản thí điểm/thử cần Console → "Gia hạn" hoặc một khoản thanh toán thật.

## 11. Cài thật và kiểm trên staging

Mục "Chưa kiểm thử runtime" của `deploy.md` (mục 10) **bắt buộc kiểm trên staging** (máy riêng, tên miền con riêng) trước khi lên production. Ai: OPS (DEV hỗ trợ). Dùng cùng quy trình `deploy.md` mục 5.

- [ ] `docker compose build` đầy đủ chạy xong; `docker compose up -d` với image build thật, `kc ps` mọi service `healthy`.
- [ ] Healthcheck của Rails, Sidekiq, Zalo bridge hoạt động, gồm `docker/entrypoints/rails-prod.sh` (vòng chờ `pg_isready` không có giới hạn: nếu sai host DB thì treo thay vì crash; kiểm log khi khởi động).
- [ ] Certbot: cấp lần đầu `--standalone` trước khi bật Nginx, chuyển sang `--webroot`, `certbot renew --dry-run` thành công, deploy-hook reload được Nginx.
- [ ] Job CI `kalo_docker_build.yml` build image thành công (workflow này **chỉ build, không đẩy image lên registry**: quyết định cách đưa image lên server, `docker load` hoặc registry riêng).
- [ ] Đoạn lệnh tạo SuperAdmin (mục 9) chạy được (chưa từng chạy trên instance thật).
- [ ] `curl -I https://<tên miền>` ra landing có video; `https://app.<tên miền>` ra màn hình đăng nhập; `wss://app.<tên miền>/cable` kết nối được.
- [ ] Đăng nhập, tạo sản phẩm, tạo đơn, gửi mã QR trong chat, trang Báo cáo và Gói cước chạy trên dữ liệu thật.
- [ ] Kết nối Zalo cá nhân thử: quét QR, nhận và gửi một tin.
- [ ] Gửi mail thử (mục 7); thử Casso (mục 5).
- [ ] Kết quả kiểm khói và trình duyệt thật (12B) trong [báo cáo QA](../reports/2026-11-kalo-launch-qa.md) không còn mục hỏng.

## 12. Sao lưu và khôi phục

| Việc | Ai | Cách kiểm |
|---|---|---|
| Cài cron `script/ops/pg_backup.sh` hằng ngày (user riêng, `BACKUP_DIR` quyền 700; `deploy.md` mục 7) và sao lưu volume `storage_data` | OPS | Có thư mục `/var/backups/kalo/<ngày>/` với file `.dump` quyền 600 |
| Mã hóa bản sao trước khi đưa ra ngoài máy chủ bằng `age` (khuyến nghị) hoặc `gpg`; chỉ để public key trên server, khóa riêng cất nơi khác | OPS | Có file `.age`/`.gpg`; giải mã thử được trên máy có khóa riêng |
| **Diễn tập khôi phục:** `script/ops/pg_restore_test.sh` thoát 0 (hằng tuần), và một lần khôi phục thật từ bản đã giải mã vào máy staging | OPS | Đếm bảng `accounts` khớp; đăng nhập được vào bản khôi phục |
| Sao `ZALO_BRIDGE_ENCRYPTION_KEYS` và `.env.production` vào nơi lưu bí mật (password manager) | OPS/CDA | Mất khóa này thì phiên Zalo đã lưu không đọc lại được |

## 13. Mở dần

1. **Staging** đạt mục 11 và 12.
2. **Production, chưa mở signup.** DNS/chứng chỉ/`ps healthy`/Casso thật số tiền nhỏ OK. Ai: OPS, CDA xác nhận.
3. **1 shop thí điểm** (CDA chọn, được báo là bản đầu): dùng thật 1-2 tuần; xem log, Console, hóa đơn AgentGW, phản hồi.
4. **Mở signup** (mục 10) và bán. Sales chỉ hứa các tính năng ở mục 16.

## 14. Giám sát tối thiểu

| Việc | Ai | Cách kiểm |
|---|---|---|
| Uptime check ngoài (UptimeRobot hoặc tương đương) vào `https://app.<tên miền>/api` và `https://<tên miền>`; báo qua email/Zalo cho CDA | OPS | Tắt thử Rails 1-2 phút thì có cảnh báo |
| Theo dõi webhook Casso: Console → Giao dịch: theo dõi các sự kiện `unmatched`, `underpaid`, `description_ambiguous` (gán tay hoặc liên hệ khách); sự kiện `invalid` **không được lưu** nên không thấy ở Console (backlog ROADMAP), chỉ thấy qua log `invalid_payload` và báo lỗi của Casso; Casso không báo webhook lỗi | CDA/OPS | Mỗi tuần xem 1 lần |
| Xoay log (`logrotate` cho `/var/log/kalo-backup.log` và log Docker `max-size`) | OPS | `docker inspect` thấy giới hạn log; log không phình |
| Cảnh báo đĩa (>80%) và RAM; cảnh báo cron backup lỗi (mã thoát khác 0) | OPS | Ngưỡng thử gửi được cảnh báo |
| Gia hạn chứng chỉ chạy tự động | OPS | `certbot renew --dry-run` định kỳ |

## 15. Quay lui

Theo `deploy.md` mục 9: luôn `script/ops/pg_backup.sh` trước khi cập nhật; sự cố thì `git checkout <tag trước>`, `kc build && kc up -d`; nếu migration đã chạy và không đảo ngược được thì dừng `rails sidekiq` rồi `pg_restore` từ bản backup trước đó. Gắn tag image (`KALO_IMAGE=kalo-rails:<tag>`) để giữ bản cũ. Ai: OPS; **CDA quyết định quay lui** khi dữ liệu thanh toán bị ảnh hưởng. Sau khôi phục, đối chiếu giao dịch Casso trong khoảng thời gian bị mất với Console (gán tay sự kiện `unmatched`).

## 16. KHÔNG có trong bản này (sales không được hứa)

- **Giới hạn theo gói** (số nhân viên, kênh, tin nhắn AI…): chưa áp dụng và không được quảng bá; ba gói khác nhau chủ yếu về giá. Kalo không từ chối vì vượt "giới hạn gói".
- **Tự đối soát tiền đơn hàng của shop:** shop bấm "Đã nhận tiền" bằng tay. Chỉ tiền gói cước Kalo mới tự khớp qua Casso.
- **Vận chuyển GHN/GHTK:** chỉ nhập hãng và mã vận đơn.
- **Tích hợp POS ngoài** (KiotViet, Sapo, Nhanh.vn), **quản lý quảng cáo** (Meta/TikTok/Shopee), **đăng bài tự động**, **SMS Brandname, ZNS**, **video MMO**, **chi trả affiliate tự động**.
- Hết hạn dùng thử vẫn gọi được gửi QR/đổi trạng thái đơn đã có (chỉ chặn tạo sản phẩm, đơn, AI); đơn của mọi inbox hiển thị cho mọi nhân viên trong shop.
- Bản đầu có thể còn lỗi giao diện chưa phát hiện (kiểm trình duyệt thật xem báo cáo QA); chưa có SLA.

Danh sách đầy đủ việc hoãn: mục "Sau launch" của [ROADMAP.md](../ROADMAP.md).
