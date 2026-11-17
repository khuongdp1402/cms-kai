// Kalo UI phase 2 (task 1b-i): ChatListHeader
//  - search entry links to the search page (C-22)
//  - layout switch moved into the filter popover and still toggles the UI setting (C-18)
//  - filter popover "advanced filter" opens the advanced filter modal (C-04)
//  - save / clear buttons when an advanced filter is applied (C-05)
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import ChatListHeader from '../ChatListHeader.vue';
import ConversationBasicFilter from '../widgets/conversation/ConversationBasicFilter.vue';
import SwitchLayout from 'dashboard/routes/dashboard/conversation/search/SwitchLayout.vue';

const mockUpdateUISettings = vi.fn();
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({
    uiSettings: { value: { conversation_display_type: 'condensed' } },
    updateUISettings: mockUpdateUISettings,
  }),
}));

const baseProps = {
  pageTitle: 'Tin nhắn',
  hasAppliedFilters: false,
  hasActiveFolders: false,
  activeStatus: 'open',
  isOnExpandedLayout: false,
  conversationStats: { allCount: 4 },
  isListLoading: false,
};

const mountHeader = async (props = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['home', 'search'].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  await router.push({ name: 'home', params: { accountId: 1 } });
  const store = createStore({
    getters: {
      'accounts/getAccount': () => () => ({}),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/isFeatureEnabledonAccount': () => () => true,
    },
  });
  return mount(ChatListHeader, {
    props: { ...baseProps, ...props },
    global: {
      plugins: [router, store],
      directives: { tooltip: {} },
      stubs: { ConversationBasicFilter: true, NextButton: true },
    },
  });
};

describe('ChatListHeader', () => {
  it('shows the title and a search entry linking to the search page', async () => {
    const wrapper = await mountHeader();
    expect(wrapper.text()).toContain('Tin nhắn');
    expect(
      wrapper.find('[data-test-id="kalo-chat-search"]').attributes('href')
    ).toBe('/app/accounts/1/search');
  });

  it('layout toggle from the filter popover switches the conversation display type', async () => {
    const wrapper = await mountHeader();
    await wrapper
      .findComponent(ConversationBasicFilter)
      .vm.$emit('toggleLayout');
    expect(mockUpdateUISettings).toHaveBeenCalledWith({
      conversation_display_type: 'expanded',
      previously_used_conversation_display_type: 'expanded',
    });
  });

  it('advanced filter from the popover asks the list to open the filter modal', async () => {
    const wrapper = await mountHeader();
    await wrapper
      .findComponent(ConversationBasicFilter)
      .vm.$emit('openAdvancedFilter');
    expect(wrapper.emitted('filtersModal')).toHaveLength(1);
    expect(wrapper.find('#conversationFilterTeleportTarget').exists()).toBe(
      true
    );
  });

  it('forwards status / sort changes', async () => {
    const wrapper = await mountHeader();
    await wrapper
      .findComponent(ConversationBasicFilter)
      .vm.$emit('changeFilter', 'resolved', 'status');
    expect(wrapper.emitted('basicFilterChange')).toEqual([
      ['resolved', 'status'],
    ]);
  });

  it('with an applied filter: hides the popover, shows save / clear and the edit filter button', async () => {
    const wrapper = await mountHeader({ hasAppliedFilters: true });
    expect(wrapper.findComponent(ConversationBasicFilter).exists()).toBe(false);
    expect(wrapper.find('#saveFilterTeleportTarget').exists()).toBe(true);
    expect(wrapper.find('#toggleConversationFilterButton').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="kalo-chat-search"]').exists()).toBe(
      false
    );
  });

  it.each([{ hasAppliedFilters: true }, { hasActiveFolders: true }])(
    'keeps a layout switch in filtered / folder mode (%o)',
    async props => {
      mockUpdateUISettings.mockClear();
      const wrapper = await mountHeader(props);
      const switcher = wrapper.findComponent(SwitchLayout);
      expect(switcher.exists()).toBe(true);
      await switcher.vm.$emit('toggle');
      expect(mockUpdateUISettings).toHaveBeenCalledWith({
        conversation_display_type: 'expanded',
        previously_used_conversation_display_type: 'expanded',
      });
    }
  );

  it.each([{ hasAppliedFilters: true }, { hasActiveFolders: true }])(
    'gives every icon-only button an accessible name (%o)',
    async props => {
      const wrapper = await mountHeader(props);
      const buttons = wrapper.findAll('next-button-stub');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
      buttons.forEach(button => {
        expect(button.attributes('aria-label')).toBeTruthy();
      });
    }
  );

  it('has no extra layout switch when the popover is shown', async () => {
    const wrapper = await mountHeader();
    expect(wrapper.findComponent(SwitchLayout).exists()).toBe(false);
  });
});
