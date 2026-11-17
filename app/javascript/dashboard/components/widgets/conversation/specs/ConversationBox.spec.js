// Characterization spec for ConversationBox = chat column container (chat-parity C-33, C-103, C-23).
// Pins components/widgets/conversation/ConversationBox.vue:
//  - fetches the conversation labels and dashboard apps on mount                 :82-87
//  - loads assignable agents (incl. agent bots) of the chat's inbox               :67-80
//  - header + MessagesView only when a conversation is selected, EmptyState otherwise :112-126,134-139
//  - "Messages" + one tab per Dashboard App, tabs only if apps exist              :52-61,111-124
//  - back button only in expanded layout outside the inbox view                   :116
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ConversationBox from '../ConversationBox.vue';
import ConversationHeader from '../ConversationHeader.vue';
import MessagesView from '../MessagesView.vue';
import EmptyState from '../EmptyState/EmptyState.vue';
import DashboardAppFrame from '../../DashboardApp/Frame.vue';

const actions = {
  'inboxAssignableAgents/fetch': vi.fn(),
  'conversationLabels/get': vi.fn(),
  'dashboardApps/get': vi.fn(),
};

const mountBox = ({
  chat = { id: 5, inbox_id: 2 },
  apps = [],
  props = {},
} = {}) =>
  shallowMount(ConversationBox, {
    props,
    global: {
      plugins: [
        createStore({
          getters: {
            getSelectedChat: () => chat,
            'dashboardApps/getRecords': () => apps,
          },
          actions,
        }),
      ],
    },
  });

describe('ConversationBox', () => {
  it('fetches labels for the open conversation and the dashboard apps on mount', () => {
    mountBox();
    expect(actions['conversationLabels/get']).toHaveBeenCalledWith(
      expect.anything(),
      5
    );
    expect(actions['dashboardApps/get']).toHaveBeenCalled();
  });

  it('loads assignable agents including agent bots for the chat inbox', () => {
    mountBox();
    expect(actions['inboxAssignableAgents/fetch']).toHaveBeenCalledWith(
      expect.anything(),
      { inboxIds: [2], includeAgentBots: true }
    );
  });

  it('shows header and messages for a selected conversation', () => {
    const wrapper = mountBox();
    expect(wrapper.findComponent(ConversationHeader).exists()).toBe(true);
    expect(wrapper.findComponent(MessagesView).exists()).toBe(true);
    expect(wrapper.findComponent(EmptyState).exists()).toBe(false);
  });

  it('shows the empty state when no conversation is selected', () => {
    const wrapper = mountBox({ chat: {} });
    expect(wrapper.findComponent(EmptyState).exists()).toBe(true);
    expect(wrapper.findComponent(ConversationHeader).exists()).toBe(false);
    expect(wrapper.findComponent(MessagesView).exists()).toBe(false);
    expect(actions['conversationLabels/get']).not.toHaveBeenCalled();
  });

  it('hides the empty state in the inbox view', () => {
    const wrapper = mountBox({ chat: {}, props: { isInboxView: true } });
    expect(wrapper.findComponent(EmptyState).exists()).toBe(false);
  });

  it('adds no tabs when the account has no dashboard apps', () => {
    const wrapper = mountBox();
    expect(wrapper.find('woot-tabs-stub').exists()).toBe(false);
    expect(wrapper.vm.dashboardAppTabs.map(t => t.key)).toEqual(['messages']);
  });

  it('adds a tab per dashboard app after the Messages tab, each with its frame', () => {
    const wrapper = mountBox({
      apps: [
        { id: 1, title: 'CRM', content: [] },
        { id: 2, title: 'ERP', content: [] },
      ],
    });
    expect(wrapper.vm.dashboardAppTabs.map(t => [t.key, t.name])).toEqual([
      ['messages', 'Messages'],
      ['dashboard-1', 'CRM'],
      ['dashboard-2', 'ERP'],
    ]);
    expect(wrapper.findAllComponents(DashboardAppFrame)).toHaveLength(2);
  });

  it('switching tab changes the active index', async () => {
    const wrapper = mountBox({ apps: [{ id: 1, title: 'CRM', content: [] }] });
    wrapper.vm.onDashboardAppTabChange(1);
    expect(wrapper.vm.activeIndex).toBe(1);
  });

  it('back button is shown only in expanded layout outside the inbox view', () => {
    expect(
      mountBox({ props: { isOnExpandedLayout: true } })
        .findComponent(ConversationHeader)
        .props('showBackButton')
    ).toBe(true);
    expect(
      mountBox({ props: { isOnExpandedLayout: true, isInboxView: true } })
        .findComponent(ConversationHeader)
        .props('showBackButton')
    ).toBe(false);
    expect(
      mountBox({ props: { isOnExpandedLayout: false } })
        .findComponent(ConversationHeader)
        .props('showBackButton')
    ).toBe(false);
  });
});
