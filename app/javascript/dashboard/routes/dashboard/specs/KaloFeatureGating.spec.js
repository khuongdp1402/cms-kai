import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import reportsAPI from 'dashboard/api/kchat/reports';
import { kaloFeatureGetters } from 'dashboard/helper/specs/kaloFeatureGetters';
import ReportsIndex from '../reports/ReportsIndex.vue';
import MarketingIndex from '../marketing/MarketingIndex.vue';
import CommentsPage from '../marketing/CommentsPage.vue';
import CampaignsPage from '../marketing/CampaignsPage.vue';
import BrandPage from '../marketing/BrandPage.vue';
import ChannelList from '../settings/inbox/ChannelList.vue';
import CampaignsPageRouteView from '../campaigns/pages/CampaignsPageRouteView.vue';
import IntegrationsIndex from '../settings/integrations/Index.vue';

vi.mock('dashboard/api/kchat/reports', () => ({
  default: {
    summary: vi.fn(),
    funnel: vi.fn(),
    brandsOverview: vi.fn(),
  },
}));

const ALL_ON = {
  kalo_comments: true,
  kalo_campaigns: true,
  kalo_brand: true,
  kalo_pos: true,
  kalo_advanced_automation: true,
  kalo_help_center: true,
  kalo_detailed_reports: true,
  kalo_extra_channels: true,
};

const REPORT_ROUTES = [
  'account_overview_reports',
  'conversation_reports',
  'agent_reports_index',
  'label_reports_index',
  'inbox_reports_index',
  'team_reports_index',
  'csat_reports',
];

const mountWith = async (
  component,
  { features = ALL_ON, getters = {}, actions = {}, stubs = {} } = {}
) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      'kalo_page',
      'kalo_overview',
      'kalo_billing',
      'campaigns_livechat_index',
      'campaigns_sms_index',
      'campaigns_whatsapp_index',
      'kalo_campaigns',
      ...REPORT_ROUTES,
    ].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  await router.push({ name: 'kalo_page', params: { accountId: 1 } });
  const store = createStore({
    getters: {
      getCurrentRole: () => 'administrator',
      ...kaloFeatureGetters(features),
      ...getters,
    },
    actions: {
      'campaigns/get': vi.fn(),
      'labels/get': vi.fn(),
      'inboxes/get': vi.fn(),
      ...actions,
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(component, {
    global: { plugins: [router, store, i18n], stubs },
  });
  await flushPromises();
  return wrapper;
};

const MARKETING_STUBS = {
  MarketingCampaigns: { template: '<div data-test="campaigns-body" />' },
  // The Chiến dịch page embeds the website greetings section directly.
  WebsiteCampaignsCard: { template: '<div data-test="campaigns-body" />' },
  ContentIdeas: { template: '<div data-test="ideas-body" />' },
  ContentCalendar: { template: '<div data-test="calendar-body" />' },
  CommentAutomationSettings: { template: '<div data-test="comments-body" />' },
  BrandProfileForm: { template: '<div data-test="brand-body" />' },
};

describe('Kalo feature flags in pages', () => {
  describe('ReportsIndex detail links (kalo_detailed_reports)', () => {
    beforeEach(() => {
      reportsAPI.summary.mockResolvedValue({ data: null });
      reportsAPI.funnel.mockResolvedValue({ data: null });
      reportsAPI.brandsOverview.mockResolvedValue({ data: { brands: [] } });
    });

    it('lists the Chatwoot detail reports when the flag is on', async () => {
      const wrapper = await mountWith(ReportsIndex);
      expect(
        wrapper.findAll('[data-test="reports-detail-links"] a')
      ).toHaveLength(REPORT_ROUTES.length);
    });

    it('hides them when the flag is off', async () => {
      const wrapper = await mountWith(ReportsIndex, {
        features: { ...ALL_ON, kalo_detailed_reports: false },
      });
      expect(wrapper.find('[data-test="reports-detail-links"]').exists()).toBe(
        false
      );
    });
  });

  describe('former Marketing page tabs', () => {
    const tabs = wrapper => wrapper.findAll('[role="tab"]').map(t => t.text());

    it('shows every tab when the modules are on', async () => {
      const wrapper = await mountWith(MarketingIndex, {
        stubs: MARKETING_STUBS,
      });
      expect(tabs(wrapper)).toEqual([
        'Chiến dịch',
        'Ý tưởng nội dung',
        'Lịch nội dung',
        'Bình luận FB/IG',
        'Hồ sơ thương hiệu',
      ]);
    });

    it('drops the tabs of modules that are off and opens the first one left', async () => {
      const wrapper = await mountWith(MarketingIndex, {
        features: { kalo_comments: true },
        stubs: MARKETING_STUBS,
      });
      expect(tabs(wrapper)).toEqual(['Bình luận FB/IG']);
      expect(wrapper.find('[data-test="comments-body"]').exists()).toBe(true);
    });

    it('renders nothing until the account flags are loaded (no flash of hidden tabs)', async () => {
      const wrapper = await mountWith(MarketingIndex, {
        stubs: MARKETING_STUBS,
        getters: { 'accounts/getAccount': () => () => ({ id: 1 }) },
      });
      expect(wrapper.find('[role="tab"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="kalo-feature-off"]').exists()).toBe(
        false
      );
    });

    it('shows the feature-off page when every module is off', async () => {
      const wrapper = await mountWith(MarketingIndex, {
        features: {},
        stubs: MARKETING_STUBS,
      });
      expect(wrapper.find('[data-test="kalo-feature-off"]').exists()).toBe(
        true
      );
    });
  });

  describe('Bình luận, Chiến dịch and Thương hiệu pages', () => {
    it('Bình luận wraps the comment automation settings in KaloPage', async () => {
      const wrapper = await mountWith(CommentsPage, { stubs: MARKETING_STUBS });
      expect(wrapper.find('[data-test-id="kalo-page"]').exists()).toBe(true);
      expect(wrapper.find('h1').text()).toBe('Bình luận');
      expect(wrapper.find('[data-test="comments-body"]').exists()).toBe(true);
    });

    it('Chiến dịch shows the campaign lists and loads their data', async () => {
      const load = vi.fn();
      const wrapper = await mountWith(CampaignsPage, {
        stubs: MARKETING_STUBS,
        actions: { 'campaigns/get': load },
      });
      expect(wrapper.find('h1').text()).toBe('Chiến dịch');
      expect(wrapper.find('[data-test="campaigns-body"]').exists()).toBe(true);
      expect(load).toHaveBeenCalled();
    });

    it('Thương hiệu has profile, calendar and ideas tabs', async () => {
      const wrapper = await mountWith(BrandPage, { stubs: MARKETING_STUBS });
      expect(wrapper.find('h1').text()).toBe('Thương hiệu');
      expect(wrapper.find('[data-test="brand-body"]').exists()).toBe(true);
      const tabButtons = wrapper.findAll('[role="tab"]');
      expect(tabButtons.map(t => t.text())).toEqual([
        'Hồ sơ thương hiệu',
        'Lịch nội dung',
        'Ý tưởng nội dung',
      ]);
      await tabButtons[1].trigger('click');
      expect(wrapper.find('[data-test="calendar-body"]').exists()).toBe(true);
      await tabButtons[2].trigger('click');
      expect(wrapper.find('[data-test="ideas-body"]').exists()).toBe(true);
    });
  });

  describe('campaign pages channel chips (kalo_extra_channels)', () => {
    const chips = wrapper =>
      wrapper
        .findAll('nav a')
        .map(a => a.attributes('href'))
        .filter(href => href.includes('campaigns_'));

    it('hides SMS and WhatsApp when extra channels are off', async () => {
      const wrapper = await mountWith(CampaignsPageRouteView, {
        features: { ...ALL_ON, kalo_extra_channels: false },
        stubs: { RouterView: true },
      });
      expect(chips(wrapper)).toEqual([
        '/app/accounts/1/campaigns_livechat_index',
      ]);
    });

    it('shows them when on', async () => {
      const wrapper = await mountWith(CampaignsPageRouteView, {
        stubs: { RouterView: true },
      });
      expect(chips(wrapper)).toHaveLength(3);
    });
  });

  describe('add-inbox channel list (kalo_extra_channels)', () => {
    const keys = wrapper =>
      wrapper
        .findAllComponents({ name: 'ChannelItem' })
        .map(item => item.props('channel').key);
    const options = features => ({
      features,
      getters: { 'globalConfig/get': () => ({}) },
      stubs: {
        ChannelItem: {
          name: 'ChannelItem',
          props: ['channel', 'enabledFeatures'],
          template: '<div />',
        },
      },
    });

    // TikTok is listed only when its app is configured (not in this spec).
    it('keeps Zalo cá nhân, Facebook, Instagram and website only when off', async () => {
      const wrapper = await mountWith(
        ChannelList,
        options({ ...ALL_ON, kalo_extra_channels: false })
      );
      expect(keys(wrapper)).toEqual([
        'zalo_personal',
        'facebook',
        'instagram',
        'website',
      ]);
    });

    it('lists the extra channels when on', async () => {
      const wrapper = await mountWith(ChannelList, options(ALL_ON));
      expect(keys(wrapper)).toEqual(
        expect.arrayContaining([
          'zalo',
          'whatsapp',
          'telegram',
          'line',
          'email',
          'sms',
          'api',
        ])
      );
    });
  });

  describe('Integrations page (kalo_advanced_automation)', () => {
    const INTEGRATIONS = [
      { id: 'webhook', name: 'Webhooks' },
      { id: 'dashboard_apps', name: 'Dashboard Apps' },
      { id: 'slack', name: 'Slack' },
    ];
    const ids = wrapper =>
      wrapper
        .findAllComponents({ name: 'IntegrationItem' })
        .map(item => item.props('id'));
    const options = features => ({
      features,
      getters: {
        'integrations/getUIFlags': () => ({ isFetching: false }),
        'integrations/getAppIntegrations': () => INTEGRATIONS,
      },
      actions: { 'integrations/get': vi.fn() },
      stubs: {
        BaseSettingsHeader: true,
        IntegrationItem: {
          name: 'IntegrationItem',
          props: ['id', 'logo', 'name', 'description', 'enabled'],
          template: '<div />',
        },
      },
    });

    it('hides webhooks and dashboard apps when off', async () => {
      const wrapper = await mountWith(
        IntegrationsIndex,
        options({ ...ALL_ON, kalo_advanced_automation: false })
      );
      expect(ids(wrapper)).toEqual(['slack']);
    });

    it('shows them when on', async () => {
      const wrapper = await mountWith(IntegrationsIndex, options(ALL_ON));
      expect(ids(wrapper)).toEqual(['webhook', 'dashboard_apps', 'slack']);
    });
  });
});
