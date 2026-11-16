import { mount } from '@vue/test-utils';
import SalesChart from '../SalesChart.vue';
import { createPageTestEnv } from './kaloPageTestEnv';

describe('SalesChart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('renders one bar per day and highlights today', () => {
    const daily = [
      { date: '2026-11-10', revenue: 100000 },
      { date: '2026-11-11', revenue: 0 },
      { date: '2026-11-12', revenue: 300000 },
      { date: '2026-11-13', revenue: 200000 },
      { date: '2026-11-14', revenue: 150000 },
      { date: '2026-11-15', revenue: 50000 },
      { date: '2026-11-16', revenue: 400000 },
    ];
    const { plugins } = createPageTestEnv();
    const wrapper = mount(SalesChart, {
      props: { daily },
      global: { plugins },
    });
    const bars = wrapper.findAll('[data-test="bar"]');
    expect(bars).toHaveLength(7);
    const today = wrapper.findAll('[data-test="bar"][data-today="true"]');
    expect(today).toHaveLength(1);
    expect(today[0].attributes('data-date')).toBe('2026-11-16');
    expect(wrapper.text()).toContain('T2');
    expect(wrapper.text()).toContain('1.200.000đ');
  });
});
