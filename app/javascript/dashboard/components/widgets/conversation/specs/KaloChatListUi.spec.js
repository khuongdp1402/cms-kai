// Kalo UI phase 2 (task 1b-i): conversation list pieces that are new or moved.
//  - KaloChatQuickViews: entry points for mentions / unattended / participating (C-07)
//  - KaloChatListEmpty: per-list empty state with "clear filters" (C-19)
//  - KaloChannelBadge: channel mark on avatars (C-11)
//  - OnboardingView: Kalo welcome with greeting + the one setup checklist (C-103, guided UX §3.1)
//  - ConversationBasicFilter popover: advanced filter + layout toggle entries (C-04, C-18)
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloChatQuickViews from '../KaloChatQuickViews.vue';
import KaloChatListEmpty from '../KaloChatListEmpty.vue';
import OnboardingView from '../OnboardingView.vue';
import ConversationBasicFilter from '../ConversationBasicFilter.vue';
import KaloChannelBadge from 'dashboard/components-next/icon/KaloChannelBadge.vue';

vi.mock('dashboard/api/kchat/products', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: { payload: [] } })) },
}));
vi.mock('dashboard/api/kchat/orders', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { meta: { count: 0 } } })),
  },
}));
vi.mock('dashboard/api/kchat/paymentSettings', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: {} })) },
}));

vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings: vi.fn() }),
}));

const ROUTES = [
  'home',
  'conversation_mentions',
  'conversation_unattended',
  'conversation_participating',
  'settings_inbox_new',
  'kalo_pos',
  'kalo_orders',
  'kalo_payment_settings',
  'kalo_console',
];

const createEnv = ({ role = 'administrator', inboxes = [] } = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ROUTES.map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  const store = createStore({
    getters: {
      getCurrentRole: () => role,
      getCurrentUser: () => ({ name: 'Lan' }),
      'inboxes/getInboxes': () => inboxes,
      'accounts/getAccount': () => () => ({}),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/isFeatureEnabledonAccount': () => () => true,
      getChatStatusFilter: () => 'open',
      getChatSortFilter: () => 'last_activity_at_desc',
    },
    actions: { setChatStatusFilter: vi.fn(), setChatSortFilter: vi.fn() },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return { router, store, i18n };
};

const mountWith = async (component, { route = 'home', env, props } = {}) => {
  const { router, store, i18n } = env || createEnv();
  await router.push({ name: route, params: { accountId: 1 } });
  return mount(component, {
    props,
    global: { plugins: [router, store, i18n] },
  });
};

const linkTargets = wrapper =>
  wrapper.findAll('a').map(a => a.attributes('href'));

describe('KaloChatQuickViews', () => {
  it('links to all / mentions / unattended / participating lists', async () => {
    const wrapper = await mountWith(KaloChatQuickViews);
    expect(linkTargets(wrapper)).toEqual([
      '/app/accounts/1/home',
      '/app/accounts/1/conversation_mentions',
      '/app/accounts/1/conversation_unattended',
      '/app/accounts/1/conversation_participating',
    ]);
    expect(wrapper.text()).toContain('Được nhắc tên');
  });

  it('marks the current list and tells the popover to close on click', async () => {
    const wrapper = await mountWith(KaloChatQuickViews, {
      route: 'conversation_unattended',
    });
    const current = wrapper.find('[aria-current="page"]');
    expect(current.attributes('data-test-id')).toBe(
      'kalo-quick-view-unattended'
    );
    await current.trigger('click');
    expect(wrapper.emitted('navigate')).toHaveLength(1);
  });
});

describe('KaloChatListEmpty', () => {
  it('shows a friendly message and no clear button for an empty list', async () => {
    const wrapper = await mountWith(KaloChatListEmpty);
    expect(wrapper.text()).toContain('Chưa có tin nhắn nào');
    expect(wrapper.find('[data-test-id="kalo-chat-list-clear"]').exists()).toBe(
      false
    );
  });

  it('carries the setup checklist on mobile only (not when filtered)', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 400;
    const wrapper = await mountWith(KaloChatListEmpty);
    await flushPromises();
    expect(
      wrapper.find('[data-test-id="kalo-setup-checklist"]').exists()
    ).toBe(true);
    const filtered = await mountWith(KaloChatListEmpty, {
      props: { isFiltered: true },
    });
    await flushPromises();
    expect(
      filtered.find('[data-test-id="kalo-setup-checklist"]').exists()
    ).toBe(false);
    // Desktop: not mounted at all (OnboardingView shows it beside the list).
    window.innerWidth = 1280;
    const desktop = await mountWith(KaloChatListEmpty);
    await flushPromises();
    expect(
      desktop.findComponent({ name: 'KaloSetupChecklist' }).exists()
    ).toBe(false);
    window.innerWidth = originalWidth;
  });

  it('offers to clear the filters when the list is filtered', async () => {
    const wrapper = await mountWith(KaloChatListEmpty, {
      props: { isFiltered: true },
    });
    await wrapper
      .find('[data-test-id="kalo-chat-list-clear"]')
      .trigger('click');
    expect(wrapper.emitted('clearFilters')).toHaveLength(1);
  });
});

describe('KaloChannelBadge', () => {
  it.each([
    ['Channel::ZaloPersonal', 'Z'],
    ['Channel::FacebookPage', 'f'],
  ])('renders the brand letter for %s', (channelType, mark) => {
    const wrapper = mount(KaloChannelBadge, {
      props: { inbox: { channel_type: channelType, name: 'Shop' } },
    });
    expect(wrapper.text()).toBe(mark);
    expect(wrapper.attributes('title')).toBe('Shop');
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toBe('Shop');
  });

  it('uses the sprite glyph for TikTok and nothing for an API inbox', () => {
    const tiktok = mount(KaloChannelBadge, {
      props: { inbox: { channel_type: 'Channel::Tiktok' } },
    });
    expect(tiktok.find('use').attributes('href')).toBe('/kalo-icons.svg#c-tt');
    const api = mount(KaloChannelBadge, {
      props: { inbox: { channel_type: 'Channel::Api' } },
    });
    expect(api.find('[data-test-id="kalo-channel-badge"]').exists()).toBe(
      false
    );
  });
});

describe('OnboardingView (Kalo welcome)', () => {
  it('greets the user by name in Vietnamese and shows the setup checklist to admins', async () => {
    const wrapper = await mountWith(OnboardingView);
    await flushPromises();
    expect(wrapper.text()).toMatch(/Chào buổi (sáng|chiều|tối), Lan!/);
    expect(wrapper.text()).not.toMatch(/Welcome|Chatwoot|KTech/);
    const checklist = wrapper.find('[data-test-id="kalo-setup-checklist"]');
    expect(checklist.text()).toContain('Bắt đầu với Kalo');
    expect(checklist.findAll('li')).toHaveLength(5);
    expect(linkTargets(wrapper)).toContain(
      '/app/accounts/1/settings_inbox_new'
    );
    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('hides the checklist from agents and marks Nối kênh done once a channel exists', async () => {
    const agent = await mountWith(OnboardingView, {
      env: createEnv({ role: 'agent' }),
    });
    await flushPromises();
    expect(agent.text()).toMatch(/Lan!/);
    expect(agent.find('[data-test-id="kalo-setup-checklist"]').exists()).toBe(
      false
    );
    const admin = await mountWith(OnboardingView, {
      env: createEnv({ inboxes: [{ id: 1 }] }),
      props: { message: 'Chọn một cuộc trò chuyện' },
    });
    await flushPromises();
    expect(
      admin.find('[data-test-id="kalo-setup-step-channel"]').text()
    ).toContain('Đã xong');
    expect(admin.text()).toContain('Chọn một cuộc trò chuyện');
  });
});

describe('ConversationBasicFilter popover (single filter entry)', () => {
  const mountFilter = async () => {
    const wrapper = await mountWith(ConversationBasicFilter, {
      props: { isOnExpandedLayout: false },
    });
    await wrapper.find('[data-test-id="kalo-filter-trigger"]').trigger('click');
    await flushPromises();
    return wrapper;
  };

  it('opens one panel with status, sort, quick views, advanced filter and layout', async () => {
    const wrapper = await mountFilter();
    const panel = wrapper.find('[data-test-id="kalo-filter-panel"]');
    expect(panel.exists()).toBe(true);
    expect(panel.findAll('[data-test-id^="kalo-status-"]')).toHaveLength(5);
    expect(panel.findAll('option')).toHaveLength(10);
    expect(panel.find('[data-test-id="kalo-quick-views"]').exists()).toBe(true);
  });

  it('advanced filter entry emits openAdvancedFilter and closes the panel', async () => {
    const wrapper = await mountFilter();
    await wrapper
      .find('[data-test-id="kalo-advanced-filter"]')
      .trigger('click');
    expect(wrapper.emitted('openAdvancedFilter')).toHaveLength(1);
    expect(wrapper.vm.$.setupState.showActionsDropdown).toBe(false);
  });

  it('Escape closes the panel; trigger advertises the popup', async () => {
    const wrapper = await mountFilter();
    const trigger = wrapper.find('[data-test-id="kalo-filter-trigger"]');
    expect(trigger.attributes('aria-haspopup')).toBe('dialog');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(
      wrapper.find('[data-test-id="kalo-filter-panel"]').attributes('role')
    ).toBe('dialog');
    await wrapper
      .find('[data-test-id="kalo-sort-select"]')
      .trigger('keydown', { key: 'Escape' });
    expect(wrapper.vm.$.setupState.showActionsDropdown).toBe(false);
  });

  it('layout entry emits toggleLayout', async () => {
    const wrapper = await mountFilter();
    await wrapper.find('[data-test-id="kalo-layout-toggle"]').trigger('click');
    expect(wrapper.emitted('toggleLayout')).toHaveLength(1);
  });

  it('status chip and sort select call the same handlers', async () => {
    const wrapper = await mountFilter();
    await wrapper
      .find('[data-test-id="kalo-status-resolved"]')
      .trigger('click');
    const select = wrapper.find('[data-test-id="kalo-sort-select"]');
    await select.setValue('unread');
    expect(wrapper.emitted('changeFilter')).toEqual([
      ['resolved', 'status'],
      ['unread', 'sort'],
    ]);
  });
});
