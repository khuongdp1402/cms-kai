import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import KaloDrawer from '../KaloDrawer.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'vi',
  messages: { vi: viMessages },
});

const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount());
  document.body.innerHTML = '';
});

const mountDrawer = ({
  props = {},
  slots = {},
  attrs = {},
  attachTo = document.body,
} = {}) => {
  const wrapper = mount(KaloDrawer, {
    props: { title: 'Tạo đơn', ...props },
    attrs,
    slots: {
      default:
        '<input data-test="first" /><p>Nội dung</p><input data-test="last" />',
      footer: '<button data-test="save">Lưu</button>',
      ...slots,
    },
    attachTo,
    global: { plugins: [i18n] },
  });
  wrappers.push(wrapper);
  return wrapper;
};

const press = (key, options = {}) =>
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...options })
  );

describe('KaloDrawer', () => {
  it('renders a labelled modal dialog with sticky header, scrolling body and footer slot', () => {
    const wrapper = mountDrawer({ attrs: { 'data-test': 'my-drawer' } });
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('data-test')).toBe('my-drawer');
    const title = wrapper.find(`#${dialog.attributes('aria-labelledby')}`);
    expect(title.text()).toBe('Tạo đơn');
    expect(
      wrapper.find('[data-test-id="kalo-drawer-body"]').classes()
    ).toContain('overflow-y-auto');
    expect(wrapper.find('[data-test-id="kalo-drawer-footer"]').text()).toBe(
      'Lưu'
    );
  });

  it('is 460px wide on desktop and full screen on mobile', () => {
    const classes = mountDrawer().find('[role="dialog"]').classes();
    expect(classes).toEqual(
      expect.arrayContaining(['w-full', 'h-full', 'sm:max-w-[460px]'])
    );
  });

  it('has a close button with a Vietnamese label', async () => {
    const wrapper = mountDrawer();
    const close = wrapper.find('[data-test-id="kalo-drawer-close"]');
    expect(close.attributes('aria-label')).toBe('Đóng');
    await close.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('closes on Esc and on a backdrop click, not on a click inside', async () => {
    const wrapper = mountDrawer();
    press('Escape');
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper.find('[role="dialog"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper
      .find('[data-test-id="kalo-drawer-backdrop"]')
      .trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('also sees an Esc dispatched on document (non bubbling)', () => {
    const wrapper = mountDrawer();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('moves focus into the panel and traps Tab inside it', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const wrapper = mountDrawer();
    await flushPromises();
    const panel = wrapper.find('[role="dialog"]').element;
    expect(panel.contains(document.activeElement)).toBe(true);

    const save = wrapper.find('[data-test="save"]').element;
    const close = wrapper.find('[data-test-id="kalo-drawer-close"]').element;
    save.focus();
    press('Tab');
    expect(document.activeElement).toBe(close);
    close.focus();
    press('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(save);

    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(document.activeElement).toBe(opener);
  });

  it('only the topmost drawer reacts to Esc', () => {
    const below = mountDrawer();
    const top = mountDrawer({ props: { title: 'Chi tiết' } });
    press('Escape');
    expect(top.emitted('close')).toHaveLength(1);
    expect(below.emitted('close')).toBeUndefined();
  });

  it('can open as a bottom sheet', () => {
    const wrapper = mountDrawer({ props: { placement: 'bottom' } });
    expect(wrapper.find('[role="dialog"]').classes()).toContain(
      'rounded-t-2xl'
    );
    expect(
      wrapper.find('[data-test-id="kalo-drawer-backdrop"]').classes()
    ).toContain('items-end');
  });

  it('leaves Esc from a popover layered above it (outside the panel) to that popover', () => {
    const wrapper = mountDrawer();
    const popover = document.createElement('div');
    popover.innerHTML = '<input data-test="popover-input" />';
    document.body.appendChild(popover);
    const outside = popover.querySelector('input');
    outside.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(wrapper.emitted('close')).toBeUndefined();

    wrapper
      .find('[data-test="first"]')
      .element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('locks the page scroll container behind it while open', () => {
    const scroller = document.createElement('section');
    scroller.style.overflowY = 'auto';
    const host = document.createElement('div');
    scroller.appendChild(host);
    document.body.appendChild(scroller);
    const wrapper = mountDrawer({ attachTo: host });
    expect(scroller.classList.contains('!overflow-hidden')).toBe(true);
    expect(document.body.classList.contains('!overflow-hidden')).toBe(true);
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(scroller.classList.contains('!overflow-hidden')).toBe(false);
    expect(document.body.classList.contains('!overflow-hidden')).toBe(false);
  });

  it('keeps the lock until the last of two stacked drawers closes', () => {
    const below = mountDrawer();
    const top = mountDrawer({ props: { title: 'Chi tiết' } });
    top.unmount();
    wrappers.splice(wrappers.indexOf(top), 1);
    expect(document.body.classList.contains('!overflow-hidden')).toBe(true);
    below.unmount();
    wrappers.splice(wrappers.indexOf(below), 1);
    expect(document.body.classList.contains('!overflow-hidden')).toBe(false);
  });
});
