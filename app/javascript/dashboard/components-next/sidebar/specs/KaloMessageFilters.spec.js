import { mount } from '@vue/test-utils';
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
});
