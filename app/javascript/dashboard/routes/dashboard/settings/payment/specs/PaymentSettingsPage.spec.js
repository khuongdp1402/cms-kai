import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';
import ComboBox from 'dashboard/components-next/combobox/ComboBox.vue';
import PaymentSettingsPage from '../PaymentSettingsPage.vue';
import { VN_BANKS, OTHER_BANK } from '../vnBanks';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/api/kchat/paymentSettings', () => ({
  default: { get: vi.fn(), save: vi.fn(), previewQr: vi.fn() },
}));

const EMPTY = {
  bank_bin: null,
  bank_name: null,
  account_number: null,
  account_name: null,
};
const SAVED = {
  bank_bin: '970436',
  bank_name: 'Vietcombank',
  account_number: '0123456789',
  account_name: 'NGUYEN VAN A',
};

const mountPage = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['kalo_console', 'kalo_payment_settings'].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  await router.push({
    name: 'kalo_payment_settings',
    params: { accountId: 1 },
  });
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      getCurrentRole: () => 'administrator',
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(PaymentSettingsPage, {
    attachTo: document.body,
    global: { plugins: [router, store, i18n] },
  });
  await flushPromises();
  return wrapper;
};

const input = (wrapper, name) => wrapper.find(`input[data-test="${name}"]`);
const pickBank = async (wrapper, value) => {
  wrapper.findComponent(ComboBox).vm.$emit('update:modelValue', value);
  await flushPromises();
};
const fill = async (wrapper, name, value) => {
  await input(wrapper, name).setValue(value);
  await flushPromises();
};
const save = async wrapper => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('vnBanks', () => {
  it('lists unique 6-digit NAPAS BINs, including the ones the backend specs use', () => {
    const bins = VN_BANKS.map(bank => bank.bin);
    expect(new Set(bins).size).toBe(bins.length);
    bins.forEach(bin => expect(bin).toMatch(/^\d{6}$/));
    expect(VN_BANKS.find(b => b.bin === '970436').shortName).toBe(
      'Vietcombank'
    );
    expect(VN_BANKS.find(b => b.bin === '970422').shortName).toBe('MB Bank');
  });
});

describe('PaymentSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentSettingsAPI.get.mockResolvedValue({ data: EMPTY });
    paymentSettingsAPI.save.mockImplementation(data =>
      Promise.resolve({ data })
    );
    paymentSettingsAPI.previewQr.mockResolvedValue({
      data: new Blob(['png']),
    });
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('shows the saved bank account and the configured status', async () => {
    paymentSettingsAPI.get.mockResolvedValue({ data: SAVED });
    const wrapper = await mountPage();
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe('970436');
    expect(input(wrapper, 'account-number').element.value).toBe('0123456789');
    expect(input(wrapper, 'account-name').element.value).toBe('NGUYEN VAN A');
    expect(wrapper.find('[data-test="payment-status"]').text()).toBe(
      'Đã cài đặt'
    );
    expect(wrapper.find('[data-test="settings-back-to-hub"]').exists()).toBe(
      true
    );
  });

  it('shows the missing status and the empty preview hint when nothing is saved', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="payment-status"]').text()).toBe(
      'Chưa cài đặt'
    );
    expect(wrapper.find('[data-test="qr-preview-empty"]').exists()).toBe(true);
    expect(paymentSettingsAPI.previewQr).not.toHaveBeenCalled();
  });

  it('writes the account name in uppercase without accents and keeps only digits in the account number', async () => {
    const wrapper = await mountPage();
    await fill(wrapper, 'account-name', 'Nguyễn Văn Đức');
    expect(input(wrapper, 'account-name').element.value).toBe('NGUYEN VAN DUC');
    await fill(wrapper, 'account-number', '0123 456-789');
    expect(input(wrapper, 'account-number').element.value).toBe('0123456789');
  });

  it('blocks saving with the same rules as the server', async () => {
    const wrapper = await mountPage();
    await fill(wrapper, 'account-number', '12345');
    await save(wrapper);
    expect(paymentSettingsAPI.save).not.toHaveBeenCalled();
    const text = wrapper.text();
    expect(text).toContain('Chọn ngân hàng nhận tiền');
    expect(text).toContain('Số tài khoản gồm 6 đến 19 chữ số');
    expect(text).toContain('Nhập tên chủ tài khoản, tối đa 60 ký tự');
  });

  it('saves the picked bank with its BIN and name and confirms in Vietnamese', async () => {
    const wrapper = await mountPage();
    await pickBank(wrapper, '970422');
    await fill(wrapper, 'account-number', '0987654321');
    await fill(wrapper, 'account-name', 'Tran Thi B');
    await save(wrapper);
    expect(paymentSettingsAPI.save).toHaveBeenCalledWith({
      bank_bin: '970422',
      bank_name: 'MB Bank',
      account_number: '0987654321',
      account_name: 'TRAN THI B',
    });
    expect(alertMock).toHaveBeenCalledWith('Đã lưu tài khoản nhận tiền');
    expect(wrapper.find('[data-test="payment-status"]').text()).toBe(
      'Đã cài đặt'
    );
  });

  it('lets the shop type the BIN of a bank that is not listed', async () => {
    const wrapper = await mountPage();
    await pickBank(wrapper, OTHER_BANK);
    await fill(wrapper, 'bank-bin', '12345');
    await fill(wrapper, 'bank-name', 'Ngân hàng X');
    await fill(wrapper, 'account-number', '0987654321');
    await fill(wrapper, 'account-name', 'TRAN THI B');
    await save(wrapper);
    expect(paymentSettingsAPI.save).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Mã BIN gồm đúng 6 chữ số');

    await fill(wrapper, 'bank-bin', '970999');
    await save(wrapper);
    expect(paymentSettingsAPI.save).toHaveBeenCalledWith({
      bank_bin: '970999',
      bank_name: 'Ngân hàng X',
      account_number: '0987654321',
      account_name: 'TRAN THI B',
    });
  });

  it('opens a saved BIN that is not in the list as another bank', async () => {
    paymentSettingsAPI.get.mockResolvedValue({
      data: { ...SAVED, bank_bin: '970999', bank_name: 'Ngân hàng X' },
    });
    const wrapper = await mountPage();
    expect(wrapper.findComponent(ComboBox).props('modelValue')).toBe(
      OTHER_BANK
    );
    expect(input(wrapper, 'bank-bin').element.value).toBe('970999');
    expect(input(wrapper, 'bank-name').element.value).toBe('Ngân hàng X');
  });

  it('shows a Vietnamese toast when the server rejects the values', async () => {
    paymentSettingsAPI.get.mockResolvedValue({ data: SAVED });
    paymentSettingsAPI.save.mockRejectedValue({
      response: {
        status: 422,
        data: { error: 'validation_failed', message: 'Bank bin is invalid' },
      },
    });
    const wrapper = await mountPage();
    await save(wrapper);
    expect(alertMock).toHaveBeenCalledWith(
      'Thông tin chưa hợp lệ, bạn kiểm tra lại nhé'
    );
  });

  it('shows a load error instead of an empty form when the settings cannot be read', async () => {
    paymentSettingsAPI.get.mockRejectedValue({ response: { status: 500 } });
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="payment-load-error"]').exists()).toBe(
      true
    );
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('previews the QR of the values being typed after a short pause and frees the image', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    paymentSettingsAPI.get.mockResolvedValue({ data: SAVED });
    const wrapper = await mountPage();
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(paymentSettingsAPI.previewQr).toHaveBeenCalledWith({
      bankBin: '970436',
      accountNumber: '0123456789',
    });
    expect(wrapper.find('img[data-test="qr-preview"]').attributes('src')).toBe(
      'blob:preview'
    );

    // Two quick edits collapse into one request (counted from here, because a
    // slow mount can settle the initial load in one or two watcher runs).
    const callsBefore = paymentSettingsAPI.previewQr.mock.calls.length;
    await fill(wrapper, 'account-number', '0987654321');
    await fill(wrapper, 'account-number', '0987654322');
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(paymentSettingsAPI.previewQr).toHaveBeenCalledTimes(callsBefore + 1);
    expect(paymentSettingsAPI.previewQr).toHaveBeenLastCalledWith({
      bankBin: '970436',
      accountNumber: '0987654322',
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');

    await fill(wrapper, 'account-number', '12');
    expect(wrapper.find('[data-test="qr-preview-empty"]').exists()).toBe(true);
    wrapper.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('shows a preview error when the QR cannot be built', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    paymentSettingsAPI.get.mockResolvedValue({ data: SAVED });
    paymentSettingsAPI.previewQr.mockRejectedValue({
      response: { status: 422 },
    });
    const wrapper = await mountPage();
    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(wrapper.find('[data-test="qr-preview-error"]').text()).toBe(
      'Chưa tạo được mã QR xem trước'
    );
  });
});
