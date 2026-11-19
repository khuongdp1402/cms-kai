import { mount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import InboxMembersAPI from 'dashboard/api/inboxMembers';
import ConsoleAddToInboxDrawer from '../ConsoleAddToInboxDrawer.vue';

vi.mock('dashboard/composables', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/api/inboxMembers', () => ({
  default: { show: vi.fn(), create: vi.fn() },
}));

describe('ConsoleAddToInboxDrawer', () => {
  it('re-reads memberships when the inbox list loads after the drawer opened', async () => {
    InboxMembersAPI.show.mockImplementation(inboxId =>
      Promise.resolve({
        data: { payload: inboxId === 11 ? [{ id: 5 }] : [] },
      })
    );
    const store = createStore({
      state: { inboxes: [] },
      getters: { 'inboxes/getInboxes': state => state.inboxes },
      mutations: {
        setInboxes(state, inboxes) {
          state.inboxes = inboxes;
        },
      },
    });
    const i18n = createI18n({
      legacy: false,
      locale: 'vi',
      messages: { vi: viMessages },
    });
    const wrapper = mount(ConsoleAddToInboxDrawer, {
      attachTo: document.body,
      props: { agent: { id: 5, name: 'Lan' } },
      global: { plugins: [store, i18n], stubs: { ChannelIcon: true } },
    });
    await flushPromises();
    expect(InboxMembersAPI.show).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Chưa có kênh nào');

    store.commit('setInboxes', [
      { id: 10, name: 'Website' },
      { id: 11, name: 'Fanpage' },
    ]);
    await flushPromises();

    expect(InboxMembersAPI.show).toHaveBeenCalledWith(10);
    expect(InboxMembersAPI.show).toHaveBeenCalledWith(11);
    const member = wrapper.find('[data-test="console-inbox-11"]');
    expect(member.element.disabled).toBe(true);
    expect(member.element.checked).toBe(true);
    expect(
      wrapper.find('[data-test="console-inbox-10"]').element.disabled
    ).toBe(false);
    wrapper.unmount();
  });
});
