# KChat (cms-kai) - Ma trận tính năng (Feature Matrix)

> Trạng thái: Draft | Cập nhật: 2026-09-29
> Mục đích: Rà soát và phân nhóm toàn bộ các tính năng cốt lõi (Core Features) và tính năng mở rộng (Extensions) của hệ thống CMS đa kênh KChat.

## 1. Tính năng cốt lõi (Core Omnichannel Chatwoot)

| Phân hệ (Module) | Tính năng (Feature) | Trạng thái / Ghi chú | Mức ưu tiên |
|---|---|---|---|
| **Quản lý Hội thoại (Conversations)** | Inbox tập trung đa kênh | Hỗ trợ gộp chung tin nhắn Zalo, Facebook, Email, Website | P0 |
| | Nhắn tin thời gian thực | Giao tiếp 2 chiều (Text, Hình ảnh, File đính kèm) | P0 |
| | Quản lý vòng đời hội thoại | Open, Resolved, Snoozed, Pending | P1 |
| | SLA & Business Hours | Tự động cảnh báo quá giờ, thiết lập giờ làm việc CSKH | P1 |
| **Quản lý Contact (Khách hàng)** | Hồ sơ khách hàng (CRM mini) | Lưu trữ Avatar, Tên, SĐT, Kênh liên hệ, Custom Attributes | P0 |
| | Lịch sử hội thoại (History) | Xem lại toàn bộ phiên chat cũ của cùng 1 contact | P0 |
| **Quản lý Agent (CSKH)** | Phân quyền và Role (RBAC) | Admin, Agent, Administrator... | P0 |
| | Tự động phân phối (Routing) | Round robin hoặc gán thủ công hội thoại cho Agent | P1 |
| **Báo cáo (Reports & Analytics)** | Báo cáo theo Agent / Kênh | Phân tích thời gian phản hồi (FRT, RT), số tin đã giải quyết | P2 |

## 2. Tính năng mở rộng & Tích hợp tùy biến (KTech Extensions)

| Phân hệ (Module) | Tính năng (Feature) | Trạng thái / Ghi chú | Mức ưu tiên |
|---|---|---|---|
| **Zalo Personal Bridge** | Quét QR tự động đăng nhập | Dùng Puppeteer & `zca-js` để auth tự động Zalo Cá nhân | P0 |
| | Đồng bộ Hội thoại Inbound | Từ Zalo cá nhân đổ về Chatwoot (Direct & Group chat) | P0 |
| | Gửi tin nhắn Outbound | Từ Chatwoot phản hồi ra Zalo cá nhân qua Webhook | P0 |
| | Hỗ trợ File đính kèm / Media | (Đang cải thiện) Xử lý ảnh (Sharp resize) & File | P1 |
| **Tích hợp bên thứ ba** | CRM/ERP Integration | Đồng bộ Lead/Customer qua API / Webhook ra ngoài | P1 |
| | Chatbot & Auto-reply AI | Phản hồi tự động qua các gem `ruby-openai`, `ai-agents` | P2 |

## 3. Quản trị & Vận hành (Ops/DevOps)

| Phân hệ (Module) | Tính năng (Feature) | Trạng thái / Ghi chú | Mức ưu tiên |
|---|---|---|---|
| **Hạ tầng (Infra)** | K8s Manifest & Helm Charts | Deploy dự án lên Kubernetes (P0-08) | P1 |
| | CI/CD Pipeline | Tự động test, linter, build Docker image | P1 |
| | Monitoring & Alerting | NewRelic, Datadog, Sentry (Tracking lỗi & Hiệu năng) | P2 |
| | Redis & Sidekiq | Background jobs cho các tác vụ nặng (Email, Webhook) | P0 |

---
*Tiếp theo trong roadmap: Sẽ bóc tách các tính năng này thành các Phase chi tiết để phát triển (Phase 1, Phase 2, ...).*
