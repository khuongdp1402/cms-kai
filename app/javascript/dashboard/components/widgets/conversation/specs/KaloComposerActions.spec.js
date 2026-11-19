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

import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

const mountIt = ({ sendQr = vi.fn(), props = {} } = {}) => {
  const store = createStore({
    modules: {
      kchatOrders: { namespaced: true, actions: { sendQr } },
    },
  });
  const wrapper = mount(KaloComposerActions, {
    props: { contactId: 7, conversationId: 12, ...props },
    attachTo: document.body,
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

  it('keeps an accessible name when the labels collapse to icons on narrow screens', () => {
    const { wrapper } = mountIt();
    expect(
      wrapper.find('[data-test="create-order"]').attributes('aria-label')
    ).toBe('Tạo đơn');
    expect(wrapper.find('[data-test="pick-qr"]').attributes('aria-label')).toBe(
      'Mã QR'
    );
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

  it('renders nothing without a contact or on a restricted channel', () => {
    const noContact = mountIt({ props: { contactId: null } }).wrapper;
    expect(noContact.find('[data-test="create-order"]').exists()).toBe(false);
    expect(noContact.find('[data-test="pick-qr"]').exists()).toBe(false);
    const restricted = mountIt({ props: { isReplyRestricted: true } }).wrapper;
    expect(restricted.find('[data-test="create-order"]').exists()).toBe(false);
    expect(restricted.find('[data-test="pick-qr"]').exists()).toBe(false);
  });

  it('never queries orders or opens the form without a contact id', async () => {
    const { wrapper } = mountIt();
    await wrapper.setProps({ contactId: undefined });
    await wrapper.vm.pickQr();
    wrapper.vm.openForm();
    await flushPromises();
    expect(OrdersAPI.get).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="order-form"]').exists()).toBe(false);
  });

  it('ignores a second click on Mã QR while the lookup is in flight', async () => {
    let resolve;
    OrdersAPI.get.mockReturnValue(
      new Promise(r => {
        resolve = r;
      })
    );
    const { wrapper } = mountIt();
    await wrapper.find('[data-test="pick-qr"]').trigger('click');
    await wrapper.find('[data-test="pick-qr"]').trigger('click');
    expect(OrdersAPI.get).toHaveBeenCalledTimes(1);
    resolve({
      data: {
        payload: [makeOrder({ id: 2 }), makeOrder({ id: 3, number: 1043 })],
        meta: {},
      },
    });
    await flushPromises();
    expect(wrapper.findAll('[data-test="qr-picker"]')).toHaveLength(1);
  });

  it('maps payment_settings_missing to a friendly alert with a link to the payment settings', async () => {
    OrdersAPI.get.mockResolvedValue({
      data: { payload: [makeOrder({ id: 3 })], meta: {} },
    });
    const sendQr = vi.fn(() =>
      Promise.reject(
        Object.assign(new Error('422'), {
          response: { data: { error: 'payment_settings_missing' } },
        })
      )
    );
    const { wrapper } = mountIt({ sendQr });
    await wrapper.find('[data-test="pick-qr"]').trigger('click');
    await flushPromises();
    expect(alertMock).toHaveBeenCalledWith(
      viMessages.KALO_ORDERS.ERRORS.PAYMENT_SETTINGS_MISSING,
      expect.objectContaining({
        type: 'link',
        to: { name: 'kalo_payment_settings' },
        message: viMessages.KALO_PAYMENT.SETUP_LINK,
      })
    );
  });

  it.each(['order_not_payable', 'conversation_contact_mismatch'])(
    'maps the %s error of send_qr to a friendly alert',
    async code => {
      OrdersAPI.get.mockResolvedValue({
        data: { payload: [makeOrder({ id: 3 })], meta: {} },
      });
      const sendQr = vi.fn(() =>
        Promise.reject(
          Object.assign(new Error('422'), {
            response: { data: { error: code } },
          })
        )
      );
      const { wrapper } = mountIt({ sendQr });
      await wrapper.find('[data-test="pick-qr"]').trigger('click');
      await flushPromises();
      expect(alertMock).toHaveBeenCalledWith(
        viMessages.KALO_ORDERS.ERRORS[code.toUpperCase()]
      );
    }
  );

  describe('dialog accessibility', () => {
    const escape = () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    it('form dialog: focus moves in, Escape closes and focus returns to the trigger', async () => {
      const { wrapper } = mountIt();
      const trigger = wrapper.find('[data-test="create-order"]').element;
      trigger.focus();
      await wrapper.find('[data-test="create-order"]').trigger('click');
      await flushPromises();
      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.attributes('aria-modal')).toBe('true');
      expect(dialog.attributes('aria-label')).toBe(
        viMessages.KALO_ORDERS.FORM.TITLE
      );
      expect(dialog.element.contains(document.activeElement)).toBe(true);
      escape();
      await flushPromises();
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('OrderForm cancel closes the dialog', async () => {
      const { wrapper } = mountIt();
      await wrapper.find('[data-test="create-order"]').trigger('click');
      wrapper.findComponent(OrderFormStub).vm.$emit('cancel');
      await flushPromises();
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('picker dialog is labelled, closes on Escape and restores focus', async () => {
      OrdersAPI.get.mockResolvedValue({
        data: {
          payload: [makeOrder({ id: 2 }), makeOrder({ id: 3, number: 1043 })],
          meta: {},
        },
      });
      const { wrapper } = mountIt();
      const trigger = wrapper.find('[data-test="pick-qr"]').element;
      trigger.focus();
      await wrapper.find('[data-test="pick-qr"]').trigger('click');
      await flushPromises();
      const dialog = wrapper.find('[data-test="qr-picker"]');
      const title = dialog.find(`#${dialog.attributes('aria-labelledby')}`);
      expect(title.text()).toBe(viMessages.KALO_CHAT.QR_PICKER.TITLE);
      expect(dialog.element.contains(document.activeElement)).toBe(true);
      escape();
      await flushPromises();
      expect(wrapper.find('[data-test="qr-picker"]').exists()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('created dialog closes on Escape and restores focus to the Tạo đơn button', async () => {
      const { wrapper } = mountIt();
      const trigger = wrapper.find('[data-test="create-order"]').element;
      trigger.focus();
      await wrapper.find('[data-test="create-order"]').trigger('click');
      wrapper.findComponent(OrderFormStub).vm.$emit('created', makeOrder());
      await flushPromises();
      const dialog = wrapper.find('[data-test="created-dialog"]');
      expect(dialog.attributes('aria-labelledby')).toBeTruthy();
      expect(dialog.element.contains(document.activeElement)).toBe(true);
      escape();
      await flushPromises();
      expect(wrapper.find('[data-test="created-dialog"]').exists()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('renders the order/QR target of the Tin nhắn tour', () => {
    const { wrapper } = mountIt();
    expectTourTargets(wrapper, 'messages', ['chat-order-qr']);
  });
});
