import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import CampaignsPage from '../../CampaignsPage.vue';
import CampaignResults from '../CampaignResults.vue';
import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

vi.mock('dashboard/api/kchat/broadcasts', () => ({
  default: {
    list: vi.fn(),
    results: vi.fn(),
    destroyDraft: vi.fn(),
    audience: vi.fn(),
  },
}));
vi.mock('dashboard/api/kchat/brandGrowth', () => ({
  default: { aiHealth: vi.fn(() => Promise.reject(new Error('off'))) },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const ROWS = [
  { id: 'd', title: 'Nháp Tết', status: 'draft', goal: 'sales', labels: [] },
  {
    id: 's',
    title: 'Hẹn cuối tuần',
    status: 'scheduled',
    scheduled_at: '2026-12-05T02:00:00Z',
    inbox_name: 'Zalo Shop',
    channel_type: 'zalo_personal',
  },
  { id: 'p', title: 'Đang chạy', status: 'processing' },
  {
    id: 'c',
    title: 'Ra mắt nến',
    status: 'completed',
    goal: 'launch',
    inbox_name: 'Fanpage',
    channel_type: 'facebook_page',
    sent_count: 8,
    eligible_count: 10,
    failed_count: 2,
    delivery_failed_count: 1,
  },
  { id: 'f', title: 'Kênh mất', status: 'failed' },
  { id: 'g', title: 'Đang chạy job', status: 'sending' },
  {
    id: 'e',
    title: 'Hết hạn',
    status: 'failed',
    error: 'subscription_expired',
  },
];

const mountPage = async ({
  role = 'administrator',
  component = CampaignsPage,
  props = {},
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/accounts/:accountId/marketing/campaigns',
        name: 'kalo_campaigns',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push('/app/accounts/1/marketing/campaigns');
  const store = createStore({
    getters: {
      getCurrentRole: () => role,
      'accounts/getAccount': () => () => ({ id: 1, name: 'Hoa Mai' }),
      'accounts/isFeatureEnabledonAccount': () => () => true,
      'globalConfig/isOnChatwootCloud': () => false,
      'customViews/getContactCustomViews': () => [],
      'labels/getLabels': () => [],
    },
    actions: {
      'campaigns/get': vi.fn(),
      'labels/get': vi.fn(),
      'inboxes/get': vi.fn(),
      'customViews/get': vi.fn(),
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(component, {
    props,
    attachTo: document.body,
    global: {
      plugins: [router, store, i18n],
      stubs: {
        RouterLink: RouterLinkStub,
        // The website greetings section (live chat campaigns) of the page.
        WebsiteCampaignsCard: { template: '<div data-test="livechat" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const RESULTS = (overrides = {}) => ({
  data: {
    broadcast: {
      id: 'c',
      title: 'Ra mắt nến',
      status: 'completed',
      channel_type: 'facebook_page',
      requires_24h_window: true,
      campaign_tag: 'ra_mat_nen',
      ...overrides.broadcast,
    },
    results: {
      eligible_count: 10,
      sent_count: 8,
      failed_count: 2,
      delivery_failed_count: 1,
      skipped_24h_count: 4,
      read_supported: true,
      read_count: 5,
      replied_count: 3,
      orders_count: 1,
      revenue: 250000,
      attribution_days: 7,
      ...overrides.results,
    },
  },
});

describe('Chiến dịch page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    broadcastsAPI.list.mockResolvedValue({ data: { broadcasts: ROWS } });
    broadcastsAPI.results.mockResolvedValue(RESULTS());
    broadcastsAPI.audience.mockResolvedValue({
      data: { audience_count: 0, channels: [] },
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists campaigns with a status chip for each state and only stored numbers', async () => {
    const wrapper = await mountPage();
    const chips = wrapper
      .findAll('[data-test="campaign-status"]')
      .map(chip => chip.text());
    expect(chips).toEqual([
      'Nháp',
      'Đã hẹn',
      'Đang gửi',
      'Đã gửi',
      'Lỗi',
      'Đang gửi',
      'Lỗi',
    ]);
    const rows = wrapper.findAll('[data-test="campaign-row"]');
    expect(rows[6].text()).toContain('gói dùng thử đã hết hạn');
    expect(rows[3].text()).toContain('Đã gửi 7/10 khách');
    expect(rows[3].text()).toContain('3 lỗi');
    expect(rows[1].text()).toContain('Gửi lúc');
    expect(rows[1].text()).toContain('09:00');
    expect(wrapper.findAll('[data-test="campaign-row-numbers"]')).toHaveLength(
      1
    );
    expect(wrapper.find('[data-test="livechat"]').exists()).toBe(true);
  });

  it('renders the page targets of the Chiến dịch tour', async () => {
    const wrapper = await mountPage();
    // campaign-website lives in WebsiteCampaignsCard (stubbed here, own spec).
    expectTourTargets(wrapper, 'campaigns', [
      'campaign-create',
      'campaign-list',
    ]);
  });

  it('shows the create button with its tour anchor for admins and opens the wizard', async () => {
    const wrapper = await mountPage();
    const create = wrapper.find('[data-tour="campaign-create"]');
    expect(create.text()).toBe('Tạo chiến dịch');
    await create.trigger('click');
    await flushPromises();
    expect(
      document.querySelector('[data-test="campaign-wizard"]')
    ).not.toBeNull();
  });

  it('is read-only for agents', async () => {
    const wrapper = await mountPage({ role: 'agent' });
    expect(wrapper.find('[data-test="campaign-create"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="campaign-readonly"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="campaign-row-delete"]').exists()).toBe(
      false
    );
  });

  it('opens a draft in the wizard and a sent campaign in the results drawer', async () => {
    const wrapper = await mountPage();
    const rows = wrapper.findAll('[data-test="campaign-row-open"]');
    await rows[0].trigger('click');
    await flushPromises();
    expect(document.querySelector('[data-test="campaign-title"]').value).toBe(
      'Nháp Tết'
    );
    wrapper.findComponent({ name: 'CampaignWizard' }).vm.$emit('close');
    await flushPromises();

    await wrapper
      .findAll('[data-test="campaign-row-open"]')[3]
      .trigger('click');
    await flushPromises();
    expect(broadcastsAPI.results).toHaveBeenCalledWith('c');
    expect(
      document.querySelector('[data-test="campaign-results-drawer"]')
    ).not.toBeNull();
  });

  it('deletes a draft only after a second click', async () => {
    broadcastsAPI.destroyDraft.mockResolvedValue({});
    const wrapper = await mountPage();
    const del = wrapper.find('[data-test="campaign-row-delete"]');
    await del.trigger('click');
    expect(broadcastsAPI.destroyDraft).not.toHaveBeenCalled();
    expect(del.text()).toBe('Bấm lần nữa để xóa');
    await del.trigger('click');
    await flushPromises();
    expect(broadcastsAPI.destroyDraft).toHaveBeenCalledWith('d');
    expect(wrapper.findAll('[data-test="campaign-row"]')).toHaveLength(6);
  });

  it('explains a stalled run in the list', async () => {
    broadcastsAPI.list.mockResolvedValue({
      data: {
        broadcasts: [
          { id: 'x', title: 'Treo', status: 'failed', error: 'stalled' },
        ],
      },
    });
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="campaign-row-error"]').text()).toContain(
      'Lần gửi bị gián đoạn'
    );
  });

  it('shows the empty state with a create button', async () => {
    broadcastsAPI.list.mockResolvedValue({ data: { broadcasts: [] } });
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="campaign-empty"]').text()).toContain(
      'Chưa có chiến dịch nào'
    );
    expect(wrapper.find('[data-test="campaign-empty-create"]').exists()).toBe(
      true
    );
  });
});

describe('CampaignResults', () => {
  beforeEach(() => vi.clearAllMocks());

  const tileKeys = wrapper =>
    wrapper
      .findAll('[data-test^="campaign-result-"]')
      .map(el => el.attributes('data-test'))
      .filter(key => !key.includes('status') && !key.includes('refresh'));

  it('shows read counts and the 24h skip only where the channel reports them', async () => {
    broadcastsAPI.results.mockResolvedValue(RESULTS());
    const wrapper = await mountPage({
      component: CampaignResults,
      props: { broadcastId: 'c' },
    });
    expect(tileKeys(wrapper)).toEqual([
      'campaign-result-eligible',
      'campaign-result-sent',
      'campaign-result-failed_count',
      'campaign-result-skipped_24h',
      'campaign-result-read',
      'campaign-result-replied',
      'campaign-result-orders',
      'campaign-result-revenue',
    ]);
    expect(
      wrapper.find('[data-test="campaign-result-failed_count"]').text()
    ).toContain('3');
    expect(wrapper.find('[data-test="campaign-result-read"]').text()).toContain(
      '5'
    );
    // 8 handed to the channel, 1 rejected by it afterwards.
    expect(wrapper.find('[data-test="campaign-result-sent"]').text()).toContain(
      '7'
    );
    expect(
      wrapper.find('[data-test="campaign-result-revenue"]').text()
    ).toContain('250.000đ');
    expect(
      wrapper.find('[data-test="campaign-results-no-read"]').exists()
    ).toBe(false);
    expect(wrapper.find('[data-tour="campaign-results"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Đơn tạo trong 7 ngày sau khi gửi');
  });

  it('omits "Đã xem" and explains why on Zalo', async () => {
    broadcastsAPI.results.mockResolvedValue(
      RESULTS({
        broadcast: {
          channel_type: 'zalo_personal',
          requires_24h_window: false,
        },
        results: { read_supported: false, read_count: null },
      })
    );
    const wrapper = await mountPage({
      component: CampaignResults,
      props: { broadcastId: 'c' },
    });
    expect(tileKeys(wrapper)).not.toContain('campaign-result-read');
    expect(tileKeys(wrapper)).not.toContain('campaign-result-skipped_24h');
    expect(
      wrapper.find('[data-test="campaign-results-no-read"]').text()
    ).toContain('Zalo cá nhân không báo trạng thái đã xem');
  });

  it('explains a stalled run in the results', async () => {
    broadcastsAPI.results.mockResolvedValue(
      RESULTS({ broadcast: { status: 'failed', error: 'stalled' } })
    );
    const wrapper = await mountPage({
      component: CampaignResults,
      props: { broadcastId: 'c' },
    });
    expect(
      wrapper.find('[data-test="campaign-results-failed"]').text()
    ).toContain('Lần gửi bị gián đoạn');
  });

  it('shows no numbers for a scheduled campaign', async () => {
    broadcastsAPI.results.mockResolvedValue(
      RESULTS({
        broadcast: {
          status: 'scheduled',
          scheduled_at: '2026-12-05T02:00:00Z',
        },
      })
    );
    const wrapper = await mountPage({
      component: CampaignResults,
      props: { broadcastId: 'c' },
    });
    expect(wrapper.find('[data-test="campaign-results-tiles"]').exists()).toBe(
      false
    );
    expect(
      wrapper.find('[data-test="campaign-results-scheduled"]').text()
    ).toContain('09:00');
  });

  it('refreshes on demand', async () => {
    broadcastsAPI.results.mockResolvedValue(RESULTS());
    const wrapper = await mountPage({
      component: CampaignResults,
      props: { broadcastId: 'c' },
    });
    await wrapper
      .find('[data-test="campaign-results-refresh"]')
      .trigger('click');
    await flushPromises();
    expect(broadcastsAPI.results).toHaveBeenCalledTimes(2);
  });
});
