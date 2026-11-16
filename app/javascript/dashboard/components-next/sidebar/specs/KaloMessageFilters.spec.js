import { mount, flushPromises } from '@vue/test-utils';
import KaloMessageFilters from '../KaloMessageFilters.vue';
import { createKaloTestEnv } from './kaloTestHelpers';

const mountFilters = async (options, props = { inline: true }) => {
  const { router, store, i18n } = createKaloTestEnv(options);
  await router.push({ name: 'home', params: { accountId: 1 } });
  return mount(KaloMessageFilters, {
    props,
    global: {
      plugins: [router, store, i18n],
      stubs: {
        ComposeConversation: true,
        RouterLink: {
          name: 'RouterLink',
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  });
};

describe('KaloMessageFilters', () => {
  it('lists inboxes, labels, teams and folders linking to the right routes', async () => {
    const wrapper = await mountFilters({
      inboxes: [{ id: 3, name: 'Zalo shop' }],
      labels: [{ id: 4, title: 'vip' }],
      teams: [{ id: 5, name: 'Chốt đơn' }],
      folders: [{ id: 6, name: 'Chưa trả lời' }],
    });
    const links = wrapper
      .findAllComponents({ name: 'RouterLink' })
      .map(link => [link.text(), link.props('to').name]);
    expect(links).toEqual([
      ['Zalo shop', 'inbox_dashboard'],
      ['vip', 'label_conversations'],
      ['Chốt đơn', 'team_conversations'],
      ['Chưa trả lời', 'folder_conversations'],
    ]);
  });

  it('hides empty sections', async () => {
    const wrapper = await mountFilters({ labels: [{ id: 4, title: 'vip' }] });
    expect(wrapper.text()).toContain('Nhãn');
    expect(wrapper.text()).not.toContain('Hộp thư');
    expect(wrapper.text()).not.toContain('Nhóm');
  });

  it('opens from the chevron trigger when not inline', async () => {
    const wrapper = await mountFilters(
      { inboxes: [{ id: 3, name: 'Zalo shop' }] },
      {}
    );
    expect(wrapper.text()).not.toContain('Zalo shop');
    await wrapper
      .find('[data-test-id="kalo-filters-trigger"]')
      .trigger('click');
    expect(wrapper.text()).toContain('Zalo shop');
  });

  it('stays open for clicks in the teleported compose form, closes on outside clicks and link clicks', async () => {
    const { router, store, i18n } = createKaloTestEnv({
      inboxes: [{ id: 3, name: 'Zalo shop' }],
    });
    await router.push({ name: 'home', params: { accountId: 1 } });
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const wrapper = mount(KaloMessageFilters, {
      attachTo: document.body,
      global: {
        plugins: [router, store, i18n],
        stubs: {
          // Mirrors the real Popover: content is teleported to body and
          // carries the data-popover-content attribute.
          ComposeConversation: {
            template: `<div data-test-id="compose-root"><slot name="trigger" />
              <Teleport to="body"><form data-popover-content data-test-id="compose-form" /></Teleport></div>`,
          },
          RouterLink: {
            name: 'RouterLink',
            props: ['to'],
            template: '<a data-test-id="filter-link"><slot /></a>',
          },
        },
      },
    });
    const isPanelOpen = () =>
      wrapper.find('[data-test-id="compose-root"]').exists();
    const click = async el => {
      // vueuse drops clicks that arrive before its 0ms processing timer resets.
      await new Promise(resolve => {
        setTimeout(resolve, 5);
      });
      // vueuse click-outside arms itself on pointerdown before the click.
      el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      await flushPromises();
    };

    await click(wrapper.find('[data-test-id="kalo-filters-trigger"]').element);
    expect(isPanelOpen()).toBe(true);

    await click(wrapper.find('[data-test-id="kalo-new-conversation"]').element);
    expect(isPanelOpen()).toBe(true);

    await click(document.querySelector('[data-test-id="compose-form"]'));
    expect(isPanelOpen()).toBe(true);

    await click(outside);
    expect(isPanelOpen()).toBe(false);

    await click(wrapper.find('[data-test-id="kalo-filters-trigger"]').element);
    expect(isPanelOpen()).toBe(true);
    await click(wrapper.find('[data-test-id="filter-link"]').element);
    expect(isPanelOpen()).toBe(false);

    wrapper.unmount();
    outside.remove();
  });
});
