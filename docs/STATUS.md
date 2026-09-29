# Tình trạng thực hiện

> File sống, cập nhật sau mỗi phiên làm việc. Đọc file này **đầu tiên** trước khi bắt tay vào việc.
> Trạng thái: `todo` · `in-progress` · `done` · `blocked` · `skipped`

**Phase hiện tại:** Phase 0 — Chuẩn bị
**Việc đang làm:** P0-05 (môi trường dev Docker), sau đó quay lại P0-02
**Cập nhật lần cuối:** 2026-09-29

## Phase 0 — Chuẩn bị

| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P0-01 | Setup tài liệu, CLAUDE.md, skills | done | CLAUDE.md, docs/, `.claude/settings.json` (superpowers, deny ghi DSF), `.mcp.json` + skill codegraph, index codegraph đã build |
| P0-02 | Ma trận tính năng | todo | |
| P0-03 | Chốt câu hỏi mở Q1–Q3 | blocked | Chờ chủ dự án trả lời (xem DECISIONS.md) |
| P0-04 | Remote upstream và quy trình merge | todo | |
| P0-05 | Môi trường dev local đầy đủ | in-progress | Nhánh `feat/P0-05-docker-dev-env`: sửa docker-compose (healthcheck, volume, secret chung Rails/bridge, bỏ mount `dist`), `.gitattributes` ép LF, lệnh `make docker_*`, hướng dẫn ở `docs/reference/dev-setup.md` |
| P0-06 | Staging và CI | todo | Gồm cả dọn workflow Chatwoot thừa hưởng |
| P0-07 | Chiến lược nhánh git | in-progress | ADR-006 `proposed`; đã có `develop` (local, chưa push) và nhánh `feat/*` đầu tiên; chưa bật branch protection |
| P0-08 | Manifest K8s toàn stack | todo | Hiện `deploy/k8s/` chỉ có bridge |

## Phase 1 → 9

Chưa bắt đầu. Danh sách task ở [ROADMAP.md](ROADMAP.md). Khi bắt đầu phase nào thì copy bảng task của phase đó vào đây.

## Việc chen ngang

Việc ngoài kế hoạch mà chủ dự án yêu cầu thì ghi vào đây. Nếu làm thay đổi phạm vi hoặc thứ tự thì cập nhật cả ROADMAP.md.

| Ngày | Yêu cầu | Trạng thái | Ảnh hưởng tới plan |
|---|---|---|---|
| 2026-09-29 | Rà soát kế hoạch Antigravity, bổ sung phần còn thiếu, tách nhánh để làm việc | done | Thêm P0-07, P0-08, P1-09, P1-10, P4-08, P4-09, ADR-006, Q4–Q5. Giữ ADR-001 (CMS riêng, Chatwoot headless); bỏ phần rebrand dashboard cũ trong kế hoạch Antigravity |

## Nhật ký

- **2026-09-29**: Rà soát kế hoạch do Antigravity đề xuất, bổ sung các mục CRM/ERP, Zalo bridge, K8s và chiến lược nhánh vào roadmap. Làm trên nhánh `docs/roadmap-crm-zalo-k8s`.
- **2026-09-28**: Audit dự án, chốt phương án 2 (CMS riêng, Chatwoot headless), dựng bộ docs, CLAUDE.md, codegraph và superpowers.
