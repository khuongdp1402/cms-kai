import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import { useAlert } from 'dashboard/composables';
import consoleAPI from 'dashboard/api/kchat/console';
import ConsoleShops from './ConsoleShops.vue';

vi.mock('dashboard/api/kchat/console', () => ({
  default: { accounts: vi.fn(), updateAccount: vi.fn() },
}));
vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));

const shop = (over = {}) => ({
  id: 1042,
  name: 'Nhà Mây',
  plan: 'growth',
  status: 'active',
  valid_until: '2026-12-16T00:00:00Z',
  days_left: 30,
  locked: false,
  ...over,
});

const page = (payload, meta = {}) => ({
  data: {
    payload,
    meta: { count: payload.length, current_page: 1, per_page: 25, ...meta },
  },
});

const mountPage = () =>
  mount(ConsoleShops, {
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

const byText = (wrapper, selector, text) =>
  wrapper.findAll(selector).find(el => el.text() === text);

describe('ConsoleShops', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleAPI.accounts.mockResolvedValue(page([shop()]));
  });

  it('filter tabs map to filter=all|trial|expiring|locked', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(consoleAPI.accounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: 'all', page: 1 })
    );
    const tabs = {
      'Dùng thử': 'trial',
      'Sắp hết hạn': 'expiring',
      'Đã khóa': 'locked',
      'Tất cả': 'all',
    };
    // eslint-disable-next-line no-restricted-syntax
    for (const [label, filter] of Object.entries(tabs)) {
      // eslint-disable-next-line no-await-in-loop
      await byText(wrapper, '[data-testid="filter-tab"]', label).trigger(
        'click'
      );
      // eslint-disable-next-line no-await-in-loop
      await flushPromises();
      expect(consoleAPI.accounts).toHaveBeenLastCalledWith(
        expect.objectContaining({ filter, page: 1 })
      );
    }
  });

  it('searches by query and resets to page 1', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="search"]').setValue('mây');
    await wrapper.find('[data-testid="search-form"]').trigger('submit');
    await flushPromises();
    expect(consoleAPI.accounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'mây', page: 1 })
    );
  });

  it('paginates from meta', async () => {
    consoleAPI.accounts.mockResolvedValue(
      page([shop()], { count: 60, per_page: 25 })
    );
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.find('[data-testid="next-page"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.accounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it('Khóa shop asks for confirmation before PATCH', async () => {
    consoleAPI.updateAccount.mockResolvedValue({
      data: shop({ locked: true }),
    });
    const wrapper = mountPage();
    await flushPromises();
    await byText(wrapper, 'button', 'Khóa shop').trigger('click');
    expect(consoleAPI.updateAccount).not.toHaveBeenCalled();
    await wrapper.find('[data-testid="confirm-lock"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.updateAccount).toHaveBeenCalledTimes(1);
    expect(consoleAPI.updateAccount).toHaveBeenCalledWith(1042, {
      locked: true,
    });
    expect(wrapper.text()).toContain('Mở khóa');
  });

  it('Mở khóa also confirms and sends locked false', async () => {
    consoleAPI.accounts.mockResolvedValue(page([shop({ locked: true })]));
    consoleAPI.updateAccount.mockResolvedValue({ data: shop() });
    const wrapper = mountPage();
    await flushPromises();
    await byText(wrapper, 'button', 'Mở khóa').trigger('click');
    expect(consoleAPI.updateAccount).not.toHaveBeenCalled();
    await wrapper.find('[data-testid="confirm-lock"]').trigger('click');
    await flushPromises();
    expect(consoleAPI.updateAccount).toHaveBeenCalledWith(1042, {
      locked: false,
    });
  });

  it('Gia hạn sends extend_days bounded 1..365', async () => {
    consoleAPI.updateAccount.mockResolvedValue({ data: shop() });
    const wrapper = mountPage();
    await flushPromises();
    const input = wrapper.find('[data-testid="extend-days"]');
    const button = byText(wrapper, 'button', 'Gia hạn');
    await input.setValue('0');
    expect(button.attributes('disabled')).toBeDefined();
    await input.setValue('366');
    expect(button.attributes('disabled')).toBeDefined();
    await input.setValue('30');
    expect(button.attributes('disabled')).toBeUndefined();
    await button.trigger('click');
    await flushPromises();
    expect(consoleAPI.updateAccount).toHaveBeenCalledWith(1042, {
      extend_days: 30,
    });
  });

  it.each([404, 422])(
    'on %s PATCH shows a message and reloads',
    async status => {
      consoleAPI.updateAccount.mockRejectedValue({ response: { status } });
      const wrapper = mountPage();
      await flushPromises();
      await byText(wrapper, 'button', 'Khóa shop').trigger('click');
      await wrapper.find('[data-testid="confirm-lock"]').trigger('click');
      await flushPromises();
      expect(useAlert).toHaveBeenCalledWith('Không cập nhật được. Thử lại.');
      expect(consoleAPI.accounts).toHaveBeenCalledTimes(2);
    }
  );
});
