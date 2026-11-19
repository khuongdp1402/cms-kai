// Website greetings section of the Chiến dịch page: no second "Tạo chiến
// dịch", no faded English sample cards, create/edit in KaloDrawer.
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createI18n } from 'vue-i18n';
import viMessages from 'dashboard/i18n/ktech/vi.json';
import WebsiteCampaignsCard from '../WebsiteCampaignsCard.vue';
import { kaloFeatureGetters } from 'dashboard/helper/specs/kaloFeatureGetters';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: name => ({ name, params: { accountId: 1 } }),
  }),
}));

const CAMPAIGN = {
  id: 9,
  title: 'Chào khách mới',
  message: 'Xin chào',
  campaign_status: 'active',
  enabled: true,
  inbox: { id: 1, name: 'Website', channel_type: 'Channel::WebWidget' },
  trigger_rules: { url: 'https://hoamai.vn', time_on_page: 10 },
  created_at: '2026-11-19T02:00:00Z',
};

const mountCard = async ({ campaigns = [], features = null } = {}) => {
  const create = vi.fn();
  const store = createStore({
    getters: {
      'campaigns/getUIFlags': () => ({ isFetching: false }),
      'campaigns/getLiveChatCampaigns': () => campaigns,
      'inboxes/getWebsiteInboxes': () => [],
      'inboxes/getInboxes': () => [],
      'agents/getAgents': () => [],
      'agentBots/getBots': () => [],
      getCurrentAccountId: () => 1,
      ...kaloFeatureGetters(features),
    },
    actions: {
      'campaigns/create': create,
      'agents/get': vi.fn(),
      'agentBots/get': vi.fn(),
    },
  });
  const wrapper = mount(WebsiteCampaignsCard, {
    attachTo: document.body,
    global: {
      plugins: [
        store,
        createI18n({
          legacy: false,
          locale: 'vi',
          messages: { vi: viMessages },
        }),
      ],
      stubs: {
        RouterLink: RouterLinkStub,
        LiveChatCampaignForm: {
          props: ['mode', 'selectedCampaign'],
          emits: ['submit', 'cancel'],
          template:
            '<form data-test="form" :data-mode="mode" @submit.prevent="$emit(\'submit\', { title: \'A\' })" />',
        },
        CampaignList: {
          props: ['campaigns'],
          emits: ['edit', 'delete'],
          template:
            '<ul><li v-for="c in campaigns" :key="c.id" data-test="row" @click="$emit(\'edit\', c)">{{ c.title }}</li></ul>',
        },
        ConfirmDeleteCampaignDialog: true,
      },
    },
  });
  await flushPromises();
  return { wrapper, create };
};

const wrappers = [];
afterEach(() => wrappers.splice(0).forEach(w => w.unmount()));

describe('WebsiteCampaignsCard', () => {
  it('shows one Vietnamese sentence and one secondary action when empty', async () => {
    const { wrapper } = await mountCard();
    wrappers.push(wrapper);
    const empty = wrapper.find('[data-test="website-campaigns-empty"]');
    expect(empty.text()).toContain('Chưa có lời chào nào');
    expect(wrapper.findAll('[data-test="website-campaign-add"]')).toHaveLength(
      1
    );
    expect(wrapper.text()).not.toContain('Tạo chiến dịch');
    expect(wrapper.text()).not.toMatch(/Chatbot|Assistance|campaign/i);
    expect(wrapper.attributes('data-tour')).toBe('campaign-website');
  });

  it('creates a greeting in a KaloDrawer', async () => {
    const { wrapper, create } = await mountCard();
    wrappers.push(wrapper);
    await wrapper.find('[data-test="website-campaign-add"]').trigger('click');
    const drawer = wrapper.find('[data-test="website-campaign-drawer"]');
    expect(drawer.attributes('role')).toBe('dialog');
    expect(drawer.find('[data-test="form"]').attributes('data-mode')).toBe(
      'create'
    );
    await drawer.find('form').trigger('submit');
    await flushPromises();
    expect(create).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test="website-campaign-drawer"]').exists()).toBe(
      false
    );
  });

  it('lists greetings with the add button in the header and edits in a drawer', async () => {
    const { wrapper } = await mountCard({ campaigns: [CAMPAIGN] });
    wrappers.push(wrapper);
    expect(wrapper.find('[data-test="website-campaigns-empty"]').exists()).toBe(
      false
    );
    expect(wrapper.findAll('[data-test="website-campaign-add"]')).toHaveLength(
      1
    );
    await wrapper.find('[data-test="row"]').trigger('click');
    const drawer = wrapper.find('[data-test="website-campaign-drawer"]');
    expect(drawer.find('[data-test="form"]').attributes('data-mode')).toBe(
      'edit'
    );
  });

  it('links SMS and WhatsApp campaigns only when extra channels are on', async () => {
    const off = await mountCard({ features: { kalo_campaigns: true } });
    wrappers.push(off.wrapper);
    expect(off.wrapper.findAll('[data-test="campaign-link"]')).toHaveLength(0);
    const on = await mountCard();
    wrappers.push(on.wrapper);
    expect(on.wrapper.findAll('[data-test="campaign-link"]')).toHaveLength(2);
  });
});
