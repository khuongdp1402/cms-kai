import { mount, flushPromises } from '@vue/test-utils';
import KaloRail from '../KaloRail.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

const mountRail = async ({ unread = 0, route = 'home' } = {}) => {
  const { router, store, i18n } = createKaloTestEnv({ unread });
  await router.push({ name: route, params: { accountId: 1 } });
  return mount(KaloRail, {
    global: { plugins: [router, store, i18n] },
  });
};

describe('KaloRail', () => {
  it('renders exactly six items in order Tin nhắn, Đơn hàng, Khách, Marketing, Báo cáo, Cài đặt', async () => {
    const wrapper = await mountRail();
    const labels = wrapper
      .findAll('[data-test-id^="kalo-nav-"]')
      .map(item => item.text().replace(/\d+$/, '').trim());
    expect(labels).toEqual([
      'Tin nhắn',
      'Đơn hàng',
      'Khách',
      'Marketing',
      'Báo cáo',
      'Cài đặt',
    ]);
  });

  it('marks the item matching the current route as active', async () => {
    const wrapper = await mountRail({ route: 'contacts_dashboard_index' });
    await flushPromises();
    const active = wrapper.findAll('[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].attributes('data-test-id')).toBe('kalo-nav-customers');
  });

  it('shows unread count on Tin nhắn from the store getter and hides it at 0', async () => {
    const withUnread = await mountRail({ unread: 12 });
    expect(withUnread.find('[data-test-id="kalo-badge"]').text()).toBe('12');
    const without = await mountRail({ unread: 0 });
    expect(without.find('[data-test-id="kalo-badge"]').exists()).toBe(false);
  });

  it('POS is not a nav item', async () => {
    const wrapper = await mountRail();
    expect(wrapper.find('[data-test-id="kalo-nav-pos"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Bán tại quầy');
  });
});
