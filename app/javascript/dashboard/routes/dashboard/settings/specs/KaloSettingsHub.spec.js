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
  it('shows the shop-owner groups in order', async () => {
    const { wrapper } = await mountHub();
    const headings = wrapper.findAll('h2').map(h => h.text());
    expect(headings).toEqual([
      'Kênh bán hàng',
      'Nhân viên & nhóm',
      'Nhãn & trả lời nhanh',
      'Cửa hàng',
      'Tài khoản của tôi',
      'Nâng cao',
      'Báo cáo chi tiết',
    ]);
  });

  it('restores bots and conversation workflow and drops the dead Chatwoot billing link', async () => {
    const { names } = await mountHub();
    expect(names).toContain('agent_bots');
    expect(names).toContain('conversation_workflow_index');
    expect(names).toContain('kalo_billing');
    expect(names).not.toContain('billing_settings_index');
  });

  it('lists Nhận tiền in the Cửa hàng group, after the shop info and before the plan', async () => {
    const { wrapper } = await mountHub();
    const shop = wrapper.find('[data-test="hub-group-SHOP"]');
    const titles = shop.findAll('li').map(li => li.text());
    expect(titles).toHaveLength(3);
    expect(titles[1]).toContain('Nhận tiền');
    const shopLinks = shop
      .findAllComponents({ name: 'RouterLink' })
      .map(link => link.props('to').name);
    expect(shopLinks).toEqual([
      'general_settings_index',
      'kalo_payment_settings',
      'kalo_billing',
    ]);
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
});
