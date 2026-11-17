// Characterization spec for ConversationHeader (chat-parity C-23, C-24, C-25).
// Pins components/widgets/conversation/ConversationHeader.vue:
//  - contact name + `#<conversation id>` (click copies the id)       :100-104,118-166
//  - inbox name only with more than one inbox                         :95-97,155-157
//  - snoozed marker ("snoozed until ...")                              :80-93,158-163
//  - unverified web-widget session (HMAC) warning icon                 :64-68,140
//  - back button only when showBackButton                              :126-130
//  - renders MoreActions for the selected conversation                 :176
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ref } from 'vue';
import ConversationHeader from '../ConversationHeader.vue';
import MoreActions from '../MoreActions.vue';
import InboxName from '../../InboxName.vue';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

const isWebWidget = ref(true);
vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () => ({ isAWebWidgetInbox: isWebWidget }),
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('shared/helpers/clipboard', () => ({
  copyTextToClipboard: vi.fn(() => Promise.resolve()),
}));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: {}, name: 'inbox_conversation' }),
}));

const mountHeader = ({
  chat = {},
  selected = {},
  inboxes = [{ id: 1 }],
  props = {},
} = {}) => {
  const chatProp = {
    id: 33,
    inbox_id: 1,
    meta: { sender: { id: 5 }, hmac_verified: true },
    ...chat,
  };
  const store = createStore({
    getters: {
      getSelectedChat: () => ({ id: 33, status: 'open', ...selected }),
      getCurrentAccountId: () => 1,
      'contacts/getContact': () => () => ({ name: 'Jane Doe', thumbnail: '' }),
      'inboxes/getInbox': () => () => ({ id: 1, name: 'Web' }),
      'inboxes/getInboxes': () => inboxes,
    },
  });
  return shallowMount(ConversationHeader, {
    props: { chat: chatProp, ...props },
    global: {
      plugins: [store],
      directives: { tooltip: {} },
      stubs: { 'fluent-icon': true },
    },
  });
};

describe('ConversationHeader', () => {
  beforeEach(() => {
    isWebWidget.value = true;
  });

  it('shows the contact name and the conversation id', () => {
    const wrapper = mountHeader();
    expect(wrapper.text()).toContain('Jane Doe');
    expect(wrapper.text()).toContain('#33');
  });

  it('clicking the id copies it to the clipboard', async () => {
    const wrapper = mountHeader();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(copyTextToClipboard).toHaveBeenCalledWith('33');
  });

  it('renders MoreActions for the selected conversation', () => {
    const wrapper = mountHeader();
    expect(
      wrapper.findComponent(MoreActions).attributes('conversation-id')
    ).toBe('33');
  });

  it('shows the inbox name only when the account has more than one inbox', () => {
    expect(mountHeader().findComponent(InboxName).exists()).toBe(false);
    expect(
      mountHeader({ inboxes: [{ id: 1 }, { id: 2 }] })
        .findComponent(InboxName)
        .exists()
    ).toBe(true);
  });

  // Kalo UI phase 2: BackButton became an icon-only button (selector change only).
  it('back button is rendered only when showBackButton is set', () => {
    const back = '[data-test-id="kalo-back-button"]';
    expect(mountHeader().find(back).exists()).toBe(false);
    expect(
      mountHeader({ props: { showBackButton: true } })
        .find(back)
        .exists()
    ).toBe(true);
  });

  it('shows "snoozed until next reply" when snoozed without a time', () => {
    const wrapper = mountHeader({ selected: { status: 'snoozed' } });
    expect(wrapper.text()).toContain('Snoozed until next reply');
  });

  it('shows "snoozed until <time>" when a snooze time is set', () => {
    const wrapper = mountHeader({
      selected: { status: 'snoozed', snoozed_until: 1893456000 },
    });
    expect(wrapper.text()).toContain('Snoozed until');
    expect(wrapper.text()).not.toContain('next reply');
  });

  it('does not show a snooze marker for open conversations', () => {
    expect(mountHeader().text()).not.toContain('Snoozed');
  });

  it('warns about an unverified (HMAC) web widget session', () => {
    const wrapper = mountHeader({
      chat: { meta: { sender: { id: 5 }, hmac_verified: false } },
    });
    expect(wrapper.find('fluent-icon-stub[icon="warning"]').exists()).toBe(
      true
    );
  });

  it('no HMAC warning when verified or for non web-widget inboxes', () => {
    expect(mountHeader().find('fluent-icon-stub').exists()).toBe(false);
    isWebWidget.value = false;
    const wrapper = mountHeader({
      chat: { meta: { sender: { id: 5 }, hmac_verified: false } },
    });
    expect(wrapper.find('fluent-icon-stub').exists()).toBe(false);
  });
});
