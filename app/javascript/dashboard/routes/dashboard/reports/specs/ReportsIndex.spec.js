import { mount, flushPromises } from '@vue/test-utils';
import ReportsIndex from '../ReportsIndex.vue';
import reportsAPI from 'dashboard/api/kchat/reports';
import { createPageTestEnv } from './kaloPageTestEnv';

vi.mock('dashboard/api/kchat/reports', () => ({
  default: { summary: vi.fn() },
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
});
