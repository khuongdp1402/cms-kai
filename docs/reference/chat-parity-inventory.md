# Bảng kiểm chống mất chức năng: khung chat và Cài đặt

> Task 0 của [kế hoạch giao diện đợt 2](../plans/2026-11-17-kalo-ui-phase2.md), mục "Rà soát chống mất chức năng".
> Lập ngày 2026-11-17 bằng cách đọc code thật (không chạy app). Mỗi dòng có `file:line` đã đọc.
> Task 1 (khung chat) và Task 2 (Cài đặt) phải nộp lại bảng này với cột "Kết quả" điền một trong: **giữ nguyên / đổi vị trí / bỏ có chủ đích (lý do, chủ dự án duyệt)**.

**Viết tắt đường dẫn**

- `D/` = `app/javascript/dashboard/`
- `W/` = `app/javascript/dashboard/components/widgets/conversation/`
- `E/` = `app/javascript/dashboard/components/widgets/WootWriter/`
- `M/` = `app/javascript/dashboard/components-next/message/`
- `R/` = `app/javascript/dashboard/routes/dashboard/`
- `S/` = `app/javascript/dashboard/routes/dashboard/settings/`
- `ST/` = `app/javascript/dashboard/store/modules/`

**Mức rủi ro** = khả năng bị mất *âm thầm* khi viết lại giao diện: `cao` = tính năng ẩn (phím tắt, sự kiện DOM, bus event, realtime), không nhìn thấy trên mockup; `TB` = có nút/khu vực riêng nhưng dễ quên khi đổi bố cục; `thấp` = phần chính của màn, ai cũng thấy.

**Lưu ý về spec:** khung chat gần như không có spec component (chỉ `ConversationCard.spec.js` và các component Kalo). Phần lớn spec là của store/helper/composable, nên "có spec" **không** bảo vệ việc component mới còn gọi đúng action. Task 1 phải thêm spec component cho mỗi dòng "đổi vị trí".

---

## A. Khung chat

### A1. Danh sách hội thoại

| ID | Chức năng | Vị trí (file:line) | Spec hiện có | Kiểm tay trên trình duyệt | Rủi ro |
|---|---|---|---|---|---|
| C-01 | Tab Của tôi / Chưa giao / Tất cả, kèm số đếm | `D/components/ChatList.vue:930` (`ChatTypeTabs`), số đếm `:222` | `ST/specs/conversationStats/*.spec.js` | Bấm 3 tab, số trên tab khớp số dòng | TB |
| C-02 | Phím **Alt+N** chuyển tab kế tiếp | `D/components/widgets/ChatTypeTabs.vue:33` | none | Nhấn Alt+N, tab đổi vòng | cao |
| C-03 | Lọc trạng thái (Mở/Chờ/Hoãn/Đã xong/Tất cả) và sắp xếp, nhớ vào UI settings | `D/components/widgets/conversation/ConversationBasicFilter.vue:122-137` | none | Đổi trạng thái + sắp xếp, F5 vẫn giữ | TB |
| C-04 | Bộ lọc nâng cao (modal điều kiện) | `D/components/ChatList.vue:983` (`ConversationFilter`), `:420` `onApplyFilter` | `W/advancedFilterItems/specs/*.spec.js`, `D/helper/specs/filterQueryGenerator.spec.js`, `ST/conversations/helpers/specs/filterHelpers.spec.js` | Mở lọc, thêm điều kiện nhãn, danh sách thu hẹp | TB |
| C-05 | Lưu bộ lọc thành thư mục (custom view), sửa, xóa thư mục | `D/components/ChatList.vue:913` (`SaveCustomView`), `:921` (`DeleteCustomViews`), `:434` `onUpdateSavedFilter` | `D/helper/specs/customViewsHelper.spec.js` | Lưu thư mục, thấy trong bộ lọc kênh, xóa được | TB |
| C-06 | Lọc theo hộp thư / nhãn / nhóm / thư mục từ rail | `D/components-next/sidebar/KaloMessageFilters.vue:27-60`, route `R/conversation/conversation.routes.js:70-156` | `D/components-next/sidebar/specs/KaloMessageFilters.spec.js` | Mở bộ lọc trên rail, chọn 1 nhãn → URL `/label/...` | thấp |
| C-07 | Danh sách Được nhắc tên / Chưa phản hồi / Đang tham gia | route `R/conversation/conversation.routes.js:168-226`; **KaloMessageFilters không có link** | none | Gõ URL `/mentions/conversations` → vẫn chạy; trên rail không có lối vào | cao (đã mất lối vào) |
| C-08 | Cuộn tải thêm (IntersectionObserver) + dòng "hết danh sách" | `D/components/ConversationList.vue:88`, `:86`; `D/components/ChatList.vue:591` `loadMoreConversations` | `ST/specs/conversationPage/*.spec.js` | Hộp thư > 25 hội thoại, cuộn xuống thấy tải tiếp | cao |
| C-09 | Danh sách ảo hóa (virtua `Virtualizer`) | `D/components/ConversationList.vue:66` | none | 500+ hội thoại vẫn cuộn mượt | TB |
| C-10 | Phím **Alt+J / Alt+K** sang hội thoại trước/sau. Dựa vào selector DOM `div.conversations-list div.conversation` và `.active` | `D/composables/chatlist/useChatListKeyboardEvents.js:5-11,49-56`; class ở `W/ConversationCard.vue:112-117`, `D/components/ConversationList.vue` (class `conversations-list`) | none | Mở 1 hội thoại, Alt+K sang hội thoại dưới | cao |
| C-11 | Thẻ hội thoại: avatar, tên, hộp thư, người phụ trách (hoặc bot), ưu tiên, xem trước tin cuối, thời gian, số chưa đọc, nhãn, SLA | `W/ConversationCard.vue:128-243` | `W/specs/ConversationCard.spec.js` (chỉ phần SLA/nhãn) | So 1 thẻ với dữ liệu hội thoại | thấp |
| C-12 | Chọn nhiều: rê chuột lên avatar hiện checkbox | `W/ConversationCard.vue:139-145`, `D/components/ConversationItem.vue:113-119` | `ST/specs/bulkActions/*.spec.js` | Rê lên avatar, tick 2 thẻ, thanh thao tác hàng loạt hiện | cao |
| C-13 | Thao tác hàng loạt: chọn tất cả, gắn/gỡ nhãn, đổi trạng thái, hoãn (kể cả giờ tùy chọn), giao nhân viên, giao nhóm | `W/conversationBulkActions/Index.vue:155-208`; `D/composables/chatlist/useBulkActions.js:9-210` | `ST/specs/bulkActions/*.spec.js` | Chọn 2 thẻ, giao 1 nhân viên, cả 2 đổi | cao |
| C-14 | Thao tác hàng loạt qua thanh lệnh (hoãn / mở lại / xong) | `D/composables/commands/useBulkActionsHotKeys.js:26-51`; bus event `W/conversationBulkActions/Index.vue:118-120` | `D/composables/commands/spec/useBulkActionsHotKeys.spec.js` | Chọn 2 thẻ, Ctrl+K gõ "resolve" | cao |
| C-15 | Menu chuột phải trên thẻ: đọc/chưa đọc, xong/mở lại/chờ, hoãn, ưu tiên, nhãn, nhân viên, nhóm, mở tab mới, sao chép link, xóa (admin) | `D/components/ConversationItem.vue:122-177,218-234`; `W/contextMenu/Index.vue:98-182,435-445` | none | Chuột phải 1 thẻ, thử "Đánh dấu chưa đọc" | cao |
| C-16 | Ctrl/Cmd+click thẻ mở tab mới | `D/components/ConversationItem.vue:95-107` | none | Cmd+click thẻ → tab mới | cao |
| C-17 | Xóa hội thoại (hộp xác nhận) | `D/components/ChatList.vue:822`, `:966-977` | `ST/specs/conversations/actions.spec.js` | Admin chuột phải → Xóa → xác nhận | TB |
| C-18 | Chuyển bố cục thẻ gọn / mở rộng | `D/components/ChatListHeader.vue:42,162` (`SwitchLayout`); `D/components/ConversationItem.vue` (`ConversationCardExpanded`) | none | Bấm nút đổi bố cục, thẻ đổi kiểu | TB |
| C-19 | Trạng thái rỗng của danh sách | `D/components/ChatList.vue:939` | none | Lọc ra 0 kết quả, thấy thông báo | thấp |
| C-20 | Soạn hội thoại mới (từ bộ lọc rail và từ panel khách) | `D/components-next/sidebar/KaloMessageFilters.vue:85` (`ComposeConversation`); `R/conversation/contact/ContactInfo.vue:296`; `D/components-next/NewConversation/ComposeConversation.vue` | `D/components-next/NewConversation/helpers/specs/composeConversationHelper.spec.js` | Bấm "Hội thoại mới", chọn khách + hộp thư, gửi | TB |
| C-21 | Phím **Cmd/Ctrl+Enter** (và Enter) gửi trong form hội thoại mới | `D/components-next/NewConversation/components/ActionButtons.vue:148,159`; `.../ComposeNewConversationForm.vue:353` | none | Mở form, Cmd+Enter gửi | cao |
| C-22 | Tìm kiếm hội thoại/khách/tin nhắn | route `D/modules/search/search.routes.js:14`; nút ở `D/components-next/sidebar/KaloRailFooter.vue:34` | `ST/specs/conversationSearch/*.spec.js` | Bấm tìm kiếm trên rail, gõ tên khách | TB |

### A2. Đầu hội thoại và thao tác trên hội thoại

| ID | Chức năng | Vị trí (file:line) | Spec hiện có | Kiểm tay trên trình duyệt | Rủi ro |
|---|---|---|---|---|---|
| C-23 | Header: avatar, tên khách, hộp thư (khi > 1 hộp thư), dấu "đang hoãn đến…" | `W/ConversationHeader.vue:118-166` | none | Mở hội thoại đã hoãn, thấy giờ hoãn | thấp |
| C-24 | Cảnh báo khách web widget chưa xác minh HMAC | `W/ConversationHeader.vue:64,140` | none | Hội thoại widget không HMAC → thấy biểu tượng cảnh báo | TB |
| C-25 | Bấm để sao chép ID hội thoại | `W/ConversationHeader.vue:100-104,154` | none | Bấm ID, dán ra được số | cao |
| C-26 | Nút Xong + menu: Mở lại / Chờ / Hoãn đến… | `D/components/buttons/ResolveAction.vue:84-137,229,248` | none | Bấm Xong, rồi Mở lại; chọn Chờ | thấp |
| C-27 | Phím **Alt+E** xong, **Cmd+Alt+E** xong và nhảy hội thoại kế, **Alt+M** mở menu trạng thái | `D/components/buttons/ResolveAction.vue:141-160` | none | Nhấn Cmd+Alt+E, hội thoại đóng và mở hội thoại dưới | cao |
| C-28 | Hỏi thuộc tính bắt buộc trước khi đóng hội thoại | `D/components/buttons/ResolveAction.vue:253` (`ConversationResolveAttributesModal`); `D/components/ChatList.vue:776` | `D/composables/spec/useConversationRequiredAttributes.spec.js` | Bật cờ thuộc tính bắt buộc ở Cài đặt (S-19), bấm Xong → modal hiện | cao |
| C-29 | Hoãn: hôm nay/mai/tuần sau/tháng sau/giờ tùy chọn; qua thanh lệnh | `R/commands/CmdBarConversationSnooze.vue:21-31`; `D/helper/snoozeHelpers.js:49-51`; `D/components/CustomSnoozeModal.vue` | `D/helper/specs/snoozeHelpers.spec.js`, `snoozeDateParser.spec.js` | Hoãn đến giờ tùy chọn, hội thoại sang tab Hoãn | TB |
| C-30 | Tắt/bật thông báo hội thoại (mute) | `W/MoreActions.vue:36-48,95-114` | none | Menu ⋯ → Tắt tiếng, tin mới không kêu | TB |
| C-31 | Gửi transcript qua email | `W/MoreActions.vue:50-55,155`; `W/EmailTranscriptModal.vue:81` | none | Menu ⋯ → Gửi transcript → nhập email | TB |
| C-32 | Đồng bộ tin Zalo cá nhân (Kalo) | `W/MoreActions.vue:58-87,102` | none | Hội thoại Zalo cá nhân → menu ⋯ → Đồng bộ | TB |
| C-33 | Tab Dashboard App cạnh tab Tin nhắn | `W/ConversationBox.vue:79,111-114,137` | none | Thêm Dashboard App ở S-16, thấy tab trong hội thoại | TB |
| C-34 | Nút gọi video Dyte (bubble `Dyte.vue`) | `M/bubbles/Dyte.vue`; backend `app/controllers/api/v1/accounts/integrations/dyte_controller.rb` | none | Bật Dyte ở S-16, bắt đầu cuộc gọi | thấp |
| C-35 | Bật/tắt panel khách, phím **Alt+O** | `D/components-next/Conversation/SidepanelSwitch.vue:51`; `R/conversation/ConversationView.vue:214` | none | Nhấn Alt+O, panel phải ẩn/hiện | cao |

### A3. Luồng tin nhắn

| ID | Chức năng | Vị trí (file:line) | Spec hiện có | Kiểm tay trên trình duyệt | Rủi ro |
|---|---|---|---|---|---|
| C-36 | Cuộn lên tải tin cũ, giữ vị trí cuộn | `W/MessagesView.vue:385-429` (`fetchPreviousMessages`) | `W/helpers/specs/scrollTopCalculationHelper.spec.js` | Hội thoại dài, cuộn lên đầu, tin cũ nạp không nhảy | cao |
| C-37 | Mở hội thoại: nhảy tới tin chưa đọc đầu tiên, nhãn "N tin chưa đọc" | `W/MessagesView.vue:351-381,491-499` | none | Hội thoại có 3 tin chưa đọc, mở ra thấy dải chưa đọc | cao |
| C-38 | Đánh dấu đã đọc khi mở | `W/MessagesView.vue:339,432-433` | `ST/specs/conversations/actions.spec.js` | Mở hội thoại, số chưa đọc trên thẻ về 0 | cao |
| C-39 | Nhảy tới một tin (link `?messageId=`), bus `SCROLL_TO_MESSAGE` | `W/MessagesView.vue:261,326-336`; `D/../shared/constants/busEvents.js:5` | none | Sao chép link tin (C-46) rồi mở | cao |
| C-40 | Chỉ báo "đang gõ" của khách/nhân viên | `W/MessagesView.vue:114-127,514-524`; `D/helper/commons.js` `getTypingUsersText` | `D/helper/specs/commons.spec.js`, `ST/specs/conversationTypingStatus/*.spec.js` | Gõ trên widget, dashboard hiện "đang gõ" | cao |
| C-41 | Banner hết cửa sổ 24h (FB/IG/TikTok/WhatsApp Twilio) và banner hộp thư Instagram cũ | `W/MessagesView.vue:173-224,456-468` | none | Hội thoại FB quá 24h → banner | TB |
| C-42 | Gợi ý nhãn (Captain `label_suggestion`) | `W/MessagesView.vue:100-110,285-311,504`; `W/conversation/LabelSuggestion.vue` | none | Bật `captain_tasks` + khóa API, mở hội thoại mới | TB |
| C-43 | Gửi lại tin lỗi | `W/MessagesView.vue:435-438,479`; `M/MessageError.vue` | none | Tắt mạng, gửi, bấm "thử lại" | cao |
| C-44 | Loại bong bóng: chữ, email, ảnh, file, audio, video, vị trí, danh bạ, CSAT, form, embed, IG story, hoạt động, sticker Zalo, không hỗ trợ | `M/Message.vue:320-370`; `M/bubbles/*.vue`; sticker `M/bubbles/StickerBubble.vue:17-28`, chọn ở `M/Message.vue:327-329` | none | Mở 1 hội thoại mỗi kênh, xem từng loại | TB |
| C-45 | Ghi chú riêng hiển thị khác màu, không gửi cho khách | `M/Message.vue:165` (`MESSAGE_VARIANTS.PRIVATE`) | none | Gửi ghi chú (C-51), bong bóng màu ghi chú | cao |
| C-46 | Menu chuột phải trên tin: sao chép, dịch, sao chép link, thêm vào câu trả lời mẫu, trả lời trích dẫn, xóa | `M/Message.vue:397-425,446-475`; `D/modules/conversations/components/MessageContextMenu.vue:89-149,172-271` | none | Chuột phải 1 tin outgoing, thử từng mục | cao |
| C-47 | Trả lời trích dẫn (reply-to), bus `TOGGLE_REPLY_TO_MESSAGE`, lưu localStorage | `M/Message.vue:470-475`; `W/ReplyBox.vue:530,1207-1219,1303` (`ReplyToMessage`) | none | Chuột phải → Trả lời, khung soạn hiện trích dẫn | cao |
| C-48 | Dịch tin / bật tắt bản dịch | `D/modules/conversations/components/MessageContextMenu.vue:128`; `M/TranslationToggle.vue`; backend `messages_controller.rb#translate` | none | Chuột phải → Dịch | TB |
| C-49 | Trạng thái tin (đã gửi/đã nhận/đã xem/lỗi) | `M/MessageStatus.vue`, `M/MessageMeta.vue` | none | Gửi trên widget, thấy dấu đã xem | TB |
| C-50 | Xem ảnh dạng gallery, phím **← → Esc** | `W/components/GalleryView.vue:147-156` | none | Bấm 1 ảnh, dùng phím mũi tên | cao |

### A4. Khung soạn tin (ReplyBox / Editor)

| ID | Chức năng | Vị trí (file:line) | Spec hiện có | Kiểm tay trên trình duyệt | Rủi ro |
|---|---|---|---|---|---|
| C-51 | Chuyển Trả lời ↔ Ghi chú riêng; phím **Alt+P** (ghi chú) / **Alt+L** (trả lời) | `E/ReplyTopPanel.vue:105-114`; `E/Editor.vue:636-643`; `W/ReplyBox.vue:935-941` | none | Nhấn Alt+P, khung soạn đổi màu ghi chú | cao |
| C-52 | Gửi bằng **Enter** hoặc **Cmd/Ctrl+Enter** theo cài đặt hồ sơ; chặn gửi khi đang mở menu gợi ý | `W/ReplyBox.vue:693-722`; `E/Editor.vue:650-658`; cài đặt ở `S/profile/Index.vue:204-207,294` | `D/composables/spec/useUISettings.spec.js` | Đổi cài đặt ở hồ sơ, thử cả 2 kiểu | cao |
| C-53 | **Cmd/Ctrl+K** từ khung soạn mở thanh lệnh | `W/ReplyBox.vue:685-691` | none | Đang gõ, nhấn Cmd+K | cao |
| C-54 | **Esc** đóng bảng emoji | `W/ReplyBox.vue:679-684` | none | Mở emoji, nhấn Esc | cao |
| C-55 | @nhắc tên nhân viên (chỉ trong ghi chú riêng) | `E/Editor.vue:286-297,880` (`TagAgents`), `:338-339` | `D/helper/specs/editorHelper.spec.js` | Ở ghi chú gõ "@", chọn tên, người đó nhận thông báo | cao |
| C-56 | Câu trả lời mẫu bằng **"/"** (không chạy trong ghi chú) | `E/Editor.vue:299-301,885` (`CannedResponse`), `:239-242` | `ST/specs/cannedResponses/getters.spec.js` | Gõ "/" + từ khóa, chọn mẫu | cao |
| C-57 | Biến `{{ }}` và cảnh báo biến chưa định nghĩa trước khi gửi | `E/Editor.vue:305-312,890` (`VariableList`); `W/ReplyBox.vue:875,1482` | `D/helper/specs/editorHelper.spec.js` | Gõ "{{", chọn `contact.name`; gõ biến sai → modal xác nhận | cao |
| C-58 | Emoji: nút chọn + gõ **":"** gợi ý | `W/ReplyBox.vue:1308-1316`; `E/Editor.vue:315,895` (`KeyboardEmojiSelector`) | none | Gõ ":smi", chọn emoji | cao |
| C-59 | Đính kèm file bằng nút kẹp giấy, phím **Cmd/Ctrl+Alt+A** | `E/ReplyBottomPanel.vue:142-160,290-314` (input id `conversationAttachment`) | `D/composables/spec/useFileUpload.spec.js`, `D/helper/specs/uploadHelper.spec.js`, `directUploadsHelper.spec.js` | Nhấn Cmd+Alt+A, chọn file, xem trước rồi gửi | cao |
| C-60 | **Kéo thả** file vào khung chat (lớp phủ toàn màn hình) | `E/ReplyBottomPanel.vue:223,298,380-381`; né modal hội thoại mới `W/ReplyBox.vue:532-539,1222-1225` | none | Kéo 1 ảnh vào cửa sổ, thấy lớp phủ, thả → đính kèm | cao |
| C-61 | **Dán** file/ảnh từ clipboard (lọc theo loại file kênh cho phép) | `W/ReplyBox.vue:518,724-757,1387` | `app/javascript/shared/helpers/specs/FileHelper.spec.js` | Chụp màn hình, Cmd+V vào khung soạn | cao |
| C-62 | **Cmd/Ctrl+Shift+V** dán ảnh inline (email/website) | `E/Editor.vue:610-647` | none | Kênh email, Cmd+Shift+V ảnh → ảnh nằm trong nội dung | cao |
| C-63 | Ghi âm tin nhắn thoại (wavesurfer), phát/dừng, gửi như voice message | `W/ReplyBox.vue:996-1033,1324-1332`; `E/AudioRecorder.vue:4-63`; `E/ReplyBottomPanel.vue:188,317-326` | `D/helper/AudioAlerts/specs/AudioMessageHelper.spec.js` | Bấm mic, nói 3 giây, dừng, gửi | cao |
| C-64 | Chữ ký: tự chèn/bỏ, nút bật tắt theo hộp thư, cảnh báo chưa có chữ ký | `E/ReplyBottomPanel.vue:247,269,335-336`; `E/Editor.vue:325-541`; `W/ReplyBox.vue:1395`; chữ ký đặt ở `S/profile/Index.vue:281` | `D/helper/specs/editorHelper.spec.js` | Đặt chữ ký ở hồ sơ, bật nút chữ ký, gửi | cao |
| C-65 | Lưu nháp theo hội thoại + chế độ soạn | `W/ReplyBox.vue:623-672,941` | `ST/specs/draftMessages/*.spec.js` | Gõ dở, sang hội thoại khác rồi quay lại | cao |
| C-66 | Gửi trạng thái "đang gõ" cho khách (on/off) | `W/ReplyBox.vue:1008-1050`; `E/Editor.vue:179-181` | `ST/specs/conversationTypingStatus/actions.spec.js` | Gõ trên dashboard, widget hiện "đang gõ" | cao |
| C-67 | Tách tin text/đính kèm cho WhatsApp/Instagram/TikTok; chỉ 1 caption cho WhatsApp | `W/ReplyBox.vue:788-812,1088-1116` | none | Hội thoại WhatsApp gửi 2 ảnh + chữ | TB |
| C-68 | Email: Đến / CC / BCC, trích dẫn email cũ (bật/tắt) | `W/ReplyBox.vue:1318-1322,1376-1382`; `W/ReplyEmailHead.vue`; `W/QuotedEmailPreview.vue`; nút `E/ReplyBottomPanel.vue:344-349` | `W/helpers/specs/emailHeadHelper.spec.js`, `D/helper/specs/quotedEmailHelper.spec.js`, `emailQuoteExtractor.spec.js` | Hội thoại email, thêm CC, gửi | TB |
| C-69 | Mẫu WhatsApp (360/Cloud) và Content Template (Twilio) | `W/ReplyBox.vue:1466-1480`; `E/ReplyBottomPanel.vue:355-364` | `D/helper/specs/templateHelper.spec.js` | Hộp thư WhatsApp quá 24h, chọn mẫu gửi | TB |
| C-70 | Khóa khung soạn khi không được trả lời (WhatsApp/API hết cửa sổ), giới hạn ký tự còn lại | `W/ReplyBox.vue:204-209,453-459`; `E/ReplyTopPanel.vue` (`charactersRemaining`) | none | Hội thoại WhatsApp quá 24h: khung soạn bị khóa, ghi chú vẫn gõ được | TB |
| C-71 | Chèn bài viết Help Center vào tin | `W/ReplyBox.vue:1287-1291`; nút `E/ReplyBottomPanel.vue:392` | none | Có portal, bấm nút bài viết, chèn link | thấp |
| C-72 | Phóng to khung soạn (`toggleEditorSize`, `ResizableEditorWrapper`) | `W/MessagesView.vue:528-532`; `W/ReplyBox.vue:90` | none | Bấm nút phóng to trên khung soạn | TB |
| C-73 | Gợi ý trả lời AI của Kalo (AgentGW) | `W/ReplyBox.vue:1260-1267`; `W/KaloAiSuggestions.vue` | `W/specs/KaloAiSuggestions.spec.js` | Có `AGENTGW_*`, mở hội thoại khách vừa nhắn | TB |
| C-74 | Nút tạo đơn / gửi QR của Kalo trong khung soạn | `W/ReplyBox.vue:1406-1410`; `W/KaloComposerActions.vue`; `W/KaloOrderCard.vue` | `W/specs/KaloComposerActions.spec.js`, `W/specs/KaloOrderCard.spec.js` | Bấm "Tạo đơn" trong hội thoại, gửi QR | TB |
| C-75 | Captain viết lại/tóm tắt/mở rộng/sửa ngữ pháp (menu AI trên khung soạn, thanh lệnh) | `E/ReplyTopPanel.vue:81-98,170`; `W/ReplyBox.vue:540,1334-1345`; `D/composables/useCopilotReply.js`; backend `app/controllers/api/v1/accounts/captain/tasks_controller.rb:4-44`, `lib/captain/*` | `D/composables/spec/useCaptain.spec.js`, `useConversationHotKeys.spec.js` | Bật `captain_tasks` + khóa OpenAI, chọn "Viết lại" | TB |

### A5. Panel khách (ContactPanel)

| ID | Chức năng | Vị trí (file:line) | Spec hiện có | Kiểm tay trên trình duyệt | Rủi ro |
|---|---|---|---|---|---|
| C-76 | Thông tin khách, sửa tên tại chỗ, sửa email/điện thoại/công ty, mạng xã hội | `R/conversation/contact/ContactInfo.vue:124-153,184-292` | `ST/specs/contacts/*.spec.js` | Bấm tên khách, sửa, Enter lưu | TB |
| C-77 | Gộp khách (merge) | `R/conversation/contact/ContactInfo.vue:325`; `D/modules/contact/ContactMergeModal.vue`; backend `actions/contact_merges_controller.rb` | none | Bấm "Gộp", chọn khách trùng | TB |
| C-78 | Sửa / xóa khách (xóa chỉ admin) | `R/conversation/contact/ContactInfo.vue:317-355`; `R/conversation/contact/EditContact.vue:28` (Esc) | `ST/specs/contacts/actions.spec.js` | Bấm Sửa, đổi số điện thoại | TB |
| C-79 | Kéo thả sắp xếp các mục panel, lưu UI settings; mở/đóng từng mục | `R/conversation/ContactPanel.vue:144-152,112-114,159-312` | none | Kéo mục "Ghi chú" lên đầu, F5 vẫn giữ | cao |
| C-80 | Giao nhân viên (có nút "giao cho tôi"), giao nhóm, ưu tiên | `R/conversation/ConversationAction.vue:82-153,233-301` | `ST/specs/conversations/actions.spec.js` | Đổi nhân viên trong panel, thẻ danh sách cập nhật | thấp |
| C-81 | Nhãn hội thoại; phím **L** mở ô nhãn, Esc đóng | `R/conversation/labels/LabelBox.vue:39-50`; `R/conversation/ConversationAction.vue:305` | `D/composables/spec/useConversationLabels.spec.js`, `ST/specs/conversationLabels/*.spec.js` | Không focus ô nhập, nhấn L | cao |
| C-82 | Người theo dõi hội thoại (participants/watchers) | `R/conversation/ConversationParticipant.vue:102-116` | `ST/specs/conversationWatchers/*.spec.js` | Thêm 1 nhân viên theo dõi | TB |
| C-83 | Thông tin hội thoại: trình duyệt, IP, referer, thời điểm bắt đầu (web widget) | `R/conversation/ConversationInfo.vue:18-28` | none | Hội thoại widget, mở "Thông tin hội thoại" | TB |
| C-84 | Thuộc tính tùy chỉnh của khách/hội thoại (sửa tại chỗ) | `R/conversation/customAttributes/CustomAttributes.vue:204-226` | none | Tạo thuộc tính ở S-15, sửa trong panel | TB |
| C-85 | Hội thoại trước đây của khách | `R/conversation/ContactConversations.vue:121-142` | `ST/specs/contactConversations/*.spec.js` | Khách có 2 hội thoại, thấy hội thoại cũ | TB |
| C-86 | Chạy macro | `R/conversation/Macros/MacroItem.vue:29-32,80` | `D/composables/spec/useMacros.spec.js`, `ST/specs/macros/*.spec.js` | Tạo macro ở S-14, bấm chạy trong panel | TB |
| C-87 | Ghi chú về khách, **Cmd/Ctrl+Enter** lưu | `R/conversation/contact/ContactNotes.vue:59-92,79` | `ST/specs/contactNotes/*.spec.js` | Gõ ghi chú, Cmd+Enter | cao |
| C-88 | File đã chia sẻ (ảnh/file, mở gallery) | `R/conversation/SharedFiles.vue:52-69`; `W/MessagesView.vue:323` (`fetchAllAttachments`) | none | Mở mục "File đã chia sẻ" | TB |
| C-89 | Linear: tạo/liên kết issue | `R/conversation/ContactPanel.vue:258-272`; `W/linear/*`; backend `integrations/linear_controller.rb` | none | Kết nối Linear ở S-16, tạo issue | thấp |
| C-90 | Đơn Shopify của khách | `R/conversation/ContactPanel.vue:277-288`; backend `integrations/shopify_controller.rb` | none | Kết nối Shopify, xem đơn | thấp |
| C-91 | Đơn hàng Kalo của khách | `R/conversation/ContactPanel.vue:142`; `R/conversation/contact/KaloContactOrders.vue` | `R/conversation/contact/specs/KaloContactOrders.spec.js` | Khách đã có đơn → thấy danh sách | TB |
| C-92 | Panel tự đóng khi bấm ra ngoài trên màn nhỏ (bỏ qua popover ProseMirror) | `W/ConversationSidebar.vue:28-50` | none | Màn < breakpoint nhỏ, bấm ra ngoài | TB |

### A6. Toàn cục: phím tắt, thanh lệnh, realtime, thông báo

| ID | Chức năng | Vị trí (file:line) | Spec hiện có | Kiểm tay trên trình duyệt | Rủi ro |
|---|---|---|---|---|---|
| C-93 | Thanh lệnh **Cmd/Ctrl+K** (ninja-keys): đổi trạng thái, giao nhân viên/nhóm, ưu tiên, nhãn, hoãn, mute, transcript, AI, đi tới các trang, giao diện | `R/commands/commandbar.vue:2-42`; `R/Dashboard.vue:147`; `D/composables/commands/useConversationHotKeys.js:195-358`, `useGoToCommandHotKeys.js:28-169`, `useInboxHotKeys.js:19`, `useAppearanceHotKeys.js:57` | `D/composables/commands/spec/*.spec.js` | Cmd+K, gõ "assign", giao nhân viên | cao |
| C-94 | Bảng phím tắt **Cmd+/** (đóng Cmd+Esc) | `D/components-next/sidebar/useSidebarKeyboardShortcuts.js:18-23`; `R/Dashboard.vue:156` | `D/composables/spec/useKeyboardEvents.spec.js` | Nhấn Cmd+/ | cao |
| C-95 | Phím điều hướng **Alt+C** (hội thoại), **Alt+V** (khách), **Alt+R** (báo cáo), **Alt+S** (cài đặt nhân viên) | `D/components-next/sidebar/useSidebarKeyboardShortcuts.js:24-35` | none | Nhấn Alt+V → trang khách | cao |
| C-96 | Realtime ActionCable: tin mới/cập nhật, hội thoại mới, đổi trạng thái, đổi người phụ trách, đổi khách, đã đọc, cập nhật hội thoại, số chưa đọc, presence, xóa/cập nhật khách, nhắc tên, thông báo | `D/helper/actionCable.js:38-66,84-343` | `D/helper/specs/actionCable.spec.js` | Hai trình duyệt, gửi tin ở widget → dashboard hiện ngay | cao |
| C-97 | Typing realtime tự tắt sau 30 giây | `D/helper/actionCable.js:263-306` | `D/helper/specs/actionCable.spec.js` | Gõ trên widget rồi dừng, chỉ báo tắt | cao |
| C-98 | Âm báo tin mới + chấm trên favicon (theo cài đặt hồ sơ) | `D/helper/actionCable.js:131`; `D/helper/AudioAlerts/DashboardAudioNotificationHelper.js:52,101-110,171` | `D/helper/AudioAlerts/specs/*.spec.js` | Bật âm báo ở hồ sơ, tab khác, khách nhắn | cao |
| C-99 | Thông báo đẩy trình duyệt (push) | `D/helper/pushHelper.js:6-38`; cài đặt `S/profile/Index.vue` (`NotificationPreferences`) | none | Bật push ở hồ sơ, đóng tab, nhận thông báo | TB |
| C-100 | Trang thông báo + chuông, số chưa đọc | `R/notifications/routes.js:13`; `D/components-next/sidebar/KaloRailFooter.vue:27`; `D/components-next/sidebar/useKaloNav.js` (`notifications/unReadCount`) | `ST/specs/notifications/*.spec.js` | Được nhắc tên → chuông có số | TB |
| C-101 | Badge số tin chưa đọc trên mục Tin nhắn của rail | `D/components-next/sidebar/useKaloNav.js` (`conversationUnreadCounts/get`, `badge`) | `ST/specs/conversationUnreadCounts/*.spec.js`, `D/components-next/sidebar/specs/KaloRail.spec.js` | Khách nhắn, rail hiện số | TB |
| C-102 | Inbox view kiểu Chatwoot (`inbox_view`) | `R/inbox/routes.js:12-25` | none | Gõ URL `/inbox-view`; trên rail không có lối vào | TB |
| C-103 | Màn trống khi chưa chọn hội thoại / chưa có hộp thư; màn chào admin (`OnboardingView`, đang tiếng Anh) | `W/EmptyState/EmptyState.vue:39-92`; `W/OnboardingView.vue:41-77` | none | Tài khoản mới không có hộp thư → màn chào | thấp |
| C-104 | Khôi phục kết nối, tải lại dữ liệu khi mất mạng | `D/helper/actionCable.js:71-78`; `D/helper/ReconnectService.js` | `D/helper/specs/ReconnectService.spec.js` | Tắt mạng 30 giây rồi bật, danh sách tự cập nhật | cao |

### A7. Chức năng Chatwoot enterprise không có backend ở đây (không thuộc danh sách phải giữ)

Không có `enterprise/` và không có controller tương ứng. Ghi **không có backend**; được phép bỏ khỏi giao diện mới, nhưng phải ghi "bỏ có chủ đích" trong bảng nộp lại.

| ID | Chức năng | Vị trí giao diện | Vì sao không có backend |
|---|---|---|---|
| C-X1 | Gọi thoại (nút gọi, trạng thái cuộc gọi trên thẻ, widget cuộc gọi nổi, bubble VoiceCall, sự kiện `voice_call.*`) | `W/ConversationHeader.vue:177`, `W/ConversationCard.vue:189`, `R/Dashboard.vue:150`, `M/bubbles/VoiceCall.vue`, `D/helper/actionCable.js:63-66` | Không có controller calls/voice trong `app/controllers` |
| C-X2 | SLA (nhãn SLA trên header/thẻ, popover) | `W/ConversationHeader.vue:170`, `W/ConversationCard.vue:241`, `W/components/SLA*.vue` | `sla_policies` chỉ có route (`config/routes.rb:148`), không controller |
| C-X3 | Copilot panel (chat với Captain bên phải, `CopilotLauncher`/`CopilotContainer`) | `R/Dashboard.vue:148-149`; API `D/api/captain/copilotThreads.js:5` | `captain/copilot_threads` không có controller (chỉ có `captain/preferences` và `captain/tasks`) |
| C-X4 | Báo cáo tin nhắn Captain (mục "report" trong menu tin) | `M/Message.vue:421-424` | `captain/message_reports` không có controller; chỉ bật khi `isOnChatwootCloud` |

Lưu ý: **Captain tasks** (C-42, C-75) *có* backend (`captain/tasks_controller.rb` + `lib/captain/*`), cần cờ `captain_tasks` và khóa OpenAI trong `InstallationConfig` (`lib/captain/base_task_service.rb:35-44`). Không xếp vào nhóm "không có backend".

---

## B. Cài đặt

Lối vào hiện tại: rail Kalo chỉ có mục **Cài đặt → `kalo_settings_hub`** (`D/components-next/sidebar/useKaloNav.js`, route `R/dashboard.routes.js:39`). `Sidebar.vue` cũ của Chatwoot không còn được render trong `R/Dashboard.vue:130-166`. Vì vậy trang nào không có link trong `S/SettingsHub.vue` thì chỉ vào được bằng URL. Router chỉ kiểm `meta.permissions` (`D/helper/routeHelpers.js:16`), không kiểm `featureFlag`/`installationTypes`, nên trang enterprise vẫn mở được bằng URL và sẽ lỗi API.

Cột "Hub": có link trong `S/SettingsHub.vue` (số dòng) hay không. Cột "Kế hoạch": theo Task 2 của kế hoạch (viết lại = trang dùng nhiều; đổi khung = chỉ đổi khung và màu).

| ID | Trang (route name) | Vị trí (file:line) | Backend | Hub | Spec hiện có | Kiểm tay trên trình duyệt | Kế hoạch | Rủi ro |
|---|---|---|---|---|---|---|---|---|
| S-01 | Hub cài đặt `kalo_settings_hub` | `R/dashboard.routes.js:39`; `S/SettingsHub.vue:12-66` | — | — | `S/SettingsHub.spec.js`, `R/kaloRoutes.spec.js` | Bấm Cài đặt trên rail, thấy 6 nhóm | viết lại | thấp |
| S-02 | Chuyển hướng `settings_home` (admin → Tài khoản, còn lại → Câu trả lời mẫu) | `S/settings.routes.js:36-47` | — | không | none | Nhân viên thường mở `/settings` → trang mẫu | giữ | TB |
| S-03 | Tài khoản `general_settings_index`: tên, ngôn ngữ, email hỗ trợ, phiên âm audio, ID tài khoản, xóa tài khoản, build info | `S/account/account.routes.js:16`; `S/account/Index.vue:161-255` | `accounts_controller.rb` | `:61` | none | Đổi tên tài khoản, lưu | viết lại | TB |
| S-04 | Hồ sơ `profile_settings_index`: ảnh, tên, cỡ chữ, ngôn ngữ, **chữ ký tin nhắn**, **phím gửi Enter/Cmd+Enter**, đổi mật khẩu, MFA, phiên đăng nhập, **âm báo**, **thông báo** | `S/profile/profile.routes.js:20`; `S/profile/Index.vue:232-360` (chữ ký `:281`, phím gửi `:204-207,294`) | `profiles_controller.rb`, `notification_settings_controller.rb` | `:60` | `D/composables/spec/useUISettings.spec.js`, `ST/specs/userNotificationSettings/*.spec.js` | Đổi phím gửi, quay lại chat thử (liên quan C-52, C-64, C-98) | đổi khung | cao |
| S-05 | MFA `profile_settings_mfa` | `S/profile/profile.routes.js:28` | `profile/mfa_controller.rb` | không (vào từ Hồ sơ) | none | Hồ sơ → bật MFA | đổi khung | TB |
| S-06 | Danh sách hộp thư `settings_inbox_list` | `S/inbox/inbox.routes.js:28` | `inboxes_controller.rb` | `:39` | none | Mở danh sách hộp thư | viết lại | thấp |
| S-07 | Tạo hộp thư: chọn kênh, form theo kênh (Website, Email, WhatsApp, API, Zalo, Zalo cá nhân, FB, IG, TikTok, Telegram, Line, SMS…), thêm nhân viên, hoàn tất | `S/inbox/inbox.routes.js:52-92`; `S/inbox/channels/*.vue` | `inboxes_controller.rb`, `channels/`, `zalo_personal/` | không (vào từ S-06) | none | Tạo hộp thư Website, nhận mã nhúng | viết lại | cao (nhiều form con) |
| S-08 | Cài đặt 1 hộp thư `settings_inbox_show`: tab Cài đặt, Cộng tác viên, Giờ làm việc, CSAT, Form trước chat, Cấu hình, Bot, Sức khỏe WhatsApp | `S/inbox/inbox.routes.js:97-99`; `S/inbox/Settings.vue:172-237` | `inboxes_controller.rb`, `inbox_members_controller.rb`, `inbox_csat_templates_controller.rb` | không (vào từ S-06) | `S/inbox/helpers/specs/businessHour.spec.js`, `S/inbox/components/specs/AccountHealth.spec.js`, `D/helper/specs/preChat.spec.js` | Bật giờ làm việc cho hộp thư widget | viết lại | cao |
| S-09 | Nhân viên `agent_list` | `S/agents/agent.routes.js:20` | `agents_controller.rb` | `:46` | `D/helper/specs/agentHelper.spec.js` | Mời 1 nhân viên | viết lại | thấp |
| S-10 | Nhóm `settings_teams_list` + tạo/sửa/thêm thành viên | `S/teams/teams.routes.js:29-111` | `teams_controller.rb`, `team_members_controller.rb` | `:46` | none | Tạo nhóm, thêm 2 người | đổi khung | TB |
| S-11 | Nhãn `labels_list` (kể cả bật "hiện trên sidebar") | `S/labels/labels.routes.js:25` | `labels_controller.rb` | `:41` | `S/labels/specs/validations.spec.js` | Tạo nhãn, thấy ở bộ lọc rail (C-06) | viết lại | thấp |
| S-12 | Câu trả lời mẫu `canned_list` | `S/canned/canned.routes.js:24` | `canned_responses_controller.rb` | `:51` | `ST/specs/cannedResponses/getters.spec.js` | Tạo mẫu, gõ "/" trong chat (C-56) | viết lại | thấp |
| S-13 | Tự động hóa `automation_list` | `S/automation/automation.routes.js:20` | `automation_rules_controller.rb` | `:52` | `D/helper/specs/automationHelper.spec.js`, `actionQueryGenerator.spec.js` | Tạo rule gắn nhãn khi có tin mới | đổi khung | TB |
| S-14 | Macro `macros_wrapper`, `macros_new`, `macros_edit` | `S/macros/macros.routes.js:21-53` | `macros_controller.rb` | `:53` | `S/macros/specs/*.spec.js`, `D/helper/specs/macrosHelper.spec.js` | Tạo macro, chạy ở C-86 | đổi khung | TB |
| S-15 | Thuộc tính tùy chỉnh `attributes_list` | `S/attributes/attributes.routes.js:20` | `custom_attribute_definitions_controller.rb` | `:54` | none | Tạo thuộc tính khách, sửa ở C-84 | đổi khung | TB |
| S-16 | Tích hợp `settings_applications` + Webhook, Dashboard Apps, Slack, Linear, Notion, Shopify, hook theo id (Dyte, OpenAI…) | `S/integrations/integrations.routes.js:22-96` | `integrations/{apps,hooks,slack,linear,notion,shopify,dyte}_controller.rb`, `webhooks_controller.rb`, `dashboard_apps_controller.rb` | `:40` | `S/integrations/specs/hookMixin.spec.js` | Thêm webhook, thêm Dashboard App (C-33) | đổi khung | TB |
| S-17 | Bot `agent_bots` | `S/agentBots/agentBot.routes.js:17` | `agent_bots_controller.rb` | **không** | none | Gõ URL `/settings/agent-bots` | cần quyết định | cao (đã mất lối vào) |
| S-18 | Nhập dữ liệu `settings_data_imports`, `settings_data_import_show` | `S/data/data.routes.js:15-24` | `data_imports_controller.rb` | **không** | `S/data/specs/*.spec.js` | Gõ URL `/settings/data` | cần quyết định | cao (đã mất lối vào) |
| S-19 | Quy trình hội thoại `conversation_workflow_index`: tự đóng hội thoại, thuộc tính bắt buộc khi đóng | `S/conversationWorkflow/conversationWorkflow.routes.js:13`; `S/conversationWorkflow/index.vue:16-44` | lưu trong `account.settings` (`app/models/concerns/account_settings_schema.rb:19`) | **không** | `D/composables/spec/useConversationRequiredAttributes.spec.js` | Gõ URL `/settings/conversation-workflow`, bật tự đóng | cần quyết định | cao (đã mất lối vào; C-28 phụ thuộc) |
| S-20 | Chính sách phân công `assignment_policy_index`, `agent_assignment_policy_*` (cờ `ASSIGNMENT_V2`) | `S/assignmentPolicy/assignmentPolicy.routes.js:25-56` | `assignment_policies_controller.rb`, `inboxes/assignment_policies_controller.rb` | **không** | none | Gõ URL `/settings/assignment-policy` (cần bật cờ) | cần quyết định | TB |
| S-21 | Báo cáo: tổng quan, hội thoại, nhân viên, nhãn, hộp thư, nhóm, CSAT (+ trang chi tiết) | `S/reports/reports.routes.js:34-131` | `api/v2/accounts/reports_controller.rb`, `summary_reports_controller.rb`, `live_reports_controller.rb`, `csat_survey_responses_controller.rb` | `:27-33` | `S/reports/**/specs/*.spec.js` | Mở báo cáo nhân viên, đổi khoảng ngày | ngoài Task 2 | thấp |
| S-22 | Chiến dịch `campaigns_livechat_index` | `S/SettingsHub.vue:18` | `campaigns_controller.rb` | `:18` | none | Tạo chiến dịch live chat | ngoài Task 2 | thấp |
| S-23 | Help Center `portals_index` | `S/SettingsHub.vue:19` | `portals_controller.rb`, `articles_controller.rb`, `categories_controller.rb` | `:19` | `D/helper/specs/portalHelper.spec.js` | Tạo portal (C-71 phụ thuộc) | ngoài Task 2 | thấp |
| S-24 | Gói cước Kalo `kalo_billing` | `S/settings.routes.js:59-63`; `S/billing/BillingPage.vue` | `kchat/subscriptions_controller.rb` | `:63-66` | `S/billing/specs/BillingPage.spec.js` | Xem gói, ngày hết hạn dùng thử | viết lại | thấp |
| S-25 | Cài đặt Captain `captain_settings_index` | `S/captain/captain.routes.js:24` | `captain/preferences_controller.rb` (có) | **không** | `D/composables/spec/useCaptain.spec.js` | Gõ URL `/settings/captain` (cờ `CAPTAIN`) | cần quyết định | TB |

### B2. Trang cài đặt không có backend (loại khỏi must-keep)

| ID | Trang (route name) | Vị trí | Vì sao không có backend | Ghi chú |
|---|---|---|---|---|
| S-X1 | **Billing Chatwoot** `billing_settings_index` | `S/billing/billing.routes.js:23`; gọi `D/api/enterprise/account.js:6-14` | Route `checkout/subscription` chỉ khai khi có `enterprise/` (`config/routes.rb:612-625`) | **Hub đang link tới trang này** (`S/SettingsHub.vue:62`) cạnh "Gói cước Kalo" → link chết, nên bỏ ở Task 2 |
| S-X2 | Phân bổ theo năng lực `agent_capacity_policy_*` | `S/assignmentPolicy/assignmentPolicy.routes.js:61-83` | `agent_capacity_policies` chỉ có route (`config/routes.rb:150`) | không có trong hub |
| S-X3 | Nhật ký kiểm toán `auditlogs_list` | `S/auditlogs/audit.routes.js:22` | `audit_logs` chỉ có route (`config/routes.rb:132`) | không có trong hub |
| S-X4 | SLA `sla_list` | `S/sla/sla.routes.js:31` | `sla_policies` chỉ có route (`config/routes.rb:148`) | không có trong hub |
| S-X5 | Vai trò tùy chỉnh `custom_roles_list` | `S/customRoles/customRole.routes.js:20` | `custom_roles` chỉ có route (`config/routes.rb:149`) | không có trong hub |
| S-X6 | Bảo mật / SAML `security_settings_index` | `S/security/security.routes.js:27` | `saml_settings` chỉ có route (`config/routes.rb:120`) | không có trong hub |
| S-X7 | Tab Thoại / Cuộc gọi của hộp thư | `S/inbox/Settings.vue:254-271`; `S/inbox/settingsPage/VoiceConfigurationPage.vue`, `WhatsappCallingPage.vue` | không có controller calls/voice | ẩn hoặc bỏ khi viết lại S-08 |

---

## C. Hợp đồng props / emit / store của các component chat chính

Component mới thay thế phải giữ nguyên các hợp đồng dưới đây, hoặc đổi có chủ đích và sửa mọi nơi gọi. Ngoài props/emits, nhiều chức năng đi qua **bus event** (`emitter`, hằng số ở `app/javascript/shared/constants/busEvents.js`) và **selector DOM**; mất những thứ này thì không có lỗi biên dịch, chỉ mất chức năng.

### C.1 `ConversationView` (`R/conversation/ConversationView.vue`)
- Props: `inboxId`, `conversationId`, `label`, `teamId`, `conversationType`, `foldersId` (`:30-62`).
- Con: `ChatList` (`@conversation-load`), `ConversationBox`, `SidepanelSwitch`, `ConversationSidebar`, `CmdBarConversationSnooze` (`:199-217`).
- Store actions: `clearSelectedState`, `agents/get`, `portals/index`, `setActiveInbox`, `getConversation`, `setActiveChat` (`:26,112-184`).

### C.2 `ChatList` (`D/components/ChatList.vue`)
- Props: `conversationInbox`, `teamId`, `label`, `conversationType`, `foldersId`, `showConversationList`, `isOnExpandedLayout` (`:56-65`). Emits: `conversationLoad` (`:66`).
- Getters: `getCurrentUser`, `getFilteredConversations`, `getMineChats`, `getAllStatusChats`, `getUnAssignedChats`, `getParticipatingChats`, `getChatListLoadingStatus`, `getSelectedInbox`, `conversationStats/getStats`, `getAppliedConversationFiltersV2`, `customViews/getConversationCustomViews`, `agents/getAgents`, `teams/getTeams`, `inboxes/getInboxes`, `campaigns/getAllCampaigns`, `labels/getLabels`, `getCurrentAccountId`, `teams/getTeam`, `getConversationById`, `contacts/getContact`, `customViews/getActiveFolderContactId`, `conversationPage/getCurrentPageFilter`, `conversationPage/getHasEndReached`, `inboxes/getInbox` (`:93-215`).
- Actions: `fetchAllConversations`, `fetchFilteredConversations`, `updateChatListFilters`, `setChatListFilters`, `setChatStatusFilter`, `setChatSortFilter`, `conversationPage/reset`, `emptyAllConversations`, `clearConversationFilters`, `assignPriority`, `setCurrentChatPriority`, `markMessagesUnread`, `markMessagesRead`, `assignTeam`, `toggleStatus`, `deleteConversation`, `conversationStats/get`, `customViews/update`, `customViews/setActiveConversationFolder`, `campaigns/get` (`:396-880`).
- Composable: `useBulkActions` (`bulkActions/setSelectedConversationIds`, `removeSelectedConversationIds`, `clearSelectedConversationIds`, `process`), `useFilter`.
- Bus: lắng nghe `fetch_conversation_stats` (`:803`); phát `clearSearchInput` (`:609`).

### C.3 `ConversationList` / `ConversationItem` (`D/components/`)
- `ConversationList` props: `conversationList`, `isLoading`, `showEndOfListMessage`, `label`, `teamId`, `foldersId`, `conversationType`, `showAssignee`, `isOnExpandedLayout`; emits `loadMore`; `provide('contextMenuElementTarget')`, `provide('toggleContextMenu')`; `defineExpose({ conversationListRef })`.
- **DOM bắt buộc:** container có class `conversations-list`, mỗi thẻ có class `conversation`, thẻ đang mở có class `active` (dùng bởi `useChatListKeyboardEvents.js:5-11` và `ResolveAction.vue:151-160`).
- `ConversationItem` props: `source`, `label`, `teamId`, `foldersId`, `conversationType`, `showAssignee`, `showExpanded`; `inject('toggleContextMenu')`.

### C.4 `ConversationCard` (`W/ConversationCard.vue:16-34`)
- Props: `chat` (bắt buộc), `currentContact` (bắt buộc), `assignee`, `inbox`, `selected`, `isActiveChat`, `showAssignee`, `showInboxName`, `hideThumbnail`, `compact`.
- Emits: `click`, `contextmenu`, `selectConversation(chatId, inboxId)`, `deSelectConversation(chatId, inboxId)`.

### C.5 `ConversationBox` (`W/ConversationBox.vue:15-90`)
- Props: `inboxId`, `isInboxView`, `isContactPanelOpen`, `isOnExpandedLayout`.
- Getters: `getSelectedChat`, `dashboardApps/getRecords`. Actions: `inboxAssignableAgents/fetch`, `dashboardApps/get`, `conversationLabels/get`.

### C.6 `ConversationHeader` / `MoreActions` / `ResolveAction`
- `ConversationHeader` props: `chat`, `showBackButton` (`W/ConversationHeader.vue:20-29`). Getters: `getSelectedChat`, `getCurrentAccountId`, `contacts/getContact`, `inboxes/getInbox`, `inboxes/getInboxes`.
- `MoreActions`: không props, đọc `getSelectedChat`; actions `muteConversation`, `unmuteConversation`; API `ConversationAPI.syncZaloMessages`; bus `CMD_MUTE_CONVERSATION`, `CMD_UNMUTE_CONVERSATION`, `CMD_SEND_TRANSCRIPT` (`W/MoreActions.vue:118-125`).
- `ResolveAction`: bus `CMD_REOPEN_CONVERSATION`, `CMD_RESOLVE_CONVERSATION` (`D/components/buttons/ResolveAction.vue:169-170`); mở thanh lệnh với `ninja.open({ parent: 'snooze_conversation' })` (`:81`).

### C.7 `MessagesView` (`W/MessagesView.vue`)
- Getters: `getSelectedChat`, `getCurrentUserID`, `getAllMessagesLoaded`, `getCurrentAccountId`, `conversationTypingStatus/getUserList`, `inboxes/getInbox`, `inboxes/getInstagramInboxByInstagramId`.
- Actions: `fetchPreviousMessages`, `markMessagesRead`, `sendMessageWithData` (gửi lại), `fetchAllAttachments`.
- Bus: lắng nghe `SCROLL_TO_MESSAGE`, `MESSAGE_SENT` (`:261-264`); phát `ON_MESSAGE_LIST_SCROLL` (`:428`).
- **DOM:** tin chưa đọc có class `message--unread` (`:364`).
- Con: `MessageList` (`currentUserId`, `firstUnreadId`, `isAnEmailChannel`, `inboxSupportsReplyTo`, `messages`; emit `retry`; `M/MessageList.vue:19-42`), `ReplyBox` (`@toggle-editor-size`).

### C.8 `Message` (`M/Message.vue`)
- Props chính: `id`, `messageType` (validator `MESSAGE_TYPES`), `content`, `contentAttributes`, `attachments`, `status`, `private`, `inReplyTo`, `inboxSupportsReplyTo`, `conversationId`… (`:106-141`). Emits: `retry`.
- Bus: phát `TOGGLE_REPLY_TO_MESSAGE` và ghi `LOCAL_STORAGE_KEYS.MESSAGE_REPLY_TO` (`:470-475`).
- Menu tin `MessageContextMenu`: emits `open`, `close`, `replyTo`; actions `translateMessage`, `deleteMessage`.

### C.9 `ReplyBox` (`W/ReplyBox.vue`)
- Emits: `toggleEditorSize` (`:90`). Không props (đọc từ store).
- Getters: `getSelectedChat`, `getMessageSignature`, `getCurrentUser`, `getLastEmailInSelectedChat`, `globalConfig/get`, `contacts/getContact`, `inboxes/getInbox`, `inboxes/getWhatsAppTemplates`, `draftMessages/get`.
- Actions: `createPendingMessageAndSend` (`:904`), `draftMessages/set`, `draftMessages/delete`, `draftMessages/setReplyEditorMode`, `conversationTypingStatus/toggleTyping`.
- Bus: lắng nghe `TOGGLE_REPLY_TO_MESSAGE`, `NEW_CONVERSATION_MODAL`, `INSERT_INTO_NORMAL_EDITOR`, `CMD_AI_ASSIST`; phát `INSERT_INTO_RICH_EDITOR`, `SCROLL_TO_MESSAGE`, `MESSAGE_SENT` (`:530-551,581,908-909`).
- Sự kiện DOM toàn trang: `document` `paste` và `keydown` (`:518-519`, gỡ ở `:543-544`).
- Composable: `useUISettings` (`isEditorHotKeyEnabled`, cờ chữ ký, cờ trích dẫn email), `useCopilotReply`, `useKbd`; mixins `inboxMixin`, `fileUploadMixin`, `keyboardEventListenerMixins`.

### C.10 `WootMessageEditor` (`E/Editor.vue:78-112`)
- Props: `modelValue`, `editorId`, `placeholder`, `disabled`, `isPrivate`, `enableSuggestions`, `overrideLineBreaks`, `updateSelectionWith`, `enableVariables`, `enableCannedResponses`, `enableCaptainTools`, `variables`, `signature`, `allowSignature`, `channelType`, `conversationId`, `medium`, `focusOnMount`.
- Emits: `typingOn`, `typingOff`, `toggleUserMention`, `toggleCannedMenu`, `toggleVariablesMenu`, `toggleToolsMenu`, `clearSelection`, `blur`, `focus`, `input`, `update:modelValue`, `executeCopilotAction`.
- Trigger gợi ý: `@` (nhắc tên / công cụ Captain), `/` (mẫu), `{{` (biến), `:` (emoji) (`:286-315`).

### C.11 `ReplyBottomPanel` / `ReplyTopPanel` (`E/`)
- `ReplyBottomPanel`: nhận callback qua props (`onFileUpload`, `onSend`, `toggleEmojiPicker`, `toggleAudioRecorder`, `toggleAudioRecorderPlayPause`) và cờ hiển thị (`showFileUpload`, `showAudioRecorder`, `showEmojiPicker`, `enableMultipleFileUpload`, `enableWhatsAppTemplates`, `enableContentTemplates`, `showQuotedReplyToggle`, `quotedReplyEnabled`, `newConversationModalActive`…) (`W/ReplyBox.vue:1430-1464`). Emits: `selectWhatsappTemplate`, `selectContentTemplate`, `toggleInsertArticle`, `toggleQuotedReply`. **DOM:** input file id `conversationAttachment` (phím Cmd+Alt+A tìm theo id này).
- `ReplyTopPanel` emits: `setReplyMode`, `toggleEditorSize`, `executeCopilotAction` (+ `toggleCopilot` từ ReplyBox) (`E/ReplyTopPanel.vue:61`).

### C.12 `ContactPanel` / `ConversationSidebar` / `ConversationAction`
- `ContactPanel` props: `conversationId` (bắt buộc), `inboxId` (`R/conversation/ContactPanel.vue:29-38`). Getters: `getSelectedChat`, `conversationMetadata/*`, `contacts/getContact`. Actions: `contacts/show`, `attributes/get`, `integrations/get('linear')`. UI settings: `is_*_open` từng mục, thứ tự mục (`conversation_sidebar_items_order` qua `updateUISettings`, `:112-114`).
- `ConversationSidebar` props: `currentChat` (bắt buộc); đọc/ghi `is_contact_sidebar_open`, `is_copilot_panel_open`.
- `ConversationAction` actions: `setCurrentChatAssignee`, `assignAgent`, `setCurrentChatTeam`, `assignTeam`, `setCurrentChatPriority`, `assignPriority`.

---

## D. Mười chức năng rủi ro cao nhất

1. C-96/C-97: realtime ActionCable và typing (tin mới, trạng thái, đang gõ).
2. C-60: kéo thả file vào khung chat.
3. C-61/C-62: dán ảnh/file từ clipboard (gắn `document`).
4. C-51/C-45: ghi chú riêng và phím Alt+P / Alt+L.
5. C-55: @nhắc tên trong ghi chú.
6. C-56: câu trả lời mẫu bằng "/".
7. C-10/C-27/C-93: phím tắt điều hướng, đóng hội thoại và thanh lệnh Cmd+K (phụ thuộc class DOM `conversations-list`, `conversation`, `active`).
8. C-12/C-13: chọn nhiều và thao tác hàng loạt.
9. C-63/C-59: ghi âm và đính kèm (Cmd+Alt+A, id `conversationAttachment`).
10. C-64/C-65: chữ ký và lưu nháp.

Ba trang đã **mất lối vào** trước cả khi viết lại (không có link trong hub/rail): C-07 (danh sách nhắc tên/chưa phản hồi/đang tham gia), S-17/S-18/S-19 (Bot, Nhập dữ liệu, Quy trình hội thoại). Hub đang link tới một trang không có backend: S-X1 (Billing Chatwoot).
