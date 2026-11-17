// Characterization spec for ConversationBasicFilter (chat-parity C-03) and the
// assignee tab -> stats count mapping used by ChatList (C-01).
// Pins components/widgets/conversation/ConversationBasicFilter.vue:44-137 (status + sort
// options, dispatch + UI-settings persistence + `changeFilter` emit) and
// constants/permissions.js:32-53 (ASSIGNEE_TYPE_TAB_PERMISSIONS: tab key -> count key,
// consumed by ChatList.vue:178-188).
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ConversationBasicFilter from '../ConversationBasicFilter.vue';
import SelectMenu from 'dashboard/components-next/selectmenu/SelectMenu.vue';
import { ASSIGNEE_TYPE_TAB_PERMISSIONS } from 'dashboard/constants/permissions';

const mockUpdateUISettings = vi.fn();
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings: mockUpdateUISettings }),
}));

const setChatStatusFilter = vi.fn();
const setChatSortFilter = vi.fn();

const mountFilter = ({ status = 'open', sort = 'last_activity_at_desc' } = {}) =>
  mount(ConversationBasicFilter, {
    props: { isOnExpandedLayout: false },
    global: {
      plugins: [
        createStore({
          getters: {
            getChatStatusFilter: () => status,
            getChatSortFilter: () => sort,
          },
          actions: { setChatStatusFilter, setChatSortFilter },
        }),
      ],
      directives: { tooltip: {}, 'on-click-outside': {} },
      stubs: { SelectMenu: true },
    },
  });

// The dropdown is toggled by a button guarded by v-on-click-outside, which does not
// re-render reliably under jsdom, so the option lists and handlers are exercised through
// the component's setup state (same functions the SelectMenus call).
const state = wrapper => wrapper.vm.$.setupState;

describe('ConversationBasicFilter', () => {
  it('renders a toolbar button and keeps the menus closed by default', () => {
    const wrapper = mountFilter();
    expect(wrapper.find('button').exists()).toBe(true);
    expect(wrapper.findAllComponents(SelectMenu)).toHaveLength(0);
  });

  it('offers exactly the five statuses', () => {
    expect(state(mountFilter()).chatStatusOptions.map(o => o.value)).toEqual([
      'open',
      'resolved',
      'pending',
      'snoozed',
      'all',
    ]);
  });

  it('offers exactly the ten sort orders', () => {
    expect(state(mountFilter()).chatSortOptions.map(o => o.value)).toEqual([
      'last_activity_at_asc',
      'last_activity_at_desc',
      'created_at_desc',
      'created_at_asc',
      'unread',
      'priority_desc',
      'priority_asc',
      'priority_desc_created_at_asc',
      'waiting_since_asc',
      'waiting_since_desc',
    ]);
  });

  it('status change emits changeFilter, dispatches setChatStatusFilter and persists it', () => {
    const wrapper = mountFilter();
    state(wrapper).handleStatusChange('resolved');
    expect(wrapper.emitted('changeFilter')).toEqual([['resolved', 'status']]);
    expect(setChatStatusFilter).toHaveBeenCalledWith(
      expect.anything(),
      'resolved'
    );
    expect(mockUpdateUISettings).toHaveBeenCalledWith({
      conversations_filter_by: {
        status: 'resolved',
        order_by: 'last_activity_at_desc',
      },
    });
  });

  it('sort change emits changeFilter, dispatches setChatSortFilter and persists it', () => {
    const wrapper = mountFilter({ status: 'pending' });
    state(wrapper).handleSortChange('unread');
    expect(wrapper.emitted('changeFilter')).toEqual([['unread', 'sort']]);
    expect(setChatSortFilter).toHaveBeenCalledWith(expect.anything(), 'unread');
    expect(mockUpdateUISettings).toHaveBeenCalledWith({
      conversations_filter_by: { status: 'pending', order_by: 'unread' },
    });
  });

  it('defaults to open / last_activity_at_desc when nothing is stored', () => {
    const wrapper = mountFilter({ status: '', sort: '' });
    expect(state(wrapper).currentStatusFilter).toBe('open');
    expect(state(wrapper).currentSortBy).toBe('last_activity_at_desc');
  });
});

describe('ASSIGNEE_TYPE_TAB_PERMISSIONS (list tabs Mine / Unassigned / All)', () => {
  it('has the three tabs in order with their conversation-stats count keys', () => {
    expect(Object.keys(ASSIGNEE_TYPE_TAB_PERMISSIONS)).toEqual([
      'me',
      'unassigned',
      'all',
    ]);
    expect(
      Object.values(ASSIGNEE_TYPE_TAB_PERMISSIONS).map(tab => tab.count)
    ).toEqual(['mineCount', 'unAssignedCount', 'allCount']);
  });
});
