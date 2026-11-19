import { mount, flushPromises } from '@vue/test-utils';
import productsAPI from 'dashboard/api/kchat/products';
import ordersAPI from 'dashboard/api/kchat/orders';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';
import KaloSetupChecklist from '../KaloSetupChecklist.vue';
import { resetKaloSetupCache } from '../useKaloSetup';
import { createGuideEnv } from './guideTestEnv';

vi.mock('dashboard/api/kchat/products', () => ({ default: { get: vi.fn() } }));
vi.mock('dashboard/api/kchat/orders', () => ({ default: { get: vi.fn() } }));
vi.mock('dashboard/api/kchat/paymentSettings', () => ({
  default: { get: vi.fn() },
}));

const mockData = ({ products = 0, orders = 0, payment = false } = {}) => {
  productsAPI.get.mockResolvedValue({
    data: { payload: Array.from({ length: products }, (_, id) => ({ id })) },
  });
  ordersAPI.get.mockResolvedValue({
    data: { payload: [], meta: { count: orders } },
  });
  paymentSettingsAPI.get.mockResolvedValue({
    data: payment
      ? { bank_bin: '970436', account_number: '0123456789' }
      : { bank_bin: null, account_number: null },
  });
};

const mountChecklist = async (envOptions = {}, props = {}) => {
  const env = createGuideEnv(envOptions);
  await env.router.push({ name: 'kalo_overview', params: { accountId: 1 } });
  const wrapper = mount(KaloSetupChecklist, {
    props,
    global: { plugins: [env.router, env.store, env.i18n] },
  });
  await flushPromises();
  return { wrapper, ...env };
};

const step = (wrapper, key) =>
  wrapper.find(`[data-test-id="kalo-setup-step-${key}"]`);

describe('KaloSetupChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetKaloSetupCache();
    mockData();
  });

  it('shows the five steps with 0/5 for a fresh shop', async () => {
    const { wrapper } = await mountChecklist();
    expect(wrapper.text()).toContain('Bắt đầu với Kalo');
    expect(wrapper.find('[data-test-id="kalo-setup-progress"]').text()).toBe(
      '0/5'
    );
    expect(
      wrapper.findAll('li').map(li => li.attributes('data-state'))
    ).toEqual(['todo', 'todo', 'todo', 'todo', 'todo']);
    expect(wrapper.text()).toContain('Nối kênh');
    expect(wrapper.text()).toContain('Mời nhân viên');
  });

  it('marks steps done from real data', async () => {
    mockData({ products: 2, orders: 1, payment: true });
    const { wrapper } = await mountChecklist({
      inboxes: [{ id: 1 }],
      agents: [{ id: 1 }, { id: 2 }],
    });
    expect(wrapper.find('[data-test-id="kalo-setup-progress"]').text()).toBe(
      '5/5'
    );
    expect(wrapper.text()).toContain('Shop đã thiết lập xong');
    expect(wrapper.findAll('[data-test-id="kalo-setup-cta"]')).toHaveLength(0);
  });

  it('links each step to the page that completes it', async () => {
    const { wrapper } = await mountChecklist();
    const hrefs = wrapper
      .findAll('[data-test-id="kalo-setup-cta"]')
      .map(a => a.attributes('href'));
    expect(hrefs).toEqual([
      '/app/accounts/1/settings_inbox_new',
      '/app/accounts/1/kalo_pos?add_product=1',
      '/app/accounts/1/kalo_payment_settings',
      '/app/accounts/1/kalo_orders?new=1',
      '/app/accounts/1/kalo_console?invite=1',
    ]);
  });

  it('sends the product step to the order form when POS is off', async () => {
    const { wrapper } = await mountChecklist({
      features: { kalo_brand: true },
    });
    expect(
      step(wrapper, 'product')
        .find('[data-test-id="kalo-setup-cta"]')
        .attributes('href')
    ).toBe('/app/accounts/1/kalo_orders?new=1');
  });

  it('skips a step per user and account, and can undo it', async () => {
    const { wrapper, store } = await mountChecklist();
    await step(wrapper, 'invite')
      .find('[data-test-id="kalo-setup-skip"]')
      .trigger('click');
    expect(store.state.uiSettings.kalo_setup).toEqual({
      1: { skipped: ['INVITE'] },
    });
    expect(step(wrapper, 'invite').attributes('data-state')).toBe('skipped');
    expect(step(wrapper, 'invite').text()).toContain('Đã bỏ qua');
    await step(wrapper, 'invite')
      .find('[data-test-id="kalo-setup-unskip"]')
      .trigger('click');
    expect(step(wrapper, 'invite').attributes('data-state')).toBe('todo');
  });

  it('"Ẩn danh sách" hides it and keeps it hidden', async () => {
    const { wrapper, store } = await mountChecklist();
    await wrapper.find('[data-test-id="kalo-setup-hide"]').trigger('click');
    expect(store.state.uiSettings.kalo_setup[1].hidden).toBe(true);
    expect(wrapper.find('[data-test-id="kalo-setup-checklist"]').exists()).toBe(
      false
    );
    const again = await mountChecklist({
      uiSettings: { kalo_setup: { 1: { hidden: true } } },
    });
    expect(
      again.wrapper.find('[data-test-id="kalo-setup-checklist"]').exists()
    ).toBe(false);
  });

  it('is not shown to staff', async () => {
    const { wrapper } = await mountChecklist({ role: 'agent' });
    expect(wrapper.find('[data-test-id="kalo-setup-checklist"]').exists()).toBe(
      false
    );
    expect(productsAPI.get).not.toHaveBeenCalled();
  });
});
