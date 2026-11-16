import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsoleOverview from './ConsoleOverview.vue';

vi.mock('dashboard/api/kchat/console', () => ({
  default: { overview: vi.fn() },
}));

const overview = {
  shops: 140,
  revenue_month: 74200000,
  expiring_7d: 9,
  unmatched_payments: 2,
  recent_payments: [
    {
      id: 1,
      amount: 699000,
      status: 'applied',
      account_name: 'Nhà Mây',
      description: 'KALO 1',
      received_at: '2026-11-16T07:10:00Z',
    },
    {
      id: 2,
      amount: 299000,
      status: 'unmatched',
      account_name: null,
      description: 'chuyen tien',
      received_at: '2026-11-16T04:10:00Z',
    },
  ],
  shops_by_plan: { starter: 71, growth: 46, enterprise: 11 },
};

const mountPage = () =>
  mount(ConsoleOverview, {
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  });

describe('ConsoleOverview', () => {
  beforeEach(() => {
    consoleAPI.overview.mockResolvedValue({ data: overview });
  });

  it('shows five KPI numbers from /overview', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const kpis = wrapper.findAll('[data-testid="kpi"]').map(k => k.text());
    expect(kpis).toHaveLength(5);
    expect(kpis[0]).toContain('140');
    expect(kpis[1]).toContain('74.200.000đ');
    expect(kpis[2]).toContain('9');
    expect(kpis[3]).toContain('2');
    expect(kpis[4]).toContain('128');
  });

  it('lists latest payments with status chips', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Nhà Mây');
    expect(text).toContain('699.000đ');
    expect(text).toContain('Đã kích hoạt');
    expect(text).toContain('Cần ghép shop');
  });

  it('shows shops by plan', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const plans = wrapper
      .findAll('[data-testid="plan-row"]')
      .map(r => r.text());
    expect(plans).toHaveLength(3);
    expect(plans[0]).toContain('71');
    expect(plans[2]).toContain('11');
  });

  it('shows a loading state until data arrives', async () => {
    consoleAPI.overview.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Đang tải');
    expect(wrapper.findAll('[data-testid="kpi"]')).toHaveLength(0);
  });

  it('does not throw on an unknown payment status', async () => {
    consoleAPI.overview.mockResolvedValue({
      data: {
        ...overview,
        recent_payments: [
          { ...overview.recent_payments[0], status: 'refunded' },
        ],
      },
    });
    const wrapper = mountPage();
    await flushPromises();
    const chip = wrapper.find('[data-testid="status-chip"]');
    expect(chip.text()).toBe('refunded');
    expect(chip.classes()).toContain('bg-n-slate-3');
  });
});
