import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import KaloAssistantButton from '../KaloAssistantButton.vue';
import { resetAssistantState } from '../useKaloAssistant';
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
  it('is inserted in the rail footer and the mobile sheet', async () => {
    const [{ default: KaloRailFooter }, { default: KaloTabBar }, helpers] =
      await Promise.all([
        import('../../sidebar/KaloRailFooter.vue'),
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
    const footer = mount(KaloRailFooter, { attachTo: document.body, global });
    const tabBar = mount(KaloTabBar, { attachTo: document.body, global });
    wrappers.push(footer, tabBar);
    await flushPromises();
    expect(button(footer).exists()).toBe(true);
    await tabBar.find('[data-test-id="kalo-tab-more"]').trigger('click');
    await flushPromises();
    expect(button(tabBar).exists()).toBe(true);
  });
});
