// Characterization spec (chat-parity C-01, C-02).
// Pins components/widgets/ChatTypeTabs.vue:9-47: Alt+N cycles tabs, emits `chatTabChange`
// with the tab key; from the "all" tab it wraps to the first tab.
import { mount } from '@vue/test-utils';
import ChatTypeTabs from '../ChatTypeTabs.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

const WootTabs = {
  name: 'WootTabs',
  props: ['index'],
  template: '<div><slot /></div>',
};
const WootTabsItem = {
  name: 'WootTabsItem',
  props: ['name', 'count', 'index', 'isCompact'],
  template: '<span class="tab-item" />',
};

const items = [
  { key: 'me', name: 'Mine', count: 3 },
  { key: 'unassigned', name: 'Unassigned', count: 2 },
  { key: 'all', name: 'All', count: 5 },
];

const mountTabs = activeTab =>
  mount(ChatTypeTabs, {
    props: { items, activeTab },
    global: {
      components: { WootTabs, WootTabsItem },
    },
  });

describe('ChatTypeTabs', () => {
  it('renders one tab item per entry with name and count', () => {
    const wrapper = mountTabs('me');
    const tabs = wrapper.findAllComponents(WootTabsItem);
    expect(tabs).toHaveLength(3);
    expect(tabs.map(t => [t.props('name'), t.props('count')])).toEqual([
      ['Mine', 3],
      ['Unassigned', 2],
      ['All', 5],
    ]);
  });

  it('passes the index of the active tab to woot-tabs', () => {
    const wrapper = mountTabs('unassigned');
    expect(wrapper.findComponent(WootTabs).props('index')).toBe(1);
  });

  it('woot-tabs change event emits chatTabChange with the new key', async () => {
    const wrapper = mountTabs('me');
    await wrapper.findComponent(WootTabs).vm.$emit('change', 1);
    expect(wrapper.emitted('chatTabChange')).toEqual([['unassigned']]);
  });

  it('does not emit when the selected tab is already active', async () => {
    const wrapper = mountTabs('me');
    await wrapper.findComponent(WootTabs).vm.$emit('change', 0);
    expect(wrapper.emitted('chatTabChange')).toBeUndefined();
  });

  it('Alt+N moves to the next tab', () => {
    const wrapper = mountTabs('me');
    useKeyboardEvents.mock.calls[0][0]['Alt+KeyN'].action();
    expect(wrapper.emitted('chatTabChange')).toEqual([['unassigned']]);
  });

  it('Alt+N on the "all" tab wraps to the first tab', () => {
    const wrapper = mountTabs('all');
    useKeyboardEvents.mock.calls[0][0]['Alt+KeyN'].action();
    expect(wrapper.emitted('chatTabChange')).toEqual([['me']]);
  });
});
