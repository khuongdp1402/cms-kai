import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import reportsAPI from 'dashboard/api/kchat/reports';
import OverviewIndex from '../OverviewIndex.vue';

vi.mock('dashboard/api/kchat/reports', () => ({
  default: {
    qualityOverview: vi.fn(),
    brandsOverview: vi.fn(),
  },
}));

const mountOverview = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/app/accounts/:accountId/overview',
        name: 'kalo_overview',
        component: { template: '<div />' },
      },
      {
        path: '/app/accounts/:accountId/orders',
        name: 'kalo_orders',
        component: { template: '<div />' },
      },
      {
        path: '/app/accounts/:accountId/pos',
        name: 'kalo_pos',
        component: { template: '<div />' },
      },
      {
        path: '/app/accounts/:accountId/marketing',
        name: 'kalo_marketing',
        component: { template: '<div />' },
      },
      {
        path: '/app/accounts/:accountId/dashboard',
        name: 'home',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'kalo_overview', params: { accountId: 1 } });
  const store = createStore({ getters: { getCurrentAccountId: () => 1 } });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return mount(OverviewIndex, {
    global: { plugins: [router, store, i18n] },
  });
};

describe('OverviewIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportsAPI.brandsOverview.mockResolvedValue({ data: { brands: [] } });
  });

  it('renders quality KPIs, SKU metrics, and action queue from qualityOverview API', async () => {
    reportsAPI.qualityOverview.mockResolvedValue({
      data: {
        range: '7d',
        kpis: {
          revenue: 4500000,
          orders_count: 9,
          aov: 500000,
          pending_qr_count: 2,
          conversations_count: 20,
          conversations_with_orders: 9,
          chat_to_order_cvr_pct: 45.0,
          avg_first_response_seconds: 125,
          sla_under_5m_pct: 92.5,
          waiting_now_count: 2,
          waiting_over_15m_count: 1,
          social_comments_count: 8,
          phones_protected_count: 3,
          calendar_scheduled_count: 4,
          calendar_total_count: 6,
          ai_jobs_approved_count: 2,
        },
        sku_quality: [
          {
            product_id: 1,
            name: 'Nến trầm',
            sold_qty: 10,
            cancelled_qty: 2,
            cancel_rate_pct: 16.7,
            revenue: 2500000,
            stock: 2,
            needs_attention: true,
          },
        ],
        channel_quality: [
          {
            channel: 'zalo_personal',
            conversations_count: 15,
            orders_count: 7,
            cvr_pct: 46.7,
            waiting_over_15m_count: 1,
          },
        ],
        action_queue: [
          { key: 'waiting_over_15m', count: 1, route: 'home', tone: 'warn' },
        ],
      },
    });

    const wrapper = await mountOverview();
    await flushPromises();

    expect(wrapper.find('[data-test="overview-kpi-revenue"]').text()).toContain(
      '9 đơn thành công'
    );
    expect(wrapper.find('[data-test="overview-kpi-cvr"]').text()).toContain(
      '45%'
    );
    expect(wrapper.find('[data-test="overview-kpi-sla"]').text()).toContain(
      '2p 5s'
    );
    expect(wrapper.find('[data-test="overview-kpi-content"]').text()).toContain(
      '3 SĐT bình luận đã ẩn'
    );
    expect(wrapper.text()).toContain('Nến trầm');
    expect(wrapper.text()).toContain('Cần rà soát');
    expect(
      wrapper.find('[data-test="queue-item-waiting_over_15m"]').exists()
    ).toBe(true);
  });

  // Guided UX §2: KaloPage header (one primary action) and KaloCard groups.
  it('sits in the shared page frame with cards and one primary action', async () => {
    reportsAPI.qualityOverview.mockResolvedValue({
      data: {
        kpis: {},
        sku_quality: [],
        channel_quality: [],
        action_queue: [],
      },
    });
    reportsAPI.brandsOverview.mockResolvedValue({ data: { brands: [] } });
    const wrapper = await mountOverview();
    await flushPromises();
    expect(wrapper.find('[data-test-id="kalo-page-header"] h1').exists()).toBe(
      true
    );
    expect(
      wrapper.find('[data-test-id="kalo-page-description"]').text()
    ).toBeTruthy();
    expect(
      wrapper.findAll('[data-test-id="kalo-card"]').length
    ).toBeGreaterThanOrEqual(3);
    const primaries = wrapper
      .find('[data-test-id="kalo-page-actions"]')
      .findAll('.bg-n-brand');
    expect(primaries).toHaveLength(1);
  });

  it('reloads data when range tab is changed and shows error state on failure', async () => {
    reportsAPI.qualityOverview
      .mockResolvedValueOnce({
        data: {
          range: '7d',
          kpis: {},
          sku_quality: [],
          channel_quality: [],
          action_queue: [],
        },
      })
      .mockRejectedValueOnce(new Error('network'));

    const wrapper = await mountOverview();
    await flushPromises();
    expect(wrapper.find('[data-test="overview-queue-empty"]').exists()).toBe(
      true
    );

    await wrapper.find('[data-test="overview-range-month"]').trigger('click');
    await flushPromises();
    expect(reportsAPI.qualityOverview).toHaveBeenLastCalledWith('month');
    expect(wrapper.find('[data-test="overview-error"]').exists()).toBe(true);
  });
});
