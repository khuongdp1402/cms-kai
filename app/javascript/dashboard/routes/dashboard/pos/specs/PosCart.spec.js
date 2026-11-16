import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import PosCart from '../PosCart.vue';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { makeOrder, makeProduct } from '../../orders/specs/kaloOrdersFixtures';

vi.mock('dashboard/api/kchat/orders', () => ({
  default: { qr: vi.fn() },
}));

const candle = makeProduct();
const cup = makeProduct({ id: 2, name: 'Cốc gốm men lam', price: 145000 });

const mountCart = ({ create, transition } = {}) => {
  const store = createStore({
    modules: {
      kchatOrders: {
        namespaced: true,
        getters: { getUIFlags: () => ({ isCreating: false }) },
        actions: {
          create: create || vi.fn().mockResolvedValue(makeOrder()),
          transition: transition || vi.fn().mockResolvedValue(makeOrder()),
        },
      },
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return mount(PosCart, { global: { plugins: [store, i18n] } });
};

describe('PosCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:qr');
    URL.revokeObjectURL = vi.fn();
  });

  it('adds a product once and increments on second tap', async () => {
    const wrapper = mountCart();
    wrapper.vm.add(candle);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('[data-test="cart-line"]')).toHaveLength(1);
    wrapper.vm.add(candle);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('[data-test="cart-line"]')).toHaveLength(1);
    expect(wrapper.find('[data-test="line-qty"]').text()).toBe('2');
  });

  it('total equals sum of price × quantity', async () => {
    const wrapper = mountCart();
    wrapper.vm.add(candle);
    wrapper.vm.add(candle);
    wrapper.vm.add(cup);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="cart-total"]').text()).toBe('523.000đ');
    expect(wrapper.find('[data-test="pay"]').text()).toContain('523.000đ');
  });

  it('paying by cash posts payment_method cash and shows "Đã nhận tiền"', async () => {
    const create = vi
      .fn()
      .mockResolvedValue(makeOrder({ status: 'paid', payment_method: 'cash' }));
    const wrapper = mountCart({ create });
    wrapper.vm.add(candle);
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-test="method-cash"]').trigger('click');
    await wrapper.find('[data-test="pay"]').trigger('click');
    await flushPromises();
    expect(create.mock.calls[0][1]).toEqual({
      source: 'pos',
      payment_method: 'cash',
      items: [{ product_id: 1, quantity: 1 }],
    });
    expect(wrapper.find('[data-test="paid-state"]').text()).toContain(
      'Đã nhận tiền'
    );
  });

  it('QR payment shows the QR image and a button Đã nhận tiền', async () => {
    const order = makeOrder({ id: 9 });
    const create = vi.fn().mockResolvedValue(order);
    const transition = vi.fn().mockResolvedValue({ ...order, status: 'paid' });
    OrdersAPI.qr.mockResolvedValue({ data: new Blob(['png']) });
    const wrapper = mountCart({ create, transition });
    wrapper.vm.add(candle);
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-test="pay"]').trigger('click');
    await flushPromises();
    expect(create.mock.calls[0][1].payment_method).toBe('transfer_qr');
    expect(OrdersAPI.qr).toHaveBeenCalledWith(9);
    expect(wrapper.find('img[data-test="qr-image"]').attributes('src')).toBe(
      'blob:qr'
    );
    const confirm = wrapper.find('[data-test="confirm-paid"]');
    expect(confirm.text()).toBe('Đã nhận tiền');
    await confirm.trigger('click');
    await flushPromises();
    expect(transition.mock.calls[0][1]).toEqual({
      id: 9,
      event: 'mark_paid',
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr');
    expect(wrapper.find('[data-test="paid-state"]').exists()).toBe(true);
  });
});
