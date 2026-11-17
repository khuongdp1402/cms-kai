// Characterization spec (chat-parity C-01, C-02).
// Pins components/widgets/ChatTypeTabs.vue: Alt+N cycles tabs, emits `chatTabChange`
// with the tab key; from the "all" tab it wraps to the first tab.
import { mount } from '@vue/test-utils';
import ChatTypeTabs from '../ChatTypeTabs.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

const items = [
  { key: 'me', name: 'Mine', count: 3 },
  { key: 'unassigned', name: 'Unassigned', count: 2 },
  { key: 'all', name: 'All', count: 5 },
];

// Kalo UI phase 2: woot-tabs became pill buttons; selectors changed, intent kept.
const tabs = wrapper => wrapper.findAll('[data-test-id="kalo-chat-tab"]');

const mountTabs = activeTab =>
  mount(ChatTypeTabs, {
    props: { items, activeTab },
  });

describe('ChatTypeTabs', () => {
  it('renders one tab item per entry with name and count', () => {
    const wrapper = mountTabs('me');
    expect(tabs(wrapper)).toHaveLength(3);
    expect(tabs(wrapper).map(t => t.text().replace(/\s+/g, ' '))).toEqual([
      'Mine 3',
      'Unassigned 2',
      'All 5',
    ]);
  });

  it('marks the active tab as selected', () => {
    const wrapper = mountTabs('unassigned');
    expect(tabs(wrapper).map(t => t.attributes('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('clicking a tab emits chatTabChange with the new key', async () => {
    const wrapper = mountTabs('me');
    await tabs(wrapper)[1].trigger('click');
    expect(wrapper.emitted('chatTabChange')).toEqual([['unassigned']]);
  });

  it('does not emit when the selected tab is already active', async () => {
    const wrapper = mountTabs('me');
    await tabs(wrapper)[0].trigger('click');
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
