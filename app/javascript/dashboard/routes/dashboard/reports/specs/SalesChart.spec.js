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
      props: { daily, today: '2026-11-16' },
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

  const mountWith = (daily, today) =>
    mount(SalesChart, {
      props: { daily, today },
      global: { plugins: createPageTestEnv().plugins },
    });
  const week = ['2026-11-14', '2026-11-15', '2026-11-16'].map(date => ({
    date,
    revenue: 1000,
  }));

  it('highlights the bar whose date is the account today, even when it is not the last bar', () => {
    const wrapper = mountWith(week, '2026-11-15');
    const today = wrapper.findAll('[data-today="true"]');
    expect(today).toHaveLength(1);
    expect(today[0].attributes('data-date')).toBe('2026-11-15');
  });

  it('highlights nothing when today is not among the bars (data ends yesterday) or unknown', () => {
    const stale = week.slice(0, 2);
    expect(
      mountWith(stale, '2026-11-16').findAll('[data-today="true"]')
    ).toHaveLength(0);
    expect(
      mountWith(week, undefined).findAll('[data-today="true"]')
    ).toHaveLength(0);
  });
});
