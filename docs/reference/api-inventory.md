# docs/reference/api-inventory.md
# KChat API Inventory (P1-06)
> Danh sách đầy đủ các API endpoints mà KChat CMS frontend sẽ sử dụng.
> Sinh từ `swagger/` và xác minh lại qua codebase thực tế.
> Auth: `access-token`, `client`, `uid` (devise_token_auth headers).

## 1. Authentication

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/auth/sign_in` | Đăng nhập, trả về auth headers | Không |
| DELETE | `/auth/sign_out` | Đăng xuất, xoá token | Có |
| POST | `/auth/password` | Yêu cầu reset mật khẩu | Không |
| PUT | `/auth/password` | Đặt mật khẩu mới | Có (reset token) |
| GET | `/auth/validate_token` | Kiểm tra token còn hiệu lực | Có |

## 2. Profile

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/profile` | Lấy thông tin user hiện tại | Có |
| PUT | `/api/v1/profile` | Cập nhật profile, avatar | Có |
| GET | `/api/v1/profile/availability` | Trạng thái online/offline | Có |
| GET | `/api/v1/profile/notifications` | Cài đặt thông báo | Có |
| POST | `/api/v1/profile/mfa` | Bật MFA | Có |

## 3. Accounts

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/accounts/:id` | Chi tiết account | Có |
| PUT | `/api/v1/accounts/:id` | Cập nhật account settings | Có (admin) |
| GET | `/api/v1/accounts/:id/cache_keys` | Cache key cho invalidation | Có |

## 4. Conversations (Core)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/accounts/:id/conversations` | List conversations (filter, page) | Có |
| GET | `/api/v1/accounts/:id/conversations/filter` | Filter nâng cao | Có |
| GET | `/api/v1/accounts/:id/conversations/meta` | Meta stats (unread count, v.v.) | Có |
| GET | `/api/v1/accounts/:id/conversations/:display_id` | Chi tiết conversation | Có |
| PATCH | `/api/v1/accounts/:id/conversations/:display_id` | Cập nhật status/assignee/labels | Có |
| GET | `/api/v1/accounts/:id/conversations/:display_id/messages` | Danh sách messages | Có |
| POST | `/api/v1/accounts/:id/conversations/:display_id/messages` | Gửi message | Có |
| DELETE | `/api/v1/accounts/:id/conversations/:display_id/messages/:message_id` | Xoá message | Có |
| POST | `/api/v1/accounts/:id/conversations/:display_id/participants` | Thêm participants | Có |
| POST | `/api/v1/accounts/:id/conversations/:display_id/assignments` | Gán agent | Có |
| POST | `/api/v1/accounts/:id/conversations/:display_id/labels` | Gắn label | Có |
| POST | `/api/v1/accounts/:id/conversations/:display_id/read` | Đánh dấu đã đọc | Có |
| GET | `/api/v1/accounts/:id/conversations/:display_id/activities` | Activity log | Có |

## 5. Contacts

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/accounts/:id/contacts` | List contacts (page, sort) | Có |
| GET | `/api/v1/accounts/:id/contacts/search` | Tìm contact theo q | Có |
| GET | `/api/v1/accounts/:id/contacts/filter` | Filter nâng cao | Có |
| POST | `/api/v1/accounts/:id/contacts` | Tạo contact mới | Có |
| GET | `/api/v1/accounts/:id/contacts/:contact_id` | Chi tiết contact | Có |
| PUT | `/api/v1/accounts/:id/contacts/:contact_id` | Cập nhật contact | Có |
| DELETE | `/api/v1/accounts/:id/contacts/:contact_id` | Xoá contact | Có (admin) |
| GET | `/api/v1/accounts/:id/contacts/:contact_id/conversations` | Conversations của contact | Có |
| GET | `/api/v1/accounts/:id/contacts/:contact_id/notes` | Notes của contact | Có |
| POST | `/api/v1/accounts/:id/contacts/:contact_id/notes` | Tạo note | Có |

## 6. Inboxes

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/accounts/:id/inboxes` | List tất cả inboxes | Có |
| POST | `/api/v1/accounts/:id/inboxes` | Tạo inbox mới | Có (admin) |
| GET | `/api/v1/accounts/:id/inboxes/:inbox_id` | Chi tiết inbox | Có |
| PATCH | `/api/v1/accounts/:id/inboxes/:inbox_id` | Cập nhật inbox | Có (admin) |
| DELETE | `/api/v1/accounts/:id/inboxes/:inbox_id` | Xoá inbox | Có (admin) |
| GET | `/api/v1/accounts/:id/inbox_members/:inbox_id` | Members của inbox | Có |

## 7. Agents & Teams

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/accounts/:id/agents` | List agents | Có |
| POST | `/api/v1/accounts/:id/agents` | Tạo agent mới | Có (admin) |
| PUT | `/api/v1/accounts/:id/agents/:agent_id` | Cập nhật agent | Có (admin) |
| DELETE | `/api/v1/accounts/:id/agents/:agent_id` | Xoá agent | Có (admin) |
| GET | `/api/v1/accounts/:id/teams` | List teams | Có |
| POST | `/api/v1/accounts/:id/teams` | Tạo team | Có (admin) |
| GET | `/api/v1/accounts/:id/teams/:team_id/team_members` | Members của team | Có |

## 8. Reports

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v2/accounts/:id/reports` | Báo cáo tổng hợp | Có |
| GET | `/api/v2/accounts/:id/reports/agents/conversations` | Báo cáo theo agent | Có |
| GET | `/api/v2/accounts/:id/reports/overview` | Overview tổng quan | Có |
| GET | `/api/v1/accounts/:id/reports/agents/satisfaction` | CSAT theo agent | Có |

## 9. Notifications

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/accounts/:id/notifications` | List notifications | Có |
| POST | `/api/v1/accounts/:id/notifications/read_all` | Đánh dấu tất cả đã đọc | Có |
| POST | `/api/v1/accounts/:id/notifications/:id/read` | Đánh dấu đã đọc | Có |

## 10. WebSocket (ActionCable)

| Channel | Subscribe params | Events nhận | Ghi chú |
|---------|-----------------|-------------|---------|
| `RoomChannel` | `{ account_id }` | `conversation.created`, `conversation.status_changed`, `message.created`, `contact.created`, v.v. | Toàn bộ event list trong `action_cable_listener.rb` |

## 11. KChat Custom Endpoints (namespace `/api/v1/kchat`)

> Các endpoint này sẽ được phát triển trong Phase 4-5 khi có yêu cầu tích hợp CRM/ERP.

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/v1/kchat/crm/contacts/:id` | Đồng bộ contact từ CRM | Có (admin) |
| POST | `/api/v1/kchat/crm/sync` | Trigger đồng bộ thủ công | Có (admin) |
| GET | `/api/v1/kchat/zalo/status` | Trạng thái kết nối Zalo Bridge | Có |
