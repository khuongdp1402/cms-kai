import { mount, flushPromises } from '@vue/test-utils';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import KaloRail from '../KaloRail.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

vi.mock('dashboard/api/auth', () => ({ default: { logout: vi.fn() } }));
vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));

// Guided UX spec §2: collapsed rail = icons + tooltips, submenus only when
// expanded, toggle at the header junction, ⌘\ shortcut, state kept per user.
const wrappers = [];
afterEach(() => wrappers.forEach(w => w.unmount()));

const mountRail = async ({ route = 'kalo_orders', ...envOptions } = {}) => {
  const env = createKaloTestEnv({
    inboxes: [{ id: 3, name: 'Zalo shop' }],
    ...envOptions,
  });
  await env.router.push({ name: route, params: { accountId: 1 } });
  const wrapper = mount(KaloRail, {
    attachTo: document.body,
    global: {
      plugins: [env.router, env.store, env.i18n],
      stubs: { SidebarProfileMenuStatus: true, ComposeConversation: true },
    },
  });
  wrappers.push(wrapper);
  return { wrapper, ...env };
};

const nav = wrapper => wrapper.find('nav');
const item = (wrapper, key) => wrapper.find(`[data-test-id="kalo-nav-${key}"]`);
const tooltip = wrapper => wrapper.find('[data-test-id="kalo-rail-tooltip"]');

describe('KaloRail shell behaviour', () => {
  it('shows only icons while collapsed: item names are screen-reader text', async () => {
    const { wrapper } = await mountRail();
    const label = item(wrapper, 'orders').find('span');
    expect(label.text()).toBe('Đơn hàng');
    expect(label.classes()).toContain('sr-only');
    expect(nav(wrapper).text()).not.toContain('Vận hành');
  });

  it('shows the item name in a tooltip on hover and hides it on leave', async () => {
    const { wrapper } = await mountRail();
    const holder = item(wrapper, 'customers').element.parentElement
      .parentElement;
    await holder.dispatchEvent(new MouseEvent('mouseenter'));
    await flushPromises();
    expect(tooltip(wrapper).text()).toBe('Khách');
    expect(tooltip(wrapper).attributes('role')).toBe('tooltip');
    expect(item(wrapper, 'customers').attributes('aria-describedby')).toBe(
      tooltip(wrapper).attributes('id')
    );
    holder.dispatchEvent(new MouseEvent('mouseleave'));
    await flushPromises();
    expect(tooltip(wrapper).exists()).toBe(false);
  });

  it('shows the tooltip on keyboard focus too', async () => {
    const { wrapper } = await mountRail();
    await item(wrapper, 'reports').trigger('focusin');
    expect(tooltip(wrapper).text()).toBe('Báo cáo');
    await item(wrapper, 'reports').trigger('focusout');
    expect(tooltip(wrapper).exists()).toBe(false);
  });

  it('never shows tooltips when expanded (the names are visible)', async () => {
    const { wrapper } = await mountRail();
    await wrapper.find('[data-test-id="kalo-rail-toggle"]').trigger('click');
    await item(wrapper, 'reports').trigger('focusin');
    expect(tooltip(wrapper).exists()).toBe(false);
    expect(item(wrapper, 'reports').find('span').classes()).not.toContain(
      'sr-only'
    );
  });

  it('hides the Tin nhắn submenu while collapsed, even on a message route', async () => {
    const { wrapper } = await mountRail({ route: 'home' });
    expect(wrapper.find('[data-test-id="kalo-filters-submenu"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-id="kalo-filters-trigger"]').exists()).toBe(
      false
    );
  });

  it('clicking Tin nhắn while collapsed expands the rail and opens its submenu under it', async () => {
    const { wrapper } = await mountRail();
    await item(wrapper, 'messages').trigger('click');
    await flushPromises();
    expect(nav(wrapper).attributes('data-expanded')).toBe('true');
    const submenu = wrapper.find('[data-test-id="kalo-filters-submenu"]');
    expect(submenu.text()).toContain('Zalo shop');
    // Rendered inside the Tin nhắn entry, right below its link.
    const parent = item(wrapper, 'messages').element.parentElement
      .parentElement;
    expect(parent.contains(submenu.element)).toBe(true);
  });

  it('clicking an item without submenu while collapsed keeps the rail collapsed', async () => {
    const { wrapper } = await mountRail();
    await item(wrapper, 'reports').trigger('click');
    await flushPromises();
    expect(nav(wrapper).attributes('data-expanded')).toBe('false');
  });

  it('opens the active submenu when expanded and folds it with the chevron', async () => {
    const { wrapper } = await mountRail({ route: 'home' });
    await wrapper.find('[data-test-id="kalo-rail-toggle"]').trigger('click');
    const trigger = wrapper.find('[data-test-id="kalo-filters-trigger"]');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-test-id="kalo-filters-submenu"]').exists()).toBe(
      true
    );
    await trigger.trigger('click');
    expect(wrapper.find('[data-test-id="kalo-filters-submenu"]').exists()).toBe(
      false
    );
  });

  it('places the toggle at the sidebar edge, labelled with the shortcut', async () => {
    const { wrapper } = await mountRail();
    const toggle = wrapper.find('[data-test-id="kalo-rail-toggle"]');
    expect(toggle.classes()).toEqual(
      expect.arrayContaining(['absolute', 'ltr:-right-3'])
    );
    expect(toggle.attributes('aria-label')).toContain('⌘\\');
    expect(toggle.attributes('aria-expanded')).toBe('false');
  });

  it('persists the state per user in uiSettings and restores it', async () => {
    const { wrapper, store } = await mountRail({ uiSettings: {} });
    const dispatch = vi.spyOn(store, 'dispatch');
    await wrapper.find('[data-test-id="kalo-rail-toggle"]').trigger('click');
    expect(dispatch).toHaveBeenCalledWith('updateUISettings', {
      uiSettings: { is_kalo_rail_expanded: true },
    });
    expect(nav(wrapper).attributes('data-expanded')).toBe('true');

    const restored = await mountRail({
      uiSettings: { is_kalo_rail_expanded: true },
    });
    expect(nav(restored.wrapper).attributes('data-expanded')).toBe('true');
  });

  it('toggles with ⌘\\ / Ctrl+\\', async () => {
    const { wrapper } = await mountRail();
    const events = useKeyboardEvents.mock.calls.at(-1)[0];
    events['$mod+Backslash'].action();
    await flushPromises();
    expect(nav(wrapper).attributes('data-expanded')).toBe('true');
    events['$mod+Backslash'].action();
    await flushPromises();
    expect(nav(wrapper).attributes('data-expanded')).toBe('false');
  });

  it('stays collapsed on the POS screen', async () => {
    const { wrapper } = await mountRail({
      route: 'kalo_pos',
      uiSettings: { is_kalo_rail_expanded: true },
    });
    expect(nav(wrapper).attributes('data-expanded')).toBe('false');
  });

  it('gives the collapsed footer icons the same name tooltip on hover and focus', async () => {
    const { wrapper } = await mountRail();
    const footer = wrapper.find('[data-test-id="kalo-rail-footer"]');
    const search = footer.find('[data-test-id="kalo-search"]');
    await search.trigger('focusin');
    await flushPromises();
    const tip = footer.find('[data-test-id="kalo-rail-tooltip"]');
    expect(tip.text()).toBe('Tìm kiếm');
    expect(search.attributes('aria-describedby')).toBe(tip.attributes('id'));
    await search.trigger('focusout');
    await flushPromises();
    expect(footer.find('[data-test-id="kalo-rail-tooltip"]').exists()).toBe(
      false
    );
    expect(search.attributes('aria-describedby')).toBeUndefined();

    const bell = footer.find('button[aria-label="Thông báo"]');
    await bell.element.parentElement.dispatchEvent(
      new MouseEvent('mouseenter')
    );
    await flushPromises();
    expect(footer.find('[data-test-id="kalo-rail-tooltip"]').text()).toBe(
      'Thông báo'
    );

    const profile = footer.find('button[title="Lan"]');
    await profile.trigger('focusin');
    await flushPromises();
    expect(
      footer.findAll('[data-test-id="kalo-rail-tooltip"]').map(t => t.text())
    ).toContain('Lan');
  });

  it('shows no footer tooltips when expanded', async () => {
    const { wrapper } = await mountRail();
    await wrapper.find('[data-test-id="kalo-rail-toggle"]').trigger('click');
    await wrapper.find('[data-test-id="kalo-search"]').trigger('focusin');
    expect(wrapper.find('[data-test-id="kalo-rail-tooltip"]').exists()).toBe(
      false
    );
  });
});
