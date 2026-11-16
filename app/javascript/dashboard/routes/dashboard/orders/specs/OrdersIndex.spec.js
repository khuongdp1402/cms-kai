import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import OrdersIndex from '../OrdersIndex.vue';
import { makeOrder } from './kaloOrdersFixtures';

const mountIndex = (orders, { fetch = vi.fn(), transition = vi.fn() } = {}) => {
  const store = createStore({
    modules: {
      kchatOrders: {
        namespaced: true,
        getters: {
          getOrders: () => orders,
          getOrderById: () => id => orders.find(o => o.id === id),
          getMeta: () => ({ count: orders.length }),
          getUIFlags: () => ({ isFetching: false }),
        },
        actions: { fetch, transition, sendQr: vi.fn() },
      },
      kchatProducts: {
        namespaced: true,
        getters: { getProducts: () => [] },
        actions: { fetch: vi.fn() },
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(OrdersIndex, {
    global: {
      plugins: [store, i18n],
      stubs: { RouterLink: { template: '<a><slot /></a>' }, OrderForm: true },
    },
  });
  return { wrapper, fetch, transition };
};

describe('OrdersIndex', () => {
  it('lists orders with status chips and the row action matching the status', async () => {
    const { wrapper } = mountIndex([
      makeOrder({ id: 1, number: 1042 }),
      makeOrder({ id: 2, number: 1041, status: 'paid', paid_at: 'x' }),
    ]);
    await flushPromises();
    const rows = wrapper.findAll('[data-test="order-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('#1042');
    expect(rows[0].text()).toContain('403.000đ');
    expect(rows[0].text()).toContain('Chờ thanh toán');
    expect(rows[0].find('[data-test="row-action"]').text()).toBe('Gửi QR');
    expect(rows[1].text()).toContain('Đã nhận tiền');
    expect(rows[1].find('[data-test="row-action"]').text()).toBe('Giao hàng');
  });

  it('runs the matching transition when the row action is clicked', async () => {
    const { wrapper, transition } = mountIndex([
      makeOrder({ id: 2, status: 'paid' }),
    ]);
    await flushPromises();
    await wrapper.find('[data-test="row-action"]').trigger('click');
    expect(transition.mock.calls[0][1]).toEqual({ id: 2, event: 'ship' });
  });

  it('fetches by status when a tab is chosen', async () => {
    const { wrapper, fetch } = mountIndex([makeOrder()]);
    await flushPromises();
    await wrapper.find('[data-test="tab-paid"]').trigger('click');
    expect(fetch.mock.calls.at(-1)[1]).toMatchObject({ status: 'paid' });
  });

  it('empty state shows one sentence and one button "Tạo đơn"', async () => {
    const { wrapper } = mountIndex([]);
    await flushPromises();
    const empty = wrapper.find('[data-test="orders-empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.findAll('p')).toHaveLength(1);
    expect(empty.findAll('button')).toHaveLength(1);
    expect(empty.find('button').text()).toBe('Tạo đơn');
    expect(
      wrapper.findAll('button').filter(b => b.text() === 'Tạo đơn')
    ).toHaveLength(1);
  });
});
