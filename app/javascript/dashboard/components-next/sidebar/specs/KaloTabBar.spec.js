import { mount } from '@vue/test-utils';
import Auth from 'dashboard/api/auth';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import KaloTabBar from '../KaloTabBar.vue';
import KaloGuideTabDot from 'next/guide/KaloGuideTabDot.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));

describe('KaloTabBar', () => {
  it('shows four primary items plus Thêm on screens under 768px and opens a sheet with the rest', async () => {
    const { router, store, i18n } = createKaloTestEnv({ unread: 3 });
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: {
        plugins: [router, store, i18n],
        stubs: { ComposeConversation: true },
      },
    });

    const tabs = wrapper
      .findAll('[data-test-id^="kalo-tab-"]')
      .map(tab => tab.text().replace(/\d+$/, '').trim());
    expect(tabs).toEqual(['Tin nhắn', 'Đơn hàng', 'Khách', 'Báo cáo', 'Thêm']);
    expect(wrapper.find('[data-test-id="kalo-more-sheet"]').exists()).toBe(
      false
    );

    await wrapper.find('[data-test-id="kalo-tab-more"]').trigger('click');
    const sheet = wrapper.find('[data-test-id="kalo-more-sheet"]');
    expect(sheet.exists()).toBe(true);
    expect(sheet.text()).toContain('Chiến dịch');
    expect(sheet.text()).toContain('Console');
    expect(sheet.text()).toContain('Cài đặt');
    expect(sheet.text()).not.toContain('Nền tảng');
  });

  it('orders the Thêm sheet by spec §4: Vận hành, Tăng trưởng, then Console and Cài đặt', async () => {
    const { router, store, i18n } = createKaloTestEnv();
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: {
        plugins: [router, store, i18n],
        stubs: { ComposeConversation: true },
      },
    });
    await wrapper.find('[data-test-id="kalo-tab-more"]').trigger('click');
    const sheet = wrapper.find('[data-test-id="kalo-more-sheet"]');
    expect(
      sheet.findAll('[data-test-id="kalo-sheet-section"]').map(s => s.text())
    ).toEqual(['Vận hành', 'Tăng trưởng']);
    const order = sheet
      .findAll('[data-test-id^="kalo-sheet-"]')
      .map(el => el.attributes('data-test-id'))
      .filter(id => id !== 'kalo-sheet-section');
    expect(order.slice(0, 8)).toEqual([
      'kalo-sheet-item-overview',
      'kalo-sheet-item-comments',
      'kalo-sheet-item-campaigns',
      'kalo-sheet-item-brand',
      'kalo-sheet-item-posts',
      'kalo-sheet-item-console',
      'kalo-sheet-item-settings',
      'kalo-sheet-notifications',
    ]);
  });

  it('the Thêm sheet links to Nền tảng for SuperAdmin', async () => {
    const { router, store, i18n } = createKaloTestEnv({
      userType: 'SuperAdmin',
    });
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: {
        plugins: [router, store, i18n],
        stubs: { ComposeConversation: true },
      },
    });
    await wrapper.find('[data-test-id="kalo-tab-more"]').trigger('click');
    const link = wrapper.find('[data-test-id="kalo-sheet-platform"]');
    expect(link.text()).toBe('Nền tảng');
    // kaloTestHelpers mounts every route under /app/accounts/:accountId/<name>;
    // the real path (/app/platform/overview) is covered by platform/routes.spec.js.
    expect(link.attributes('href')).toBe(
      '/app/accounts/1/kalo_platform_overview'
    );
  });

  it('tab bar sheet contains logout', async () => {
    const { router, store, i18n } = createKaloTestEnv();
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: {
        plugins: [router, store, i18n],
        stubs: { ComposeConversation: true },
      },
    });
    await wrapper.find('[data-test-id="kalo-tab-more"]').trigger('click');
    const sheet = wrapper.find('[data-test-id="kalo-more-sheet"]');
    ['Thông báo', 'Tìm kiếm', 'Hồ sơ', 'Đăng xuất'].forEach(label =>
      expect(sheet.text()).toContain(label)
    );
    expect(
      sheet.find('[data-test-id="kalo-sheet-switch-account"]').exists()
    ).toBe(false);
    await sheet.find('[data-test-id="kalo-sheet-logout"]').trigger('click');
    expect(Auth.logout).toHaveBeenCalled();
  });

  const openSheet = async env => {
    await env.router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      attachTo: document.body,
      global: {
        plugins: [env.router, env.store, env.i18n],
        stubs: { ComposeConversation: true },
      },
    });
    await wrapper.find('[data-test-id="kalo-tab-more"]').trigger('click');
    return wrapper;
  };

  it('keeps the create-account entry for a single account when the flag is on', async () => {
    const wrapper = await openSheet(
      createKaloTestEnv({ createNewAccount: true })
    );
    expect(
      wrapper.find('[data-test-id="kalo-sheet-switch-account"]').text()
    ).toContain('Tạo cửa hàng mới');
    wrapper.unmount();
  });

  it('closes the sheet on Escape and on backdrop click', async () => {
    const wrapper = await openSheet(createKaloTestEnv());
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test-id="kalo-more-sheet"]').exists()).toBe(
      false
    );
    await wrapper.find('[data-test-id="kalo-tab-more"]').trigger('click');
    await wrapper
      .find('[data-test-id="kalo-drawer-backdrop"]')
      .trigger('click');
    expect(wrapper.find('[data-test-id="kalo-more-sheet"]').exists()).toBe(
      false
    );
    wrapper.unmount();
  });

  it('lists message filters inside the sheet and registers shortcuts', async () => {
    const wrapper = await openSheet(
      createKaloTestEnv({ inboxes: [{ id: 3, name: 'Zalo shop' }] })
    );
    expect(wrapper.find('[data-test-id="kalo-more-sheet"]').text()).toContain(
      'Zalo shop'
    );
    expect(useKeyboardEvents).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('carries the guide dot inside the Thêm tab', async () => {
    const { router, store, i18n } = createKaloTestEnv();
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: {
        plugins: [router, store, i18n],
        stubs: { ComposeConversation: true },
      },
    });
    expect(
      wrapper
        .find('[data-test-id="kalo-tab-more"]')
        .findComponent(KaloGuideTabDot)
        .exists()
    ).toBe(true);
  });
});
