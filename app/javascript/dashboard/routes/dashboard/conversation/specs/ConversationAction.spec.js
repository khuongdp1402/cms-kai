// Characterization spec for ConversationAction (chat-parity C-80, C-81).
// Pins routes/dashboard/conversation/ConversationAction.vue:
//  - assign agent / agent bot: optimistic setCurrentChatAssignee then assignAgent    :69-92,176-191
//  - clicking the already assigned agent unassigns                                   :176-186
//  - "assign to me" (self assign) only when not already assigned to me               :145-175
//  - assign team (with a "None" entry when a team is assigned), toggle off            :93-107,193-199
//  - priority list None/Urgent/High/Medium/Low, set via assignPriority                :37-67,108-135,201-211
//  - renders the conversation labels box                                              :302-304
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ref } from 'vue';
import ConversationAction from '../ConversationAction.vue';
import LabelBox from '../labels/LabelBox.vue';
import MultiselectDropdown from 'shared/components/ui/MultiselectDropdown.vue';

vi.mock('dashboard/composables', () => ({
  useAlert: vi.fn(),
  useTrack: vi.fn(),
}));
vi.mock('dashboard/composables/useAgentsList', () => ({
  useAgentsList: () => ({
    agentsList: ref([
      { id: 1, name: 'Me' },
      { id: 2, name: 'Agent B' },
    ]),
  }),
}));

const actions = {
  setCurrentChatAssignee: vi.fn(),
  assignAgent: vi.fn(() => Promise.resolve()),
  setCurrentChatTeam: vi.fn(),
  assignTeam: vi.fn(() => Promise.resolve()),
  setCurrentChatPriority: vi.fn(),
  assignPriority: vi.fn(() => Promise.resolve()),
};

const currentUser = { id: 1, name: 'Me', account_id: 1, avatar_url: 'a.png' };

const mountAction = (chat = {}, props = {}) => {
  const store = createStore({
    getters: {
      getSelectedChat: () => ({
        id: 50,
        priority: null,
        meta: { assignee: null, team: null },
        ...chat,
      }),
      getCurrentUser: () => currentUser,
      'teams/getTeams': () => [{ id: 7, name: 'Support' }],
    },
    actions,
  });
  return shallowMount(ConversationAction, {
    props: { conversationId: 50, ...props },
    global: { plugins: [store] },
  });
};

describe('ConversationAction', () => {
  it('renders three dropdowns (agent, team, priority) and the label box', () => {
    const wrapper = mountAction();
    expect(wrapper.findAllComponents(MultiselectDropdown)).toHaveLength(3);
    expect(wrapper.findComponent(LabelBox).exists()).toBe(true);
  });

  it('showLabels=false leaves the labels to the Kalo panel "Nhãn" section', () => {
    const wrapper = mountAction({}, { showLabels: false });
    expect(wrapper.findAllComponents(MultiselectDropdown)).toHaveLength(3);
    expect(wrapper.findComponent(LabelBox).exists()).toBe(false);
  });

  describe('assignee', () => {
    it('selecting an agent sets it optimistically then calls assignAgent', async () => {
      const wrapper = mountAction();
      const agent = { id: 2, name: 'Agent B' };
      wrapper.vm.onClickAssignAgent(agent);
      await flushPromises();
      expect(actions.setCurrentChatAssignee).toHaveBeenCalledWith(
        expect.anything(),
        { conversationId: 50, assignee: agent, assigneeType: 'User' }
      );
      expect(actions.assignAgent).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        agentId: 2,
        assigneeType: 'User',
      });
    });

    it('selecting an agent bot keeps its assignee type', async () => {
      const wrapper = mountAction();
      wrapper.vm.onClickAssignAgent({ id: 9, assignee_type: 'AgentBot' });
      await flushPromises();
      expect(actions.assignAgent).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        agentId: 9,
        assigneeType: 'AgentBot',
      });
    });

    it('selecting the already assigned agent unassigns the conversation', async () => {
      const wrapper = mountAction({
        meta: { assignee: { id: 2, name: 'Agent B' }, team: null },
      });
      wrapper.vm.onClickAssignAgent({ id: 2, name: 'Agent B' });
      await flushPromises();
      expect(actions.assignAgent).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        agentId: null,
        assigneeType: null,
      });
    });

    it('"assign to me" is offered when unassigned or assigned to someone else', () => {
      expect(mountAction().vm.showSelfAssign).toBe(true);
      expect(
        mountAction({ meta: { assignee: { id: 2 }, team: null } }).vm
          .showSelfAssign
      ).toBe(true);
    });

    it('"assign to me" is hidden when already assigned to me', () => {
      expect(
        mountAction({ meta: { assignee: { id: 1 }, team: null } }).vm
          .showSelfAssign
      ).toBe(false);
    });

    it('self assign assigns the current user', async () => {
      const wrapper = mountAction();
      wrapper.vm.onSelfAssign();
      await flushPromises();
      expect(actions.assignAgent).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        agentId: 1,
        assigneeType: 'User',
      });
    });
  });

  describe('team', () => {
    it('selecting a team sets it optimistically then calls assignTeam', async () => {
      const wrapper = mountAction();
      const team = { id: 7, name: 'Support' };
      wrapper.vm.onClickAssignTeam(team);
      await flushPromises();
      expect(actions.setCurrentChatTeam).toHaveBeenCalledWith(
        expect.anything(),
        { team, conversationId: 50 }
      );
      expect(actions.assignTeam).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        teamId: 7,
      });
    });

    it('selecting the assigned team removes it (teamId 0)', async () => {
      const wrapper = mountAction({
        meta: { assignee: null, team: { id: 7, name: 'Support' } },
      });
      wrapper.vm.onClickAssignTeam({ id: 7, name: 'Support' });
      await flushPromises();
      expect(actions.assignTeam).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        teamId: 0,
      });
    });

    it('adds a "None" entry to the team list only when a team is assigned', () => {
      expect(mountAction().vm.teamsList.map(t => t.id)).toEqual([7]);
      expect(
        mountAction({
          meta: { assignee: null, team: { id: 7 } },
        }).vm.teamsList.map(t => t.id)
      ).toEqual([0, 7]);
    });
  });

  describe('priority', () => {
    it('offers None, Urgent, High, Medium and Low', () => {
      expect(mountAction().vm.priorityOptions.map(o => o.id)).toEqual([
        null,
        'urgent',
        'high',
        'medium',
        'low',
      ]);
    });

    it('selecting a priority sets it optimistically then calls assignPriority', async () => {
      const wrapper = mountAction();
      wrapper.vm.onClickAssignPriority(wrapper.vm.priorityOptions[2]);
      await flushPromises();
      expect(actions.setCurrentChatPriority).toHaveBeenCalledWith(
        expect.anything(),
        { priority: 'high', conversationId: 50 }
      );
      expect(actions.assignPriority).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        priority: 'high',
      });
    });

    it('selecting the current priority clears it to None', async () => {
      const wrapper = mountAction({ priority: 'high' });
      wrapper.vm.onClickAssignPriority(wrapper.vm.priorityOptions[2]);
      await flushPromises();
      expect(actions.assignPriority).toHaveBeenCalledWith(expect.anything(), {
        conversationId: 50,
        priority: null,
      });
    });
  });
});
