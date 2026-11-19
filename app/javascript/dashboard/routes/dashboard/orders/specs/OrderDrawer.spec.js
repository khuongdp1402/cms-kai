import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import OrdersAPI from 'dashboard/api/kchat/orders';
import OrderDrawer from '../OrderDrawer.vue';
import { makeOrder } from './kaloOrdersFixtures';

vi.mock('dashboard/api/kchat/orders', () => ({ default: { qr: vi.fn() } }));

const mountDrawer = (order, props = {}) =>
  mount(OrderDrawer, {
    props: { order, ...props },
    attachTo: document.body,
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
        },
      },
    },
  });

describe('OrderDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:drawer');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows the QR image for a pending transfer_qr order and revokes it on unmount', async () => {
    OrdersAPI.qr.mockResolvedValue({ data: new Blob(['png']) });
    const wrapper = mountDrawer(makeOrder({ id: 4, conversation_id: null }));
    await flushPromises();
    expect(OrdersAPI.qr).toHaveBeenCalledWith(4);
    expect(wrapper.find('img[data-test="drawer-qr"]').attributes('src')).toBe(
      'blob:drawer'
    );
    expect(wrapper.find('[data-test="drawer-qr-loading"]').exists()).toBe(
      false
    );
    wrapper.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:drawer');
  });

  it('shows a single cancelled badge instead of repeating Đã hủy twice', () => {
    const wrapper = mountDrawer(makeOrder({ status: 'cancelled' }));
    expect(wrapper.find('[data-test="drawer-cancelled-chip"]').text()).toBe(
      'Đã hủy'
    );
    expect(wrapper.text().match(/Đã hủy/g)).toHaveLength(1);
  });

  it('does not create the object URL when unmounted before the PNG arrives', async () => {
    let resolve;
    OrdersAPI.qr.mockReturnValue(
      new Promise(r => {
        resolve = r;
      })
    );
    const wrapper = mountDrawer(makeOrder());
    wrapper.unmount();
    resolve({ data: new Blob(['png']) });
    await flushPromises();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('shows the settings-missing message instead of the image', async () => {
    OrdersAPI.qr.mockRejectedValue({
      response: { data: { error: 'payment_settings_missing' } },
    });
    const wrapper = mountDrawer(makeOrder());
    await flushPromises();
    expect(wrapper.find('[data-test="drawer-qr-error"]').text()).toBe(
      'Chưa cài đặt tài khoản nhận tiền'
    );
    expect(wrapper.find('img[data-test="drawer-qr"]').exists()).toBe(false);
    const link = wrapper.find('[data-test="drawer-qr-setup"]');
    expect(link.text()).toBe('Cài đặt nhận tiền');
    expect(JSON.parse(link.attributes('data-to'))).toEqual({
      name: 'kalo_payment_settings',
    });
  });

  it('offers no settings link for other QR errors', async () => {
    OrdersAPI.qr.mockRejectedValue({
      response: { data: { error: 'invalid_amount' } },
    });
    const wrapper = mountDrawer(makeOrder());
    await flushPromises();
    expect(wrapper.find('[data-test="drawer-qr-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="drawer-qr-setup"]').exists()).toBe(false);
  });

  it('shows the not-payable message when the server refuses the QR of a non-pending order', async () => {
    const body = new Blob([JSON.stringify({ error: 'order_not_payable' })]);
    // jsdom's Blob has no text(); the real browser Blob does.
    body.text = async () => JSON.stringify({ error: 'order_not_payable' });
    OrdersAPI.qr.mockRejectedValue({ response: { data: body } });
    const wrapper = mountDrawer(makeOrder());
    await flushPromises();
    expect(wrapper.find('[data-test="drawer-qr-error"]').text()).toBe(
      'Đơn này không còn chờ thanh toán'
    );
  });

  it('shows the invalid-amount message', async () => {
    OrdersAPI.qr.mockRejectedValue({
      response: { data: { error: 'invalid_amount' } },
    });
    const wrapper = mountDrawer(makeOrder());
    await flushPromises();
    expect(wrapper.find('[data-test="drawer-qr-error"]').text()).toBe(
      'Đơn 0đ không có mã QR'
    );
  });

  it('does not load a QR for orders that are not pending transfer_qr', async () => {
    mountDrawer(makeOrder({ status: 'paid' }));
    mountDrawer(makeOrder({ payment_method: 'cod' }));
    await flushPromises();
    expect(OrdersAPI.qr).not.toHaveBeenCalled();
  });

  it('asks for confirmation before cancelling', async () => {
    OrdersAPI.qr.mockResolvedValue({ data: new Blob(['png']) });
    const wrapper = mountDrawer(makeOrder());
    await flushPromises();
    await wrapper.find('[data-test="cancel"]').trigger('click');
    expect(wrapper.emitted('action')).toBeUndefined();
    await wrapper.find('[data-test="confirm-cancel"]').trigger('click');
    expect(wrapper.emitted('action')[0][0]).toMatchObject({ event: 'cancel' });
  });

  it('disables the buttons while busy', async () => {
    OrdersAPI.qr.mockResolvedValue({ data: new Blob(['png']) });
    const wrapper = mountDrawer(makeOrder(), { busy: true });
    await flushPromises();
    expect(
      wrapper.find('[data-test="primary"]').attributes('disabled')
    ).toBeDefined();
    expect(
      wrapper.find('[data-test="cancel"]').attributes('disabled')
    ).toBeDefined();
  });

  it('is a labelled dialog that closes on Escape and backdrop click', async () => {
    OrdersAPI.qr.mockResolvedValue({ data: new Blob(['png']) });
    const wrapper = mountDrawer(makeOrder());
    await flushPromises();
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-label')).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper
      .find('[data-test="order-drawer"]')
      .element.parentElement.click();
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
