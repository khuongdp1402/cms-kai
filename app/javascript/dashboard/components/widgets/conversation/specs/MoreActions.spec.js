// Characterization spec for MoreActions (chat-parity C-30, C-31, C-32, C-26).
// Pins components/widgets/conversation/MoreActions.vue:
//  - menu items: mute/unmute, send transcript, (Zalo personal) sync messages   :23-61
//  - mute/unmute dispatch `muteConversation` / `unmuteConversation`            :75-82,87-95
//  - send transcript opens EmailTranscriptModal                                :83-84,138-144
//  - Zalo sync calls ConversationAPI.syncZaloMessages(inboxId)                 :63-73
//  - command-bar events CMD_MUTE/UNMUTE_CONVERSATION and CMD_SEND_TRANSCRIPT (opens the modal)
//  - assign / team / label / priority entries open the command bar (Kalo UI phase 2)
//  - contains ResolveAction (resolve/reopen/snooze)                            :112-115
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ref } from 'vue';
import MoreActions from '../MoreActions.vue';
import ResolveAction from 'dashboard/components/buttons/ResolveAction.vue';
import ConversationAPI from 'dashboard/api/conversations';
import { emitter } from 'shared/helpers/mitt';
import {
  CMD_MUTE_CONVERSATION,
  CMD_SEND_TRANSCRIPT,
  CMD_UNMUTE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';

const isZalo = ref(false);
vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => ({ isAZaloPersonalChannel: isZalo }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/conversations', () => ({
  default: { syncZaloMessages: vi.fn() },
}));

const actions = {
  muteConversation: vi.fn(),
  unmuteConversation: vi.fn(),
};

// handlers are registered on the shared emitter, so every wrapper must be unmounted
const mounted = [];
afterEach(() => mounted.splice(0).forEach(w => w.unmount()));

const mountActions = (chat = {}) => {
  const store = createStore({
    getters: {
      getSelectedChat: () => ({
        id: 9,
        inbox_id: 4,
        status: 'open',
        muted: false,
        ...chat,
      }),
    },
    actions,
  });
  const wrapper = mount(MoreActions, {
    global: {
      plugins: [store],
      directives: { 'on-clickaway': {}, tooltip: {} },
      stubs: { ResolveAction: true, EmailTranscriptModal: true },
    },
  });
  mounted.push(wrapper);
  return wrapper;
};

const items = wrapper => wrapper.vm.$.setupState.actionMenuItems;
const click = (wrapper, action) =>
  wrapper.vm.$.setupState.handleActionClick({ action });

describe('MoreActions', () => {
  beforeEach(() => {
    isZalo.value = false;
  });

  it('includes ResolveAction for the current conversation', () => {
    const wrapper = mountActions();
    const resolve = wrapper.findComponent(ResolveAction);
    expect(resolve.exists()).toBe(true);
    expect(resolve.attributes('conversation-id')).toBe('9');
  });

  it('offers mute + send transcript on a normal conversation', () => {
    expect(items(mountActions()).map(i => i.action)).toEqual([
      'mute',
      'send_transcript',
    ]);
  });

  it('offers unmute instead of mute on a muted conversation', () => {
    expect(items(mountActions({ muted: true })).map(i => i.action)).toEqual([
      'unmute',
      'send_transcript',
    ]);
  });

  it('adds "sync Zalo messages" for Zalo personal inboxes only', () => {
    isZalo.value = true;
    expect(items(mountActions()).map(i => i.action)).toEqual([
      'mute',
      'send_transcript',
      'sync_zalo',
    ]);
  });

  it('mute / unmute menu actions dispatch with the conversation id', () => {
    const wrapper = mountActions();
    click(wrapper, 'mute');
    expect(actions.muteConversation).toHaveBeenCalledWith(expect.anything(), 9);
    click(wrapper, 'unmute');
    expect(actions.unmuteConversation).toHaveBeenCalledWith(
      expect.anything(),
      9
    );
  });

  // `useToggle` refs do not re-render the template under vitest in this repo, so the modal
  // flag is asserted on the setup state (the template binds it with v-if/:show).
  it('send transcript opens the email transcript modal (flag) and the modal cancel closes it', () => {
    const wrapper = mountActions();
    expect(wrapper.vm.$.setupState.showEmailActionsModal).toBe(false);
    click(wrapper, 'send_transcript');
    expect(wrapper.vm.$.setupState.showEmailActionsModal).toBe(true);
    wrapper.vm.$.setupState.toggleEmailModal();
    expect(wrapper.vm.$.setupState.showEmailActionsModal).toBe(false);
  });

  it('Zalo sync calls the API with the inbox id', async () => {
    ConversationAPI.syncZaloMessages.mockResolvedValue({});
    isZalo.value = true;
    const wrapper = mountActions();
    click(wrapper, 'sync_zalo');
    await flushPromises();
    expect(ConversationAPI.syncZaloMessages).toHaveBeenCalledWith(4);
  });

  it('command bar bus events trigger mute, unmute and transcript', () => {
    const wrapper = mountActions();
    emitter.emit(CMD_MUTE_CONVERSATION);
    expect(actions.muteConversation).toHaveBeenCalledTimes(1);
    emitter.emit(CMD_UNMUTE_CONVERSATION);
    expect(actions.unmuteConversation).toHaveBeenCalledTimes(1);
    // CMD_SEND_TRANSCRIPT is wired to the toggle (see note below), so a listener must exist.
    expect(emitter.all.get(CMD_SEND_TRANSCRIPT)).toHaveLength(1);
    expect(wrapper.exists()).toBe(true);
  });

  it('stops listening to the command bar after unmount', () => {
    const wrapper = mountActions();
    wrapper.unmount();
    mounted.length = 0;
    emitter.emit(CMD_MUTE_CONVERSATION);
    expect(actions.muteConversation).not.toHaveBeenCalled();
  });

  // Fixed in Kalo UI phase 2 (LESSONS B34): the listener used to be vueuse's raw toggle, which
  // mitt calls with `undefined`, so the flag became undefined and the modal never opened.
  it('CMD_SEND_TRANSCRIPT opens the email transcript modal', () => {
    const wrapper = mountActions();
    emitter.emit(CMD_SEND_TRANSCRIPT);
    expect(wrapper.vm.$.setupState.showEmailActionsModal).toBe(true);
  });

  it('assign / label / priority entries open the command bar on their sub-list', () => {
    const ninja = document.createElement('ninja-keys');
    ninja.open = vi.fn();
    document.body.appendChild(ninja);
    const wrapper = mountActions();
    // menu items call openCommandBar(item.action); the toggle ref does not re-render here
    wrapper.vm.$.setupState.openCommandBar('assign_an_agent');
    expect(ninja.open).toHaveBeenCalledWith({ parent: 'assign_an_agent' });
    expect(wrapper.vm.$.setupState.commandBarItems.map(i => i.action)).toEqual([
      'assign_an_agent',
      'assign_a_team',
      'add_a_label_to_the_conversation',
      'assign_priority',
    ]);
    ninja.remove();
  });
});
