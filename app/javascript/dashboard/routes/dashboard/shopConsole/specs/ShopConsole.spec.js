import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import subscriptionAPI from 'dashboard/api/kchat/subscription';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';
import InboxMembersAPI from 'dashboard/api/inboxMembers';
import ShopConsole from '../ShopConsole.vue';
import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

const alertMock = vi.hoisted(() => vi.fn());
vi.mock('dashboard/composables', () => ({ useAlert: alertMock }));
vi.mock('dashboard/composables/useConfig', () => ({
  useConfig: () => ({
    enabledLanguages: [
      { name: 'Tiếng Việt', iso_639_1_code: 'vi' },
      { name: 'English', iso_639_1_code: 'en' },
    ],
  }),
}));
vi.mock('dashboard/api/kchat/subscription', () => ({
  default: { get: vi.fn() },
}));
vi.mock('dashboard/api/kchat/paymentSettings', () => ({
  default: { get: vi.fn() },
}));
vi.mock('dashboard/api/inboxMembers', () => ({
  default: { show: vi.fn(), create: vi.fn() },
}));

const ROUTES = [
  'kalo_console',
  'kalo_billing',
  'kalo_payment_settings',
  'general_settings_index',
  'agent_list',
  'settings_teams_list',
  'settings_inbox_list',
  'settings_inbox_new',
  'profile_settings_index',
];

const INBOXES = [
  { id: 10, name: 'Zalo Shop', channel_type: 'Channel::ZaloPersonal' },
  {
    id: 11,
    name: 'Fanpage',
    channel_type: 'Channel::FacebookPage',
    reauthorization_required: true,
  },
];

const mountConsole = async ({
  role = 'administrator',
  agents = [
    {
      id: 5,
      name: 'Lan',
      email: 'lan@shop.vn',
      role: 'agent',
      confirmed: true,
    },
  ],
  teams = [{ id: 3, name: 'Bán hàng' }],
  inboxes = INBOXES,
  query = {},
} = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...ROUTES.map(name => ({
        name,
        path: `/app/accounts/:accountId/${name}`,
        component: { template: '<div />' },
      })),
      {
        name: 'settings_inbox_show',
        path: '/app/accounts/:accountId/inbox/:inboxId',
        component: { template: '<div />' },
      },
    ],
  });
  await router.push({ name: 'kalo_console', params: { accountId: 1 }, query });

  const agentList = [...agents];
  const actions = {
    'agents/get': vi.fn(),
    'teams/get': vi.fn(),
    'inboxes/get': vi.fn(),
    'accounts/update': vi.fn(),
    'agents/create': vi.fn((_ctx, payload) => {
      agentList.push({ id: 9, confirmed: false, ...payload });
    }),
  };
  const store = createStore({
    getters: {
      getCurrentAccountId: () => 1,
      getCurrentUser: () => ({ accounts: [{ id: 1, role }] }),
      'accounts/getAccount': () => () => ({
        id: 1,
        name: 'Shop Hoa Mai',
        locale: 'vi',
        features: {},
      }),
      'accounts/getUIFlags': () => ({ isUpdating: false }),
      'agents/getAgents': () => agentList,
      'teams/getTeams': () => teams,
      'inboxes/getInboxes': () => inboxes,
    },
    actions,
  });
  const i18n = createI18n({
    legacy: false,
    locale: 'vi',
    messages: { vi: viMessages },
  });
  const wrapper = mount(ShopConsole, {
    attachTo: document.body,
    global: {
      plugins: [router, store, i18n],
      stubs: { ChannelIcon: true, Avatar: true },
    },
  });
  await flushPromises();
  return { wrapper, actions };
};

const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount());
});
const setup = async options => {
  const result = await mountConsole(options);
  wrappers.push(result.wrapper);
  return result;
};

describe('ShopConsole', () => {
  beforeEach(() => {
    alertMock.mockReset();
    subscriptionAPI.get.mockReset();
    subscriptionAPI.get.mockResolvedValue({
      data: {
        plan: null,
        status: 'trial',
        valid_until: '2026-12-03T00:00:00Z',
        days_left: 14,
      },
    });
    paymentSettingsAPI.get.mockReset();
    paymentSettingsAPI.get.mockResolvedValue({
      data: {
        bank_bin: '970436',
        bank_name: 'Vietcombank',
        account_number: '0123456789',
        account_name: 'NGUYEN VAN A',
      },
    });
    InboxMembersAPI.show.mockReset();
    InboxMembersAPI.create.mockReset();
    InboxMembersAPI.create.mockResolvedValue({ data: { payload: [] } });
  });

  it('shows the five shop sections to an administrator', async () => {
    const { wrapper } = await setup();
    expect(wrapper.find('[data-test-id="kalo-page-header"] h1').text()).toBe(
      'Console'
    );
    [
      ['console-shop', 'Cửa hàng'],
      ['console-team', 'Nhân viên và nhóm'],
      ['console-plan', 'Gói và dùng thử'],
      ['console-payment', 'Nhận tiền'],
      ['console-channels', 'Kênh đã nối'],
    ].forEach(([test, title]) => {
      const card = wrapper.find(`[data-test="${test}"]`);
      expect(card.attributes('data-test-id')).toBe('kalo-card');
      expect(card.find('h2').text()).toBe(title);
    });
  });

  it('shows an agent only a link to their own profile', async () => {
    const { wrapper } = await setup({ role: 'agent' });
    expect(wrapper.find('[data-test="console-sections"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="console-agent-only"]').exists()).toBe(
      true
    );
    expect(
      wrapper.find('[data-test="console-profile-link"]').attributes('href')
    ).toBe('/app/accounts/1/profile_settings_index');
    expect(subscriptionAPI.get).not.toHaveBeenCalled();
  });

  it('saves the shop name and language with accounts/update', async () => {
    const { wrapper, actions } = await setup();
    expect(wrapper.find('[data-test="console-shop-name"]').element.value).toBe(
      'Shop Hoa Mai'
    );
    await wrapper.find('[data-test="console-shop-name"]').setValue('Shop Mới');
    await wrapper.find('[data-test="console-shop-locale"]').setValue('en');
    await wrapper.find('[data-test="console-shop"] form').trigger('submit');
    await flushPromises();
    expect(actions['accounts/update']).toHaveBeenCalledWith(expect.anything(), {
      name: 'Shop Mới',
      locale: 'en',
    });
    expect(alertMock).toHaveBeenCalledWith('Đã lưu thông tin cửa hàng');
  });

  it('does not save an empty shop name', async () => {
    const { wrapper, actions } = await setup();
    await wrapper.find('[data-test="console-shop-name"]').setValue('  ');
    await wrapper.find('[data-test="console-shop"] form').trigger('submit');
    expect(actions['accounts/update']).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Nhập tên cửa hàng');
  });

  it('lists agents and teams', async () => {
    const { wrapper } = await setup();
    const agent = wrapper.find('[data-test="console-agent"]');
    expect(agent.text()).toContain('Lan');
    expect(agent.text()).toContain('lan@shop.vn');
    expect(agent.text()).toContain('Nhân viên');
    expect(wrapper.find('[data-test="console-team-item"]').text()).toBe(
      'Bán hàng'
    );
  });

  it('"Thêm vào kênh" adds the agent to the chosen inboxes through the inbox members API', async () => {
    // Lan is already a member of inbox 11.
    InboxMembersAPI.show.mockImplementation(inboxId =>
      Promise.resolve({
        data: { payload: inboxId === 11 ? [{ id: 5 }] : [{ id: 2 }] },
      })
    );
    const { wrapper } = await setup();
    await wrapper
      .find('[data-test="console-agent-inboxes-5"]')
      .trigger('click');
    await flushPromises();
    expect(InboxMembersAPI.show).toHaveBeenCalledWith(10);
    expect(InboxMembersAPI.show).toHaveBeenCalledWith(11);

    const drawer = wrapper.find('[data-test="console-add-to-inbox-drawer"]');
    expect(drawer.text()).toContain('Thêm Lan vào kênh');
    const member = drawer.find('[data-test="console-inbox-11"]');
    expect(member.element.disabled).toBe(true);
    expect(member.element.checked).toBe(true);
    expect(drawer.text()).toContain('Đã ở trong kênh');

    const save = drawer.find('[data-test="console-inbox-save"]');
    expect(save.element.disabled).toBe(true);
    await drawer.find('[data-test="console-inbox-10"]').trigger('change');
    expect(save.element.disabled).toBe(false);
    await save.trigger('click');
    await flushPromises();

    expect(InboxMembersAPI.create).toHaveBeenCalledTimes(1);
    expect(InboxMembersAPI.create).toHaveBeenCalledWith({
      inbox_id: 10,
      user_ids: [5],
    });
    expect(alertMock).toHaveBeenCalledWith('Đã thêm vào 1 kênh');
    expect(
      wrapper.find('[data-test="console-add-to-inbox-drawer"]').exists()
    ).toBe(false);
  });

  it('invites in a drawer, then offers "Thêm vào kênh" for the new agent', async () => {
    InboxMembersAPI.show.mockResolvedValue({ data: { payload: [] } });
    const { wrapper, actions } = await setup();
    await wrapper.find('[data-test="console-invite"]').trigger('click');
    const drawer = wrapper.find('[data-test="console-invite-drawer"]');
    expect(drawer.exists()).toBe(true);

    await drawer.find('form').trigger('submit');
    expect(actions['agents/create']).not.toHaveBeenCalled();
    expect(drawer.text()).toContain('Nhập tên nhân viên');

    await drawer.find('[data-test="console-invite-name"]').setValue('Minh');
    await drawer
      .find('[data-test="console-invite-email"]')
      .setValue('Minh@Shop.vn');
    await drawer.find('form').trigger('submit');
    await flushPromises();

    expect(actions['agents/create']).toHaveBeenCalledWith(expect.anything(), {
      name: 'Minh',
      email: 'minh@shop.vn',
      role: 'agent',
    });
    expect(wrapper.find('[data-test="console-invite-drawer"]').exists()).toBe(
      false
    );
    expect(
      wrapper.find('[data-test="console-add-to-inbox-drawer"]').text()
    ).toContain('Thêm Minh vào kênh');
  });

  it('summarises the plan, the payment account and the channels with links', async () => {
    const { wrapper } = await setup();
    const plan = wrapper.find('[data-test="console-plan"]');
    // Trial without a plan: the name says "Dùng thử", no duplicate chip.
    expect(plan.text()).toContain('Dùng thử');
    expect(plan.find('[data-test="console-plan-status"]').exists()).toBe(false);
    expect(plan.text()).toContain('Hạn đến 03/12/2026');
    expect(plan.text()).toContain('Còn 14 ngày');
    expect(
      plan.find('[data-test="console-plan-link"]').attributes('href')
    ).toBe('/app/accounts/1/kalo_billing');

    const payment = wrapper.find('[data-test="console-payment"]');
    expect(payment.text()).toContain('Vietcombank · •••• 6789');
    expect(payment.text()).toContain('NGUYEN VAN A');
    expect(payment.find('[data-test="console-payment-link"]').text()).toBe(
      'Sửa'
    );

    const channels = wrapper.findAll('[data-test="console-channel"]');
    expect(channels.map(c => c.text())).toEqual([
      'Zalo ShopĐang hoạt động',
      'FanpageCần kết nối lại',
    ]);
    expect(channels[0].attributes('href')).toBe('/app/accounts/1/inbox/10');
    expect(
      wrapper.find('[data-test="console-add-channel"]').attributes('href')
    ).toBe('/app/accounts/1/settings_inbox_new');
  });

  it('shows the status chip for an expired or paid shop', async () => {
    subscriptionAPI.get.mockResolvedValue({
      data: { plan: null, status: 'expired', valid_until: null, days_left: 0 },
    });
    const { wrapper } = await setup();
    expect(wrapper.find('[data-test="console-plan-status"]').text()).toBe(
      'Hết hạn'
    );
  });

  it('explains a missing bank account, an unconfigured plan and no channels', async () => {
    paymentSettingsAPI.get.mockResolvedValue({
      data: { account_number: null },
    });
    // The API always returns the trial state; billing_configured says
    // whether Kalo can take plan payments yet.
    subscriptionAPI.get.mockResolvedValue({
      data: {
        plan: null,
        status: 'trial',
        valid_until: null,
        days_left: 14,
        billing_configured: false,
      },
    });
    const { wrapper } = await setup({ inboxes: [] });
    expect(wrapper.find('[data-test="console-payment-empty"]').exists()).toBe(
      true
    );
    expect(wrapper.find('[data-test="console-payment-link"]').text()).toBe(
      'Cài nhận tiền'
    );
    expect(wrapper.find('[data-test="console-plan"]').text()).toContain(
      'Kalo chưa sẵn sàng nhận phí gói'
    );
    expect(wrapper.find('[data-test="console-channels-empty"]').exists()).toBe(
      true
    );
  });

  it('shows the generic error when the plan request fails', async () => {
    subscriptionAPI.get.mockRejectedValue({
      response: { status: 503, data: { error: 'billing_not_configured' } },
    });
    const { wrapper } = await setup();
    const card = wrapper.find('[data-test="console-plan"]');
    expect(card.text()).not.toContain('Kalo chưa sẵn sàng nhận phí gói');
    expect(card.text()).toContain(viMessages.KALO_CONSOLE_SHOP.PLAN.ERROR);
  });

  it('renders every target of the Console tour', async () => {
    const { wrapper } = await setup();
    expectTourTargets(wrapper, 'console');
  });

  it('opens the invite drawer from ?invite=1 (setup checklist link)', async () => {
    const { wrapper } = await setup({ query: { invite: '1' } });
    expect(wrapper.find('[data-test="console-invite-drawer"]').exists()).toBe(
      true
    );
  });
});
