// Characterization spec for ConversationList (chat-parity C-08, C-09, C-10, C-19).
// Pins components/ConversationList.vue:
//  - wrapper keeps class `conversations-list` (keyboard nav, Cmd+Alt+E scroll reset) :72
//  - virtualized list of ConversationItem                                            :66-84
//  - spinner while loading / end-of-list message / otherwise an IntersectionObserver
//    sentinel whose `observed` event emits `loadMore`                                :85-96
import { mount } from '@vue/test-utils';
import ConversationList from '../ConversationList.vue';
import ConversationItem from '../ConversationItem.vue';
import IntersectionObserver from '../IntersectionObserver.vue';

vi.mock('dashboard/composables/chatlist/useChatListKeyboardEvents', () => ({
  useChatListKeyboardEvents: vi.fn(),
}));

vi.mock('virtua/vue', () => ({
  Virtualizer: {
    props: ['data'],
    template:
      '<div class="virt"><template v-for="item in data" :key="item.id"><slot :item="item" /></template></div>',
  },
}));

const mountList = (props = {}) =>
  mount(ConversationList, {
    props: {
      conversationList: [{ id: 1 }, { id: 2 }, { id: 3 }],
      ...props,
    },
    global: {
      stubs: {
        ConversationItem: true,
        Spinner: { template: '<i class="spinner-stub" />' },
        IntersectionObserver: true,
      },
    },
  });

describe('ConversationList', () => {
  it('root keeps the `conversations-list` class used by keyboard navigation', () => {
    expect(mountList().classes()).toContain('conversations-list');
  });

  it('renders one ConversationItem per conversation and passes list context down', () => {
    const wrapper = mountList({
      label: 'vip',
      teamId: 4,
      conversationType: 'mention',
      showAssignee: true,
    });
    const items = wrapper.findAllComponents(ConversationItem);
    expect(items).toHaveLength(3);
    expect(items[0].props()).toMatchObject({
      source: { id: 1 },
      label: 'vip',
      teamId: 4,
      conversationType: 'mention',
      showAssignee: true,
    });
  });

  it('shows the load-more sentinel and emits loadMore when it is observed', async () => {
    const wrapper = mountList();
    const sentinel = wrapper.findComponent(IntersectionObserver);
    expect(sentinel.exists()).toBe(true);
    await sentinel.vm.$emit('observed');
    expect(wrapper.emitted('loadMore')).toHaveLength(1);
  });

  it('shows a spinner (no sentinel) while loading', () => {
    const wrapper = mountList({ isLoading: true });
    expect(wrapper.find('.spinner-stub').exists()).toBe(true);
    expect(wrapper.findComponent(IntersectionObserver).exists()).toBe(false);
  });

  it('shows the end-of-list message and no sentinel when everything is loaded', () => {
    const wrapper = mountList({ showEndOfListMessage: true });
    expect(wrapper.text()).toContain('All conversations loaded');
    expect(wrapper.findComponent(IntersectionObserver).exists()).toBe(false);
  });

  it('exposes conversationListRef for the parent (scroll reset / keyboard handlers)', () => {
    const wrapper = mountList();
    expect(wrapper.vm.conversationListRef).toBe(wrapper.element);
  });
});
