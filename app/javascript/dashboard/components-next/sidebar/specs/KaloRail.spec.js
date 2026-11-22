import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { provideDropdownContext } from 'next/dropdown-menu/base/provider';
import Auth from 'dashboard/api/auth';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import KaloRail from '../KaloRail.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

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
        ComposeConversation: true,
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
  // Guided UX spec §4: Vận hành, Tăng trưởng, then the footer items.
  it('renders the spec §4 order: Tổng quan, Tin nhắn, Bình luận, Khách, Đơn hàng, Chiến dịch, Thương hiệu, Đăng bài, Báo cáo, Console, Cài đặt', async () => {
    const wrapper = await mountRail();
    const labels = wrapper
      .findAll('[data-test-id^="kalo-nav-"]')
      .map(item => item.text().replace(/\d+$/, '').trim());
    expect(labels).toEqual([
      'Tổng quan',
      'Tin nhắn',
      'Bình luận',
      'Khách',
      'Đơn hàng',
      'Chiến dịch',
      'Thương hiệu',
      'Đăng bài',
      'Báo cáo',
      'Console',
      'Cài đặt',
    ]);
  });

  it('hides Bình luận, Chiến dịch and Thương hiệu when their kalo flags are off', async () => {
    const wrapper = await mountRail({
      features: { kalo_campaigns: true },
    });
    const keys = wrapper
      .findAll('[data-test-id^="kalo-nav-"]')
      .map(item => item.attributes('data-test-id'));
    expect(keys).toContain('kalo-nav-campaigns');
    expect(keys).not.toContain('kalo-nav-comments');
    expect(keys).not.toContain('kalo-nav-brand');
    expect(keys).not.toContain('kalo-nav-posts');
  });

  it('shows Console to shop administrators only', async () => {
    const admin = await mountRail();
    expect(admin.find('[data-test-id="kalo-nav-console"]').exists()).toBe(true);
    const agent = await mountRail({
      accounts: [
        { id: 1, name: 'Shop', role: 'agent', permissions: ['agent'] },
      ],
    });
    expect(agent.find('[data-test-id="kalo-nav-console"]').exists()).toBe(
      false
    );
    expect(agent.find('[data-test-id="kalo-nav-settings"]').exists()).toBe(
      true
    );
  });

  it('toggles between compact (68px, icons only) and expanded (224px) mode via toggle button', async () => {
    const wrapper = await mountRail();
    const nav = wrapper.find('nav');
    expect(nav.attributes('data-expanded')).toBe('false');
    expect(nav.classes()).toContain('w-[68px]');
    await wrapper.find('[data-test-id="kalo-rail-toggle"]').trigger('click');
    expect(nav.attributes('data-expanded')).toBe('true');
    expect(nav.classes()).toContain('w-[224px]');
    expect(nav.text()).toContain('Vận hành');
    expect(nav.text()).toContain('Tăng trưởng');
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

  it('marks Chiến dịch active on a campaigns route', async () => {
    const wrapper = await mountRail({ route: 'campaigns_livechat_index' });
    await flushPromises();
    const active = wrapper.findAll('[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].attributes('data-test-id')).toBe('kalo-nav-campaigns');
  });

  it('profile menu links to Nền tảng for SuperAdmin only', async () => {
    const admin = await mountRail({ userType: 'SuperAdmin' });
    expect(admin.text()).toContain('Nền tảng');
    const shop = await mountRail();
    expect(shop.text()).not.toContain('Nền tảng');
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
    const logout = wrapper
      .findAll('button')
      .find(el => el.text() === 'Đăng xuất');
    await logout.trigger('click');
    expect(Auth.logout).toHaveBeenCalled();
  });

  it('keeps the create-account entry for a single account when the flag is on', async () => {
    const off = await mountRail();
    expect(off.findComponent({ name: 'SidebarAccountSwitcher' }).exists()).toBe(
      false
    );
    const on = await mountRail({ createNewAccount: true });
    expect(on.findComponent({ name: 'SidebarAccountSwitcher' }).exists()).toBe(
      true
    );
  });

  it('registers the keyboard shortcuts and maps Alt+V to an existing contacts route', async () => {
    const wrapper = await mountRail();
    const events = useKeyboardEvents.mock.calls.at(-1)[0];
    expect(Object.keys(events)).toEqual(
      expect.arrayContaining(['$mod+Slash', '$mod+Escape', 'Alt+KeyV'])
    );
    events['$mod+Slash'].action();
    expect(wrapper.emitted('openKeyShortcutModal')).toHaveLength(1);
    events['$mod+Escape'].action();
    expect(wrapper.emitted('closeKeyShortcutModal')).toHaveLength(1);
    await events['Alt+KeyV'].action();
    await flushPromises();
    expect(wrapper.vm.$router.currentRoute.value.name).toBe(
      'contacts_dashboard_index'
    );
  });

  // Guided UX §2: submenus only exist in the expanded rail.
  it('has a filters trigger beside Tin nhắn', async () => {
    const wrapper = await mountRail();
    await wrapper.find('[data-test-id="kalo-rail-toggle"]').trigger('click');
    expect(wrapper.find('[data-test-id="kalo-filters-trigger"]').exists()).toBe(
      true
    );
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

  // Kalo UI phase 2 (1b-i): the Chatwoot Sidebar used to load these lists; without them the
  // chat list had no inbox names / channel badges and showed the "no channel" welcome.
  it('loads the account lists the chat screens read from the store', async () => {
    const { router, store, i18n } = createKaloTestEnv();
    const dispatch = vi.spyOn(store, 'dispatch').mockImplementation(() => {});
    await router.push({ name: 'home', params: { accountId: 1 } });
    wrappers.push(
      mount(KaloRail, {
        global: {
          plugins: [router, store, i18n],
          stubs: { SidebarProfileMenuStatus: true, ComposeConversation: true },
        },
      })
    );
    const calls = dispatch.mock.calls.map(c => c.slice(0, 2).join(':'));
    expect(calls).toEqual(
      expect.arrayContaining([
        'labels/get',
        'inboxes/get',
        'teams/get',
        'attributes/get',
        'customViews/get:conversation',
        'customViews/get:contact',
      ])
    );
  });
});
