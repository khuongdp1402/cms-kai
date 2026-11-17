// Characterization spec for ContactConversations = "previous conversations" (chat-parity C-85).
// Pins routes/dashboard/conversation/ContactConversations.vue:
//  - fetches the contact's conversations on mount and when the contact changes     :122-142
//  - lists every conversation except the current one                                :45-47
//  - empty message when there are no other conversations; spinner while fetching    :146-176
//  - click navigates to the conversation URL; Cmd/Ctrl+click opens a new tab        :88-107
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ContactConversations from '../ContactConversations.vue';
import ConversationCard from 'dashboard/components/widgets/conversation/ConversationCard.vue';

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 }, name: 'inbox_conversation' }),
  useRouter: () => ({ push: mockPush }),
}));

const actions = { 'contactConversations/get': vi.fn() };

const conversations = [
  { id: 1, inbox_id: 3, meta: { sender: { id: 9 } } },
  { id: 2, inbox_id: 3, meta: { sender: { id: 9 } } },
  { id: 3, inbox_id: 3, meta: { sender: { id: 9 } } },
];

const mountPanel = ({ list = conversations, isFetching = false, props = {} } = {}) => {
  const store = createStore({
    getters: {
      getSelectedChat: () => ({ id: 2 }),
      'contactConversations/getUIFlags': () => ({ isFetching }),
      'contacts/getContact': () => () => ({ name: 'Jane' }),
      'inboxes/getInbox': () => () => ({ id: 3 }),
      getSelectedInbox: () => null,
      'inboxes/getInboxes': () => [{ id: 3 }],
      'contactConversations/getContactConversation': () => () => list,
    },
    actions,
  });
  return shallowMount(ContactConversations, {
    props: { contactId: 9, conversationId: 2, ...props },
    global: { plugins: [store], stubs: { ContextMenu: true } },
  });
};

describe('ContactConversations', () => {
  beforeEach(() => {
    window.chatwootConfig = { hostURL: 'https://kalo.test' };
  });

  it('fetches the contact conversations on mount', () => {
    mountPanel();
    expect(actions['contactConversations/get']).toHaveBeenCalledWith(
      expect.anything(),
      9
    );
  });

  it('refetches when the contact changes', async () => {
    const wrapper = mountPanel();
    await wrapper.setProps({ contactId: 10 });
    expect(actions['contactConversations/get']).toHaveBeenLastCalledWith(
      expect.anything(),
      10
    );
  });

  it('lists the other conversations, excluding the current one', () => {
    const wrapper = mountPanel();
    const cards = wrapper.findAllComponents(ConversationCard);
    expect(cards.map(c => c.props('chat').id)).toEqual([1, 3]);
  });

  it('renders cards compact and without thumbnails', () => {
    const card = mountPanel().findComponent(ConversationCard);
    expect(card.props('compact')).toBe(true);
    expect(card.props('hideThumbnail')).toBe(true);
  });

  it('shows the "no records" message when the contact has no other conversation', () => {
    const wrapper = mountPanel({ list: [conversations[1]] });
    expect(wrapper.findComponent(ConversationCard).exists()).toBe(false);
    expect(wrapper.text()).toContain('no previous conversations');
  });

  it('shows a spinner instead of the list while fetching', () => {
    const wrapper = mountPanel({ isFetching: true });
    expect(wrapper.findComponent(ConversationCard).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'Spinner' }).exists()).toBe(true);
  });

  it('clicking a card navigates to that conversation', async () => {
    const wrapper = mountPanel();
    await wrapper
      .findAllComponents(ConversationCard)[0]
      .vm.$emit('click', {});
    expect(mockPush).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/1',
    });
  });

  it('Cmd/Ctrl+click opens a new tab instead of navigating', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const wrapper = mountPanel();
    await wrapper
      .findAllComponents(ConversationCard)[1]
      .vm.$emit('click', { ctrlKey: true, preventDefault: vi.fn() });
    expect(open).toHaveBeenCalledWith(
      'https://kalo.test/app/accounts/1/conversations/3',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockPush).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
