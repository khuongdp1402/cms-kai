<script>
import { defineAsyncComponent, ref, computed } from 'vue';

import KaloRail from 'next/sidebar/KaloRail.vue';
import KaloTabBar from 'next/sidebar/KaloTabBar.vue';
import KaloAppShell from 'next/layout/KaloAppShell.vue';
import WootKeyShortcutModal from 'dashboard/components/widgets/modal/WootKeyShortcutModal.vue';
import AddAccountModal from 'dashboard/components/app/AddAccountModal.vue';
import UpgradePage from 'dashboard/routes/dashboard/upgrade/UpgradePage.vue';
import KaloFeatureGate from './KaloFeatureGate.vue';
import KaloTourHost from 'next/guide/KaloTourHost.vue';

import { useUISettings } from 'dashboard/composables/useUISettings';
import { useAccount } from 'dashboard/composables/useAccount';
import { useWindowSize } from '@vueuse/core';

import wootConstants from 'dashboard/constants/globals';

const CommandBar = defineAsyncComponent(
  () => import('./commands/commandbar.vue')
);

const FloatingCallWidget = defineAsyncComponent(
  () => import('dashboard/components-next/call/FloatingCallWidget.vue')
);

import CopilotLauncher from 'dashboard/components-next/copilot/CopilotLauncher.vue';
import CopilotContainer from 'dashboard/components/copilot/CopilotContainer.vue';

import { useCallsStore } from 'dashboard/stores/calls';

export default {
  components: {
    KaloRail,
    KaloTabBar,
    KaloAppShell,
    CommandBar,
    WootKeyShortcutModal,
    AddAccountModal,
    UpgradePage,
    KaloFeatureGate,
    KaloTourHost,
    CopilotLauncher,
    CopilotContainer,
    FloatingCallWidget,
  },
  setup() {
    const upgradePageRef = ref(null);
    const { uiSettings, updateUISettings } = useUISettings();
    const { accountId } = useAccount();
    const { width: windowWidth } = useWindowSize();
    const callsStore = useCallsStore();

    return {
      uiSettings,
      updateUISettings,
      accountId,
      upgradePageRef,
      windowWidth,
      hasActiveCall: computed(() => callsStore.hasActiveCall),
      hasIncomingCall: computed(() => callsStore.hasIncomingCall),
    };
  },
  data() {
    return {
      showAccountModal: false,
      showCreateAccountModal: false,
      showShortcutModal: false,
    };
  },
  computed: {
    isSmallScreen() {
      return this.windowWidth < wootConstants.SMALL_SCREEN_BREAKPOINT;
    },
    showUpgradePage() {
      return this.upgradePageRef?.shouldShowUpgradePage;
    },
    bypassUpgradePage() {
      return [
        'billing_settings_index',
        'settings_inbox_list',
        'general_settings_index',
        'agent_list',
      ].includes(this.$route.name);
    },
    previouslyUsedDisplayType() {
      const {
        previously_used_conversation_display_type: conversationDisplayType,
      } = this.uiSettings;
      return conversationDisplayType;
    },
  },
  watch: {
    isSmallScreen: {
      handler() {
        const { LAYOUT_TYPES } = wootConstants;
        if (window.innerWidth <= wootConstants.SMALL_SCREEN_BREAKPOINT) {
          this.updateUISettings({
            conversation_display_type: LAYOUT_TYPES.EXPANDED,
          });
        } else {
          this.updateUISettings({
            conversation_display_type: this.previouslyUsedDisplayType,
          });
        }
      },
      immediate: true,
    },
  },
  methods: {
    openCreateAccountModal() {
      this.showAccountModal = false;
      this.showCreateAccountModal = true;
    },
    closeCreateAccountModal() {
      this.showCreateAccountModal = false;
    },
    toggleAccountModal() {
      this.showAccountModal = !this.showAccountModal;
    },
    toggleKeyShortcutModal() {
      this.showShortcutModal = true;
    },
    closeKeyShortcutModal() {
      this.showShortcutModal = false;
    },
  },
};
</script>

<template>
  <KaloAppShell :compact="isSmallScreen">
    <template #sidebar>
      <KaloRail
        @open-key-shortcut-modal="toggleKeyShortcutModal"
        @close-key-shortcut-modal="closeKeyShortcutModal"
        @show-create-account-modal="openCreateAccountModal"
      />
    </template>

    <UpgradePage
      v-show="showUpgradePage"
      ref="upgradePageRef"
      :bypass-upgrade-page="bypassUpgradePage"
    />
    <template v-if="!showUpgradePage">
      <KaloFeatureGate />
      <KaloTourHost />
      <CommandBar />
      <CopilotLauncher />
      <CopilotContainer />
      <FloatingCallWidget v-if="hasActiveCall || hasIncomingCall" />
    </template>
    <AddAccountModal
      :show="showCreateAccountModal"
      @close-account-create-modal="closeCreateAccountModal"
    />
    <WootKeyShortcutModal
      v-model:show="showShortcutModal"
      @close="closeKeyShortcutModal"
      @clickaway="closeKeyShortcutModal"
    />

    <template #tabbar>
      <KaloTabBar
        @open-key-shortcut-modal="toggleKeyShortcutModal"
        @close-key-shortcut-modal="closeKeyShortcutModal"
        @show-create-account-modal="openCreateAccountModal"
      />
    </template>
  </KaloAppShell>
</template>
