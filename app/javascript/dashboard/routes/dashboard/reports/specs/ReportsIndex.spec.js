import { mount, flushPromises } from '@vue/test-utils';
import ReportsIndex from '../ReportsIndex.vue';
import reportsAPI from 'dashboard/api/kchat/reports';
import { createPageTestEnv } from './kaloPageTestEnv';

vi.mock('dashboard/api/kchat/reports', () => ({
  default: {
    summary: vi.fn(),
    funnel: vi.fn(),
    brandsOverview: vi.fn(),
  },
}));

const summary = (overrides = {}) => ({
  data: {
    range: 'today',
    revenue: 6821000,
    orders_count: 14,
    new_contacts: 9,
    waiting_messages: 4,
    channels: [
      { channel: 'zalo', orders: 6, share_pct: 43 },
      { channel: 'pos', orders: 8, share_pct: 57 },
    ],
    daily: [{ date: '2026-11-16', revenue: 6821000 }],
    top_products: [
      { name: 'Nến gỗ đàn hương', sold: 21, revenue: 3969000, stock: 5 },
      { name: 'Cốc gốm', sold: 14, revenue: 2030000, stock: 38 },
      { name: 'Quà tặng', sold: 1, revenue: 50000, stock: null },
    ],
    ...overrides,
  },
});

const mountPage = async () => {
  const { plugins, router } = createPageTestEnv();
  await router.push({ name: 'kalo_orders', params: { accountId: 1 } });
  const wrapper = mount(ReportsIndex, { global: { plugins } });
  await flushPromises();
  return wrapper;
};

describe('ReportsIndex', () => {
  beforeEach(() => {
    reportsAPI.summary.mockReset();
    reportsAPI.summary.mockResolvedValue(summary());
    reportsAPI.funnel.mockReset();
    reportsAPI.funnel.mockResolvedValue({ data: null });
    reportsAPI.brandsOverview.mockReset();
    reportsAPI.brandsOverview.mockResolvedValue({ data: { brands: [] } });
  });

  it('switching Hôm nay, 7 ngày, Tháng này refetches with range today, 7d, month', async () => {
    const wrapper = await mountPage();
    expect(reportsAPI.summary).toHaveBeenLastCalledWith('today');
    const tab = label =>
      wrapper.findAll('[role="tab"]').find(t => t.text() === label);
    await tab('7 ngày').trigger('click');
    expect(reportsAPI.summary).toHaveBeenLastCalledWith('7d');
    await tab('Tháng này').trigger('click');
    expect(reportsAPI.summary).toHaveBeenLastCalledWith('month');
    await tab('Hôm nay').trigger('click');
    expect(reportsAPI.summary).toHaveBeenLastCalledWith('today');
  });

  it('shows the KPIs, channel share and a sắp hết chip for stock of 5 or less', async () => {
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain('6.821.000đ');
    expect(wrapper.text()).toContain('57%');
    const chips = wrapper.findAll('[data-test="low-stock"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toContain('sắp hết');
    expect(wrapper.text()).not.toMatch(/ROAS|MER|CAC/);
  });

  it('shows 0đ and an empty-state sentence when there are no orders', async () => {
    reportsAPI.summary.mockResolvedValue(
      summary({
        revenue: 0,
        orders_count: 0,
        new_contacts: 0,
        waiting_messages: 0,
        channels: [],
        daily: [],
        top_products: [],
      })
    );
    const wrapper = await mountPage();
    expect(wrapper.text()).toContain('0đ');
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="empty"]').text()).toBe(
      'Chưa có đơn nào trong khoảng này. Tạo đơn đầu tiên để thấy báo cáo.'
    );
    expect(wrapper.find('[data-test="bar"]').exists()).toBe(false);
  });

  it('ignores a slower earlier response so the screen matches the selected range', async () => {
    let resolveFirst;
    reportsAPI.summary
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirst = resolve;
        })
      )
      .mockResolvedValueOnce(summary({ range: 'month', revenue: 9000000 }));
    const { plugins, router } = createPageTestEnv();
    await router.push({ name: 'kalo_orders', params: { accountId: 1 } });
    const wrapper = mount(ReportsIndex, { global: { plugins } });
    await wrapper
      .findAll('[role="tab"]')
      .find(t => t.text() === 'Tháng này')
      .trigger('click');
    await flushPromises();
    resolveFirst(summary({ range: 'today', revenue: 1234 }));
    await flushPromises();
    expect(wrapper.text()).toContain('9.000.000đ');
    expect(wrapper.text()).not.toContain('1.234đ');
  });

  it('renders marketing funnel tables and cross-brand switcher when available', async () => {
    reportsAPI.funnel.mockResolvedValue({
      data: {
        range: 'today',
        totals: {
          conversations_count: 10,
          orders_count: 3,
          conversion_pct: 30.0,
          revenue: 1500000,
          avg_order_value: 500000,
        },
        channel_funnel: [
          {
            channel: 'facebook_page',
            conversations: 10,
            orders: 3,
            conversion_pct: 30.0,
            revenue: 1500000,
            avg_order_value: 500000,
          },
        ],
        campaigns: [
          {
            campaign: 'tet_2027',
            source: 'facebook_ads',
            conversations: 6,
            orders: 2,
            conversion_pct: 33.3,
            revenue: 1000000,
          },
        ],
        agents: [
          {
            agent_id: 7,
            name: 'Ngọc Mai',
            conversations: 5,
            orders: 2,
            conversion_pct: 40.0,
            revenue: 1000000,
          },
        ],
      },
    });
    reportsAPI.brandsOverview.mockResolvedValue({
      data: {
        brands: [
          {
            id: 1,
            name: 'Nến An Nhiên',
            revenue: 1500000,
            orders_count: 3,
            waiting_messages: 2,
          },
          {
            id: 2,
            name: 'Gốm Xinh',
            revenue: 400000,
            orders_count: 1,
            waiting_messages: 0,
          },
        ],
      },
    });

    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="multi-brand-bar"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="brand-card"]')).toHaveLength(2);
    expect(wrapper.find('[data-test="marketing-funnel"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="funnel-campaign"]').text()).toContain(
      'tet_2027'
    );
    expect(wrapper.find('[data-test="funnel-agent"]').text()).toContain(
      'Ngọc Mai'
    );
    expect(wrapper.text()).not.toMatch(/ROAS|MER|CAC/);
  });
});
