# Bài học và yêu cầu (không được lặp lại)

> Mỗi khi gặp lỗi, làm sai, hoặc chủ dự án chỉnh cách làm thì ghi ngay vào đây. File được import vào CLAUDE.md nên luôn nằm trong context.
> Định dạng: **Triệu chứng** → **Nguyên nhân** → **Quy tắc**. Mục mới thêm lên đầu nhóm tương ứng.

## A. Yêu cầu cố định từ chủ dự án

- **A1 (2026-09-28): `~/Projects/DSF/` chỉ được đọc.** Không sửa, tạo, xóa, build, cài, index bất cứ thứ gì trong đó. Đã có luật deny Edit/Write trong `.claude/settings.json`, nhưng Bash thì không chặn được nên phải tự tuân thủ.
- **A2 (2026-09-28): Không gọi bất kỳ API/dịch vụ nào của DSF**, cả trong lúc làm việc lẫn trong code của dự án này: `dsfsoft.vn`, repo GitHub `dsf-software/*`, gateway, endpoint lấy từ code DSF. Không copy secrets/URL/ENV của DSF sang đây.
- **A3 (2026-09-28): Bám sát plan.** Làm theo `docs/STATUS.md`, cập nhật trạng thái sau mỗi bước. Có việc chen ngang thì ghi vào STATUS (và ROADMAP nếu đổi phạm vi).
- **A4 (2026-09-28): Mọi lỗi gặp phải đều ghi vào file này** để lần sau không lặp lại.

## B. Lỗi kỹ thuật đã gặp

- **B45 (2026-11-17): Mũi tên của ô chọn (select) hiện ở góc trên bên trái, đè lên chữ.**
  - Triệu chứng: ô "Sản phẩm" và "Thanh toán" của form đơn hàng có mũi tên ở góc trên trái, đè chữ "Hàng khác"/"Mã QR".
  - Nguyên nhân: `_base.scss` chỉ đặt vị trí mũi tên trong biến thể `ltr:`/`rtl:` (cần thuộc tính `dir`) và tính theo content box; thiếu `dir` thì vị trí về `0 0`.
  - Quy tắc: select tự tạo kiểu bằng Tailwind phải đặt rõ `pr-8 bg-origin-padding !bg-[position:right_0.75rem_center]` (xem `selectClass` trong `OrderForm.vue`), không dựa vào vị trí mặc định của `_base.scss`.
- **B46 (2026-11-17): Trạng thái gói trong Console không đọc `subscription_status`.**
  - Triệu chứng: shop có `subscription_status=active` vẫn hiện "Dùng thử" trong Console.
  - Nguyên nhân: theo ADR-019, trạng thái chỉ tính từ `subscription_valid_until` (và 14 ngày dùng thử); `subscription_status` chỉ là dấu ghi kèm khi cộng kỳ trả phí, không ai đọc.
  - Quy tắc: muốn kích hoạt gói bằng tay thì đặt `subscription_valid_until` (ISO 8601 đầy đủ) hoặc dùng nút gia hạn trong Console, không sửa riêng `subscription_status`.

- **B52 (2026-11-18): Chuỗi dịch "chốt" lúc tạo component nên vẫn hiện tiếng Anh dù app đã sang tiếng Việt.**
  - Triệu chứng: mô tả phím gửi tin ở Hồ sơ và tên thứ trên heatmap báo cáo hiện "Send messages…", "Thursday" khi mở thẳng trang (F5), dù khóa tiếng Việt có sẵn.
  - Nguyên nhân: gọi `t()`/`this.$t()` trong `data()` hoặc ở đầu `<script setup>` (mảng hằng); lúc đó locale còn là `en`, locale của tài khoản chỉ được áp sau khi tải `accounts/get`. Thêm `v-memo` chỉ theo dữ liệu nên không vẽ lại khi đổi locale. Ngoài ra date-fns 2 không có locale mặc định: mọi `format()` hiển thị phải đi qua `shared/helpers/dateLocale.js`.
  - Quy tắc: lưu khóa i18n trong dữ liệu, dịch ở template hoặc computed; `v-memo` của phần có chữ phải gồm `locale`. Ngày/tháng/thời lượng hiển thị dùng `formatDayDate`, `formatMonthName`, `formatDuration`… thay vì `format()`/`formatTime` trần. Trang đăng nhập lấy ngôn ngữ từ `DEFAULT_LOCALE`: stack dev thiếu biến này thì trang đăng nhập ra tiếng Anh (không phải lỗi code).
- **B31 (2026-11-17): Chuỗi i18n có ký tự "@" làm hỏng placeholder ghi chú.**
  - Triệu chứng: trình duyệt báo "Message compilation error: Invalid linked format" cho "Ghi chú chỉ nhân viên thấy… (gõ @ để nhắc tên)"; spec vitest vẫn xanh vì không mount chuỗi đó.
  - Nguyên nhân: trong vue-i18n `@` là cú pháp liên kết khóa (cũng như `{`, `}`, `|`).
  - Quy tắc: muốn hiện ký tự đó thì viết `{'@'}`. Namespace mới nên có spec dịch toàn bộ khóa và bắt lỗi biên dịch (xem `KaloChatThreadI18n.spec.js`).
- **B35 (2026-11-17): Gắn thẳng hàm `toggle` của vueuse làm listener của bus `mitt` nên lệnh "Gửi transcript" trên thanh lệnh không mở modal.**
  - Triệu chứng: `emitter.on(CMD_SEND_TRANSCRIPT, toggleEmailModal)` trong `MoreActions.vue`; chọn lệnh trên thanh Cmd+K thì modal không hiện, cờ thành `undefined`.
  - Nguyên nhân: mitt luôn gọi listener với một đối số (payload, ở đây `undefined`); `toggle(value)` của `useToggle` hễ có đối số là gán đúng giá trị đó thay vì đảo.
  - Quy tắc: không truyền thẳng `toggle`/setter nhận đối số làm listener của bus event hoặc `@event`; bọc bằng hàm không đối số (`() => toggle(true)`). Trong spec component, ref của vueuse không re-render dưới vitest ở repo này: component mới dùng `ref` thường.
- **B36 (2026-11-17): Nút "Xem hồ sơ & Đăng xuất" của Zalo cá nhân không làm gì.**
  - Triệu chứng: bấm nút trên banner Zalo cá nhân (Cài đặt hộp thư) không chuyển sang tab Cấu hình.
  - Nguyên nhân: template gán `selectedTabKey = 'configuration'`, mà `selectedTabKey` là computed chỉ đọc nên Vue bỏ qua (chỉ cảnh báo console).
  - Quy tắc: đổi tab bằng phương thức thật (`openTabByKey`/`onTabChange`), không gán vào computed trong template; viết UI bằng tay (không qua i18n) thì kiểm lại bằng spec hoặc trình duyệt.
- **B16 (2026-11-17): Task agent chỉ chạy thư mục test của mình nên bỏ sót 468 ca hỏng ở spec overlay i18n.**
  - Triệu chứng: sau khi gộp Task 8, `i18n/ktech/specs/overrides.spec.js` hỏng 468 ca (mọi khóa `KALO_*` không có khóa tiếng Anh tương ứng, mảng `WEEKDAYS` làm `text.match` lỗi); từng task đều báo "test xanh".
  - Nguyên nhân: mỗi agent chỉ chạy spec trong thư mục mình sửa, không ai chạy cả bộ.
  - Quy tắc: trước khi báo xong một nhánh/đợt phải chạy **cả bộ** rspec và vitest (`script/ktech/rspec.sh <track> spec`, `script/ktech/vitest.sh --poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=3`, hai cờ thread bắt buộc với Docker 8 GB, nếu không bị SIGKILL do hết RAM). Với rspec, loại `spec/enterprise` (code enterprise đã bỏ nên 139 lỗi nạp file) và bọc timeout từng ca vì có spec treo sẵn từ upstream. So kết quả với bản base để phân biệt lỗi có sẵn.
- **B12 (2026-11-16): Ghi "done" cho tính năng chỉ có giao diện mẫu.**
  - Triệu chứng: STATUS ghi POS, Ads, ZNS, Brand Growth "hoàn tất" nhưng backend không có tích hợp, số liệu là hằng số.
  - Quy tắc: chỉ ghi `done` khi có backend thật và spec chạy qua. Giao diện mẫu ghi rõ là `mockup`. Không trả số liệu giả qua API.
- **B11 (2026-11-16): Endpoint thanh toán và AI mở công khai.**
  - Triệu chứng: `casso/simulate` cộng gói cước thật không cần đăng nhập; webhook bỏ qua kiểm tra token khi thiếu ENV; `brand_growth/*` không xác thực và nhận `tenant` từ tham số.
  - Quy tắc: endpoint đổi dữ liệu tiền/gói phải có xác thực bắt buộc, thiếu cấu hình thì từ chối (không "tùy chọn"). Endpoint theo tenant đặt dưới `/api/v1/accounts/:account_id` kế thừa `Api::V1::Accounts::BaseController`. Endpoint thử nghiệm chỉ khai route trong development.
  - Bổ sung: không gộp whitelist CORS với `/public/api/*` và `/packs/*`, vì widget nhúng trên website khách cần `*`.

- **B14 (2026-11-16): `account.limits` của Chatwoot không giới hạn gì.**
  - Triệu chứng: đặt `limits: {agents: 2}` cho tài khoản nhưng vẫn thêm được nhân viên thứ 3.
  - Nguyên nhân: `Account#usage_limits` (bản không có enterprise) trả cứng `ChatwootApp.max_limit`, không đọc cột `limits`.
  - Quy tắc: muốn áp giới hạn gói phải kiểm bằng spec chạy thật (thêm nhân viên vượt mức), không dựa vào việc cột `limits` tồn tại. Không ghi `limits` rồi coi như đã áp dụng.
- **B15 (2026-11-16): Spec không dùng transaction làm bẩn các spec sau.**
  - Triệu chứng: spec đếm tài khoản/liên hệ lệch ngẫu nhiên vì còn dữ liệu của spec đồng thời.
  - Nguyên nhân: `let!` của group ngoài vẫn chạy trong example `use_transactional_tests = false`, và dữ liệu đó không được dọn.
  - Quy tắc: spec cần nhiều kết nối thật nằm file riêng, tự tạo và tự xoá toàn bộ dữ liệu trong `after`.

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
- **B13 (2026-11-16): `pnpm eslint <files>` không lint đúng file chỉ định.**
  - Triệu chứng: `pnpm eslint a.vue b.js` báo "No files matching the pattern", hoặc đáng ngại hơn là chạy `--fix` trên cả `app/**`.
  - Nguyên nhân: script `eslint` trong package.json đã gắn sẵn glob `app/**/*.{js,vue} --fix`, tham số thêm vào bị ghép thành một pattern.
  - Quy tắc: lint file cụ thể bằng `npx eslint <files> --ext .js,.vue` (trong container rails); chỉ dùng `pnpm eslint` khi muốn lint cả dự án.
- **B17 (2026-11-17): `DEFAULT_LOCALE=vi` trong `.env.example` làm 6 spec upstream hỏng.**
  - Triệu chứng: gate cuối có 80 lỗi thay vì 74; 6 ca so khớp thông báo tiếng Anh nhận về tiếng Việt (dyte, widget conversations, v2 accounts, omniauth, session x2).
  - Nguyên nhân: `rspec.sh` copy `.env.example` thành `.env`, mà commit smoke đặt `DEFAULT_LOCALE=vi`; 12A chạy trước commit đó nên không thấy.
  - Quy tắc: `script/ktech/rspec.sh` ép `-e DEFAULT_LOCALE=en`. Đổi mặc định cấu hình thì chạy lại cả bộ rspec.
- **B4 (2026-09-28): Tưởng tính năng có route là tính năng chạy được.**
  - Triệu chứng: routes và frontend có Captain, SLA, Custom Roles… nhưng không có controller.
  - Nguyên nhân: thư mục `enterprise/` đã bị bỏ khỏi repo.
  - Quy tắc: xác nhận tính năng "chạy được" bằng cách kiểm tra controller, model và service thật (`codegraph query`), không dựa vào routes hay UI.
