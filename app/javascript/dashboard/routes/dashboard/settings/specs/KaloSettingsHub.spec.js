import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import SettingsHub from '../SettingsHub.vue';

const ADMIN = ['administrator'];
const ALL = ['administrator', 'agent'];

// Route names the hub links to, with the meta the real routes declare.
const ROUTES = {
  kalo_settings_hub: {},
  kalo_console: { permissions: ALL },
  settings_inbox_list: { permissions: ADMIN, featureFlag: 'inbox_management' },
  campaigns_livechat_index: { permissions: ADMIN },
  portals_index: { permissions: ADMIN },
  agent_list: { permissions: ADMIN },
  settings_teams_list: { permissions: ADMIN },
  labels_list: { permissions: ADMIN },
  canned_list: { permissions: ALL },
  general_settings_index: { permissions: ADMIN },
  kalo_billing: { permissions: ADMIN },
  kalo_payment_settings: { permissions: ADMIN },
  profile_settings_index: { permissions: ALL },
  attributes_list: { permissions: ADMIN },
  automation_list: { permissions: ADMIN },
  macros_wrapper: { permissions: ALL },
  conversation_workflow_index: { permissions: ADMIN },
  settings_applications: { permissions: ADMIN },
  agent_bots: { permissions: ADMIN, featureFlag: 'agent_bots' },
  settings_data_imports: { permissions: ADMIN, featureFlag: 'data_import' },
  account_overview_reports: { permissions: ADMIN },
  conversation_reports: { permissions: ADMIN },
  agent_reports_index: { permissions: ADMIN },
  label_reports_index: { permissions: ADMIN },
  inbox_reports_index: { permissions: ADMIN },
  team_reports_index: { permissions: ADMIN },
  csat_reports: { permissions: ADMIN },
  billing_settings_index: { permissions: ADMIN },
};

const mountHub = async ({
  permissions = ADMIN,
  disabledFeatures = ['data_import'],
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: Object.entries(ROUTES).map(([name, meta]) => ({
      name,
      meta,
      path: `/app/accounts/:accountId/${name}/:navigationPath?`,
      component: { template: '<div />' },
    })),
  });
  const store = createStore({
    getters: {
      getCurrentUser: () => ({ accounts: [{ id: 1, permissions }] }),
      'accounts/getAccount': () => () => ({ id: 1 }),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/isFeatureEnabledonAccount': () => (_id, flag) =>
        !disabledFeatures.includes(flag),
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  await router.push({ name: 'kalo_settings_hub', params: { accountId: 1 } });
  const wrapper = mount(SettingsHub, {
    global: {
      plugins: [router, store, i18n],
      stubs: {
        RouterLink: {
          name: 'RouterLink',
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  });
  const links = wrapper
    .findAllComponents({ name: 'RouterLink' })
    .map(link => link.props('to'));
  return { wrapper, links, names: links.map(to => to.name) };
};

describe('SettingsHub (Kalo groups)', () => {
  // Guided UX §7: shop items moved to the Console, Chiến dịch to the sidebar.
  it('shows the Cửa hàng, replies, own account and advanced groups in order', async () => {
    const { wrapper } = await mountHub();
    const headings = wrapper.findAll('h2').map(h => h.text());
    expect(headings).toEqual([
      'Cửa hàng',
      'Nhãn & trả lời nhanh',
      'Tài khoản của tôi',
      'Nâng cao',
    ]);
  });

  it('filters setting rows in real time via quick search', async () => {
    const { wrapper } = await mountHub();
    const input = wrapper.find('[data-test="settings-search"]');
    await input.setValue('nhận tiền');
    expect(wrapper.text()).toContain('Console');
    expect(wrapper.text()).not.toContain('Bot trả lời');

    await input.setValue('zzzz_khong_ton_tai');
    expect(wrapper.find('[data-test="settings-no-match"]').exists()).toBe(true);
  });

  it('restores bots and conversation workflow and drops the dead Chatwoot billing link', async () => {
    const { names } = await mountHub();
    expect(names).toContain('agent_bots');
    expect(names).toContain('conversation_workflow_index');
    expect(names).not.toContain('billing_settings_index');
  });

  it('the Cửa hàng group links only to the Console (no duplicate shop pages)', async () => {
    const { wrapper, names } = await mountHub();
    const shop = wrapper.find('[data-test="hub-group-SHOP"]');
    const shopLinks = shop
      .findAllComponents({ name: 'RouterLink' })
      .map(link => link.props('to').name);
    expect(shopLinks).toEqual(['kalo_console']);
    [
      'general_settings_index',
      'kalo_payment_settings',
      'kalo_billing',
      'agent_list',
      'settings_teams_list',
      'settings_inbox_list',
      'campaigns_livechat_index',
    ].forEach(name => expect(names).not.toContain(name));
  });

  it('hides advanced links whose kalo flag is off and shows them when on', async () => {
    const off = await mountHub({
      disabledFeatures: [
        'data_import',
        'kalo_advanced_automation',
        'kalo_help_center',
      ],
    });
    [
      'attributes_list',
      'automation_list',
      'macros_wrapper',
      'conversation_workflow_index',
      'agent_bots',
      'portals_index',
    ].forEach(name => expect(off.names).not.toContain(name));
    expect(off.names).toContain('settings_applications');

    const on = await mountHub();
    ['automation_list', 'macros_wrapper', 'portals_index'].forEach(name =>
      expect(on.names).toContain(name)
    );
  });

  it('links data import only when the account has the feature', async () => {
    expect((await mountHub()).names).not.toContain('settings_data_imports');
    const { names } = await mountHub({ disabledFeatures: [] });
    expect(names).toContain('settings_data_imports');
  });

  it('opens profile at the security and notifications sections', async () => {
    const { links } = await mountHub();
    const hashes = links
      .filter(to => to.name === 'profile_settings_index')
      .map(to => to.hash || '');
    expect(hashes).toEqual(['', '#security', '#notifications']);
  });

  it('shows an agent only the pages their role can open', async () => {
    const { names, wrapper } = await mountHub({ permissions: ['agent'] });
    expect([...new Set(names)].sort()).toEqual([
      'canned_list',
      'macros_wrapper',
      'profile_settings_index',
    ]);
    expect(wrapper.text()).not.toContain('Cửa hàng');
  });

  // Guided UX §2: settings hub in KaloPage, one KaloCard per group.
  it('renders each group as a card in the shared page frame', async () => {
    const { wrapper } = await mountHub();
    expect(wrapper.find('[data-test-id="kalo-page-header"] h1').text()).toBe(
      'Cài đặt'
    );
    const group = wrapper.find('[data-test="hub-group-SHOP"]');
    expect(group.attributes('data-test-id')).toBe('kalo-card');
    expect(group.find('h2').text()).toBe('Cửa hàng');
    expect(
      wrapper.find('[data-test-id="kalo-page-actions"] input').exists()
    ).toBe(true);
  });
});
