import { mount } from '@vue/test-utils';
import KaloTabBar from '../KaloTabBar.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

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
});
