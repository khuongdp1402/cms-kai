// Characterization spec for ConversationItem (chat-parity C-12, C-15, C-16, C-18).
// Pins components/ConversationItem.vue:
//  - click navigates to the conversation URL (inbox/label/team/folder aware) :95-110
//  - Cmd/Ctrl+click opens a new tab instead                                   :95-107
//  - clicking the already active chat does nothing                            :109
//  - right-click opens the context menu and calls provided toggleContextMenu  :122-135,218-234
//  - select/deselect events call the injected selectConversation callbacks    :213-214
//  - showExpanded switches to the expanded card                               :174-176
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ConversationItem from '../ConversationItem.vue';
import ConversationCard from '../widgets/conversation/ConversationCard.vue';
import ConversationCardExpanded from 'dashboard/components-next/Conversation/ConversationCard/ConversationCardExpanded.vue';

const mockPush = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const provided = () => ({
  selectConversation: vi.fn(),
  deSelectConversation: vi.fn(),
  assignAgent: vi.fn(),
  assignTeam: vi.fn(),
  assignLabels: vi.fn(),
  removeLabels: vi.fn(),
  updateConversationStatus: vi.fn(),
  toggleContextMenu: vi.fn(),
  markAsUnread: vi.fn(),
  markAsRead: vi.fn(),
  assignPriority: vi.fn(),
  isConversationSelected: vi.fn(() => false),
  deleteConversation: vi.fn(),
});

const source = {
  id: 5,
  inbox_id: 3,
  status: 'open',
  unread_count: 0,
  labels: [],
  meta: { sender: { id: 9 }, assignee: { name: 'Agent A' } },
};

const mountItem = ({
  props = {},
  selectedChatId = 99,
  activeInbox = null,
} = {}) => {
  const inject = provided();
  const store = createStore({
    getters: {
      getSelectedChat: () => ({ id: selectedChatId }),
      'inboxes/getInboxes': () => [{ id: 3 }],
      getSelectedInbox: () => activeInbox,
      getCurrentAccountId: () => 1,
      'contacts/getContact': () => () => ({ name: 'Jane' }),
      'inboxes/getInbox': () => () => ({ id: 3 }),
    },
  });
  const wrapper = mount(ConversationItem, {
    props: { source, ...props },
    global: {
      plugins: [store],
      provide: inject,
      stubs: {
        ConversationCard: true,
        ConversationCardExpanded: true,
        ContextMenu: { template: '<div class="ctx"><slot /></div>' },
        ConversationContextMenu: true,
      },
    },
  });
  return { wrapper, inject };
};

describe('ConversationItem', () => {
  beforeEach(() => {
    window.chatwootConfig = { hostURL: 'https://kalo.test' };
  });

  it('passes chat, contact, assignee, inbox and active state to the card', () => {
    const { wrapper } = mountItem({ selectedChatId: 5 });
    const card = wrapper.findComponent(ConversationCard);
    expect(card.props('chat')).toEqual(source);
    expect(card.props('currentContact')).toEqual({ name: 'Jane' });
    expect(card.props('assignee')).toEqual({ name: 'Agent A' });
    expect(card.props('inbox')).toEqual({ id: 3 });
    expect(card.props('isActiveChat')).toBe(true);
  });

  it('click pushes the conversation URL', async () => {
    const { wrapper } = mountItem();
    await wrapper.findComponent(ConversationCard).vm.$emit('click', {});
    expect(mockPush).toHaveBeenCalledWith({
      path: '/app/accounts/1/conversations/5',
    });
  });

  it('click URL includes the label when the list is label-scoped', async () => {
    const { wrapper } = mountItem({ props: { label: 'vip' } });
    await wrapper.findComponent(ConversationCard).vm.$emit('click', {});
    expect(mockPush).toHaveBeenCalledWith({
      path: '/app/accounts/1/label/vip/conversations/5',
    });
  });

  it('click URL includes the active inbox when an inbox is selected', async () => {
    const { wrapper } = mountItem({ activeInbox: 3 });
    await wrapper.findComponent(ConversationCard).vm.$emit('click', {});
    expect(mockPush).toHaveBeenCalledWith({
      path: '/app/accounts/1/inbox/3/conversations/5',
    });
  });

  it('click on the already active conversation does not navigate', async () => {
    const { wrapper } = mountItem({ selectedChatId: 5 });
    await wrapper.findComponent(ConversationCard).vm.$emit('click', {});
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Cmd/Ctrl+click opens a new tab and does not navigate', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { wrapper } = mountItem();
    const preventDefault = vi.fn();
    await wrapper
      .findComponent(ConversationCard)
      .vm.$emit('click', { metaKey: true, preventDefault });
    expect(open).toHaveBeenCalledWith(
      'https://kalo.test/app/accounts/1/conversations/5',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    open.mockRestore();
  });

  it('select / deselect from the card call the injected callbacks with (chatId, inboxId)', () => {
    const { wrapper, inject } = mountItem();
    const card = wrapper.findComponent(ConversationCard);
    card.vm.$emit('selectConversation', 5, 3);
    card.vm.$emit('deSelectConversation', 5, 3);
    expect(inject.selectConversation).toHaveBeenCalledWith(5, 3);
    expect(inject.deSelectConversation).toHaveBeenCalledWith(5, 3);
  });

  it('right-click opens the context menu and tells the list (toggleContextMenu)', async () => {
    const { wrapper, inject } = mountItem();
    const preventDefault = vi.fn();
    await wrapper
      .findComponent(ConversationCard)
      .vm.$emit('contextmenu', { preventDefault, pageX: 10, pageY: 20 });
    expect(preventDefault).toHaveBeenCalled();
    expect(inject.toggleContextMenu).toHaveBeenCalledWith(true);
    expect(wrapper.find('.ctx').exists()).toBe(true);
  });

  it('showExpanded renders the expanded card instead of the condensed one', () => {
    const { wrapper } = mountItem({ props: { showExpanded: true } });
    expect(wrapper.findComponent(ConversationCardExpanded).exists()).toBe(true);
    expect(wrapper.findComponent(ConversationCard).exists()).toBe(false);
  });

  it('expanded card select toggles map to selectConversation / deSelectConversation', () => {
    const { wrapper, inject } = mountItem({ props: { showExpanded: true } });
    const card = wrapper.findComponent(ConversationCardExpanded);
    card.vm.$emit('selectConversation', true);
    expect(inject.selectConversation).toHaveBeenCalledWith(5, 3);
    card.vm.$emit('deSelectConversation', false);
    expect(inject.deSelectConversation).toHaveBeenCalledWith(5, 3);
  });
});
