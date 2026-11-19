import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { createRouter, createMemoryHistory } from 'vue-router';
import ConversationView from '../ConversationView.vue';
import { expectTourTargets } from 'dashboard/components-next/guide/specs/tourTargets';

// The Tin nhắn tour highlights the whole conversation list (data-tour on ChatList).
describe('ConversationView (Tin nhắn tour)', () => {
  it('renders the list target of the Tin nhắn tour', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          name: 'home',
          path: '/app/accounts/:accountId/dashboard',
          component: { template: '<div />' },
        },
      ],
    });
    await router.push({ name: 'home', params: { accountId: 1 } });
    const store = createStore({
      getters: {
        getAllConversations: () => [],
        getSelectedChat: () => ({}),
        getUISettings: () => ({}),
      },
      actions: {
        'agents/get': vi.fn(),
        'portals/index': vi.fn(),
        clearSelectedState: vi.fn(),
        setActiveInbox: vi.fn(),
      },
    });
    const wrapper = shallowMount(ConversationView, {
      global: { plugins: [store, router] },
    });
    await flushPromises();
    expectTourTargets(wrapper, 'messages', ['chat-list']);
  });
});
