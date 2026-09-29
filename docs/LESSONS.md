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
  - Bổ sung (2026-09-29): tạo worktree hoặc checkout từ một commit **chưa có** `.gitattributes` (ví dụ `develop` cũ) thì file vẫn ra CRLF, kể cả khi sau đó cherry-pick `.gitattributes` vào. Sau khi tạo worktree phải chạy `file docker/entrypoints/rails.sh` để kiểm tra, rồi làm lại bước ở trên nếu cần.
- **B6 (2026-09-29): Mount thư mục build rỗng đè lên image.**
  - Triệu chứng: compose cũ mount `./zalo-personal-bridge/dist:/app/dist`, nhưng `dist/` bị gitignore nên trên máy không có, dẫn tới container bridge mất `dist/main.js` và crash.
  - Quy tắc: service chạy từ image build sẵn thì không mount thư mục build output. Muốn cập nhật thì rebuild image.
- **B7 (2026-09-29): Lệnh trong entrypoint treo vì chờ prompt.**
  - Triệu chứng: container `vite` đứng ở 0% CPU, log dừng ở "modules directory will be removed… Proceed? (Y/n)".
  - Nguyên nhân: service có `tty: true` nên pnpm coi là phiên tương tác và chờ người trả lời.
  - Quy tắc: lệnh trong entrypoint/CI luôn chạy dạng không tương tác (`--config.confirmModulesPurge=false`, `-y`, `--frozen-lockfile`…). Khi chờ container thì vòng lặp chờ phải bắt cả trường hợp treo, không chỉ bắt dòng báo thành công.
- **B8 (2026-09-29): `sed` thay tên thương hiệu làm hỏng định danh code.**
  - Triệu chứng: lệnh `s/Chatwoot/KTech/g` đổi luôn `Chatwoot.config` và `ChatwootApp` trong `_navigation.html.erb`, sẽ làm hỏng trang super admin.
  - Nguyên nhân: bước kiểm tra định danh và lệnh `sed` nằm trong cùng một lệnh shell, nên sed vẫn chạy dù kiểm tra đã in ra kết quả.
  - Quy tắc: thay chữ thương hiệu thì dùng regex có ranh giới, không khớp với định danh (ví dụ `s/Chatwoot\b\([^A-Z.]\)/KTech\1/`), hoặc tách kiểm tra và thay thành 2 lệnh riêng. Sau khi thay phải chạy `git diff -U0 | grep -E "^\+.*KTech[A-Z.]"` để bắt lỗi.
- **B9 (2026-09-29): Vite trong Docker không nhận thay đổi file.**
  - Triệu chứng: sửa SCSS/Vue nhưng trang vẫn hiện bản cũ; phải restart container `vite` mới thấy.
  - Nguyên nhân: repo mount từ Windows vào container, sự kiện file (inotify) không truyền qua bind mount.
  - Quy tắc: service `vite` phải có `CHOKIDAR_USEPOLLING=true` (đã thêm vào docker-compose). Khi nghi CSS cũ thì kiểm tra log `vite` có dòng `hmr update` chưa.
- **B10 (2026-09-29): `git checkout -- <file>` để gỡ một dòng test làm mất thay đổi chưa commit.**
  - Triệu chứng: mất 3 biến vừa thêm vào `_ktech-theme.scss`.
  - Quy tắc: không bao giờ dùng `git checkout --`/`git restore` để hoàn tác một phần file đang có thay đổi chưa commit. Muốn test tạm thì sửa một file khác, hoặc gỡ đúng dòng đã thêm (`sed -i '$ d'`) sau khi kiểm tra nội dung.
- **B4 (2026-09-28): Tưởng tính năng có route là tính năng chạy được.**
  - Triệu chứng: routes và frontend có Captain, SLA, Custom Roles… nhưng không có controller.
  - Nguyên nhân: thư mục `enterprise/` đã bị bỏ khỏi repo.
  - Quy tắc: xác nhận tính năng "chạy được" bằng cách kiểm tra controller, model và service thật (`codegraph query`), không dựa vào routes hay UI.
