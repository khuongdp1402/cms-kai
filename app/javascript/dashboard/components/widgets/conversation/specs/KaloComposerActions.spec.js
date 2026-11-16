import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { makeOrder } from 'dashboard/routes/dashboard/orders/specs/kaloOrdersFixtures';
import KaloComposerActions from '../KaloComposerActions.vue';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/api/kchat/orders', () => ({ default: { get: vi.fn() } }));

const OrderFormStub = {
  props: ['contactId', 'conversationId'],
  emits: ['created', 'cancel'],
  template: '<div data-test="order-form" />',
};

const mountIt = ({ sendQr = vi.fn() } = {}) => {
  const store = createStore({
    modules: {
      kchatOrders: { namespaced: true, actions: { sendQr } },
    },
  });
  const wrapper = mount(KaloComposerActions, {
    props: { contactId: 7, conversationId: 12 },
    global: {
      plugins: [
        store,
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
      stubs: { OrderForm: OrderFormStub, Teleport: true },
    },
  });
  return { wrapper, sendQr };
};

describe('KaloComposerActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Tạo đơn and Mã QR buttons', () => {
    const { wrapper } = mountIt();
    expect(wrapper.find('[data-test="create-order"]').text()).toBe('Tạo đơn');
    expect(wrapper.find('[data-test="pick-qr"]').text()).toBe('Mã QR');
  });

  it('Tạo đơn opens the form prefilled with contact id and conversation display id', async () => {
    const { wrapper } = mountIt();
    await wrapper.find('[data-test="create-order"]').trigger('click');
    const form = wrapper.findComponent(OrderFormStub);
    expect(form.props()).toEqual({ contactId: 7, conversationId: 12 });
  });

  it('offers one-click Gửi mã QR after creating a transfer_qr order', async () => {
    const { wrapper, sendQr } = mountIt();
    await wrapper.find('[data-test="create-order"]').trigger('click');
    wrapper
      .findComponent(OrderFormStub)
      .vm.$emit('created', makeOrder({ id: 5 }));
    await flushPromises();
    expect(wrapper.find('[data-test="order-form"]').exists()).toBe(false);
    await wrapper.find('[data-test="created-send-qr"]').trigger('click');
    await flushPromises();
    expect(sendQr.mock.calls[0][1]).toEqual({ id: 5, conversationId: 12 });
    expect(alertMock).toHaveBeenCalledWith(viMessages.KALO_ORDERS.QR_SENT);
  });

  it('does not offer the QR for a cod order', async () => {
    const { wrapper } = mountIt();
    await wrapper.find('[data-test="create-order"]').trigger('click');
    wrapper
      .findComponent(OrderFormStub)
      .vm.$emit('created', makeOrder({ payment_method: 'cod' }));
    await flushPromises();
    expect(wrapper.find('[data-test="created-send-qr"]').exists()).toBe(false);
  });

  it('Mã QR sends the only pending transfer_qr order of the contact', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: { payload: [makeOrder({ id: 3 })], meta: {} },
    });
    const { wrapper, sendQr } = mountIt();
    await wrapper.find('[data-test="pick-qr"]').trigger('click');
    await flushPromises();
    expect(OrdersAPI.get).toHaveBeenCalledWith({
      status: 'pending_payment',
      contactId: 7,
    });
    expect(sendQr.mock.calls[0][1]).toEqual({ id: 3, conversationId: 12 });
  });

  it('Mã QR opens a picker when several orders are pending and ignores cod orders', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: {
        payload: [
          makeOrder({ id: 3, number: 1043 }),
          makeOrder({ id: 2, number: 1042 }),
          makeOrder({ id: 1, number: 1041, payment_method: 'cod' }),
        ],
        meta: {},
      },
    });
    const { wrapper, sendQr } = mountIt();
    await wrapper.find('[data-test="pick-qr"]').trigger('click');
    await flushPromises();
    const options = wrapper.findAll('[data-test="qr-option"]');
    expect(options).toHaveLength(2);
    expect(sendQr).not.toHaveBeenCalled();
    await options[1].trigger('click');
    await flushPromises();
    expect(sendQr.mock.calls[0][1]).toEqual({ id: 2, conversationId: 12 });
  });

  it('Mã QR shows one empty sentence when nothing is pending', async () => {
    OrdersAPI.get.mockResolvedValue({ data: { payload: [], meta: {} } });
    const { wrapper } = mountIt();
    await wrapper.find('[data-test="pick-qr"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="qr-empty"]').exists()).toBe(true);
  });
});
