// Kalo UI phase 2 (task 1b-ii): the contact panel shows the shop sections first
// (Nhãn, Ghi chú, Giao việc, Thông tin thêm) and tucks the rest under "Xem thêm".
// Pins: C-79 (reorder + persisted order and open state), C-80/C-81 (assign + labels
// moved into their own sections), C-82..C-90 (still reachable under "Xem thêm").
import { shallowMount, flushPromises } from '@vue/test-utils';
import { createStore } from 'vuex';
import ContactPanel from '../ContactPanel.vue';
import ConversationAction from '../ConversationAction.vue';
import LabelBox from '../labels/LabelBox.vue';
import ContactNotes from '../contact/ContactNotes.vue';
import ContactConversations from '../ContactConversations.vue';
import SharedFiles from '../SharedFiles.vue';
import KaloContactOrders from '../contact/KaloContactOrders.vue';
import ContactInfo from '../contact/ContactInfo.vue';
import { DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER } from 'dashboard/composables/useUISettings';
import {
  KALO_MORE_DIVIDER,
  buildKaloSidebarOrder,
} from '../kaloContactPanelOrder';

vi.mock('vue-router', () => ({ useRoute: () => ({ params: {} }) }));

const DraggableStub = {
  name: 'Draggable',
  props: ['list'],
  emits: ['start', 'end'],
  template:
    '<div><template v-for="(element, index) in list" :key="element.name"><slot name="item" :element="element" :index="index" /></template></div>',
};

const AccordionStub = {
  name: 'AccordionItem',
  props: ['title', 'isOpen', 'compact'],
  emits: ['toggle'],
  template: '<section><slot v-if="isOpen" /></section>',
};

// Account flags that are on; the macros section needs kalo_advanced_automation.
const mountPanel = async (
  uiSettings = {},
  features = ['kalo_advanced_automation']
) => {
  const updateUISettings = vi.fn();
  const store = createStore({
    getters: {
      getUISettings: () => uiSettings,
      getSelectedChat: () => ({ id: 9, meta: { sender: { id: 4 } } }),
      'conversationMetadata/getConversationMetadata': () => () => ({}),
      'contacts/getContact': () => () => ({ id: 4, name: 'Thu Hà' }),
      'integrations/getIntegration': () => () => ({ enabled: false }),
      'accounts/getAccount': () => () => ({ features: {} }),
      'globalConfig/isOnChatwootCloud': () => false,
      'accounts/isFeatureEnabledonAccount': () => (_id, name) =>
        features.includes(name),
      getCurrentAccountId: () => 1,
    },
    actions: {
      updateUISettings,
      'contacts/show': vi.fn(),
      'attributes/get': vi.fn(),
      'integrations/get': vi.fn(),
    },
  });
  const wrapper = shallowMount(ContactPanel, {
    props: { conversationId: 9, inboxId: 2 },
    global: {
      plugins: [store],
      stubs: {
        Draggable: DraggableStub,
        AccordionItem: AccordionStub,
        'woot-feature-toggle': { template: '<div><slot /></div>' },
      },
    },
  });
  // the order is built in onMounted
  await flushPromises();
  const savedSettings = () => updateUISettings.mock.calls.at(-1)[1].uiSettings;
  return { wrapper, updateUISettings, savedSettings };
};

const titles = wrapper =>
  wrapper.findAllComponents(AccordionStub).map(item => item.props('title'));

describe('buildKaloSidebarOrder', () => {
  it('puts labels, notes, assign and attributes first, then the "Xem thêm" divider', () => {
    const order = buildKaloSidebarOrder([
      ...DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER,
    ]).map(i => i.name);
    expect(order.slice(0, 5)).toEqual([
      'conversation_labels',
      'contact_notes',
      'conversation_actions',
      'contact_attributes',
      KALO_MORE_DIVIDER,
    ]);
    // nothing from the old panel is dropped
    DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER.forEach(({ name }) =>
      expect(order).toContain(name)
    );
  });

  it('keeps an order the user already arranged in the Kalo panel', () => {
    const saved = [
      { name: 'contact_notes' },
      { name: KALO_MORE_DIVIDER },
      { name: 'conversation_labels' },
      { name: 'macros' },
    ];
    expect(buildKaloSidebarOrder(saved)).toEqual(saved);
  });

  it('adds the labels section to a Kalo order saved before it existed', () => {
    const order = buildKaloSidebarOrder([
      { name: 'contact_notes' },
      { name: KALO_MORE_DIVIDER },
    ]);
    expect(order[0]).toEqual({ name: 'conversation_labels' });
  });
});

describe('ContactPanel (Kalo layout)', () => {
  it('shows the customer, purchases and the four shop sections; the rest stays under "Xem thêm"', async () => {
    const { wrapper } = await mountPanel();
    expect(wrapper.findComponent(ContactInfo).exists()).toBe(true);
    expect(wrapper.findComponent(KaloContactOrders).props('contactId')).toBe(4);
    expect(titles(wrapper)).toEqual([
      'KALO_CHAT_THREAD.PANEL.LABELS',
      'KALO_CHAT_THREAD.PANEL.NOTES',
      'KALO_CHAT_THREAD.PANEL.ASSIGN',
      'KALO_CHAT_THREAD.PANEL.MORE_INFO',
    ]);
    expect(wrapper.find('[data-test="panel-show-more"]').exists()).toBe(true);
    expect(wrapper.findComponent(ContactConversations).exists()).toBe(false);
  });

  it('labels, notes and assign start open; the labels box and the assign controls render', async () => {
    const { wrapper } = await mountPanel();
    expect(wrapper.findComponent(LabelBox).exists()).toBe(true);
    expect(wrapper.findComponent(ContactNotes).props('contactId')).toBe(4);
    const action = wrapper.findComponent(ConversationAction);
    expect(action.props('showLabels')).toBe(false);
    expect(action.props('conversationId')).toBe(9);
  });

  it('a saved closed state wins over the default', async () => {
    const { wrapper } = await mountPanel({ is_contact_notes_open: false });
    expect(wrapper.findComponent(ContactNotes).exists()).toBe(false);
  });

  it('toggling a section stores its open state in the UI settings', async () => {
    const { wrapper, savedSettings } = await mountPanel();
    const notes = wrapper
      .findAllComponents(AccordionStub)
      .find(i => i.props('title') === 'KALO_CHAT_THREAD.PANEL.NOTES');
    notes.vm.$emit('toggle');
    expect(savedSettings().is_contact_notes_open).toBe(false);
  });

  it('"Xem thêm" stores the choice and reveals the other sections', async () => {
    const { wrapper, savedSettings } = await mountPanel();
    await wrapper.find('[data-test="panel-show-more"]').trigger('click');
    expect(savedSettings().is_kalo_panel_more_open).toBe(true);

    const { wrapper: opened } = await mountPanel({
      is_kalo_panel_more_open: true,
    });
    const shown = titles(opened);
    [
      'KALO_CHAT_THREAD.PANEL.MACROS',
      'KALO_CHAT_THREAD.PANEL.CONVERSATION_INFO',
      'KALO_CHAT_THREAD.PANEL.FILES',
      'KALO_CHAT_THREAD.PANEL.PREVIOUS',
      'KALO_CHAT_THREAD.PANEL.PARTICIPANTS',
    ].forEach(title => expect(shown).toContain(title));
    expect(opened.findComponent(ContactConversations).exists()).toBe(false); // closed by default
    expect(opened.findComponent(SharedFiles).exists()).toBe(false);
  });

  it('hides the macros section when kalo_advanced_automation is off', async () => {
    const { wrapper } = await mountPanel({ is_kalo_panel_more_open: true }, []);
    expect(titles(wrapper)).not.toContain('KALO_CHAT_THREAD.PANEL.MACROS');
    expect(titles(wrapper)).toContain('KALO_CHAT_THREAD.PANEL.FILES');
  });

  it('drag end saves the order including the divider (C-79)', async () => {
    const { wrapper, savedSettings } = await mountPanel();
    wrapper.findComponent(DraggableStub).vm.$emit('end');
    const names = savedSettings().conversation_sidebar_items_order.map(
      i => i.name
    );
    expect(names).toContain(KALO_MORE_DIVIDER);
    expect(names[0]).toBe('conversation_labels');
  });
});
