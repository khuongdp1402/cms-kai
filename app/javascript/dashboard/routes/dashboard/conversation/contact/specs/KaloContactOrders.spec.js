import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { makeOrder } from 'dashboard/routes/dashboard/orders/specs/kaloOrdersFixtures';
import KaloContactOrders from '../KaloContactOrders.vue';

vi.mock('dashboard/api/kchat/orders', () => ({ default: { get: vi.fn() } }));

const mountIt = (props = { contactId: 7 }) =>
  mount(KaloContactOrders, {
    props,
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
    },
  });

describe('KaloContactOrders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows total spent and the last 3 orders of the contact', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: {
        payload: [
          makeOrder({ id: 4, number: 1004, total: 100000 }),
          makeOrder({ id: 3, number: 1003, total: 200000, status: 'paid' }),
          makeOrder({ id: 2, number: 1002, total: 300000, status: 'paid' }),
          makeOrder({ id: 1, number: 1001, total: 400000, status: 'paid' }),
        ],
        meta: { count: 4, paid_total: 900000 },
      },
    });
    const wrapper = mountIt();
    await flushPromises();
    expect(OrdersAPI.get).toHaveBeenCalledWith({ contactId: 7 });
    const summary = wrapper.find('[data-test="purchase-summary"]').text();
    expect(summary).toContain('4');
    expect(summary).toContain('900.000đ');
    const rows = wrapper.findAll('[data-test="recent-order"]');
    expect(rows).toHaveLength(3);
    expect(rows[0].text()).toContain('#1004');
    expect(rows[0].text()).toContain('100.000đ');
    expect(rows[0].text()).toContain('Chờ thanh toán');
    expect(wrapper.text()).not.toContain('#1001');
  });

  it('shows one empty sentence for a contact without orders', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: { payload: [], meta: { count: 0, paid_total: 0 } },
    });
    const wrapper = mountIt();
    await flushPromises();
    expect(wrapper.find('[data-test="recent-empty"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="recent-order"]')).toHaveLength(0);
  });

  it('reloads when the contact changes and ignores the stale answer', async () => {
    const resolvers = [];
    OrdersAPI.get.mockImplementation(
      () =>
        new Promise(r => {
          resolvers.push(r);
        })
    );
    const wrapper = mountIt({ contactId: 7 });
    await wrapper.setProps({ contactId: 8 });
    const answer = number => ({
      data: {
        payload: [makeOrder({ number })],
        meta: { count: 1, paid_total: 0 },
      },
    });
    resolvers[1](answer(2222));
    await flushPromises();
    resolvers[0](answer(1111));
    await flushPromises();
    expect(wrapper.text()).toContain('#2222');
    expect(wrapper.text()).not.toContain('#1111');
  });
});
