import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import OrdersIndex from '../OrdersIndex.vue';
import { useAlert } from 'dashboard/composables';
import { makeOrder } from './kaloOrdersFixtures';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/kchat/orders', () => ({ default: { qr: vi.fn() } }));

const mountIndex = (
  orders,
  { fetch = vi.fn(), transition = vi.fn(), meta, sendQr = vi.fn() } = {}
) => {
  const list = ref(orders);
  const store = createStore({
    modules: {
      kchatOrders: {
        namespaced: true,
        getters: {
          getOrders: () => list.value,
          getOrderById: () => id => list.value.find(o => o.id === id),
          getMeta: () => meta || { count: orders.length },
          getUIFlags: () => ({ isFetching: false }),
        },
        actions: { fetch, transition, sendQr },
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
  return { wrapper, fetch, transition, list };
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

  it('keeps tabs visible and shows an inline message when a filter has no orders', async () => {
    const { wrapper, list } = mountIndex([makeOrder()]);
    await flushPromises();
    await wrapper.find('[data-test="tab-shipping"]').trigger('click');
    list.value = [];
    await flushPromises();
    expect(wrapper.find('[data-test="orders-empty"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="orders-none"]').text()).toBe(
      'Không có đơn nào'
    );
    expect(wrapper.find('[data-test="tab-all"]').exists()).toBe(true);
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });

  it('shows "Xem thêm" only while more pages remain and loads the next page', async () => {
    const { wrapper, fetch } = mountIndex([makeOrder()], {
      meta: { count: 30, current_page: 1, per_page: 25 },
    });
    await flushPromises();
    const more = wrapper.find('[data-test="load-more"]');
    expect(more.text()).toBe('Xem thêm');
    await more.trigger('click');
    expect(fetch.mock.calls.at(-1)[1]).toMatchObject({ page: 2 });
  });

  it('hides "Xem thêm" when everything is loaded', async () => {
    const { wrapper } = mountIndex([makeOrder()], {
      meta: { count: 25, current_page: 1, per_page: 25 },
    });
    await flushPromises();
    expect(wrapper.find('[data-test="load-more"]').exists()).toBe(false);
  });

  it('disables the row action while its request runs so a double click fires once', async () => {
    let finish;
    const transition = vi.fn(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const { wrapper } = mountIndex([makeOrder({ id: 2, status: 'paid' })], {
      transition,
    });
    await flushPromises();
    const button = wrapper.find('[data-test="row-action"]');
    await button.trigger('click');
    await button.trigger('click');
    expect(transition).toHaveBeenCalledTimes(1);
    expect(button.attributes('disabled')).toBeDefined();
    finish();
    await flushPromises();
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('shows the friendly message when a row action fails', async () => {
    const transition = vi.fn().mockRejectedValue({
      response: { data: { error: 'invalid_transition' } },
    });
    const { wrapper } = mountIndex([makeOrder({ id: 2, status: 'paid' })], {
      transition,
    });
    await flushPromises();
    await wrapper.find('[data-test="row-action"]').trigger('click');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Đơn này không chuyển bước được nữa');
  });

  it('labels the search input', async () => {
    const { wrapper } = mountIndex([makeOrder()]);
    await flushPromises();
    expect(wrapper.find('input[type="search"]').attributes('aria-label')).toBe(
      'Mã đơn, tên khách'
    );
  });
});
