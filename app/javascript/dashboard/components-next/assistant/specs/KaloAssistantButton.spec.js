import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import KaloAssistantButton from '../KaloAssistantButton.vue';
import { AVAILABILITY_TTL_MS, resetAssistantState } from '../useKaloAssistant';
import { createAssistantEnv } from './assistantTestEnv';

vi.mock('dashboard/api/kchat/assistant', () => ({
  default: { send: vi.fn() },
}));
vi.mock('dashboard/api/kchat/brandGrowth', () => ({
  default: { aiHealth: vi.fn() },
}));

const wrappers = [];
const mountButton = async ({ configured, flagOn = true, props = {} }) => {
  if (configured instanceof Error) {
    brandGrowthAPI.aiHealth.mockRejectedValue(configured);
  } else {
    brandGrowthAPI.aiHealth.mockResolvedValue({ data: { configured } });
  }
  const wrapper = mount(KaloAssistantButton, {
    attachTo: document.body,
    props,
    global: { plugins: createAssistantEnv({ flagOn }).plugins },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
};
const button = w => w.find('[data-test-id="kalo-assistant-button"]');
const drawer = w => w.find('[data-test-id="kalo-assistant-drawer"]');

beforeEach(() => {
  resetAssistantState();
  vi.clearAllMocks();
});
afterEach(() => wrappers.splice(0).forEach(w => w.unmount()));

describe('KaloAssistantButton visibility', () => {
  it('is hidden when AI is not configured', async () => {
    const wrapper = await mountButton({ configured: false });
    expect(button(wrapper).exists()).toBe(false);
  });

  it('is hidden when the account flag is off', async () => {
    const wrapper = await mountButton({ configured: true, flagOn: false });
    expect(button(wrapper).exists()).toBe(false);
  });

  it('is hidden when AI is configured but the provider is failing (available: false)', async () => {
    brandGrowthAPI.aiHealth.mockResolvedValue({
      data: { configured: true, available: false },
    });
    const wrapper = mount(KaloAssistantButton, {
      attachTo: document.body,
      global: { plugins: createAssistantEnv({ flagOn: true }).plugins },
    });
    wrappers.push(wrapper);
    await flushPromises();
    expect(button(wrapper).exists()).toBe(false);
  });

  it('re-checks an unavailable AI after 5 minutes instead of hiding it for the whole session', async () => {
    vi.useFakeTimers();
    try {
      brandGrowthAPI.aiHealth
        .mockResolvedValueOnce({ data: { configured: true, available: false } })
        .mockResolvedValue({ data: { configured: true, available: true } });
      const wrapper = mount(KaloAssistantButton, {
        attachTo: document.body,
        global: { plugins: createAssistantEnv({ flagOn: true }).plugins },
      });
      wrappers.push(wrapper);
      await flushPromises();
      expect(button(wrapper).exists()).toBe(false);

      await vi.advanceTimersByTimeAsync(AVAILABILITY_TTL_MS - 1000);
      expect(brandGrowthAPI.aiHealth).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      expect(brandGrowthAPI.aiHealth).toHaveBeenCalledTimes(2);
      expect(button(wrapper).exists()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('is hidden when the health check fails', async () => {
    const wrapper = await mountButton({ configured: new Error('500') });
    expect(button(wrapper).exists()).toBe(false);
  });

  it('shows when configured and the flag is on, and opens the drawer', async () => {
    const wrapper = await mountButton({ configured: true });
    expect(button(wrapper).attributes('aria-label')).toBe('Trợ lý AI');
    await button(wrapper).trigger('click');
    expect(drawer(wrapper).exists()).toBe(true);
    await wrapper.find('[data-test-id="kalo-drawer-close"]').trigger('click');
    expect(drawer(wrapper).exists()).toBe(false);
  });

  it('uses the rail item box and icon size (44px box, 24px icon when collapsed)', async () => {
    const collapsed = await mountButton({ configured: true });
    expect(button(collapsed).classes()).toEqual(
      expect.arrayContaining(['size-11', 'rounded-xl'])
    );
    expect(button(collapsed).find('svg').classes()).toContain('size-6');
    const expanded = await mountButton({
      configured: true,
      props: { isExpanded: true },
    });
    expect(button(expanded).classes()).toEqual(
      expect.arrayContaining(['px-3', 'py-2', 'text-sm', 'font-semibold'])
    );
    expect(button(expanded).text()).toBe('Trợ lý AI');
  });

  it('renders a labelled row for the mobile sheet', async () => {
    const wrapper = await mountButton({
      configured: true,
      props: { variant: 'sheet' },
    });
    expect(button(wrapper).text()).toBe('Trợ lý AI');
  });

  it('asks ai_health only once per account', async () => {
    await mountButton({ configured: true });
    await mountButton({ configured: true });
    expect(brandGrowthAPI.aiHealth).toHaveBeenCalledTimes(1);
  });
});

describe('KaloAssistantButton account switch', () => {
  it('loads availability again when the current account changes', async () => {
    brandGrowthAPI.aiHealth.mockResolvedValue({ data: { configured: true } });
    const env = createAssistantEnv();
    const store = createStore({
      state: { accountId: 1 },
      getters: {
        getCurrentAccountId: state => state.accountId,
        'accounts/isFeatureEnabledonAccount': () => () => true,
      },
      mutations: {
        setAccount(state, value) {
          state.accountId = value;
        },
      },
    });
    const wrapper = mount(KaloAssistantButton, {
      global: { plugins: [env.router, store, env.i18n] },
    });
    wrappers.push(wrapper);
    await flushPromises();
    expect(brandGrowthAPI.aiHealth).toHaveBeenCalledTimes(1);
    store.commit('setAccount', 2);
    await flushPromises();
    expect(brandGrowthAPI.aiHealth).toHaveBeenCalledTimes(2);
  });
});

describe('KaloAssistantButton placement', () => {
  // Spec §4 footer order: Trợ lý AI first, above Console/Cài đặt (KaloRail).
  it('is inserted in the rail footer and the mobile sheet', async () => {
    const [{ default: KaloRail }, { default: KaloTabBar }, helpers] =
      await Promise.all([
        import('../../sidebar/KaloRail.vue'),
        import('../../sidebar/KaloTabBar.vue'),
        import('../../sidebar/specs/kaloTestHelpers'),
      ]);
    brandGrowthAPI.aiHealth.mockResolvedValue({ data: { configured: true } });
    const env = helpers.createKaloTestEnv();
    await env.router.push({ name: 'kalo_orders', params: { accountId: 1 } });
    const global = {
      plugins: [env.router, env.store, env.i18n],
      stubs: { SidebarProfileMenuStatus: true, ComposeConversation: true },
    };
    const footer = mount(KaloRail, { attachTo: document.body, global });
    const tabBar = mount(KaloTabBar, { attachTo: document.body, global });
    wrappers.push(footer, tabBar);
    await flushPromises();
    expect(button(footer).exists()).toBe(true);
    const order = footer
      .findAll(
        '[data-test-id="kalo-assistant-button"], [data-test-id^="kalo-nav-"]'
      )
      .map(el => el.attributes('data-test-id'));
    expect(order.slice(-3)).toEqual([
      'kalo-assistant-button',
      'kalo-nav-console',
      'kalo-nav-settings',
    ]);
    await tabBar.find('[data-test-id="kalo-tab-more"]').trigger('click');
    await flushPromises();
    expect(button(tabBar).exists()).toBe(true);
  });
});
