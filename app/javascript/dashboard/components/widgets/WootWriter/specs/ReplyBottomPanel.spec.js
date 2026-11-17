// Characterization spec (chat-parity C-59).
// Pins components/widgets/WootWriter/ReplyBottomPanel.vue:142-160,290-314: the attachment
// <input id="conversationAttachment"> and the Cmd/Ctrl+Alt+A shortcut that clicks it
// (skipped when the editor is disabled), plus when the attach button is shown.
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ReplyBottomPanel from '../ReplyBottomPanel.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    setSignatureFlagForInbox: vi.fn(),
    fetchSignatureFlagFromUISettings: vi.fn(),
  }),
}));

const mountPanel = (props = {}) => {
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      'accounts/isFeatureEnabledonAccount': () => () => false,
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
});
