// Characterization spec for LabelBox = conversation labels in the side panel (chat-parity C-81).
// Pins routes/dashboard/conversation/labels/LabelBox.vue:
//  - keyboard: `L` toggles the label dropdown (prevent default), `Escape` closes it,
//    Escape also fires while typing in an input                                   :22-40
//  - one removable label chip per active label; remove delegates to the composable :87-98
//  - "+" button toggles the dropdown; creating labels is admin-only                :82,101-109
//  - spinner while labels are fetching                                              :111
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { ref } from 'vue';
import LabelBox from '../LabelBox.vue';
import AddLabel from 'shared/components/ui/dropdown/AddLabel.vue';
import LabelDropdown from 'shared/components/ui/label/LabelDropdown.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

const isAdmin = ref(false);
const addLabelToConversation = vi.fn();
const removeLabelFromConversation = vi.fn();
const activeLabels = ref([
  { id: 1, title: 'vip', description: '', color: '#f00' },
  { id: 2, title: 'cod', description: '', color: '#0f0' },
]);

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin }),
}));
vi.mock('dashboard/composables/useConversationLabels', () => ({
  useConversationLabels: () => ({
    savedLabels: ref([]),
    activeLabels,
    accountLabels: ref([]),
    addLabelToConversation,
    removeLabelFromConversation,
  }),
}));

const mountBox = (isFetching = false) =>
  mount(LabelBox, {
    global: {
      plugins: [
        createStore({
          getters: { 'conversationLabels/getUIFlags': () => ({ isFetching }) },
        }),
      ],
      directives: { 'on-clickaway': {} },
      stubs: {
        Spinner: { template: '<i class="spinner-stub" />' },
        LabelDropdown: true,
        AddLabel: true,
        'woot-label': {
          props: ['title'],
          emits: ['remove'],
          template: '<span class="chip">{{ title }}</span>',
        },
      },
    },
  });

const events = () => useKeyboardEvents.mock.calls[0][0];

describe('LabelBox', () => {
  beforeEach(() => {
    isAdmin.value = false;
  });

  it('registers L (toggle) and Escape (close, even while typing)', () => {
    mountBox();
    expect(Object.keys(events()).sort()).toEqual(['Escape', 'KeyL']);
    expect(events().KeyL.allowOnFocusedInput).toBeUndefined();
    expect(events().Escape.allowOnFocusedInput).toBe(true);
  });

  it('shows one chip per active label', () => {
    const wrapper = mountBox();
    expect(wrapper.findAll('.chip').map(c => c.text())).toEqual(['vip', 'cod']);
  });

  it('shows a spinner instead of the labels while fetching', () => {
    const wrapper = mountBox(true);
    expect(wrapper.find('.spinner-stub').exists()).toBe(true);
    expect(wrapper.findAll('.chip')).toHaveLength(0);
  });

  it('key L opens the dropdown and prevents the default; Escape closes it', async () => {
    const wrapper = mountBox();
    expect(wrapper.findComponent(LabelDropdown).exists()).toBe(false);
    const preventDefault = vi.fn();
    events().KeyL.action({ preventDefault });
    await wrapper.vm.$nextTick();
    expect(preventDefault).toHaveBeenCalled();
    expect(wrapper.findComponent(LabelDropdown).exists()).toBe(true);
    events().Escape.action();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(LabelDropdown).exists()).toBe(false);
  });

  it('Escape does nothing while the dropdown is closed', () => {
    const wrapper = mountBox();
    events().Escape.action();
    expect(wrapper.findComponent(LabelDropdown).exists()).toBe(false);
  });

  it('the + button toggles the dropdown', async () => {
    const wrapper = mountBox();
    await wrapper.findComponent(AddLabel).vm.$emit('add');
    expect(wrapper.findComponent(LabelDropdown).exists()).toBe(true);
  });

  it('dropdown add/remove events call the label composable', async () => {
    const wrapper = mountBox();
    await wrapper.findComponent(AddLabel).vm.$emit('add');
    const dropdown = wrapper.findComponent(LabelDropdown);
    await dropdown.vm.$emit('add', 'vip');
    await dropdown.vm.$emit('remove', 'vip');
    expect(addLabelToConversation).toHaveBeenCalledWith('vip');
    expect(removeLabelFromConversation).toHaveBeenCalledWith('vip');
  });

  it('only admins may create labels from the dropdown', async () => {
    const wrapper = mountBox();
    await wrapper.findComponent(AddLabel).vm.$emit('add');
    expect(wrapper.findComponent(LabelDropdown).props('allowCreation')).toBe(
      false
    );
    wrapper.unmount();
    isAdmin.value = true;
    const adminWrapper = mountBox();
    await adminWrapper.findComponent(AddLabel).vm.$emit('add');
    expect(
      adminWrapper.findComponent(LabelDropdown).props('allowCreation')
    ).toBe(true);
  });
});
