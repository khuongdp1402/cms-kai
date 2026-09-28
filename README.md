# KChat — CMS Hệ Thống Nhắn Tin

**KChat** là nền tảng CMS nhắn tin đa kênh dùng cho hệ sinh thái KTech, xây dựng trên nền Chatwoot open-source.

## Tính năng

- Quản lý hội thoại đa kênh (Zalo, Facebook, Email, WhatsApp, Telegram...)
- Kết nối Zalo Cá Nhân (ZaloPersonal) qua bridge nội bộ
- Tích hợp API cho backend ngoài (CRM, ERP)
- Webhook đẩy sự kiện ra hệ thống ngoài
- Widget chat nhúng vào website

## Cấu trúc dự án

```
cms-kai/
├── app/                    # Rails application
├── zalo-personal-bridge/   # Bridge kết nối Zalo cá nhân (TypeScript)
├── config/                 # Cấu hình Rails
├── db/                     # Database schema & migrations
└── deploy/                 # K8s deployment configs
```

## Yêu cầu môi trường

- Ruby (xem `.ruby-version`)
- Node.js 20+, pnpm
- PostgreSQL 13+
- Redis 6+

## Cài đặt

```bash
bundle install
pnpm install
```

## Chạy môi trường dev

```bash
pnpm dev
# hoặc
overmind start -f Procfile.dev
```

---

Built on [Chatwoot](https://www.chatwoot.com) open-source — customized for KTech ecosystem.
