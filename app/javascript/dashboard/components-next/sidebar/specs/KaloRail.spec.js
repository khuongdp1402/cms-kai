import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { provideDropdownContext } from 'next/dropdown-menu/base/provider';
import KaloRail from '../KaloRail.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

const wrappers = [];
afterEach(() => wrappers.forEach(w => w.unmount()));

const mountRail = async ({ route = 'home', ...envOptions } = {}) => {
  const { router, store, i18n } = createKaloTestEnv(envOptions);
  await router.push({ name: route, params: { accountId: 1 } });
  const wrapper = mount(KaloRail, {
    global: {
      plugins: [router, store, i18n],
      stubs: {
        SidebarProfileMenuStatus: true,
        // DropdownContainer never re-renders open under jsdom here; render it open.
        DropdownContainer: {
          setup() {
            provideDropdownContext({
              isOpen: ref(true),
              toggle: () => {},
              closeMenu: () => {},
            });
          },
          template:
            '<div><slot name="trigger" :toggle="() => {}" :is-open="true" /><slot /></div>',
        },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
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

  it('marks Marketing active on a campaigns route', async () => {
    const wrapper = await mountRail({ route: 'campaigns_livechat_index' });
    await flushPromises();
    const active = wrapper.findAll('[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].attributes('data-test-id')).toBe('kalo-nav-marketing');
  });

  it('shows bell with unread badge', async () => {
    const wrapper = await mountRail({ notificationUnread: 5 });
    expect(wrapper.find('[data-test-id="kalo-rail-footer"]').text()).toContain(
      '5'
    );
  });

  it('opens profile menu which contains a logout action', async () => {
    const wrapper = await mountRail();
    const trigger = wrapper.find(
      '[data-test-id="kalo-rail-footer"] button[title="Lan"]'
    );
    expect(trigger.exists()).toBe(true);
    expect(wrapper.text()).toContain('Đăng xuất');
  });

  it('hides account switcher for a single account and shows it for several', async () => {
    const single = await mountRail();
    expect(single.find('[title="Shop"]').exists()).toBe(false);
    const many = await mountRail({
      accounts: [
        { id: 1, name: 'Shop', role: 'administrator' },
        { id: 2, name: 'Shop 2', role: 'agent' },
      ],
    });
    expect(
      many.findComponent({ name: 'SidebarAccountSwitcher' }).exists()
    ).toBe(true);
    expect(
      single.findComponent({ name: 'SidebarAccountSwitcher' }).exists()
    ).toBe(false);
  });
});
