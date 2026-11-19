import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import ConsoleTeamCard from '../ConsoleTeamCard.vue';

const mountCard = async ({ agents, teams }) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['agent_list', 'settings_teams_list'].map(name => ({
      name,
      path: `/app/accounts/:accountId/${name}`,
      component: { template: '<div />' },
    })),
  });
  await router.push({ name: 'agent_list', params: { accountId: 1 } });
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      'agents/getAgents': () => agents,
      'teams/getTeams': () => teams,
    },
    actions: {
      'agents/get': vi.fn(),
      'teams/get': vi.fn(),
      'inboxes/get': vi.fn(),
    },
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  return mount(ConsoleTeamCard, {
    global: {
      plugins: [router, store, i18n],
      stubs: { ConsoleInviteDrawer: true, ConsoleAddToInboxDrawer: true },
    },
  });
};

const OWNER = {
  id: 1,
  name: 'Chủ shop',
  email: 'a@shop.vn',
  role: 'administrator',
};

describe('ConsoleTeamCard empty states', () => {
  it('owner only: one sentence and one invite button that opens the drawer', async () => {
    const wrapper = await mountCard({ agents: [OWNER], teams: [] });
    const empty = wrapper.find('[data-test="console-team-empty"]');
    expect(empty.find('p').text()).toBe(
      'Hiện chỉ có bạn trong shop, hãy mời thêm người bán cùng.'
    );
    expect(empty.findAll('button')).toHaveLength(1);
    await wrapper
      .find('[data-test="console-team-empty-invite"]')
      .trigger('click');
    expect(
      wrapper.findComponent({ name: 'ConsoleInviteDrawer' }).exists()
    ).toBe(true);
  });

  it('no teams: one sentence and a link to create a team', async () => {
    const wrapper = await mountCard({ agents: [OWNER], teams: [] });
    const empty = wrapper.find('[data-test="console-teams-empty"]');
    expect(empty.find('p').text()).toBe('Chưa có nhóm nào.');
    expect(
      empty.find('[data-test="console-teams-empty-create"]').attributes('href')
    ).toBe('/app/accounts/1/settings_teams_list');
  });

  it('shows no empty hints with several agents and a team', async () => {
    const wrapper = await mountCard({
      agents: [OWNER, { ...OWNER, id: 2, role: 'agent' }],
      teams: [{ id: 3, name: 'Bán hàng' }],
    });
    expect(wrapper.find('[data-test="console-team-empty"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test="console-teams-empty"]').exists()).toBe(
      false
    );
  });
});
