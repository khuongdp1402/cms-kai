import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { kaloFeatureGetters } from 'dashboard/helper/specs/kaloFeatureGetters';
import reportsAPI from 'dashboard/api/kchat/reports';
import ReportsIndex from '../ReportsIndex.vue';
import MarketingFunnelSection from '../MarketingFunnelSection.vue';
import OverviewIndex from '../../overview/OverviewIndex.vue';
import { createPageTestEnv } from './kaloPageTestEnv';

vi.mock('dashboard/api/kchat/reports', () => ({
  default: {
    summary: vi.fn(),
    funnel: vi.fn(),
    brandsOverview: vi.fn(),
    qualityOverview: vi.fn(),
  },
}));

// API payloads of the reported case (1 website chat with QR order #1001 not yet
// paid + 1 POS cash sale #1002), as returned by Kchat::Metrics.
const SUMMARY = {
  range: 'today',
  today: '2026-11-20',
  revenue: 90000,
  orders_count: 1,
  new_orders_count: 2,
  new_contacts: 1,
  waiting_messages: 0,
  channels: [
    { channel: 'pos', orders: 1, share_pct: 50 },
    { channel: 'web_widget', orders: 1, share_pct: 50 },
  ],
  daily: [{ date: '2026-11-20', revenue: 90000 }],
  top_products: [],
};

const FUNNEL = {
  range: 'today',
  totals: {
    conversations_count: 1,
    converted_conversations_count: 1,
    orders_count: 1,
    counter_orders_count: 1,
    conversion_pct: 100.0,
    revenue: 90000,
    avg_order_value: 90000,
  },
  channel_funnel: [
    {
      channel: 'web_widget',
      chat: true,
      conversations: 1,
      converted_conversations: 1,
      orders: 1,
      conversion_pct: 100.0,
      revenue: 0,
      avg_order_value: 0,
    },
    {
      channel: 'pos',
      chat: false,
      conversations: 0,
      converted_conversations: 0,
      orders: 1,
      conversion_pct: null,
      revenue: 90000,
      avg_order_value: 90000,
    },
  ],
  campaigns: [],
  agents: [],
};

const QUALITY = {
  range: 'today',
  kpis: {
    revenue: 90000,
    orders_count: 1,
    aov: 90000,
    new_orders_count: 2,
    pending_qr_count: 1,
    cancelled_orders_count: 0,
    conversations_count: 1,
    conversations_with_orders: 1,
    chat_orders_count: 2, // a second order on the same conversation
    chat_to_order_cvr_pct: 100.0,
    avg_first_response_seconds: null,
    sla_under_5m_pct: null,
    waiting_now_count: 0,
    waiting_over_15m_count: 0,
    social_comments_count: 0,
    phones_protected_count: 0,
    calendar_scheduled_count: 0,
    calendar_total_count: 0,
    ai_jobs_approved_count: 0,
  },
  sku_quality: [],
  channel_quality: [
    {
      channel: 'web_widget',
      chat: true,
      conversations_count: 1,
      orders_count: 1,
      cvr_pct: 100.0,
      waiting_over_15m_count: 0,
    },
    {
      channel: 'pos',
      chat: false,
      conversations_count: 0,
      orders_count: 1,
      cvr_pct: null,
      waiting_over_15m_count: 0,
    },
  ],
  action_queue: [],
};

const mountWithI18n = (component, props = {}) => {
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return mount(component, { props, global: { plugins: [i18n] } });
};

const mountOverview = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['kalo_overview', 'kalo_orders', 'kalo_pos', 'home'].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  await router.push({ name: 'kalo_overview', params: { accountId: 1 } });
  const store = createStore({
    getters: { getCurrentAccountId: () => 1, ...kaloFeatureGetters() },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(OverviewIndex, {
    global: { plugins: [router, store, i18n] },
  });
  await flushPromises();
  return wrapper;
};

describe('Kalo metrics are consistent across Báo cáo and Tổng quan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportsAPI.summary.mockResolvedValue({ data: SUMMARY });
    reportsAPI.funnel.mockResolvedValue({ data: FUNNEL });
    reportsAPI.brandsOverview.mockResolvedValue({ data: { brands: [] } });
    reportsAPI.qualityOverview.mockResolvedValue({ data: QUALITY });
  });

  it('Báo cáo shows 2 new orders (every non-cancelled order) and explains each KPI', async () => {
    const { plugins, router } = createPageTestEnv();
    await router.push({ name: 'kalo_orders', params: { accountId: 1 } });
    const wrapper = mount(ReportsIndex, { global: { plugins } });
    await flushPromises();

    const orders = wrapper.find('[data-test="report-kpi-ORDERS"]');
    expect(orders.text()).toContain('2');
    expect(orders.attributes('title')).toBe(viMessages.KALO_METRICS.NEW_ORDERS);
    expect(
      wrapper.find('[data-test="report-kpi-REVENUE"]').attributes('title')
    ).toBe(viMessages.KALO_METRICS.REVENUE);
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false);
  });

  it('funnel: the overall rate matches the chat row; the POS row has no rate and its own label', () => {
    const wrapper = mountWithI18n(MarketingFunnelSection, { funnel: FUNNEL });
    expect(wrapper.text()).toContain('Tỷ lệ chốt chung: 100%');
    const rows = wrapper.findAll('[data-test="funnel-channel"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Website');
    expect(rows[0].text()).toContain('100%');
    expect(rows[1].text()).toContain('Bán tại quầy');
    expect(rows[1].text()).not.toContain('%');
    expect(rows[1].attributes('title')).toBe(
      viMessages.KALO_METRICS.COUNTER_ROW
    );
    expect(
      wrapper.find('[data-test="funnel-overall-rate"]').attributes('title')
    ).toBe(viMessages.KALO_METRICS.CHAT_CONVERSION);
  });

  it('Tổng quan shows 1 chat order for 1 conversation at 100% and no CVR on the POS row', async () => {
    const wrapper = await mountOverview();
    const cvr = wrapper.find('[data-test="overview-kpi-cvr"]');
    expect(cvr.text()).toContain('100%');
    expect(cvr.text()).toContain('1 đơn / 1 hội thoại');
    expect(cvr.attributes('title')).toBe(
      viMessages.KALO_METRICS.CHAT_CONVERSION
    );
    expect(
      wrapper.find('[data-test="overview-kpi-revenue"]').attributes('title')
    ).toBe(viMessages.KALO_METRICS.REVENUE);
    const channelRows = wrapper.findAll('[data-test="overview-channel-row"]');
    expect(channelRows).toHaveLength(2);
    expect(channelRows[0].text()).toContain('CVR 100%');
    expect(channelRows[1].text()).toContain('1 đơn');
    expect(channelRows[1].text()).not.toContain('CVR');
  });
});
