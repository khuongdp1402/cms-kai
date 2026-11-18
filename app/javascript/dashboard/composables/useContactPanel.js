import { ref, computed } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useUISettings } from 'dashboard/composables/useUISettings';
import wootConstants from 'dashboard/constants/globals';

// On small screens the contact panel covers the chat thread, so the persisted
// `is_contact_sidebar_open` (a desktop preference) is ignored there: the panel
// shows only for the conversation it was opened from on the small screen, and
// opening/closing it there never writes the preference.
const openedOnSmallScreenFor = ref(null);

export function useContactPanel() {
  const { uiSettings, updateUISettings } = useUISettings();
  const { width } = useWindowSize();

  const isSmallScreen = computed(
    () => width.value < wootConstants.SMALL_SCREEN_BREAKPOINT
  );

  const isContactPanelOpenFor = conversationId => {
    if (isSmallScreen.value) {
      return !!conversationId && openedOnSmallScreenFor.value === conversationId;
    }
    return !!uiSettings.value?.is_contact_sidebar_open;
  };

  const openContactPanel = conversationId => {
    if (isSmallScreen.value) {
      openedOnSmallScreenFor.value = conversationId;
      return;
    }
    updateUISettings({
      is_contact_sidebar_open: true,
      is_copilot_panel_open: false,
    });
  };

  const closeContactPanel = () => {
    if (isSmallScreen.value) {
      openedOnSmallScreenFor.value = null;
      return;
    }
    updateUISettings({
      is_contact_sidebar_open: false,
      is_copilot_panel_open: false,
    });
  };

  const toggleContactPanel = conversationId => {
    if (isContactPanelOpenFor(conversationId)) {
      closeContactPanel();
    } else {
      openContactPanel(conversationId);
    }
  };

  return {
    isSmallScreen,
    isContactPanelOpenFor,
    openContactPanel,
    closeContactPanel,
    toggleContactPanel,
  };
}
