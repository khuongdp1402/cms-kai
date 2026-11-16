import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { makeOrder } from 'dashboard/routes/dashboard/orders/specs/kaloOrdersFixtures';
import KaloOrderCard from '../KaloOrderCard.vue';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));

const buildStore = ({ orders = [], sendQr, fetchOne } = {}) =>
  createStore({
    getters: { getSelectedChat: () => ({ id: 12 }) },
    modules: {
      kchatOrders: {
        namespaced: true,
        state: () => ({ records: orders }),
        getters: {
          getOrderById: state => id => state.records.find(o => o.id === id),
        },
        actions: {
          sendQr: sendQr || vi.fn(),
          fetchOne: fetchOne || vi.fn(),
        },
      },
    },
  });

const mountCard = (store, props = { orderId: 1 }) =>
  mount(KaloOrderCard, {
    props,
    global: {
      plugins: [
        store,
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
    },
  });

describe('KaloOrderCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows number, status chip, items and total', () => {
    const wrapper = mountCard(buildStore({ orders: [makeOrder()] }));
    expect(wrapper.text()).toContain('1042');
    expect(wrapper.text()).toContain('Chờ thanh toán');
    expect(wrapper.text()).toContain('Nến gỗ đàn hương');
    expect(wrapper.text()).toContain('2 × 189.000đ');
    expect(wrapper.text()).toContain('403.000đ');
  });

  it('fetches the order by id when it is not in the store', async () => {
    const fetchOne = vi.fn();
    const wrapper = mountCard(buildStore({ fetchOne }), { orderId: 9 });
    await flushPromises();
    expect(fetchOne).toHaveBeenCalledTimes(1);
    expect(fetchOne.mock.calls[0][1]).toBe(9);
    expect(wrapper.find('[data-test="order-card"]').exists()).toBe(false);
  });

  it('Gửi mã QR button calls send_qr with the current conversation id and disables itself while sending', async () => {
    let resolve;
    const sendQr = vi.fn(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );
    const wrapper = mountCard(buildStore({ orders: [makeOrder()], sendQr }));
    const button = wrapper.find('[data-test="send-qr"]');
    expect(button.text()).toContain('Gửi mã QR');
    await button.trigger('click');
    expect(sendQr.mock.calls[0][1]).toEqual({ id: 1, conversationId: 12 });
    expect(wrapper.find('[data-test="send-qr"]').attributes('disabled')).toBe(
      ''
    );
    await wrapper.find('[data-test="send-qr"]').trigger('click');
    expect(sendQr).toHaveBeenCalledTimes(1);
    resolve({});
    await flushPromises();
    expect(
      wrapper.find('[data-test="send-qr"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('shows a friendly alert when sending fails', async () => {
    const sendQr = vi.fn(() =>
      Promise.reject(
        Object.assign(new Error('422'), {
          response: { data: { error: 'order_not_payable' } },
        })
      )
    );
    const wrapper = mountCard(buildStore({ orders: [makeOrder()], sendQr }));
    await wrapper.find('[data-test="send-qr"]').trigger('click');
    await flushPromises();
    expect(alertMock).toHaveBeenCalledWith(
      viMessages.KALO_ORDERS.ERRORS.ORDER_NOT_PAYABLE
    );
  });

  it('hides the button for paid and non transfer_qr orders', () => {
    const paid = mountCard(
      buildStore({ orders: [makeOrder({ status: 'paid' })] })
    );
    expect(paid.find('[data-test="send-qr"]').exists()).toBe(false);
    expect(paid.text()).toContain('Đã nhận tiền');
    const cod = mountCard(
      buildStore({ orders: [makeOrder({ payment_method: 'cod' })] })
    );
    expect(cod.find('[data-test="send-qr"]').exists()).toBe(false);
  });

  it('stays quiet when the order cannot be loaded', async () => {
    const fetchOne = vi.fn(() => Promise.reject(new Error('404')));
    const wrapper = mountCard(buildStore({ fetchOne }), { orderId: 9 });
    await flushPromises();
    expect(wrapper.find('[data-test="send-qr"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="order-card-unavailable"]').text()).toBe(
      viMessages.KALO_CHAT.CARD.UNAVAILABLE
    );
    expect(alertMock).not.toHaveBeenCalled();
  });
});
