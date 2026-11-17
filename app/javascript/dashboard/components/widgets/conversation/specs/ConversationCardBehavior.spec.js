// Characterization spec for ConversationCard (chat-parity C-10, C-11, C-12, C-16, C-18).
// Pins components/widgets/conversation/ConversationCard.vue:
//  - root keeps classes `conversation`, `active`, `selected` (Alt+J/K + Cmd+Alt+E use them) :112-117
//  - emits click/contextmenu                                                 :113-114
//  - hover over the avatar reveals the bulk-select checkbox                  :139-145
//  - checkbox emits selectConversation / deSelectConversation(chatId, inboxId) :80-86
//  - unread badge, contact name, assignee (agent / bot), priority, no-messages fallback :150-243
import { mount } from '@vue/test-utils';
import ConversationCard from '../ConversationCard.vue';

const baseChat = {
  id: 5,
  labels: [],
  messages: [],
  priority: null,
  unread_count: 0,
  timestamp: 1700000000,
  created_at: 1700000000,
  meta: {},
};

const mountCard = (props = {}) =>
  mount(ConversationCard, {
    props: {
      chat: { ...baseChat, ...props.chat },
      currentContact: { name: 'Jane Doe', thumbnail: '' },
      inbox: { id: 3 },
      ...props,
      ...(props.chat ? { chat: { ...baseChat, ...props.chat } } : {}),
    },
    global: {
      stubs: {
        MessagePreview: { template: '<p class="preview-stub" />' },
        TimeAgo: { template: '<span class="time-stub" />' },
        InboxName: { template: '<span class="inbox-name-stub" />' },
        CardLabels: { template: '<div class="labels-stub" />' },
        SLACardLabel: true,
        'fluent-icon': true,
      },
    },
  });

describe('ConversationCard behavior', () => {
  it('root element carries the `conversation` class that keyboard navigation queries', () => {
    const wrapper = mountCard();
    expect(wrapper.classes()).toContain('conversation');
    expect(wrapper.classes()).not.toContain('active');
    expect(wrapper.classes()).not.toContain('selected');
  });

  it('adds `active` for the open conversation and `selected` for bulk-selected', () => {
    const wrapper = mountCard({ isActiveChat: true, selected: true });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['conversation', 'active', 'selected'])
    );
  });

  it('forwards click and contextmenu to the parent', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('click');
    await wrapper.trigger('contextmenu');
    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(wrapper.emitted('contextmenu')).toHaveLength(1);
  });

  it('shows the contact name', () => {
    const wrapper = mountCard();
    expect(wrapper.find('.conversation--user').text()).toBe('Jane Doe');
  });

  it('shows the unread badge with the count only when unread_count > 0', () => {
    expect(
      mountCard({ chat: { unread_count: 0 } }).findComponent({
        name: 'UnreadBadge',
      }).exists()
    ).toBe(false);
    const wrapper = mountCard({ chat: { unread_count: 3 } });
    const badge = wrapper.findComponent({ name: 'UnreadBadge' });
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('3');
  });

  it('unread conversations render the name in semibold', () => {
    const wrapper = mountCard({ chat: { unread_count: 2 } });
    expect(wrapper.find('.conversation--user').classes()).toContain(
      'font-semibold'
    );
  });

  it('shows the "no messages" fallback when the chat has no last message', () => {
    const wrapper = mountCard();
    expect(wrapper.find('.preview-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('No Messages');
  });

  it('shows the message preview when the chat has messages', () => {
    const wrapper = mountCard({
      chat: {
        messages: [
          { id: 1, content: 'hi', message_type: 0, created_at: 1700000000 },
        ],
      },
    });
    expect(wrapper.find('.preview-stub').exists()).toBe(true);
  });

  it('shows assignee name only when showAssignee is set and there is an assignee', () => {
    const wrapper = mountCard({
      showAssignee: true,
      assignee: { name: 'Agent A' },
    });
    expect(wrapper.text()).toContain('Agent A');
    const hidden = mountCard({ assignee: { name: 'Agent A' } });
    expect(hidden.text()).not.toContain('Agent A');
  });

  it('renders the inbox name only when showInboxName is set', () => {
    expect(mountCard().find('.inbox-name-stub').exists()).toBe(false);
    expect(
      mountCard({ showInboxName: true }).find('.inbox-name-stub').exists()
    ).toBe(true);
  });

  describe('bulk-select checkbox', () => {
    it('is hidden until the avatar is hovered', async () => {
      const wrapper = mountCard();
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
      await wrapper.get('div.relative:not(.conversation)').trigger('mouseenter');
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
      await wrapper.get('div.relative:not(.conversation)').trigger('mouseleave');
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    });

    it('stays visible while the card is selected', () => {
      const wrapper = mountCard({ selected: true });
      const input = wrapper.find('input[type="checkbox"]');
      expect(input.exists()).toBe(true);
      expect(input.element.checked).toBe(true);
    });

    it('does not appear on hover when hideThumbnail is set', async () => {
      const wrapper = mountCard({ hideThumbnail: true });
      await wrapper.get('div.relative:not(.conversation)').trigger('mouseenter');
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
    });

    it('ticking emits selectConversation(chatId, inboxId)', async () => {
      const wrapper = mountCard();
      await wrapper.get('div.relative:not(.conversation)').trigger('mouseenter');
      const input = wrapper.find('input[type="checkbox"]');
      input.element.checked = true;
      await input.trigger('change');
      expect(wrapper.emitted('selectConversation')).toEqual([[5, 3]]);
    });

    it('unticking emits deSelectConversation(chatId, inboxId)', async () => {
      const wrapper = mountCard({ selected: true });
      const input = wrapper.find('input[type="checkbox"]');
      input.element.checked = false;
      await input.trigger('change');
      expect(wrapper.emitted('deSelectConversation')).toEqual([[5, 3]]);
    });

    it('clicking the checkbox does not bubble up as a card click', async () => {
      const wrapper = mountCard({ selected: true });
      await wrapper.find('label').trigger('click');
      expect(wrapper.emitted('click')).toBeUndefined();
    });
  });
});
