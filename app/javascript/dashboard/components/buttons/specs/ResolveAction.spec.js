// Characterization spec (chat-parity C-26, C-27, C-28).
// Pins components/buttons/ResolveAction.vue:84-160 (status toggling, Alt+E,
// Cmd+Alt+E, Alt+M, required-attributes gate) and :229/:248 (resolve/reopen buttons).
// The shortcuts depend on DOM selectors `.conversations-list .conversation(.active)`.
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import ResolveAction from '../ResolveAction.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { emitter } from 'shared/helpers/mitt';
import {
  CMD_REOPEN_CONVERSATION,
  CMD_RESOLVE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';

const mockCheckMissing = vi.fn();

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/composables/useConversationRequiredAttributes', () => ({
  useConversationRequiredAttributes: () => ({
    checkMissingAttributes: mockCheckMissing,
  }),
}));

const toggleStatus = vi.fn(() => Promise.resolve());

const mountAction = (chat = { id: 7, status: 'open' }) => {
  const store = createStore({
    getters: { getSelectedChat: () => chat },
    actions: { toggleStatus },
  });
  return mount(ResolveAction, {
    global: {
      plugins: [store],
      directives: { 'on-clickaway': {} },
      stubs: { ConversationResolveAttributesModal: true },
    },
  });
};

const events = () => useKeyboardEvents.mock.calls[0][0];

describe('ResolveAction', () => {
  let wrapper;

  beforeEach(() => {
    mockCheckMissing.mockReturnValue({ hasMissing: false, missing: [] });
    document.body.innerHTML = '';
  });
  afterEach(() => wrapper?.unmount());

  it('registers Alt+M, Alt+E and Cmd+Alt+E', () => {
    wrapper = mountAction();
    expect(Object.keys(events()).sort()).toEqual(
      ['$mod+Alt+KeyE', 'Alt+KeyE', 'Alt+KeyM'].sort()
    );
    expect(events()['Alt+KeyM'].allowOnFocusedInput).toBe(true);
  });

  it('clicking the main button on an open conversation resolves it', async () => {
    wrapper = mountAction({ id: 7, status: 'open' });
    await wrapper.findAll('button')[0].trigger('click');
    expect(toggleStatus).toHaveBeenCalledTimes(1);
    expect(toggleStatus.mock.calls[0][1]).toMatchObject({
      conversationId: 7,
      status: 'resolved',
    });
  });

  it('clicking the main button on a resolved conversation reopens it', async () => {
    wrapper = mountAction({ id: 7, status: 'resolved' });
    await wrapper.findAll('button')[0].trigger('click');
    expect(toggleStatus.mock.calls[0][1]).toMatchObject({
      conversationId: 7,
      status: 'open',
    });
  });

  it('pending and snoozed conversations show the open button and no resolve', () => {
    wrapper = mountAction({ id: 7, status: 'snoozed' });
    // only the "open" button, no dropdown arrow for snoozed/pending
    expect(wrapper.findAll('button')).toHaveLength(1);
  });

  it('Alt+E resolves the current conversation', async () => {
    wrapper = mountAction();
    await events()['Alt+KeyE'].action();
    expect(toggleStatus.mock.calls[0][1]).toMatchObject({
      conversationId: 7,
      status: 'resolved',
    });
  });

  it('Alt+E opens the required-attributes modal instead when attributes are missing', async () => {
    mockCheckMissing.mockReturnValue({ hasMissing: true, missing: ['plan'] });
    wrapper = mountAction();
    const open = vi.fn();
    wrapper.vm.$.setupState.resolveAttributesModalRef = { open };
    await events()['Alt+KeyE'].action();
    expect(toggleStatus).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      ['plan'],
      {},
      {
        id: 7,
        snoozedUntil: null,
      }
    );
  });

  it('Cmd+Alt+E resolves and clicks the next .conversation after .active', async () => {
    document.body.innerHTML = `<div class="conversations-list">
      <div class="conversation active"></div><div class="conversation"></div></div>`;
    const clicked = [];
    document
      .querySelectorAll('.conversation')
      .forEach((el, i) => el.addEventListener('click', () => clicked.push(i)));
    wrapper = mountAction();
    const preventDefault = vi.fn();
    await events()['$mod+Alt+KeyE'].action({ preventDefault });
    expect(toggleStatus.mock.calls[0][1].status).toBe('resolved');
    expect(clicked).toEqual([1]);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('Cmd+Alt+E on the last conversation wraps to the first', async () => {
    document.body.innerHTML = `<div class="conversations-list">
      <div class="conversation"></div><div class="conversation active"></div></div>`;
    const clicked = [];
    document
      .querySelectorAll('.conversation')
      .forEach((el, i) => el.addEventListener('click', () => clicked.push(i)));
    wrapper = mountAction();
    await events()['$mod+Alt+KeyE'].action({ preventDefault: vi.fn() });
    expect(clicked).toEqual([0]);
  });

  it('Alt+M clicks the status dropdown arrow', async () => {
    wrapper = mountAction();
    const arrow = wrapper.findAll('button')[1];
    const spy = vi.fn();
    arrow.element.addEventListener('click', spy);
    events()['Alt+KeyM'].action();
    expect(spy).toHaveBeenCalled();
  });

  it('"snooze until…" closes the status dropdown and opens the snooze command', async () => {
    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    wrapper = mountAction();
    await wrapper.findAll('button')[1].trigger('click');
    const snooze = wrapper
      .findAll('button')
      .find(button => button.html().includes('i-lucide-alarm-clock-minus'));
    expect(snooze).toBeTruthy();
    await snooze.trigger('click');
    expect(ninja.open).toHaveBeenCalledWith({ parent: 'snooze_conversation' });
    expect(wrapper.html()).not.toContain('i-lucide-alarm-clock-minus');
  });

  it('reacts to the command-bar bus events (resolve and reopen)', async () => {
    wrapper = mountAction();
    await flushPromises();
    emitter.emit(CMD_RESOLVE_CONVERSATION);
    expect(toggleStatus.mock.calls[0][1].status).toBe('resolved');
    emitter.emit(CMD_REOPEN_CONVERSATION);
    expect(toggleStatus.mock.calls[1][1].status).toBe('open');
  });
});
