# Bài học và yêu cầu (không được lặp lại)

> Mỗi khi gặp lỗi, làm sai, hoặc chủ dự án chỉnh cách làm thì ghi ngay vào đây. File được import vào CLAUDE.md nên luôn nằm trong context.
> Định dạng: **Triệu chứng** → **Nguyên nhân** → **Quy tắc**. Mục mới thêm lên đầu nhóm tương ứng.

## A. Yêu cầu cố định từ chủ dự án

- **A1 (2026-09-28): `~/Projects/DSF/` chỉ được đọc.** Không sửa, tạo, xóa, build, cài, index bất cứ thứ gì trong đó. Đã có luật deny Edit/Write trong `.claude/settings.json`, nhưng Bash thì không chặn được nên phải tự tuân thủ.
- **A2 (2026-09-28): Không gọi bất kỳ API/dịch vụ nào của DSF**, cả trong lúc làm việc lẫn trong code của dự án này: `dsfsoft.vn`, repo GitHub `dsf-software/*`, gateway, endpoint lấy từ code DSF. Không copy secrets/URL/ENV của DSF sang đây.
- **A3 (2026-09-28): Bám sát plan.** Làm theo `docs/STATUS.md`, cập nhật trạng thái sau mỗi bước. Có việc chen ngang thì ghi vào STATUS (và ROADMAP nếu đổi phạm vi).
- **A4 (2026-09-28): Mọi lỗi gặp phải đều ghi vào file này** để lần sau không lặp lại.

## B. Lỗi kỹ thuật đã gặp

- **B1 (2026-09-28): `git status` trong repo DSF.**
  - Triệu chứng: `git status` thực chất có ghi `.git/index` (refresh stat).
  - Nguyên nhân: git tự cập nhật index khi chạy status.
  - Quy tắc: trong `~/Projects/DSF` chỉ dùng `git --no-optional-locks log|show|diff`, không bao giờ chạy `git status` hoặc lệnh git có ghi.
- **B2 (2026-09-28): `.claude/` bị `.gitignore` chặn toàn bộ.**
  - Triệu chứng: skill và settings dự án không được commit.
  - Nguyên nhân: `.gitignore` gốc của Chatwoot có dòng `.claude/`.
  - Quy tắc: đã đổi thành `.claude/*` kèm ngoại lệ `settings.json` và `skills/`. Khi thêm file cấu hình mới thì chạy `git check-ignore -v <file>` để kiểm tra.
- **B3 (2026-09-28): Không có lệnh `claude` trong PATH** (môi trường VSCode extension).
  - Triệu chứng: không cài plugin bằng CLI được.
  - Nguyên nhân: CLI đi kèm extension, không expose ra shell.
  - Quy tắc: khai báo plugin/marketplace theo kiểu declarative trong `.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`) rồi để người dùng xác nhận qua `/plugin`.
- **B5 (2026-09-29): Script trong container lỗi do CRLF.**
  - Triệu chứng: working tree trên Windows có CRLF (`core.autocrlf=true`), trong khi repo được mount thẳng vào container Linux, nên `docker/entrypoints/*.sh` và `bin/*` chạy lỗi `/bin/sh^M`.
  - Nguyên nhân: git tự đổi LF sang CRLF khi checkout trên Windows.
  - Quy tắc: `.gitattributes` đã ép `eol=lf`. Không bỏ dòng đó. Khi clone mới mà file vẫn là CRLF thì xoá file rồi chạy `git checkout-index -f -a`, sau đó `git add --renormalize .`.
- **B6 (2026-09-29): Mount thư mục build rỗng đè lên image.**
  - Triệu chứng: compose cũ mount `./zalo-personal-bridge/dist:/app/dist`, nhưng `dist/` bị gitignore nên trên máy không có, dẫn tới container bridge mất `dist/main.js` và crash.
  - Quy tắc: service chạy từ image build sẵn thì không mount thư mục build output. Muốn cập nhật thì rebuild image.
- **B4 (2026-09-28): Tưởng tính năng có route là tính năng chạy được.**
  - Triệu chứng: routes và frontend có Captain, SLA, Custom Roles… nhưng không có controller.
  - Nguyên nhân: thư mục `enterprise/` đã bị bỏ khỏi repo.
  - Quy tắc: xác nhận tính năng "chạy được" bằng cách kiểm tra controller, model và service thật (`codegraph query`), không dựa vào routes hay UI.
