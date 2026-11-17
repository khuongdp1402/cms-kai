# Bảng phủ spec chống mất chức năng: khung chat

> Task 1a của [kế hoạch giao diện đợt 2](../plans/2026-11-17-kalo-ui-phase2.md). Đối chiếu từng ID với [chat-parity-inventory.md](chat-parity-inventory.md).
> Các spec dưới đây **mô tả hành vi hiện tại** (characterization), viết trước khi dựng lại giao diện chat, chạy xanh trên code chưa đổi. Task 1 (dựng lại) phải giữ cho cả bộ vẫn xanh; spec nào đỏ nghĩa là một chức năng đã đổi hoặc mất, phải sửa code hoặc ghi "bỏ có chủ đích" kèm lý do được chủ dự án duyệt.
> Viết tắt đường dẫn như inventory: `D/` = `app/javascript/dashboard/`, `W/` = `D/components/widgets/conversation/`, `E/` = `D/components/widgets/WootWriter/`, `M/` = `D/components-next/message/`, `R/` = `D/routes/dashboard/conversation/`.

## Cách dùng

- Chạy riêng các spec chat: `script/ktech/vitest.sh <đường dẫn spec…>`; cả bộ cần thêm `--poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=3` (LESSONS B16).
- Component được **mount thật**, con (child) bị stub để chỉ ghim phần nối dây của chính component: sự kiện vào, action store ra, class/id DOM mà phím tắt dựa vào. Khi dựng lại, nếu đổi cấu trúc con thì chỉ cần giữ: props/emit của component cha, tên action store, selector DOM ghi ở cột "Ghi chú".
- Spec nào phải đọc state qua `wrapper.vm.$.setupState` là do `useToggle` của vueuse không re-render template trong vitest của repo này (đã gặp ở `MoreActions`, `ConversationBasicFilter`); nếu component mới bỏ `useToggle`, chuyển sang assert DOM.

## Selector DOM mà phím tắt phụ thuộc (phải giữ)

| Selector / id | Dùng bởi | Spec ghim |
|---|---|---|
| `div.conversations-list` (gốc `ConversationList`) | Alt+J/K, Cmd+Alt+E, cuộn lên đầu | `ConversationList.spec.js` ("root keeps the `conversations-list` class") |
| `div.conversation` (gốc `ConversationCard`) | Alt+J/K, Cmd+Alt+E | `ConversationCardBehavior.spec.js` ("root element carries the `conversation` class") |
| `.active` trên thẻ đang mở, `.selected` trên thẻ được chọn | Alt+J/K, Cmd+Alt+E, viền | `ConversationCardBehavior.spec.js` ("adds `active`…"), `useChatListKeyboardEvents.spec.js`, `ResolveAction.spec.js` |
| `<input id="conversationAttachment">` | Cmd+Alt+A | `ReplyBottomPanel.spec.js` ("renders the file input with the id…") |
| `ninja-keys` (thanh lệnh) | Cmd+K từ khung soạn | `ReplyBox.spec.js` ("Cmd/Ctrl+K opens the command bar") |
| `.conversation-panel` (gốc `MessageList`) | cuộn tải tin cũ | `MessagesView.spec.js` ("gives MessageList… the panel class") |
| `#message<id>`, `data-message-id` | nhảy tới tin, link tin | `Message.spec.js` ("exposes message<ID> DOM id…") |

## Bảng theo ID

Cột "Trạng thái": **đã có spec** (đủ phần logic có thể test), **một phần** (ghi rõ phần còn thiếu), **có spec sẵn** (spec có từ trước, không thêm), **chưa thể test tự động** (lý do).

### A1. Danh sách hội thoại

| ID | Trạng thái | Spec (đường dẫn, tên test) / lý do |
|---|---|---|
| C-01 | một phần | `D/components/widgets/specs/ChatTypeTabs.spec.js` (renders one tab item per entry with name and count; passes the index of the active tab; woot-tabs change event emits chatTabChange), `W/specs/ConversationBasicFilter.spec.js` (ASSIGNEE_TYPE_TAB_PERMISSIONS: has the three tabs in order with their count keys). Thiếu: phép tính số đếm trong `ChatList.vue` (`assigneeTabItems`), vì `ChatList.vue` (~1000 dòng, nhiều composable) không mount được gọn |
| C-02 | đã có spec | `ChatTypeTabs.spec.js` (Alt+N moves to the next tab; Alt+N on the "all" tab wraps to the first tab) |
| C-03 | đã có spec | `W/specs/ConversationBasicFilter.spec.js` (offers exactly the five statuses; offers exactly the ten sort orders; status change… persists it; sort change… persists it; defaults to open / last_activity_at_desc). Thiếu: mở dropdown bằng nút (xem mục Cách dùng) |
| C-04 | chưa thể test tự động | `ChatList.vue` không có spec và không mount gọn được. Helper lọc đã có spec sẵn: `W/advancedFilterItems/specs/*.spec.js`, `D/helper/specs/filterQueryGenerator.spec.js` |
| C-05 | chưa thể test tự động | cùng lý do C-04 (`SaveCustomView`/`DeleteCustomViews` gắn trong `ChatList.vue`); có sẵn `D/helper/specs/customViewsHelper.spec.js` |
| C-06 | có spec sẵn | `D/components-next/sidebar/specs/KaloMessageFilters.spec.js` |
| C-07 | chưa thể test tự động | chỉ là route (không có UI để mount); kiểm tay |
| C-08 | một phần | `D/components/specs/ConversationList.spec.js` (shows the load-more sentinel and emits loadMore when it is observed; shows a spinner (no sentinel) while loading; shows the end-of-list message…). Thiếu: `loadMoreConversations` trong `ChatList.vue` (xem C-04) và IntersectionObserver thật (jsdom không có) |
| C-09 | một phần | `ConversationList.spec.js` (renders one ConversationItem per conversation and passes list context down) với `Virtualizer` được stub; việc ảo hóa thật không test được trong jsdom (`ResizeObserver` không có) |
| C-10 | đã có spec | `D/composables/chatlist/specs/useChatListKeyboardEvents.spec.js` (Alt+K clicks the conversation after the .active one; Alt+J…; fallback ở đầu/cuối; with no .active…; ignores conversations outside div.conversations-list; registers… work while an input is focused), cộng các selector ở bảng trên |
| C-11 | đã có spec | `W/specs/ConversationCardBehavior.spec.js` (shows the contact name; unread badge…; unread conversations render the name in semibold; no messages fallback; message preview; assignee; inbox name). SLA/nhãn: `ConversationCard.spec.js` có sẵn |
| C-12 | đã có spec | `ConversationCardBehavior.spec.js` (bulk-select checkbox: hidden until the avatar is hovered; stays visible while selected; hideThumbnail; ticking emits selectConversation(chatId, inboxId); unticking emits deSelectConversation; clicking the checkbox does not bubble), `D/components/specs/ConversationItem.spec.js` (select / deselect from the card call the injected callbacks) |
| C-13 | chưa thể test tự động | `conversationBulkActions/Index.vue` không có spec; action store đã có spec (`ST/specs/bulkActions/*.spec.js`). Để Task 1 tự viết nếu đổi |
| C-14 | có spec sẵn | `D/composables/commands/spec/useBulkActionsHotKeys.spec.js` |
| C-15 | một phần | `ConversationItem.spec.js` (right-click opens the context menu and tells the list (toggleContextMenu)). Thiếu: các mục trong `contextMenu/Index.vue` |
| C-16 | đã có spec | `ConversationItem.spec.js` (Cmd/Ctrl+click opens a new tab and does not navigate; click pushes the conversation URL; click URL includes the label / the active inbox; click on the already active conversation does not navigate). Cũng có test tương tự cho thẻ hội thoại cũ ở `R/specs/ContactConversations.spec.js` |
| C-17 | chưa thể test tự động | hộp xác nhận xóa nằm trong `ChatList.vue` (xem C-04); action store có spec sẵn |
| C-18 | đã có spec | `ConversationItem.spec.js` (showExpanded renders the expanded card instead of the condensed one; expanded card select toggles map to…) |
| C-19 | chưa thể test tự động | trạng thái rỗng nằm trong `ChatList.vue` (xem C-04) |
| C-20 | một phần | `R/contact/specs/ContactInfo.spec.js` (has a "new message" compose button for this contact). Thiếu: `ComposeConversation` ở rail và luồng gửi (có spec helper sẵn `composeConversationHelper.spec.js`) |
| C-21 | chưa thể test tự động | `ActionButtons.vue`/`ComposeNewConversationForm.vue` chưa viết spec (ngoài phạm vi 1a, form riêng) |
| C-22 | chưa thể test tự động | màn tìm kiếm là module riêng (`modules/search`); store có spec sẵn |

### A2. Đầu hội thoại và thao tác

| ID | Trạng thái | Spec / lý do |
|---|---|---|
| C-23 | đã có spec | `W/specs/ConversationHeader.spec.js` (shows the contact name and the conversation id; shows the inbox name only when more than one inbox; back button only when showBackButton; shows "snoozed until next reply" / "snoozed until <time>"; does not show a snooze marker for open conversations) |
| C-24 | đã có spec | `ConversationHeader.spec.js` (warns about an unverified (HMAC) web widget session; no HMAC warning when verified or for non web-widget inboxes) |
| C-25 | đã có spec | `ConversationHeader.spec.js` (clicking the id copies it to the clipboard) |
| C-26 | đã có spec | `D/components/buttons/specs/ResolveAction.spec.js` (clicking the main button on an open conversation resolves it; …on a resolved conversation reopens it; pending and snoozed conversations show the open button) |
| C-27 | đã có spec | `ResolveAction.spec.js` (registers Alt+M, Alt+E and Cmd+Alt+E; Alt+E resolves…; Cmd+Alt+E resolves and clicks the next .conversation after .active; Cmd+Alt+E on the last conversation wraps to the first; Alt+M clicks the status dropdown arrow; reacts to the command-bar bus events) |
| C-28 | đã có spec | `ResolveAction.spec.js` (Alt+E opens the required-attributes modal instead when attributes are missing) |
| C-29 | chưa thể test tự động | mục "Hoãn đến…" mở `ninja-keys` + `CustomSnoozeModal`, chưa có spec component; `snoozeHelpers.spec.js` có sẵn. Header hiển thị giờ hoãn: C-23 |
| C-30 | đã có spec | `W/specs/MoreActions.spec.js` (offers mute… / unmute…; mute / unmute menu actions dispatch with the conversation id; command bar bus events trigger mute, unmute) |
| C-31 | một phần | `MoreActions.spec.js` (send transcript opens the email transcript modal (flag)). Thiếu: nội dung `EmailTranscriptModal.vue` |
| C-32 | đã có spec | `MoreActions.spec.js` (adds "sync Zalo messages" for Zalo personal inboxes only; Zalo sync calls the API with the inbox id) |
| C-33 | đã có spec | `W/specs/ConversationBox.spec.js` (adds a tab per dashboard app after the Messages tab, each with its frame; adds no tabs when no dashboard apps) |
| C-34 | chưa thể test tự động | bubble Dyte cần backend/SDK ngoài |
| C-35 | đã có spec | `D/components-next/Conversation/specs/SidepanelSwitch.spec.js` (Alt+O closes / opens the contact panel) |

### A3. Luồng tin nhắn

| ID | Trạng thái | Spec / lý do |
|---|---|---|
| C-36 | đã có spec | `W/specs/MessagesView.spec.js` (scrolling within 100px of the top fetches messages before the first loaded one; does not fetch when scrolled further down; …before the chat finished its first fetch; …while one is in flight). Giữ vị trí cuộn: `scrollTopCalculationHelper.spec.js` có sẵn, thao tác scrollTop thật cần kiểm tay |
| C-37 | một phần | `MessagesView.spec.js` (passes the first unread message id to MessageList; renders the "N unread message(s)" label). Thiếu: cuộn DOM tới tin chưa đọc đầu tiên (jsdom không có layout) |
| C-38 | một phần | `MessagesView.spec.js` (SCROLL_TO_MESSAGE marks the messages as read). Thiếu: đánh dấu đọc khi mở hội thoại (nằm ở `ConversationView`/store; store có spec sẵn) |
| C-39 | một phần | `MessagesView.spec.js` (SCROLL_TO_MESSAGE marks the messages as read), `M/specs/BubbleBase.spec.js` (shows the quoted message and clicking it scrolls to the original), `Message.spec.js` (message<ID> DOM id). Thiếu: `scrollIntoView` thật và `?messageId=` |
| C-40 | đã có spec | `MessagesView.spec.js` (typing indicator: is hidden when nobody is typing; shows the typing user name), `D/helper/specs/actionCableChatHandlers.spec.js` (typing_on creates the typing status; typing_off destroys it) |
| C-41 | đã có spec | `MessagesView.spec.js` (shows an alert banner when the conversation cannot be replied to; shows no banner when replying is allowed) |
| C-42 | chưa thể test tự động | cần `captain_tasks` + khóa OpenAI; `useLabelSuggestions` bị mock trong `MessagesView.spec.js` |
| C-43 | đã có spec | `M/specs/MessageStatus.spec.js` (MessageError: retry button emits retry; retry button disabled unless failed; no retry when older than one day / no content), `M/specs/Message.spec.js` (shows MessageError… and forwards retry), `MessagesView.spec.js` (MessageList retry resends the message through sendMessageWithData as snake_case) |
| C-44 | đã có spec | `M/specs/Message.spec.js` (Message bubble selection per channel/content type: email, sticker Zalo, csat, form, dyte, instagram, ảnh/file/audio/video/ig_reel/embed/location/fallback/contact, nhiều file → bong bóng chữ, activity). Bong bóng con (nội dung bên trong từng loại) không test |
| C-45 | đã có spec | `Message.spec.js` (private note is the `private` variant, regardless of message type), `M/specs/BubbleBase.spec.js` (private variant is styled with bg-n-solid-amber; agent/user/bot/error/unsupported) |
| C-46 | chưa thể test tự động | `MessageContextMenu.vue` (menu chuột phải tin) chưa có spec; `Message.vue` chỉ được kiểm phần truyền `enabledOptions` gián tiếp (không ghim) |
| C-47 | một phần | `W/specs/ReplyBox.spec.js` (adds in_reply_to to contentAttributes when quoting a message), `BubbleBase.spec.js` (quote). Thiếu: `handleReplyTo` ghi localStorage + `TOGGLE_REPLY_TO_MESSAGE` |
| C-48 | chưa thể test tự động | dịch tin cần backend |
| C-49 | đã có spec | `MessageStatus.spec.js` (sent = check, delivered/read = check-check, read is blue, progress = clock). Logic chọn trạng thái theo kênh trong `MessageMeta.vue` không test |
| C-50 | chưa thể test tự động | `GalleryView.vue` (phím ← → Esc) chưa có spec |

### A4. Khung soạn tin

| ID | Trạng thái | Spec / lý do |
|---|---|---|
| C-51 | đã có spec | `E/specs/ReplyTopPanel.spec.js` (Alt+P emits setReplyMode(NOTE); Alt+L emits setReplyMode(REPLY); Alt+L is a no-op when replying is restricted; both do NOT fire while an input is focused), `W/specs/ReplyBox.spec.js` (reply vs private note: ReplyTopPanel set-reply-mode NOTE stores the mode and makes the payload private; passes the private flag to the editor and bottom panel; switching back to REPLY…; mode switching discards pending attachments), `E/specs/Editor.spec.js` (registers Alt+P / Alt+L) |
| C-52 | đã có spec | `ReplyBox.spec.js` (send hotkeys: Enter sends when "Enter" is the configured key and the editor is focused; Enter does NOT send when the setting is Cmd/Ctrl+Enter; Cmd/Ctrl+Enter sends when it is the configured key; …does NOT send when Enter is configured; does not send while canned/@mention/variables menu is open; does not send an empty message; …when not focused) |
| C-53 | đã có spec | `ReplyBox.spec.js` (Cmd/Ctrl+K opens the command bar (ninja-keys) and prevents default) |
| C-54 | đã có spec | `ReplyBox.spec.js` (Escape closes the emoji picker) |
| C-55 | một phần | `E/specs/Editor.spec.js` (@mention agent menu shows only in a private note; reports the @mention menu only in private notes), `ReplyBox.spec.js` (does not send while the @mention menu is open). Thiếu: ký tự "@" thực sự gọi plugin ProseMirror (không lái được trong jsdom) và chọn tên |
| C-56 | một phần | `Editor.spec.js` (canned responses menu shows for a reply when triggered; never shows in a private note; can be disabled by the prop; reports menu visibility to the parent), `ReplyBox.spec.js` (does not send while the canned-response menu is open). Thiếu: gõ "/" thật (ProseMirror) |
| C-57 | một phần | `Editor.spec.js` (variables menu shows for replies when enabled, never in notes; is off unless enableVariables). Thiếu: modal xác nhận biến chưa định nghĩa trong `ReplyBox.onSendReply` (cần `confirmDialog` thật) |
| C-58 | một phần | `Editor.spec.js` (emoji menu shows in both modes), `ReplyBox.spec.js` (Escape closes the emoji picker). Thiếu: gõ ":" thật và chọn emoji |
| C-59 | đã có spec | `E/specs/ReplyBottomPanel.spec.js` (renders the file input with the id…; Cmd+Alt+A clicks #conversationAttachment; does nothing when the editor is disabled; hides the attach button when file upload is off and not in note mode; shows it in note mode), `ReplyBox.spec.js` (attachments: onFileUpload adds a preview entry and AttachmentPreview remove clears it; sends attached files in payload.files; allows an attachment-only send) |
| C-60 | một phần | `ReplyBottomPanel.spec.js` (enables drag-and-drop on the upload component; disables drag-and-drop while the new-conversation modal is active; forwards the input-file event to onFileUpload), `ReplyBox.spec.js` (paste is ignored while the new-conversation modal is open). Thiếu: kéo thả file thật và lớp phủ toàn màn hình (jsdom không mô phỏng DataTransfer/drag) |
| C-61 | đã có spec | `ReplyBox.spec.js` (paste on document: a pasted image on the document is attached; zero-size files are ignored; paste is ignored while the new-conversation modal is open; paste is ignored while the editor is disabled; removes the paste listener when unmounted) |
| C-62 | một phần | `Editor.spec.js` (registers $mod+Shift+KeyV; inline image paste is a no-op without clipboard.read and never throws). Thiếu: đọc ảnh từ `navigator.clipboard.read()` (jsdom không có) |
| C-63 | chưa thể test tự động | ghi âm (wavesurfer, MediaRecorder) không chạy trong jsdom; `AudioMessageHelper.spec.js` có sẵn |
| C-64 | đã có spec | `ReplyBox.spec.js` (signature: appends the agent signature to a restored draft when the channel flag is on; does not add when off; not in private-note mode; a signature-only body does not count as meaningful content; shows the missing-signature alert) |
| C-65 | đã có spec | `ReplyBox.spec.js` (drafts: restores the saved draft for conversation + mode on mount; draft key format is draft-<id>-<REPLY|NOTE>; blur saves the current text as a draft; switching reply mode saves the old draft and loads the other; removes the stored draft after a successful send) |
| C-66 | đã có spec | `ReplyBox.spec.js` (editor typing-on / typing-off dispatch toggleTyping with conversation and privacy) |
| C-67 | đã có spec | `ReplyBox.spec.js` (WhatsApp: one message per attachment, caption only on the first; Instagram: attachments have no caption and the text goes as its own message; a private note on WhatsApp is still one message with all files) |
| C-68 | một phần | `ReplyBox.spec.js` (includes cc/bcc/to only for replies on an email inbox; shows the email head (To/CC/BCC) on email replies only). Quote email: `quotedEmailHelper.spec.js` có sẵn; thiếu `QuotedEmailPreview` toggle |
| C-69 | chưa thể test tự động | modal mẫu WhatsApp/Twilio chưa có spec; `templateHelper.spec.js` có sẵn |
| C-70 | đã có spec | `ReplyBox.spec.js` (disabled states: WhatsApp conversation outside the 24h window disables the editor and send; API inbox with can_reply=false also disables; a private note is still allowed on a locked WhatsApp conversation; sends nothing as a public reply when the conversation cannot be replied to (email)), `ReplyTopPanel.spec.js` (Alt+P still works when replying is restricted) |
| C-71 | chưa thể test tự động | `ArticleSearchPopover` cần portal; chưa viết |
| C-72 | chưa thể test tự động | `ResizableEditorWrapper` phụ thuộc layout/kéo chuột |
| C-73 | có spec sẵn | `W/specs/KaloAiSuggestions.spec.js` |
| C-74 | có spec sẵn | `W/specs/KaloComposerActions.spec.js`, `W/specs/KaloOrderCard.spec.js`; `Message.spec.js` thêm: renders the Kalo order card under a QR message carrying kchatOrderId |
| C-75 | chưa thể test tự động | cần `captain_tasks` + OpenAI; `useCaptain.spec.js`, `useConversationHotKeys.spec.js` có sẵn |

### A5. Panel khách

| ID | Trạng thái | Spec / lý do |
|---|---|---|
| C-76 | đã có spec | `R/contact/specs/ContactInfo.spec.js` (shows the contact name and description; shows email, phone and company rows with the contact values; email/phone rows link with mailto:/tel: and allow copy + edit; shows the identifier row only when set; inline editing: email / phone / company row update saves through contacts/update; clicking the name opens an inline input; does not save when unchanged; Escape cancels; update errors: duplicate email / phone / other) |
| C-77 | một phần | `ContactInfo.spec.js` (renders the merge modal for the contact (everyone)). Thiếu: luồng chọn khách và gộp trong `ContactMergeModal` |
| C-78 | đã có spec | `ContactInfo.spec.js` (the pencil button toggles the edit contact modal; delete modal is admin-only and closes the panel after deleting) |
| C-79 | chưa thể test tự động | kéo thả sắp xếp mục panel (vuedraggable) và lưu UI settings; `ContactPanel.vue` chưa có spec |
| C-80 | đã có spec | `R/specs/ConversationAction.spec.js` (assignee: selecting an agent sets it optimistically then calls assignAgent; agent bot keeps its type; selecting the already assigned agent unassigns; "assign to me" shown/hidden; self assign; team: select / remove (teamId 0) / "None" entry; priority: offers None, Urgent, High, Medium, Low; select; selecting the current priority clears it) |
| C-81 | đã có spec | `R/labels/specs/LabelBox.spec.js` (registers L (toggle) and Escape (close, even while typing); shows one chip per active label; key L opens the dropdown and prevents default; Escape closes it; the + button toggles the dropdown; dropdown add/remove events call the label composable; only admins may create labels) |
| C-82 | chưa thể test tự động | `ConversationParticipant.vue` chưa viết spec; store có spec sẵn |
| C-83 | chưa thể test tự động | `ConversationInfo.vue` chưa viết spec (hiển thị thuần) |
| C-84 | chưa thể test tự động | `CustomAttributes.vue` (333 dòng, nhiều kiểu input) chưa viết spec |
| C-85 | đã có spec | `R/specs/ContactConversations.spec.js` (fetches on mount; refetches when the contact changes; lists the other conversations, excluding the current one; shows the "no records" message; spinner while fetching; click navigates; Cmd/Ctrl+click opens a new tab) |
| C-86 | chưa thể test tự động | `MacroItem.vue` chưa viết spec; `useMacros.spec.js` có sẵn |
| C-87 | đã có spec | `R/contact/specs/ContactNotes.spec.js` (registers Cmd/Ctrl+Enter that works while typing; …with content creates the note and closes the modal; …with empty content does not create; deleting dispatches contactNotes/delete; refetches when the contact changes) |
| C-88 | chưa thể test tự động | `SharedFiles.vue` chưa viết spec |
| C-89 | chưa thể test tự động | Linear: cần tích hợp ngoài |
| C-90 | chưa thể test tự động | Shopify: cần tích hợp ngoài |
| C-91 | có spec sẵn | `R/contact/specs/KaloContactOrders.spec.js` |
| C-92 | chưa thể test tự động | click ngoài + popover ProseMirror trong `ConversationSidebar.vue`, phụ thuộc layout/breakpoint |

### A6. Toàn cục

| ID | Trạng thái | Spec / lý do |
|---|---|---|
| C-93 | một phần | Cmd+K từ khung soạn: C-53. Các lệnh trong thanh lệnh: `D/composables/commands/spec/*.spec.js` có sẵn. `commandbar.vue` (ninja-keys) không mount được |
| C-94 | đã có spec | `D/components-next/sidebar/specs/useSidebarKeyboardShortcuts.spec.js` (Cmd+/ opens and Cmd+Esc closes the shortcut modal) |
| C-95 | đã có spec | `useSidebarKeyboardShortcuts.spec.js` (Alt+C/V/R/S navigate to home, contacts_dashboard_index, account_overview_reports, agent_list; does not navigate when already on the target route) |
| C-96 | đã có spec | `D/helper/specs/actionCableChatHandlers.spec.js` (subscribes the chat events to their handlers; message.created adds the message and bumps last activity; message.updated; conversation.created / status_changed / updated / read; assignee.changed; contact_changed; mentioned; contact.updated/deleted; presence.update; notification events; only accepts events for the current account) |
| C-97 | đã có spec | `actionCableChatHandlers.spec.js` (typing turns itself off after 30 seconds; a second typing_on restarts the timer; typing_off cancels the pending auto-off) |
| C-98 | một phần | `actionCableChatHandlers.spec.js` (plays the new message sound / favicon dot through the audio helper: chỉ kiểm `onNewMessage` được gọi); `AudioAlerts/specs/*.spec.js` có sẵn |
| C-99 | chưa thể test tự động | push trình duyệt cần Service Worker/Notification API |
| C-100 | chưa thể test tự động | chuông thông báo ở rail; store có spec sẵn (`notifications/*.spec.js`). `notification.*` từ ActionCable: C-96 |
| C-101 | có spec sẵn | `D/components-next/sidebar/specs/KaloRail.spec.js`, `ST/specs/conversationUnreadCounts/*.spec.js` |
| C-102 | chưa thể test tự động | chỉ là route `inbox_view` |
| C-103 | một phần | `ConversationBox.spec.js` (shows the empty state when no conversation is selected; hides it in the inbox view). Màn chào `OnboardingView` chưa test |
| C-104 | có spec sẵn | `D/helper/specs/ReconnectService.spec.js` |

### A7. Không có backend (không thuộc danh sách phải giữ)

C-X1, C-X2, C-X3, C-X4: không viết spec (code UI có thể bỏ; xem inventory mục A7).

## Phát hiện trong lúc viết spec (không sửa code theo yêu cầu 1a)

1. **`MoreActions.vue`: lệnh thanh lệnh "Gửi transcript" có thể không mở được modal.** `emitter.on(CMD_SEND_TRANSCRIPT, toggleEmailModal)` gắn thẳng hàm `toggle` của vueuse; `toggle(value)` gán `value` khi có bất kỳ đối số nào, mà mitt gọi listener với đối số `undefined`, nên cờ thành `undefined` (falsy) thay vì mở modal. Test `CMD_SEND_TRANSCRIPT currently leaves the modal flag falsy` ghim hành vi này; nếu Task 1 sửa lỗi thì phải đổi test và ghi vào `docs/LESSONS.md`. Chưa xác minh trên trình duyệt thật.
2. **Không có dải ngăn cách theo ngày** giữa các tin nhắn trong fork này (`MessageList.vue` không render): mục "date separators" trong yêu cầu không có gì để ghim.
3. Tin có `content: null` và chỉ có `contentAttributes.sticker` (sticker Zalo không kèm chữ) sẽ **không được render** (`shouldRenderMessage` trong `Message.vue:426-444`). Spec sticker dùng `content: '[sticker]'`; cần kiểm tay xem bridge Zalo có luôn gửi content không.

## Số liệu

- 26 file spec mới, 330 test mới (xem danh sách ở bảng trên; mỗi file nằm cạnh component trong thư mục `specs/`).
- Chạy cả bộ vitest (`--poolOptions.threads.minThreads=1 --poolOptions.threads.maxThreads=3`) trên nhánh này: 454 file, 4442 test, tất cả xanh.
- Không sửa file nguồn nào ngoài spec và tài liệu này. ESLint (`npx eslint <files> --ext .js,.vue` trong container rails) sạch cho cả 26 file.
