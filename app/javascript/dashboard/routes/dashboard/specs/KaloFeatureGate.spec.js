import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloFeatureGate from '../KaloFeatureGate.vue';

const PAGES = [
  'kalo_overview',
  'kalo_orders',
  'kalo_pos',
  'kalo_comments',
  'kalo_brand',
  'kalo_campaigns',
  'automation_list',
  'portals_index',
  'csat_reports',
  'campaigns_sms_index',
];

const mountGate = async (name, { features = {}, loaded = true } = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: PAGES.map(page => ({
      name: page,
      path: `/app/accounts/:accountId/${page}`,
      component: { template: `<p data-test="page">${page}</p>` },
    })),
  });
  await router.push({ name, params: { accountId: 1 } });
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      'accounts/getAccount': () => () => (loaded ? { id: 1, features } : {}),
      'accounts/isFeatureEnabledonAccount': () => (_id, flag) =>
        Boolean(features[flag]),
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(KaloFeatureGate, {
    global: { plugins: [router, store, i18n] },
  });
  await flushPromises();
  return wrapper;
};

const isOff = wrapper =>
  wrapper.find('[data-test="kalo-feature-off"]').exists();

describe('KaloFeatureGate', () => {
  it.each([
    ['kalo_pos', 'kalo_pos'],
    ['kalo_comments', 'kalo_comments'],
    ['kalo_brand', 'kalo_brand'],
    ['kalo_campaigns', 'kalo_campaigns'],
    ['automation_list', 'kalo_advanced_automation'],
    ['portals_index', 'kalo_help_center'],
    ['csat_reports', 'kalo_detailed_reports'],
  ])('%s shows the page when %s is on', async (name, flag) => {
    const wrapper = await mountGate(name, { features: { [flag]: true } });
    expect(isOff(wrapper)).toBe(false);
    expect(wrapper.find('[data-test="page"]').text()).toBe(name);
  });

  it.each([
    'kalo_pos',
    'kalo_comments',
    'kalo_brand',
    'kalo_campaigns',
    'automation_list',
    'portals_index',
    'csat_reports',
  ])(
    '%s shows the friendly feature-off page when its flag is off',
    async name => {
      const wrapper = await mountGate(name);
      expect(isOff(wrapper)).toBe(true);
      expect(wrapper.find('[data-test="page"]').exists()).toBe(false);
      expect(wrapper.text()).toContain('Chức năng chưa bật');
      expect(wrapper.text()).toContain('Liên hệ quản trị Kalo');
      const home = wrapper.find('[data-test="kalo-feature-off-home"]');
      expect(home.attributes('href')).toBe('/app/accounts/1/kalo_overview');
    }
  );

  it('needs every flag of a route (SMS campaigns need extra channels too)', async () => {
    const wrapper = await mountGate('campaigns_sms_index', {
      features: { kalo_campaigns: true },
    });
    expect(isOff(wrapper)).toBe(true);
  });

  it('never gates core pages', async () => {
    const wrapper = await mountGate('kalo_orders');
    expect(isOff(wrapper)).toBe(false);
    expect(wrapper.find('[data-test="page"]').text()).toBe('kalo_orders');
  });

  it('waits for the account payload instead of flashing either page', async () => {
    const wrapper = await mountGate('kalo_pos', { loaded: false });
    expect(isOff(wrapper)).toBe(false);
    expect(wrapper.find('[data-test="page"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="kalo-feature-pending"]').exists()).toBe(
      true
    );
  });
});
