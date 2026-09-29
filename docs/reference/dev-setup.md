# Môi trường dev local bằng Docker

> Task P0-05. Toàn bộ stack chạy bằng `docker-compose.yaml` ở gốc repo, không cần cài Ruby/Node/Postgres/Redis lên máy.

## Thành phần

| Service | Port máy | Vai trò |
|---|---|---|
| `rails` | 3000 | Chatwoot core (API + dashboard cũ, dùng tạm tới khi CMS mới đạt parity) |
| `sidekiq` | — | Background jobs |
| `vite` | 3036 | Dev server cho dashboard cũ |
| `postgres` | 5432 | Postgres 16 + pgvector, DB `chatwoot_dev` (bridge dùng chung, bảng `zalo_*`) |
| `redis` | 6379 | Sidekiq, cache, ActionCable, bridge |
| `zalo_personal_bridge` | 5001 | Bridge Zalo cá nhân, health ở `/health/ready`, metrics ở `/metrics` |
| `mailhog` | 8025 (UI), 1025 (SMTP) | Bắt email gửi ra |

Service `base` chỉ dùng để build image `chatwoot:development` (profile `build`), không chạy.

## Lần đầu

```bash
cp .env.example .env            # giữ POSTGRES_HOST=postgres, REDIS_URL=redis://redis:6379
docker compose --profile build build base   # image nền, lâu (10–20 phút)
docker compose build
docker compose run --rm rails bundle exec rails db:chatwoot_prepare   # load schema + seed + migrate
docker compose up -d
```

Có `make` (Linux/macOS/WSL) thì dùng gọn: `make docker_setup` rồi `make docker_up`.

Seed tạo sẵn tài khoản đăng nhập: `john@acme.inc` / `Password1!`.

## Hằng ngày

| Việc | Lệnh |
|---|---|
| Bật / tắt | `docker compose up -d` / `docker compose down` |
| Xem log | `docker compose logs -f rails sidekiq zalo_personal_bridge` |
| Rails console | `docker compose exec rails bundle exec rails console` |
| Chạy migration mới | `docker compose exec rails bundle exec rails db:migrate` |
| Chạy spec | `docker compose exec rails bundle exec rspec spec/path_spec.rb` |
| Sửa code bridge | `docker compose build zalo_personal_bridge && docker compose up -d zalo_personal_bridge` (bridge chạy từ image, không mount code) |
| Xoá sạch dữ liệu | `docker compose down -v` |

## Ghi chú

- Rails và bridge phải dùng chung `ZALO_BRIDGE_SERVICE_SECRET` (bridge ký webhook, Rails verify). Compose đã đặt giá trị dev mặc định cho cả hai; muốn đổi thì khai báo trong `.env`.
- Nếu đặt `REDIS_PASSWORD` trong `.env` thì phải khai báo thêm `ZALO_BRIDGE_REDIS_URL=redis://:<password>@redis:6379` cho bridge.
- **Trùng port:** nếu máy đã có project khác chiếm port, đặt `KCHAT_POSTGRES_PORT`, `KCHAT_BRIDGE_PORT`… trong `.env` (danh sách ở cuối `.env.example`). Port bên trong mạng docker không đổi.
- Lần `up` đầu tiên, container `vite` mất vài phút để `pnpm install` vào volume `node_modules`. Trong thời gian đó `/app/login` trả 500 ("Vite Ruby can't find entrypoints"). Theo dõi bằng `docker compose logs -f vite` và chờ tới dòng `VITE ... ready`.
- Bridge không có channel sẽ bị Rails trả 404 ở webhook, vì `set_channel` chạy trước bước verify chữ ký. Đó là hành vi đúng, không phải lỗi secret.
- Windows: repo có `.gitattributes` ép LF vì code được mount thẳng vào container Linux. Xem LESSONS B5.
- Compose này chỉ dành cho dev. Staging/production dùng manifest K8s (P0-08).
