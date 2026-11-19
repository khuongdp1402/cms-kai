import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { kaloFeatureGetters } from 'dashboard/helper/specs/kaloFeatureGetters';
import OrdersIndex from '../OrdersIndex.vue';
import { deliveryChip, awaitsDelivery } from '../orderStatus';
import { makeOrder } from './kaloOrdersFixtures';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/kchat/orders', () => ({ default: { qr: vi.fn() } }));

// POS sales are handed over at the counter: never "Chưa giao", never in the
// "Cần giao / Đang giao" KPI.
const POS_PAID = makeOrder({
  id: 2,
  number: 1002,
  status: 'paid',
  source: 'pos',
  payment_method: 'cash',
  conversation_id: null,
  delivery_status: 'not_applicable',
});
const CHAT_PAID = makeOrder({
  id: 3,
  number: 1003,
  status: 'paid',
  payment_method: 'cash',
  delivery_status: 'pending',
});
const CHAT_SHIPPING = makeOrder({
  id: 4,
  number: 1004,
  status: 'shipping',
  payment_method: 'cod',
  delivery_status: 'shipping',
});

const mountIndex = orders => {
  const list = ref(orders);
  const fetch = vi.fn();
  const store = createStore({
    getters: kaloFeatureGetters(),
    modules: {
      kchatOrders: {
        namespaced: true,
        getters: {
          getOrders: () => list.value,
          getOrderById: () => id => list.value.find(o => o.id === id),
          getMeta: () => ({ count: orders.length }),
          getUIFlags: () => ({ isFetching: false }),
        },
        actions: { fetch, transition: vi.fn(), sendQr: vi.fn() },
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
  return { wrapper, fetch };
};

describe('Order delivery for counter sales', () => {
  it('a POS sale gets the "Nhận tại quầy" chip, never "Chưa giao"', () => {
    expect(deliveryChip(POS_PAID).labelKey).toBe(
      'KALO_METRICS.DELIVERY_AT_COUNTER'
    );
    expect(deliveryChip(CHAT_PAID).labelKey).toBe(
      'KALO_ORDERS.DELIVERY_CHIP.NOT_SHIPPED'
    );
    expect(deliveryChip({ ...POS_PAID, delivery_status: undefined }).key).toBe(
      'AT_COUNTER'
    );
  });

  it('awaitsDelivery is true only for paid or shipping orders that ship', () => {
    expect([POS_PAID, CHAT_PAID, CHAT_SHIPPING].map(awaitsDelivery)).toEqual([
      false,
      true,
      true,
    ]);
    expect(awaitsDelivery(makeOrder())).toBe(false);
  });

  it('the KPI "Cần giao / Đang giao" leaves the POS sale out and its row reads "Nhận tại quầy"', async () => {
    const { wrapper } = mountIndex([POS_PAID, CHAT_PAID, CHAT_SHIPPING]);
    await flushPromises();
    const kpi = wrapper.find('[data-test="orders-kpi-PROCESSING"]');
    expect(kpi.text()).toContain('Cần giao / Đang giao');
    expect(kpi.text()).toContain('2');
    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('Nhận tại quầy');
    expect(rows[0].text()).not.toContain('Chưa giao');
  });

  it('the Cần giao tab asks the server for orders awaiting delivery only', async () => {
    const { wrapper, fetch } = mountIndex([CHAT_PAID]);
    await flushPromises();
    await wrapper.find('[data-test="tab-paid"]').trigger('click');
    expect(fetch.mock.calls.at(-1)[1]).toMatchObject({
      status: 'paid',
      delivery: 'pending',
    });
    await wrapper.find('[data-test="tab-all"]').trigger('click');
    expect(fetch.mock.calls.at(-1)[1].delivery).toBeUndefined();
  });
});
