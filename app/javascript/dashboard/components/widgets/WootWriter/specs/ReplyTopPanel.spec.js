// Characterization spec (chat-parity C-51, C-70).
// Pins components/widgets/WootWriter/ReplyTopPanel.vue:62-114: Alt+P = private note,
// Alt+L = reply (blocked when reply is restricted), both ignored while typing in an input,
// and the `setReplyMode` emit contract with REPLY/NOTE values.
import { shallowMount } from '@vue/test-utils';
import ReplyTopPanel from '../ReplyTopPanel.vue';
import { REPLY_EDITOR_MODES } from '../constants';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/composables/useCaptain', () => ({
  useCaptain: () => ({ captainTasksEnabled: false }),
}));

const mountPanel = (props = {}) =>
  shallowMount(ReplyTopPanel, {
    props: { mode: REPLY_EDITOR_MODES.REPLY, conversationId: 1, ...props },
    global: { directives: { tooltip: {} } },
  });

const events = () => useKeyboardEvents.mock.calls[0][0];

describe('ReplyTopPanel', () => {
  it('exposes the reply/note mode constants the rebuild must keep', () => {
    expect(REPLY_EDITOR_MODES).toEqual({ REPLY: 'REPLY', NOTE: 'NOTE' });
  });

  it('registers Alt+P and Alt+L that do NOT fire while an input is focused', () => {
    mountPanel();
    expect(events()['Alt+KeyP'].allowOnFocusedInput).toBe(false);
    expect(events()['Alt+KeyL'].allowOnFocusedInput).toBe(false);
  });

  it('Alt+P emits setReplyMode(NOTE)', () => {
    const wrapper = mountPanel();
    events()['Alt+KeyP'].action();
    expect(wrapper.emitted('setReplyMode')).toEqual([['NOTE']]);
  });

  it('Alt+L emits setReplyMode(REPLY)', () => {
    const wrapper = mountPanel({ mode: REPLY_EDITOR_MODES.NOTE });
    events()['Alt+KeyL'].action();
    expect(wrapper.emitted('setReplyMode')).toEqual([['REPLY']]);
  });

  it('Alt+L is a no-op when replying is restricted (24h window / API)', () => {
    const wrapper = mountPanel({
      mode: REPLY_EDITOR_MODES.NOTE,
      isReplyRestricted: true,
    });
    events()['Alt+KeyL'].action();
    expect(wrapper.emitted('setReplyMode')).toBeUndefined();
  });

  it('Alt+P still works when replying is restricted (private notes stay available)', () => {
    const wrapper = mountPanel({ isReplyRestricted: true });
    events()['Alt+KeyP'].action();
    expect(wrapper.emitted('setReplyMode')).toEqual([['NOTE']]);
  });
});
