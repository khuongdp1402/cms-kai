// Characterization spec for ReplyBox (chat-parity C-51..C-53, C-56..C-61, C-64..C-67, C-70).
// Pins components/widgets/conversation/ReplyBox.vue:
//  - send hotkeys + guards            :677-723 (getKeyboardEvents/isAValidEvent)
//  - send payload shape               :898-920 (createPendingMessageAndSend), :1135-1172
//  - reply/note mode                  :179-188, :935-949
//  - disabled / restricted states     :204-209, :453-459
//  - draft save/restore/clear         :623-672, :1014-1017
//  - signature on draft               :648-667
//  - paste handler                    :724-758
//  - attachments add/remove           :1053-1071 (+ fileUploadMixin)
//  - typing on/off                    :1039-1052
//  - WhatsApp/Instagram multi message :1085-1134
// Child components are stubbed: this spec pins ReplyBox's own wiring (events in, store calls out).
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ref } from 'vue';
import ReplyBox from '../ReplyBox.vue';
import WootMessageEditor from 'dashboard/components/widgets/WootWriter/Editor.vue';
import ReplyTopPanel from 'dashboard/components/widgets/WootWriter/ReplyTopPanel.vue';
import ReplyBottomPanel from 'dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue';
import AttachmentPreview from 'dashboard/components/widgets/AttachmentsPreview.vue';
import ReplyEmailHead from '../ReplyEmailHead.vue';
import MessageSignatureMissingAlert from '../MessageSignatureMissingAlert.vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useCopilotReply', () => ({
  useCopilotReply: () => ({
    isActive: ref(false),
    isButtonDisabled: ref(false),
    isGenerating: ref(false),
    showEditor: ref(false),
    generatedContent: ref(''),
    editorTransitionKey: ref('k'),
    reset: vi.fn(),
    execute: vi.fn(),
    accept: vi.fn(),
    toggleEditor: vi.fn(),
    setContentReady: vi.fn(),
    sendFollowUp: vi.fn(),
  }),
}));

const actions = {
  createPendingMessageAndSend: vi.fn(() => Promise.resolve()),
  'draftMessages/set': vi.fn(),
  'draftMessages/delete': vi.fn(),
  'draftMessages/setReplyEditorMode': vi.fn(),
  'conversationTypingStatus/toggleTyping': vi.fn(),
};

const INBOXES = {
  web: { id: 1, channel_type: 'Channel::WebWidget' },
  email: { id: 2, channel_type: 'Channel::Email', email: 'shop@x.vn' },
  whatsapp: { id: 3, channel_type: 'Channel::Whatsapp', provider: 'default' },
  instagram: { id: 4, channel_type: 'Channel::Instagram' },
  api: { id: 5, channel_type: 'Channel::Api' },
};

const buildChat = (inboxKey, overrides = {}) => ({
  id: 10,
  inbox_id: INBOXES[inboxKey].id,
  can_reply: true,
  messages: [],
  meta: { sender: { id: 99 } },
  additional_attributes: {},
  ...overrides,
});

import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

const mountReplyBox = ({
  inbox = 'web',
  chat = {},
  uiSettings = { enter_to_send_enabled: true },
  signature = '',
  drafts = {},
} = {}) => {
  const currentChat = buildChat(inbox, chat);
  const store = createStore({
    getters: {
      getSelectedChat: () => currentChat,
      getMessageSignature: () => signature,
      getCurrentUser: () => ({ name: 'Agent', avatar_url: 'a.png' }),
      getLastEmailInSelectedChat: () => null,
      'globalConfig/get': () => ({ directUploadsEnabled: false }),
      'contacts/getContact': () => () => ({ name: 'Cus', id: 99 }),
      'inboxes/getInbox': () => id =>
        Object.values(INBOXES).find(i => i.id === id),
      'inboxes/getWhatsAppTemplates': () => () => [],
      'draftMessages/get': () => key => drafts[key],
      getUISettings: () => uiSettings,
      getCurrentAccountId: () => 1,
      'accounts/isFeatureEnabledonAccount': () => () => false,
      'integrations/getUIFlags': () => ({}),
    },
    actions,
  });
  const wrapper = shallowMount(ReplyBox, {
    attachTo: document.body,
    global: {
      plugins: [store],
      directives: { 'on-clickaway': {}, tooltip: {} },
      stubs: { 'woot-confirm-modal': true, transition: false },
    },
  });
  return { wrapper, store };
};

const COMPONENTS = {
  WootMessageEditor,
  ReplyTopPanel,
  ReplyBottomPanel,
  AttachmentPreview,
  ReplyEmailHead,
  MessageSignatureMissingAlert,
};
const child = (wrapper, name) => wrapper.findComponent(COMPONENTS[name]);
const dispatchedPayload = () =>
  actions.createPendingMessageAndSend.mock.calls.at(-1)[1];

describe('ReplyBox', () => {
  let wrapper;
  afterEach(() => {
    wrapper?.unmount();
    emitter.emit(BUS_EVENTS.NEW_CONVERSATION_MODAL, false);
  });

  it('renders the composer target of the Tin nhắn tour', () => {
    ({ wrapper } = mountReplyBox());
    expectTourTargets(wrapper, 'messages', ['chat-composer']);
  });

  describe('send hotkeys', () => {
    const typeAndFocus = async w => {
      w.vm.message = 'hello';
      child(w, 'WootMessageEditor').vm.$emit('focus');
      await flushPromises();
    };

    it('Enter sends when "Enter" is the configured send key and the editor is focused', async () => {
      ({ wrapper } = mountReplyBox({
        uiSettings: { enter_to_send_enabled: true },
      }));
      await typeAndFocus(wrapper);
      const preventDefault = vi.fn();
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('Enter does NOT send when the profile setting is Cmd/Ctrl+Enter', async () => {
      ({ wrapper } = mountReplyBox({
        uiSettings: { editor_message_key: 'cmd_enter' },
      }));
      await typeAndFocus(wrapper);
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault: vi.fn() });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('Cmd/Ctrl+Enter sends when it is the configured send key', async () => {
      ({ wrapper } = mountReplyBox({
        uiSettings: { editor_message_key: 'cmd_enter' },
      }));
      await typeAndFocus(wrapper);
      wrapper.vm.getKeyboardEvents()['$mod+Enter'].action();
      await flushPromises();
      expect(actions.createPendingMessageAndSend).toHaveBeenCalledTimes(1);
    });

    it('Cmd/Ctrl+Enter does NOT send when Enter is the configured send key', async () => {
      ({ wrapper } = mountReplyBox({
        uiSettings: { editor_message_key: 'enter' },
      }));
      await typeAndFocus(wrapper);
      wrapper.vm.getKeyboardEvents()['$mod+Enter'].action();
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('does not send while the canned-response menu is open', async () => {
      ({ wrapper } = mountReplyBox());
      await typeAndFocus(wrapper);
      child(wrapper, 'WootMessageEditor').vm.$emit('toggleCannedMenu', true);
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault: vi.fn() });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('does not send while the @mention menu is open', async () => {
      ({ wrapper } = mountReplyBox());
      await typeAndFocus(wrapper);
      child(wrapper, 'WootMessageEditor').vm.$emit('toggleUserMention', true);
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault: vi.fn() });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('does not send while the {{variables}} menu is open', async () => {
      ({ wrapper } = mountReplyBox());
      await typeAndFocus(wrapper);
      child(wrapper, 'WootMessageEditor').vm.$emit('toggleVariablesMenu', true);
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault: vi.fn() });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('does not send an empty message', async () => {
      ({ wrapper } = mountReplyBox());
      child(wrapper, 'WootMessageEditor').vm.$emit('focus');
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault: vi.fn() });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('does not send when the editor is not focused', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.message = 'hello';
      wrapper.vm.getKeyboardEvents().Enter.action({ preventDefault: vi.fn() });
      await flushPromises();
      expect(actions.createPendingMessageAndSend).not.toHaveBeenCalled();
    });

    it('Cmd/Ctrl+K opens the command bar (ninja-keys) and prevents default', () => {
      ({ wrapper } = mountReplyBox());
      const open = vi.fn();
      const ninja = document.createElement('ninja-keys');
      ninja.open = open;
      document.body.appendChild(ninja);
      const preventDefault = vi.fn();
      wrapper.vm.getKeyboardEvents()['$mod+KeyK'].action({ preventDefault });
      expect(open).toHaveBeenCalled();
      expect(preventDefault).toHaveBeenCalled();
      ninja.remove();
    });

    it('Escape closes the emoji picker', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.toggleEmojiPicker();
      expect(wrapper.vm.showEmojiPicker).toBe(true);
      wrapper.vm.getKeyboardEvents().Escape.action();
      expect(wrapper.vm.showEmojiPicker).toBe(false);
    });

    it('registers Escape, Cmd+K, Enter and Cmd+Enter that work while the editor is focused', () => {
      ({ wrapper } = mountReplyBox());
      const events = wrapper.vm.getKeyboardEvents();
      expect(Object.keys(events).sort()).toEqual(
        ['$mod+Enter', '$mod+KeyK', 'Enter', 'Escape'].sort()
      );
      Object.values(events).forEach(e =>
        expect(e.allowOnFocusedInput).toBe(true)
      );
    });
  });

  describe('send payload', () => {
    it('dispatches createPendingMessageAndSend with the documented payload shape', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.message = 'xin chao';
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(actions.createPendingMessageAndSend).toHaveBeenCalledTimes(1);
      expect(dispatchedPayload()).toEqual({
        conversationId: 10,
        message: 'xin chao',
        private: false,
        sender: { name: 'Agent', thumbnail: 'a.png' },
      });
    });

    it('clears the message and emits SCROLL_TO_MESSAGE + MESSAGE_SENT after sending', async () => {
      ({ wrapper } = mountReplyBox());
      const scroll = vi.fn();
      const sent = vi.fn();
      emitter.on(BUS_EVENTS.SCROLL_TO_MESSAGE, scroll);
      emitter.on(BUS_EVENTS.MESSAGE_SENT, sent);
      wrapper.vm.message = 'hi';
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(wrapper.vm.message).toBe('');
      expect(scroll).toHaveBeenCalled();
      expect(sent).toHaveBeenCalled();
      emitter.off(BUS_EVENTS.SCROLL_TO_MESSAGE, scroll);
      emitter.off(BUS_EVENTS.MESSAGE_SENT, sent);
    });

    it('removes the stored draft after a successful send', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.message = 'hi';
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(actions['draftMessages/delete']).toHaveBeenCalledWith(
        expect.anything(),
        { key: 'draft-10-REPLY' }
      );
    });

    it('adds in_reply_to to contentAttributes when quoting a message', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.message = 'ok';
      wrapper.vm.inReplyTo = { id: 55 };
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(dispatchedPayload().contentAttributes).toEqual({
        in_reply_to: 55,
      });
    });

    it('includes cc/bcc/to only for replies on an email inbox', async () => {
      ({ wrapper } = mountReplyBox({ inbox: 'email' }));
      wrapper.vm.message = 'mail';
      wrapper.vm.ccEmails = 'cc@x.vn';
      wrapper.vm.bccEmails = 'bcc@x.vn';
      wrapper.vm.toEmails = 'to@x.vn';
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(dispatchedPayload()).toMatchObject({
        private: false,
        ccEmails: 'cc@x.vn',
        bccEmails: 'bcc@x.vn',
        toEmails: 'to@x.vn',
      });
    });

    it('shows the email head (To/CC/BCC) on email replies only', () => {
      ({ wrapper } = mountReplyBox({ inbox: 'email' }));
      expect(child(wrapper, 'ReplyEmailHead').exists()).toBe(true);
      wrapper.unmount();
      ({ wrapper } = mountReplyBox({ inbox: 'web' }));
      expect(child(wrapper, 'ReplyEmailHead').exists()).toBe(false);
    });
  });

  describe('reply vs private note', () => {
    it('ReplyTopPanel set-reply-mode NOTE stores the mode and makes the payload private', async () => {
      ({ wrapper } = mountReplyBox());
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(actions['draftMessages/setReplyEditorMode']).toHaveBeenCalledWith(
        expect.anything(),
        { mode: 'NOTE' }
      );
      expect(wrapper.vm.isOnPrivateNote).toBe(true);
      wrapper.vm.message = 'internal';
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(dispatchedPayload()).toMatchObject({
        private: true,
        message: 'internal',
      });
    });

    it('passes the private flag to the editor (is-private) and the bottom panel (is-note)', async () => {
      ({ wrapper } = mountReplyBox());
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(child(wrapper, 'WootMessageEditor').props('isPrivate')).toBe(true);
      expect(child(wrapper, 'ReplyBottomPanel').props('isNote')).toBe(true);
    });

    it('switching back to REPLY returns to a public reply', async () => {
      ({ wrapper } = mountReplyBox());
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'REPLY');
      await flushPromises();
      expect(wrapper.vm.isPrivate).toBe(false);
    });

    it('mode switching discards pending attachments', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.attachedFiles = [{ resource: {}, thumb: 'x' }];
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(wrapper.vm.attachedFiles).toEqual([]);
    });

    it('sends nothing as a public reply when the conversation cannot be replied to (email 24h/closed)', () => {
      ({ wrapper } = mountReplyBox({
        inbox: 'email',
        chat: { can_reply: false },
      }));
      expect(wrapper.vm.isReplyRestricted).toBe(true);
      expect(wrapper.vm.isPrivate).toBe(true);
      expect(child(wrapper, 'ReplyTopPanel').props('isReplyRestricted')).toBe(
        true
      );
    });
  });

  describe('disabled states', () => {
    it('WhatsApp conversation outside the 24h window disables the editor and send', () => {
      ({ wrapper } = mountReplyBox({
        inbox: 'whatsapp',
        chat: { can_reply: false },
      }));
      expect(wrapper.vm.isEditorDisabled).toBe(true);
      expect(child(wrapper, 'WootMessageEditor').props('disabled')).toBe(true);
      expect(wrapper.vm.isReplyButtonDisabled).toBe(true);
      expect(child(wrapper, 'ReplyBottomPanel').props('isEditorDisabled')).toBe(
        true
      );
    });

    it('API inbox with can_reply=false also disables the editor', () => {
      ({ wrapper } = mountReplyBox({
        inbox: 'api',
        chat: { can_reply: false },
      }));
      expect(wrapper.vm.isEditorDisabled).toBe(true);
    });

    it('a private note is still allowed on a locked WhatsApp conversation', async () => {
      ({ wrapper } = mountReplyBox({
        inbox: 'whatsapp',
        chat: { can_reply: false },
      }));
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(wrapper.vm.isEditorDisabled).toBe(false);
    });

    it('send button is disabled for an empty message and enabled with text or an attachment', async () => {
      ({ wrapper } = mountReplyBox());
      expect(wrapper.vm.isReplyButtonDisabled).toBe(true);
      wrapper.vm.message = 'x';
      expect(wrapper.vm.isReplyButtonDisabled).toBe(false);
      wrapper.vm.message = '';
      wrapper.vm.attachedFiles = [{ resource: {}, thumb: 'x' }];
      expect(wrapper.vm.isReplyButtonDisabled).toBe(false);
    });

    it('paste is ignored while the editor is disabled', () => {
      ({ wrapper } = mountReplyBox({
        inbox: 'whatsapp',
        chat: { can_reply: false },
      }));
      const spy = vi.spyOn(wrapper.vm, 'onFileUpload');
      const file = new File(['a'], 'a.png', { type: 'image/png' });
      wrapper.vm.onPaste({ clipboardData: { files: [file] } });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('drafts', () => {
    it('restores the saved draft for conversation + mode on mount', async () => {
      ({ wrapper } = mountReplyBox({
        drafts: { 'draft-10-REPLY': 'dang soan' },
      }));
      expect(wrapper.vm.message).toBe('dang soan');
      await flushPromises();
      expect(child(wrapper, 'WootMessageEditor').props('modelValue')).toBe(
        'dang soan'
      );
    });

    it('draft key format is draft-<conversationId>-<REPLY|NOTE>', () => {
      ({ wrapper } = mountReplyBox());
      expect(wrapper.vm.getDraftKey()).toBe('draft-10-REPLY');
      expect(wrapper.vm.getDraftKey(10, 'NOTE')).toBe('draft-10-NOTE');
      expect(wrapper.vm.editorStateId).toBe('draft-10-REPLY');
    });

    it('blur saves the current text as a draft', () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.message = 'dang do';
      child(wrapper, 'WootMessageEditor').vm.$emit('blur');
      expect(actions['draftMessages/set']).toHaveBeenCalledWith(
        expect.anything(),
        { key: 'draft-10-REPLY', message: 'dang do' }
      );
    });

    it('switching reply mode saves the draft of the old mode and loads the other', async () => {
      ({ wrapper } = mountReplyBox({ drafts: { 'draft-10-NOTE': 'ghi chu' } }));
      wrapper.vm.message = 'reply text';
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(actions['draftMessages/set']).toHaveBeenCalledWith(
        expect.anything(),
        { key: 'draft-10-REPLY', message: 'reply text' }
      );
      expect(wrapper.vm.message).toBe('ghi chu');
    });
  });

  describe('signature', () => {
    it('appends the agent signature to a restored draft when the channel flag is on', () => {
      ({ wrapper } = mountReplyBox({
        signature: 'Than ai, Shop',
        uiSettings: {
          enter_to_send_enabled: true,
          channel_webwidget_signature_enabled: true,
        },
      }));
      expect(wrapper.vm.message).toContain('Than ai, Shop');
      expect(wrapper.vm.isSignatureEnabledForInbox).toBe(true);
    });

    it('does not add a signature when the flag is off', () => {
      ({ wrapper } = mountReplyBox({ signature: 'Than ai, Shop' }));
      expect(wrapper.vm.message).not.toContain('Than ai, Shop');
    });

    it('does not add a signature in private-note mode', async () => {
      ({ wrapper } = mountReplyBox({
        signature: 'Than ai, Shop',
        uiSettings: { channel_webwidget_signature_enabled: true },
      }));
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(wrapper.vm.message).not.toContain('Than ai, Shop');
    });

    it('a signature-only body does not count as meaningful content', () => {
      ({ wrapper } = mountReplyBox({
        signature: 'Than ai, Shop',
        uiSettings: { channel_webwidget_signature_enabled: true },
      }));
      expect(wrapper.vm.hasMeaningfulEditorContent).toBe(false);
    });

    it('shows the missing-signature alert when the flag is on but no signature exists', () => {
      ({ wrapper } = mountReplyBox({
        signature: '',
        uiSettings: { channel_webwidget_signature_enabled: true },
      }));
      expect(child(wrapper, 'MessageSignatureMissingAlert').exists()).toBe(
        true
      );
    });
  });

  describe('attachments', () => {
    const png = () => new File(['abc'], 'a.png', { type: 'image/png' });

    it('onFileUpload adds a preview entry and AttachmentPreview remove clears it', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.onFileUpload({
        name: 'a.png',
        type: 'image/png',
        size: 3,
        file: png(),
      });
      await vi.waitFor(() => expect(wrapper.vm.attachedFiles).toHaveLength(1));
      expect(wrapper.vm.attachedFiles[0]).toMatchObject({
        currentChatId: 10,
        isPrivate: false,
        isVoiceMessage: false,
      });
      await flushPromises();
      const preview = child(wrapper, 'AttachmentPreview');
      expect(preview.exists()).toBe(true);
      preview.vm.$emit('removeAttachment', []);
      await flushPromises();
      expect(wrapper.vm.attachedFiles).toHaveLength(0);
      expect(child(wrapper, 'AttachmentPreview').exists()).toBe(false);
    });

    it('sends attached files in payload.files (non direct-upload: raw File)', async () => {
      ({ wrapper } = mountReplyBox());
      const file = png();
      wrapper.vm.attachedFiles = [{ resource: { file }, thumb: 'x' }];
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(dispatchedPayload().files).toEqual([file]);
    });

    it('allows an attachment-only send (empty text)', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.vm.attachedFiles = [{ resource: { file: png() }, thumb: 'x' }];
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(actions.createPendingMessageAndSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('paste on document (C-61)', () => {
    const firePaste = files => {
      const event = new Event('paste');
      event.clipboardData = { files };
      document.dispatchEvent(event);
    };

    it('a pasted image on the document is attached', async () => {
      ({ wrapper } = mountReplyBox());
      const file = new File(['abc'], 'shot.png', { type: 'image/png' });
      firePaste([file]);
      await vi.waitFor(() => expect(wrapper.vm.attachedFiles).toHaveLength(1));
    });

    it('zero-size files from the clipboard are ignored', async () => {
      ({ wrapper } = mountReplyBox());
      firePaste([new File([], 'empty.png', { type: 'image/png' })]);
      await flushPromises();
      expect(wrapper.vm.attachedFiles).toHaveLength(0);
    });

    it('paste is ignored while the new-conversation modal is open', async () => {
      ({ wrapper } = mountReplyBox());
      emitter.emit(BUS_EVENTS.NEW_CONVERSATION_MODAL, true);
      firePaste([new File(['abc'], 'shot.png', { type: 'image/png' })]);
      await flushPromises();
      expect(wrapper.vm.attachedFiles).toHaveLength(0);
    });

    it('removes the paste listener when unmounted', async () => {
      ({ wrapper } = mountReplyBox());
      wrapper.unmount();
      firePaste([new File(['abc'], 'shot.png', { type: 'image/png' })]);
      await flushPromises();
      expect(wrapper.vm.attachedFiles).toHaveLength(0);
    });
  });

  describe('typing indicator (C-66)', () => {
    it('editor typing-on / typing-off dispatch toggleTyping with conversation and privacy', () => {
      ({ wrapper } = mountReplyBox());
      const editor = child(wrapper, 'WootMessageEditor');
      editor.vm.$emit('typingOn');
      expect(
        actions['conversationTypingStatus/toggleTyping']
      ).toHaveBeenLastCalledWith(expect.anything(), {
        status: 'on',
        conversationId: 10,
        isPrivate: false,
      });
      editor.vm.$emit('typingOff');
      expect(
        actions['conversationTypingStatus/toggleTyping']
      ).toHaveBeenLastCalledWith(expect.anything(), {
        status: 'off',
        conversationId: 10,
        isPrivate: false,
      });
    });
  });

  describe('multi-message channels (C-67)', () => {
    const files = [
      { resource: { file: 'f1' }, thumb: 't' },
      { resource: { file: 'f2' }, thumb: 't' },
    ];

    it('WhatsApp: one message per attachment, caption only on the first', async () => {
      ({ wrapper } = mountReplyBox({ inbox: 'whatsapp' }));
      wrapper.vm.message = 'caption';
      wrapper.vm.attachedFiles = files;
      await wrapper.vm.onSendReply();
      await flushPromises();
      const calls = actions.createPendingMessageAndSend.mock.calls.map(
        c => c[1]
      );
      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatchObject({ files: ['f1'], message: 'caption' });
      expect(calls[1]).toMatchObject({ files: ['f2'], message: '' });
    });

    it('Instagram: attachments have no caption and the text goes as its own message', async () => {
      ({ wrapper } = mountReplyBox({ inbox: 'instagram' }));
      wrapper.vm.message = 'text';
      wrapper.vm.attachedFiles = [files[0]];
      await wrapper.vm.onSendReply();
      await flushPromises();
      const calls = actions.createPendingMessageAndSend.mock.calls.map(
        c => c[1]
      );
      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatchObject({ files: ['f1'], message: '' });
      expect(calls[1]).toMatchObject({ message: 'text' });
      expect(calls[1].files).toBeUndefined();
    });

    it('a private note on WhatsApp is still sent as one message with all files', async () => {
      ({ wrapper } = mountReplyBox({ inbox: 'whatsapp' }));
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      wrapper.vm.message = 'note';
      wrapper.vm.attachedFiles = files;
      await wrapper.vm.onSendReply();
      await flushPromises();
      expect(actions.createPendingMessageAndSend).toHaveBeenCalledTimes(1);
      expect(dispatchedPayload()).toMatchObject({
        private: true,
        files: ['f1', 'f2'],
      });
    });
  });

  // Kalo UI phase 2 (task 1b-ii): composer toolbar wiring.
  describe('Kalo composer toolbar', () => {
    it('the canned button inserts "/" into the editor to open the canned menu (C-56)', async () => {
      ({ wrapper } = mountReplyBox());
      child(wrapper, 'ReplyBottomPanel').vm.$emit('insertCanned');
      await flushPromises();
      expect(
        child(wrapper, 'WootMessageEditor').props('updateSelectionWith')
      ).toBe('/');
    });

    it.each([
      ['', '/'],
      [' ', '/'],
      ['\n', '/'],
      ['a', ' /'],
      ['.', ' /'],
    ])(
      'after "%s" the canned button inserts "%s" so the "/" menu opens',
      (before, expected) => {
        const addIntoEditor = vi.fn();
        ReplyBox.methods.insertCannedTrigger.call({
          messageEditor: { charBeforeCursor: () => before },
          addIntoEditor,
        });
        expect(addIntoEditor).toHaveBeenCalledWith(expected);
      }
    );

    it('send label is plain and the shortcut goes to the hint: Enter (C-52)', () => {
      ({ wrapper } = mountReplyBox());
      const panel = child(wrapper, 'ReplyBottomPanel');
      expect(panel.props('sendButtonText')).toBe(
        'KALO_CHAT_THREAD.COMPOSER.SEND'
      );
      expect(panel.props('sendButtonHint')).toBe('↵');
    });

    it('with Cmd/Ctrl+Enter configured the hint shows that shortcut (C-52)', () => {
      ({ wrapper } = mountReplyBox({
        uiSettings: { editor_message_key: 'cmd_enter' },
      }));
      expect(
        child(wrapper, 'ReplyBottomPanel').props('sendButtonHint')
      ).not.toBe('↵');
    });

    it('a private note uses the "save note" label', async () => {
      ({ wrapper } = mountReplyBox());
      child(wrapper, 'ReplyTopPanel').vm.$emit('setReplyMode', 'NOTE');
      await flushPromises();
      expect(child(wrapper, 'ReplyBottomPanel').props('sendButtonText')).toBe(
        'KALO_CHAT_THREAD.COMPOSER.SEND_NOTE'
      );
    });
  });
});
