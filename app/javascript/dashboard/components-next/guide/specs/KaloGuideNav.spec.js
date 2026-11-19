import { mount, flushPromises } from '@vue/test-utils';
import subscriptionAPI from 'dashboard/api/kchat/subscription';
import productsAPI from 'dashboard/api/kchat/products';
import ordersAPI from 'dashboard/api/kchat/orders';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';
import KaloGuideNav from '../KaloGuideNav.vue';
import KaloGuideTabDot from '../KaloGuideTabDot.vue';
import { resetKaloSetupCache } from '../useKaloSetup';
import { resetKaloTrialCache } from '../useKaloTrial';
import { createGuideEnv } from './guideTestEnv';

vi.mock('dashboard/api/kchat/subscription', () => ({
  default: { get: vi.fn() },
}));
vi.mock('dashboard/api/kchat/products', () => ({ default: { get: vi.fn() } }));
vi.mock('dashboard/api/kchat/orders', () => ({ default: { get: vi.fn() } }));
vi.mock('dashboard/api/kchat/paymentSettings', () => ({
  default: { get: vi.fn() },
}));

const trial = (overrides = {}) => ({
  data: {
    plan: null,
    status: 'trial',
    days_left: 9,
    valid_until: '2026-12-01T00:00:00Z',
    billing_configured: false,
    ...overrides,
  },
});

const wrappers = [];
const mountNav = async ({ props = {}, ...envOptions } = {}) => {
  const env = createGuideEnv(envOptions);
  await env.router.push({ name: 'home', params: { accountId: 1 } });
  const wrapper = mount(KaloGuideNav, {
    props,
    attachTo: document.body,
    global: { plugins: [env.router, env.store, env.i18n] },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, ...env };
};

const banner = wrapper => wrapper.find('[data-test-id="kalo-trial-banner"]');

describe('KaloGuideNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetKaloSetupCache();
    resetKaloTrialCache();
    subscriptionAPI.get.mockResolvedValue(trial());
    productsAPI.get.mockResolvedValue({ data: { payload: [] } });
    ordersAPI.get.mockResolvedValue({ data: { meta: { count: 0 } } });
    paymentSettingsAPI.get.mockResolvedValue({ data: {} });
  });
  afterEach(() => wrappers.splice(0).forEach(w => w.unmount()));

  describe('trial banner', () => {
    it('expanded rail shows "Còn X ngày dùng thử · Xem gói" linking to billing', async () => {
      const { wrapper } = await mountNav({ props: { isExpanded: true } });
      expect(banner(wrapper).text()).toContain('Còn 9 ngày dùng thử');
      expect(banner(wrapper).text()).toContain('Xem gói');
      expect(banner(wrapper).attributes('href')).toBe(
        '/app/accounts/1/kalo_billing'
      );
      expect(banner(wrapper).attributes('data-urgent')).toBe('false');
    });

    it('collapsed rail shows an icon with the text as tooltip and name', async () => {
      const { wrapper } = await mountNav();
      expect(banner(wrapper).text()).toBe('');
      expect(banner(wrapper).attributes('aria-label')).toBe(
        'Còn 9 ngày dùng thử · Xem gói'
      );
      await banner(wrapper).trigger('focusin');
      await flushPromises();
      expect(wrapper.find('[role="tooltip"]').text()).toContain(
        'Còn 9 ngày dùng thử'
      );
    });

    it('turns red when 3 days or fewer are left', async () => {
      subscriptionAPI.get.mockResolvedValue(trial({ days_left: 3 }));
      const { wrapper } = await mountNav({ props: { isExpanded: true } });
      expect(banner(wrapper).attributes('data-urgent')).toBe('true');
      expect(banner(wrapper).classes()).toContain('bg-n-ruby-3');
    });

    it('says the trial has ended when expired', async () => {
      subscriptionAPI.get.mockResolvedValue(
        trial({ status: 'expired', days_left: 0 })
      );
      const { wrapper } = await mountNav({ props: { variant: 'sheet' } });
      expect(banner(wrapper).text()).toContain('Đã hết hạn dùng thử');
      expect(banner(wrapper).attributes('data-urgent')).toBe('true');
    });

    it('is hidden for a paid shop and for staff', async () => {
      subscriptionAPI.get.mockResolvedValue(
        trial({ status: 'active', plan: 'growth', days_left: 20 })
      );
      const paid = await mountNav({ props: { isExpanded: true } });
      expect(banner(paid.wrapper).exists()).toBe(false);
      resetKaloTrialCache();
      const staff = await mountNav({ role: 'agent' });
      expect(banner(staff.wrapper).exists()).toBe(false);
    });

    it('renders as a row in the mobile "Thêm" sheet', async () => {
      const { wrapper } = await mountNav({ props: { variant: 'sheet' } });
      expect(banner(wrapper).text()).toContain('Còn 9 ngày dùng thử');
      expect(banner(wrapper).text()).toContain('Xem gói');
    });
  });

  describe('setup badge', () => {
    it('shows the remaining step count until done', async () => {
      const { wrapper } = await mountNav({ props: { isExpanded: true } });
      const badge = wrapper.find('[data-test-id="kalo-setup-badge"]');
      expect(badge.attributes('href')).toBe('/app/accounts/1/kalo_overview');
      expect(
        wrapper.find('[data-test-id="kalo-setup-badge-count"]').text()
      ).toBe('5');
    });

    it('names the remaining steps for the collapsed icon', async () => {
      const { wrapper } = await mountNav();
      expect(
        wrapper
          .find('[data-test-id="kalo-setup-badge"]')
          .attributes('aria-label')
      ).toBe('Còn 5 bước thiết lập');
    });

    it('is gone once the list is hidden', async () => {
      const { wrapper } = await mountNav({
        uiSettings: { kalo_setup: { 1: { hidden: true } } },
      });
      expect(wrapper.find('[data-test-id="kalo-setup-badge"]').exists()).toBe(
        false
      );
    });
  });

  describe('Hướng dẫn menu', () => {
    const openMenu = async wrapper => {
      await wrapper.find('[data-test-id="kalo-guide-open"]').trigger('click');
      await flushPromises();
      return wrapper.find('[data-test-id="kalo-guide-drawer"]');
    };

    it('lists the tours of the modules that are on', async () => {
      const { wrapper } = await mountNav({
        features: { kalo_comments: true },
      });
      const drawer = await openMenu(wrapper);
      const tours = drawer
        .findAll('[data-test-id^="kalo-guide-tour-"]')
        .map(el =>
          el.attributes('data-test-id').replace('kalo-guide-tour-', '')
        );
      expect(tours).toEqual(['messages', 'orders', 'console', 'comments']);
      expect(drawer.text()).toContain('Bắt đầu với Kalo');
    });

    it('replays a tour by opening its page with ?tour=', async () => {
      const { wrapper, router } = await mountNav({
        uiSettings: { kalo_tours_seen: { orders: true } },
      });
      const drawer = await openMenu(wrapper);
      expect(
        drawer.find('[data-test-id="kalo-guide-tour-orders"]').text()
      ).toContain('Đã xem');
      await drawer
        .find('[data-test-id="kalo-guide-tour-orders"]')
        .trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe(
        '/app/accounts/1/kalo_orders?tour=orders'
      );
      expect(wrapper.find('[data-test-id="kalo-guide-drawer"]').exists()).toBe(
        false
      );
    });

    it('brings back a hidden setup list', async () => {
      const { wrapper, store, router } = await mountNav({
        uiSettings: { kalo_setup: { 1: { hidden: true } } },
      });
      const drawer = await openMenu(wrapper);
      await drawer.find('[data-test-id="kalo-guide-setup"]').trigger('click');
      await flushPromises();
      expect(store.state.uiSettings.kalo_setup[1].hidden).toBe(false);
      expect(router.currentRoute.value.name).toBe('kalo_overview');
    });
  });

  describe('dot on the mobile "Thêm" tab', () => {
    const mountDot = async envOptions => {
      const env = createGuideEnv(envOptions);
      await env.router.push({ name: 'home', params: { accountId: 1 } });
      const wrapper = mount(KaloGuideTabDot, {
        global: { plugins: [env.router, env.store, env.i18n] },
      });
      wrappers.push(wrapper);
      await flushPromises();
      return wrapper.find('[data-test-id="kalo-more-dot"]');
    };

    it('signals remaining setup steps with a screen-reader label', async () => {
      const dot = await mountDot();
      expect(dot.find('.sr-only').text()).toBe('Còn 5 bước thiết lập');
      expect(dot.find('[aria-hidden="true"]').classes()).toContain(
        'bg-n-blue-9'
      );
    });

    it('turns red and names the trial when 3 days or fewer are left', async () => {
      subscriptionAPI.get.mockResolvedValue(trial({ days_left: 2 }));
      const dot = await mountDot({
        uiSettings: { kalo_setup: { 1: { hidden: true } } },
      });
      expect(dot.find('.sr-only').text()).toBe('Còn 2 ngày dùng thử');
      expect(dot.find('[aria-hidden="true"]').classes()).toContain(
        'bg-n-ruby-9'
      );
    });

    it('is absent when setup is hidden and the trial is not urgent', async () => {
      const dot = await mountDot({
        uiSettings: { kalo_setup: { 1: { hidden: true } } },
      });
      expect(dot.exists()).toBe(false);
    });
  });
});
