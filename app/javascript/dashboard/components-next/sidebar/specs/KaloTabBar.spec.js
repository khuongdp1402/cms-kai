import { mount } from '@vue/test-utils';
import Auth from 'dashboard/api/auth';
import KaloTabBar from '../KaloTabBar.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));

describe('KaloTabBar', () => {
  it('shows four primary items plus Thêm on screens under 768px and opens a sheet with the rest', async () => {
    const { router, store, i18n } = createKaloTestEnv({ unread: 3 });
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: { plugins: [router, store, i18n] },
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
    expect(sheet.text()).toContain('Marketing');
    expect(sheet.text()).toContain('Cài đặt');
  });

  it('tab bar sheet contains logout', async () => {
    const { router, store, i18n } = createKaloTestEnv();
    await router.push({ name: 'home', params: { accountId: 1 } });
    const wrapper = mount(KaloTabBar, {
      global: { plugins: [router, store, i18n] },
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
});
