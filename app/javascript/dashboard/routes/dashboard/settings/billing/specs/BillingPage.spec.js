import { mount, flushPromises } from '@vue/test-utils';
import BillingPage from '../BillingPage.vue';
import subscriptionAPI from 'dashboard/api/kchat/subscription';
import { createPageTestEnv } from '../../../reports/specs/kaloPageTestEnv';

vi.mock('dashboard/api/kchat/subscription', () => ({
  default: { get: vi.fn() },
}));

const subscription = (overrides = {}) => ({
  data: {
    plan: 'growth',
    status: 'active',
    valid_until: '2026-12-01',
    days_left: 15,
    bank: {
      bank: 'Vietcombank',
      account_number: '0123456789',
      account_name: 'CONG TY KALO',
    },
    memo: 'KALO 1 PLAN',
    prices: { starter: 200000, growth: 699000, enterprise: 1500000 },
    ...overrides,
  },
});

const mountPage = async (role = 'administrator') => {
  const { plugins } = createPageTestEnv({ role });
  const wrapper = mount(BillingPage, { global: { plugins } });
  await flushPromises();
  return wrapper;
};

describe('BillingPage', () => {
  beforeEach(() => {
    subscriptionAPI.get.mockReset();
    subscriptionAPI.get.mockResolvedValue(subscription());
  });

  it('shows plan, days left, bank account and memo "KALO <id> PLAN"', async () => {
    const wrapper = await mountPage();
    const text = wrapper.text();
    expect(text).toContain('Tăng trưởng');
    expect(text).toContain('15');
    expect(wrapper.find('[data-test="days-left"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="days-left"]').exists()).toBe(true);
    expect(text).toContain('Vietcombank');
    expect(text).toContain('0123456789');
    expect(text).toContain('CONG TY KALO');
    expect(wrapper.find('[data-test="memo"]').text()).toBe('KALO 1 PLAN');
    expect(text).toContain('200.000đ');
    expect(text).toContain('699.000đ');
    expect(text).toContain('1.500.000đ');
    expect(wrapper.find('[data-test="renew"]').attributes('data-primary')).toBe(
      'false'
    );
  });

  it('shows Dùng thử when the plan is null', async () => {
    subscriptionAPI.get.mockResolvedValue(
      subscription({ plan: null, status: 'trial' })
    );
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="plan"]').text()).toBe('Dùng thử');
  });

  it('expired status shows the renew button as primary', async () => {
    subscriptionAPI.get.mockResolvedValue(
      subscription({ status: 'expired', days_left: 0 })
    );
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="renew"]').attributes('data-primary')).toBe(
      'true'
    );
    expect(wrapper.find('[data-test="status"]').text()).toBe('Đã hết hạn');
  });

  it('copies the memo and survives a clipboard failure', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const wrapper = await mountPage();
    await wrapper.find('[data-test="copy-memo"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith('KALO 1 PLAN');
    expect(wrapper.find('[data-test="memo"]').exists()).toBe(true);
  });

  it('does not throw and hides the date line when valid_until is null', async () => {
    subscriptionAPI.get.mockResolvedValue(subscription({ valid_until: null }));
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="plan"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="valid-until"]').exists()).toBe(false);
  });

  it('explains that billing is not configured when the server answers 503 billing_not_configured', async () => {
    subscriptionAPI.get.mockRejectedValue({
      response: { status: 503, data: { error: 'billing_not_configured' } },
    });
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="billing-not-configured"]').text()).toBe(
      'Chưa cấu hình thanh toán gói cước, bạn liên hệ quản trị Kalo để được hỗ trợ.'
    );
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false);
  });

  it('keeps the generic error for other failures', async () => {
    subscriptionAPI.get.mockRejectedValue({ response: { status: 500 } });
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="billing-not-configured"]').exists()).toBe(
      false
    );
  });

  it('hides the days-left line when expired', async () => {
    subscriptionAPI.get.mockResolvedValue(
      subscription({ status: 'expired', days_left: 0 })
    );
    const wrapper = await mountPage();
    expect(wrapper.find('[data-test="days-left"]').exists()).toBe(false);
  });
});
