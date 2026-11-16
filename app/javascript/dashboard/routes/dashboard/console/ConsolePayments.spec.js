import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { useAlert } from 'dashboard/composables';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsolePayments from './ConsolePayments.vue';

vi.mock('dashboard/api/kchat/console', () => ({
  default: {
    paymentEvents: vi.fn(),
    accounts: vi.fn(),
    assignPaymentEvent: vi.fn(),
  },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const event = (over = {}) => ({
  id: 1,
  tid: 'T1',
  amount: 299000,
  description: 'chuyen tien',
  status: 'unmatched',
  account_id: null,
  account_name: null,
  received_at: '2026-11-16T04:10:00Z',
  ...over,
});

const list = payload => ({
  data: {
    payload,
    meta: { count: payload.length, current_page: 1, per_page: 25 },
  },
});

const mountPage = () =>
  mount(ConsolePayments, {
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

describe('ConsolePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleAPI.accounts.mockResolvedValue(
      list([{ id: 9, name: 'Linh Boutique' }])
    );
  });

  it('unmatched event offers Ghép shop with an account picker and calls assign once', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    let resolveAssign;
    consoleAPI.assignPaymentEvent.mockReturnValue(
      new Promise(resolve => {
        resolveAssign = resolve;
      })
    );
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.text()).toContain('Cần ghép shop');
    await wrapper.find('[data-testid="open-assign"]').trigger('click');
    await wrapper.find('[data-testid="account-search"]').setValue('Linh');
    await wrapper.find('[data-testid="account-search-form"]').trigger('submit');
    await flushPromises();
    expect(consoleAPI.accounts).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Linh' })
    );
    const submit = wrapper.find('[data-testid="assign"]');
    expect(submit.attributes('disabled')).toBeDefined();
    await wrapper.find('[data-testid="account-option"]').trigger('click');
    expect(submit.attributes('disabled')).toBeUndefined();
    await submit.trigger('click');
    await submit.trigger('click');
    expect(submit.attributes('disabled')).toBeDefined();
    resolveAssign({
      data: event({
        status: 'applied',
        account_id: 9,
        account_name: 'Linh Boutique',
      }),
    });
    await flushPromises();
    expect(consoleAPI.assignPaymentEvent).toHaveBeenCalledTimes(1);
    expect(consoleAPI.assignPaymentEvent).toHaveBeenCalledWith(1, 9);
    expect(wrapper.text()).toContain('Đã kích hoạt');
    expect(wrapper.find('[data-testid="open-assign"]').exists()).toBe(false);
  });

  it('underpaid events show a warning chip', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(
      list([
        event({
          status: 'underpaid',
          account_id: 9,
          account_name: 'Linh Boutique',
        }),
      ])
    );
    const wrapper = mountPage();
    await flushPromises();
    const chip = wrapper.find('[data-testid="status-chip"]');
    expect(chip.text()).toBe('Chuyển thiếu');
    expect(chip.classes()).toContain('bg-n-amber-3');
    expect(wrapper.text()).toContain('Shop chuyển thiếu tiền');
    expect(wrapper.find('[data-testid="open-assign"]').exists()).toBe(false);
  });

  const openPicker = async wrapper => {
    await wrapper.find('[data-testid="open-assign"]').trigger('click');
    await wrapper.find('[data-testid="account-search"]').setValue('Linh');
    await wrapper.find('[data-testid="account-search-form"]').trigger('submit');
    await flushPromises();
    await wrapper.find('[data-testid="account-option"]').trigger('click');
  };

  it.each([
    [422, { error: 'event_not_assignable' }],
    [404, { error: 'not_found' }],
  ])('on %s closes the picker, reloads and explains', async (status, body) => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    consoleAPI.assignPaymentEvent.mockRejectedValue({
      response: { status, data: body },
    });
    const wrapper = mountPage();
    await flushPromises();
    await openPicker(wrapper);
    await wrapper.find('[data-testid="assign"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.paymentEvents).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="assign"]').exists()).toBe(false);
    expect(useAlert).toHaveBeenCalledWith(
      'Giao dịch này đã được xử lý hoặc không còn tồn tại'
    );
  });

  it('keeps the picker open and re-enables the button on other errors', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    consoleAPI.assignPaymentEvent.mockRejectedValue({
      response: { status: 500 },
    });
    const wrapper = mountPage();
    await flushPromises();
    await openPicker(wrapper);
    await wrapper.find('[data-testid="assign"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.paymentEvents).toHaveBeenCalledTimes(1);
    expect(useAlert).toHaveBeenCalledWith('Không ghép được. Thử lại.');
    expect(
      wrapper.find('[data-testid="assign"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('shows a message when the account search fails', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    consoleAPI.accounts.mockRejectedValue(new Error('boom'));
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="open-assign"]').trigger('click');
    await wrapper.find('[data-testid="account-search-form"]').trigger('submit');
    await flushPromises();
    expect(useAlert).toHaveBeenCalledWith('Không tìm được shop. Thử lại.');
  });

  it('shows the empty message when the search returns nothing', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    consoleAPI.accounts.mockResolvedValue(list([]));
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="open-assign"]').trigger('click');
    await wrapper.find('[data-testid="account-search-form"]').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Không tìm thấy shop.');
  });

  it('does not throw on an unknown status', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(
      list([event({ status: 'refunded' })])
    );
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('[data-testid="status-chip"]').text()).toBe('refunded');
  });

  it('422 description_ambiguous shows its own message and keeps the picker open', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    consoleAPI.assignPaymentEvent.mockRejectedValue({
      response: { status: 422, data: { error: 'description_ambiguous' } },
    });
    const wrapper = mountPage();
    await flushPromises();
    await openPicker(wrapper);
    await wrapper.find('[data-testid="assign"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.paymentEvents).toHaveBeenCalledTimes(1);
    expect(useAlert).toHaveBeenCalledWith(
      'Nội dung chuyển khoản chưa rõ loại giao dịch (gói, token hay seeding). Hãy nhờ kỹ thuật xử lý.'
    );
    const button = wrapper.find('[data-testid="assign"]');
    expect(button.exists()).toBe(true);
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('an unknown 422 code gets the generic message with the picker open', async () => {
    consoleAPI.paymentEvents.mockResolvedValue(list([event()]));
    consoleAPI.assignPaymentEvent.mockRejectedValue({
      response: { status: 422, data: { error: 'something_else' } },
    });
    const wrapper = mountPage();
    await flushPromises();
    await openPicker(wrapper);
    await wrapper.find('[data-testid="assign"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.paymentEvents).toHaveBeenCalledTimes(1);
    expect(useAlert).toHaveBeenCalledWith('Không ghép được. Thử lại.');
    expect(wrapper.find('[data-testid="assign"]').exists()).toBe(true);
  });
});
