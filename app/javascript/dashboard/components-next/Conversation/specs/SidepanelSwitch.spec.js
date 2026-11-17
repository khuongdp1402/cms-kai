// Characterization spec (chat-parity C-35).
// Pins components-next/Conversation/SidepanelSwitch.vue:28-51: Alt+O toggles the contact
// panel via UI settings `is_contact_sidebar_open` (closing the copilot panel).
import { shallowMount } from '@vue/test-utils';
import { ref } from 'vue';
import { createStore } from 'vuex';
import SidepanelSwitch from '../SidepanelSwitch.vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

const updateUISettings = vi.fn();
const uiSettings = ref({ is_contact_sidebar_open: true });

vi.mock('dashboard/composables/useKeyboardEvents', () => ({
  useKeyboardEvents: vi.fn(),
}));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ uiSettings, updateUISettings }),
}));

const mountSwitch = () =>
  shallowMount(SidepanelSwitch, {
    global: {
      plugins: [
        createStore({
          getters: {
            getCurrentAccountId: () => 1,
            'accounts/isFeatureEnabledonAccount': () => () => false,
          },
        }),
      ],
      directives: { tooltip: {} },
    },
  });

describe('SidepanelSwitch', () => {
  it('Alt+O closes the contact panel when it is open', () => {
    uiSettings.value = { is_contact_sidebar_open: true };
    mountSwitch();
    useKeyboardEvents.mock.calls[0][0]['Alt+KeyO'].action();
    expect(updateUISettings).toHaveBeenCalledWith({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: false,
    });
  });

  it('Alt+O opens the contact panel when it is closed', () => {
    uiSettings.value = { is_contact_sidebar_open: false };
    mountSwitch();
    useKeyboardEvents.mock.calls[0][0]['Alt+KeyO'].action();
    expect(updateUISettings).toHaveBeenCalledWith({
      is_contact_sidebar_open: true,
      is_copilot_panel_open: false,
    });
  });
});
