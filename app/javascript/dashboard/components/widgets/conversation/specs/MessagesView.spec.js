// Characterization spec for MessagesView (chat-parity C-36, C-38, C-40, C-41, C-43).
// Pins components/widgets/conversation/MessagesView.vue:
//  - mount fetches all attachments of the chat (shared-files panel)              :336
//  - scrolling near the top (<100px) loads older messages `before` the first one  :385-411
//    only when the chat finished its first fetch and nothing is loading
//  - typing indicator with user names                                             :114-127
//  - reply-window banner when the conversation cannot be replied to               :173-224
//  - hands messages + first unread id to MessageList; retry resends via
//    `sendMessageWithData` with a snake_case payload                              :435-438,471-480
//  - SCROLL_TO_MESSAGE marks messages read                                        :339,432
//  - unread label ("N unread messages")                                           :491-499
// MessageList / ReplyBox / editor wrapper are stubbed: this pins the view's own wiring.
// Note: this fork renders no date separators between messages (nothing to pin).
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import MessagesView from '../MessagesView.vue';
import MessageList from 'next/message/MessageList.vue';
import Banner from 'dashboard/components/ui/Banner.vue';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';

vi.mock('dashboard/composables/useLabelSuggestions', () => ({
  useLabelSuggestions: () => ({
    captainTasksEnabled: false,
    isLabelSuggestionFeatureEnabled: false,
    getLabelSuggestions: vi.fn(() => []),
  }),
}));

const actions = {
  fetchAllAttachments: vi.fn(),
  fetchPreviousMessages: vi.fn(() => Promise.resolve()),
  markMessagesRead: vi.fn(),
  sendMessageWithData: vi.fn(),
};

const baseChat = {
  id: 12,
  inbox_id: 1,
  can_reply: true,
  dataFetched: true,
  unread_count: 0,
  agent_last_seen_at: 0,
  messages: [
    { id: 101, content: 'a', created_at: 10, message_type: 0 },
    { id: 102, content: 'b', created_at: 20, message_type: 1 },
  ],
};

const mountView = ({ chat = {}, typing = [], inbox = {} } = {}) => {
  const currentChat = { ...baseChat, ...chat };
  const store = createStore({
    getters: {
      getSelectedChat: () => currentChat,
      getCurrentUserID: () => 1,
      getAllMessagesLoaded: () => false,
      getCurrentAccountId: () => 1,
      'inboxes/getInbox': () => () => ({
        id: 1,
        channel_type: 'Channel::WebWidget',
        ...inbox,
      }),
      'inboxes/getInstagramInboxByInstagramId': () => () => undefined,
      'conversationTypingStatus/getUserList': () => () => typing,
    },
    actions,
  });
  return mount(MessagesView, {
    attachTo: document.body,
    global: {
      plugins: [store],
      mocks: { $route: { query: {} } },
      stubs: {
        MessageList: {
          name: 'MessageList',
          props: ['messages', 'firstUnreadId', 'currentUserId'],
          template:
            '<ul><slot name="beforeAll" /><slot name="unreadBadge" /><slot name="after" /></ul>',
        },
        ReplyBox: true,
        ResizableEditorWrapper: { template: '<div><slot /></div>' },
        Banner: true,
        Spinner: true,
        ConversationLabelSuggestion: true,
      },
    },
  });
};

const scrollTo = async (wrapper, top) => {
  const panel = wrapper.element.querySelector('.conversation-panel');
  panel.scrollTop = top;
  panel.dispatchEvent(new Event('scroll'));
  await flushPromises();
};

describe('MessagesView', () => {
  let wrapper;
  afterEach(() => wrapper?.unmount());

  it('fetches the attachments of the opened chat on mount', () => {
    wrapper = mountView();
    expect(actions.fetchAllAttachments).toHaveBeenCalledWith(
      expect.anything(),
      12
    );
  });

  it('gives MessageList the chat messages, current user id and the panel class', () => {
    wrapper = mountView();
    const list = wrapper.findComponent(MessageList);
    expect(list.props('messages').map(m => m.id)).toEqual([101, 102]);
    expect(list.props('currentUserId')).toBe(1);
    expect(list.classes()).toContain('conversation-panel');
  });

  describe('load older messages on scroll to top (C-36)', () => {
    it('scrolling within 100px of the top fetches messages before the first loaded one', async () => {
      wrapper = mountView();
      await scrollTo(wrapper, 20);
      expect(actions.fetchPreviousMessages).toHaveBeenCalledWith(
        expect.anything(),
        { conversationId: 12, before: 101 }
      );
    });

    it('does not fetch when scrolled further down than 100px', async () => {
      wrapper = mountView();
      await scrollTo(wrapper, 500);
      expect(actions.fetchPreviousMessages).not.toHaveBeenCalled();
    });

    it('does not fetch before the chat finished its first fetch', async () => {
      wrapper = mountView({ chat: { dataFetched: false } });
      await scrollTo(wrapper, 0);
      expect(actions.fetchPreviousMessages).not.toHaveBeenCalled();
    });

    it('does not start a second fetch while one is in flight', async () => {
      let resolve;
      actions.fetchPreviousMessages.mockReturnValueOnce(
        new Promise(r => {
          resolve = r;
        })
      );
      wrapper = mountView();
      await scrollTo(wrapper, 0);
      await scrollTo(wrapper, 0);
      expect(actions.fetchPreviousMessages).toHaveBeenCalledTimes(1);
      resolve();
    });

    it('emits ON_MESSAGE_LIST_SCROLL on every scroll', async () => {
      const spy = vi.fn();
      emitter.on(BUS_EVENTS.ON_MESSAGE_LIST_SCROLL, spy);
      wrapper = mountView();
      await scrollTo(wrapper, 500);
      expect(spy).toHaveBeenCalled();
      emitter.off(BUS_EVENTS.ON_MESSAGE_LIST_SCROLL, spy);
    });
  });

  describe('typing indicator (C-40)', () => {
    it('is hidden when nobody is typing', () => {
      wrapper = mountView();
      expect(wrapper.find('img[alt="Someone is typing"]').exists()).toBe(false);
    });

    it('shows the typing user name when someone types', () => {
      wrapper = mountView({ typing: [{ id: 5, name: 'Khach A' }] });
      expect(wrapper.find('img[alt="Someone is typing"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Khach A');
    });
  });

  describe('reply window banner (C-41)', () => {
    it('shows an alert banner when the conversation cannot be replied to', () => {
      wrapper = mountView({ chat: { can_reply: false } });
      const banner = wrapper.findComponent(Banner);
      expect(banner.exists()).toBe(true);
      expect(banner.props('colorScheme')).toBe('alert');
    });

    it('shows no banner when replying is allowed', () => {
      wrapper = mountView();
      expect(wrapper.findComponent(Banner).exists()).toBe(false);
    });
  });

  describe('unread messages (C-37, C-38)', () => {
    it('passes the first unread message id to MessageList', () => {
      wrapper = mountView({
        chat: {
          unread_count: 1,
          agent_last_seen_at: 15,
        },
      });
      expect(wrapper.findComponent(MessageList).props('firstUnreadId')).toBe(
        102
      );
    });

    it('renders the "N unread message(s)" label in the unread badge slot', () => {
      wrapper = mountView({
        chat: { unread_count: 12, agent_last_seen_at: 15 },
      });
      expect(wrapper.text()).toContain('9+');
    });

    it('SCROLL_TO_MESSAGE marks the messages as read', async () => {
      wrapper = mountView();
      emitter.emit(BUS_EVENTS.SCROLL_TO_MESSAGE, {});
      await flushPromises();
      expect(actions.markMessagesRead).toHaveBeenCalledWith(expect.anything(), {
        id: 12,
      });
    });
  });

  it('MessageList retry resends the message through sendMessageWithData as snake_case', async () => {
    wrapper = mountView();
    await wrapper
      .findComponent(MessageList)
      .vm.$emit('retry', { id: 102, conversationId: 12, contentType: 'text' });
    expect(actions.sendMessageWithData).toHaveBeenCalledWith(expect.anything(), {
      id: 102,
      conversation_id: 12,
      content_type: 'text',
    });
  });
});
