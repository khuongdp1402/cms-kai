// Characterization spec (chat-parity C-59).
// Pins components/widgets/WootWriter/ReplyBottomPanel.vue:142-160,290-314: the attachment
// <input id="conversationAttachment"> and the Cmd/Ctrl+Alt+A shortcut that clicks it
// (skipped when the editor is disabled), plus when the attach button is shown.
import { mount } from '@vue/test-utils';
import FileUpload from 'vue-upload-component';
import { createStore } from 'vuex';
import ReplyBottomPanel from '../ReplyBottomPanel.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
const uiSettingsMock = vi.hoisted(() => ({
  setSignatureFlagForInbox: vi.fn(),
  fetchSignatureFlagFromUISettings: vi.fn(() => false),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => uiSettingsMock,
}));

const mountPanel = (props = {}, { voice = false, slots = {} } = {}) => {
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      'accounts/isFeatureEnabledonAccount': () => () => voice,
      'integrations/getUIFlags': () => ({}),
    },
  });
  return mount(ReplyBottomPanel, {
    attachTo: document.body,
    props: {
      conversationId: 1,
      portalSlug: 'p',
      inbox: { channel_type: 'Channel::WebWidget' },
      showFileUpload: true,
      ...props,
    },
    slots,
    global: {
      plugins: [store],
      directives: { tooltip: {} },
      stubs: { VideoCallButton: true },
    },
  });
};

describe('ReplyBottomPanel attachment', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  it('renders the file input with the id the shortcut depends on', () => {
    wrapper = mountPanel();
    expect(document.querySelector('#conversationAttachment')).not.toBeNull();
  });

  it('registers $mod+Alt+KeyA that works while typing', () => {
    wrapper = mountPanel();
    const event = useKeyboardEvents.mock.calls[0][0]['$mod+Alt+KeyA'];
    expect(event.allowOnFocusedInput).toBe(true);
  });

  it('Cmd+Alt+A clicks #conversationAttachment', () => {
    wrapper = mountPanel();
    const input = document.querySelector('#conversationAttachment');
    const spy = vi.fn();
    input.addEventListener('click', spy);
    useKeyboardEvents.mock.calls[0][0]['$mod+Alt+KeyA'].action();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Cmd+Alt+A does nothing when the editor is disabled', () => {
    wrapper = mountPanel({ isEditorDisabled: true });
    expect(document.querySelector('#conversationAttachment')).toBeNull();
    // handler is still registered but guarded; must not throw
    useKeyboardEvents.mock.calls[0][0]['$mod+Alt+KeyA'].action();
  });

  it('hides the attach button when file upload is off and not in note mode', () => {
    wrapper = mountPanel({ showFileUpload: false, isNote: false });
    expect(document.querySelector('#conversationAttachment')).toBeNull();
  });

  it('shows the attach button in private-note mode even without channel file upload', () => {
    wrapper = mountPanel({ showFileUpload: false, isNote: true });
    expect(document.querySelector('#conversationAttachment')).not.toBeNull();
  });

  it('enables drag-and-drop on the upload component (C-60)', () => {
    wrapper = mountPanel();
    expect(wrapper.findComponent(FileUpload).props('drop')).toBe(true);
  });

  it('disables drag-and-drop while the new-conversation modal is active (C-60)', () => {
    wrapper = mountPanel({ newConversationModalActive: true });
    expect(wrapper.findComponent(FileUpload).props('drop')).toBe(false);
  });

  it('forwards the upload component input-file event to the onFileUpload prop (C-59/C-60)', () => {
    const onFileUpload = vi.fn();
    wrapper = mountPanel({ onFileUpload });
    const file = { name: 'a.png' };
    wrapper.findComponent(FileUpload).vm.$emit('inputFile', file);
    expect(onFileUpload).toHaveBeenCalledWith(file);
  });

  it('allows multiple files only when enableMultipleFileUpload is set', () => {
    wrapper = mountPanel({ enableMultipleFileUpload: false });
    expect(wrapper.findComponent(FileUpload).props('multiple')).toBe(false);
  });
});

// Kalo UI phase 2 (task 1b-ii): essentials stay on the toolbar (emoji, attach, canned,
// Kalo order/QR actions, send); everything else moved into one "+" menu.
describe('ReplyBottomPanel essentials and "+" menu', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  const openMenu = async () => {
    await wrapper.find('[data-test="more-menu"]').trigger('click');
  };
  const menuKeys = () =>
    wrapper
      .findAll('[role="menuitem"]')
      .map(item => item.attributes('data-test'));

  it('emoji button calls toggleEmojiPicker (C-58)', async () => {
    const toggleEmojiPicker = vi.fn();
    wrapper = mountPanel({ toggleEmojiPicker });
    await wrapper.find('[data-test="emoji"]').trigger('click');
    expect(toggleEmojiPicker).toHaveBeenCalled();
  });

  it('canned button asks the reply box to insert "/" (C-56), not in notes', async () => {
    wrapper = mountPanel();
    const canned = wrapper.find('[data-test="canned"]');
    // the label collapses to an icon below 640px, so the name lives in aria-label
    expect(canned.attributes('aria-label')).toBe(
      'KALO_CHAT_THREAD.COMPOSER.CANNED'
    );
    await canned.trigger('click');
    expect(wrapper.emitted('insertCanned')).toHaveLength(1);
    wrapper.unmount();
    wrapper = mountPanel({ isOnPrivateNote: true, isNote: true });
    expect(wrapper.find('[data-test="canned"]').exists()).toBe(false);
  });

  it('renders the Kalo actions slot on the toolbar (C-74)', () => {
    wrapper = mountPanel(
      {},
      { slots: { actions: '<button data-test="create-order" />' } }
    );
    expect(wrapper.find('[data-test="create-order"]').exists()).toBe(true);
  });

  it('send button shows the label, the shortcut hint and calls onSend', async () => {
    const onSend = vi.fn();
    wrapper = mountPanel({
      onSend,
      sendButtonText: 'Gửi',
      sendButtonHint: '↵',
    });
    const send = wrapper.find('[data-test="send"]');
    expect(send.text()).toContain('Gửi');
    expect(send.attributes('title')).toBe('↵');
    await send.trigger('click');
    expect(onSend).toHaveBeenCalled();
  });

  it('send is disabled when isSendDisabled', () => {
    wrapper = mountPanel({ isSendDisabled: true });
    expect(
      wrapper.find('[data-test="send"]').attributes('disabled')
    ).toBeDefined();
  });

  it('the menu holds signature, quoted email, templates and article; each still works', async () => {
    wrapper = mountPanel({
      showQuotedReplyToggle: true,
      enableWhatsAppTemplates: true,
      enableContentTemplates: true,
    });
    await openMenu();
    expect(menuKeys()).toEqual([
      'more-signature',
      'more-quoted-reply',
      'more-whatsapp-template',
      'more-content-template',
      'more-article',
    ]);
    await wrapper.find('[data-test="more-signature"]').trigger('click');
    expect(uiSettingsMock.setSignatureFlagForInbox).toHaveBeenCalledWith(
      'Channel::WebWidget',
      true
    );
    // choosing an item closes the menu
    expect(
      wrapper.find('[data-test="more-menu"]').attributes('aria-expanded')
    ).toBe('false');

    await openMenu();
    await wrapper.find('[data-test="more-quoted-reply"]').trigger('click');
    await openMenu();
    await wrapper.find('[data-test="more-whatsapp-template"]').trigger('click');
    await openMenu();
    await wrapper.find('[data-test="more-content-template"]').trigger('click');
    await openMenu();
    await wrapper.find('[data-test="more-article"]').trigger('click');
    expect(wrapper.emitted('toggleQuotedReply')).toHaveLength(1);
    expect(wrapper.emitted('selectWhatsappTemplate')).toHaveLength(1);
    expect(wrapper.emitted('selectContentTemplate')).toHaveLength(1);
    expect(wrapper.emitted('toggleInsertArticle')).toHaveLength(1);
  });

  it('voice recording sits in the menu when the feature is on (C-63)', async () => {
    const toggleAudioRecorder = vi.fn();
    wrapper = mountPanel(
      { showAudioRecorder: true, toggleAudioRecorder },
      { voice: true }
    );
    await openMenu();
    await wrapper.find('[data-test="more-voice"]').trigger('click');
    expect(toggleAudioRecorder).toHaveBeenCalled();
  });

  it('while recording, play/pause and stop are on the toolbar', async () => {
    const toggleAudioRecorder = vi.fn();
    const toggleAudioRecorderPlayPause = vi.fn();
    wrapper = mountPanel(
      {
        showAudioRecorder: true,
        isRecordingAudio: true,
        recordingAudioDurationText: '00:03',
        toggleAudioRecorder,
        toggleAudioRecorderPlayPause,
      },
      { voice: true }
    );
    const playPause = wrapper.find('[data-test="voice-play-pause"]');
    expect(playPause.text()).toContain('00:03');
    await playPause.trigger('click');
    await wrapper.find('[data-test="voice-stop"]').trigger('click');
    expect(toggleAudioRecorderPlayPause).toHaveBeenCalled();
    expect(toggleAudioRecorder).toHaveBeenCalled();
  });

  it('private notes hide the signature item (no signature on notes, C-64)', async () => {
    wrapper = mountPanel({ isOnPrivateNote: true, isNote: true });
    await openMenu();
    expect(menuKeys()).not.toContain('more-signature');
  });

  it('a disabled editor shows no emoji, canned or "+" menu', () => {
    wrapper = mountPanel({ isEditorDisabled: true, portalSlug: '' });
    expect(wrapper.find('[data-test="emoji"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="canned"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="more-menu"]').exists()).toBe(false);
  });
});
