<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { useToggle } from '@vueuse/core';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useI18n } from 'vue-i18n';
import { emitter } from 'shared/helpers/mitt';
import { useInbox } from 'dashboard/composables/useInbox';
import EmailTranscriptModal from './EmailTranscriptModal.vue';
import ResolveAction from '../../buttons/ResolveAction.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';
import ConversationAPI from 'dashboard/api/conversations';

import {
  CMD_MUTE_CONVERSATION,
  CMD_SEND_TRANSCRIPT,
  CMD_UNMUTE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';

// No props needed as we're getting currentChat from the store directly
const store = useStore();
const { t } = useI18n();
const { isAZaloPersonalChannel } = useInbox();

const [showEmailActionsModal, toggleEmailModal] = useToggle(false);
const [showActionsDropdown, toggleDropdown] = useToggle(false);
const isSyncing = ref(false);

const currentChat = computed(() => store.getters.getSelectedChat);

const actionMenuItems = computed(() => {
  const items = [];

  if (!currentChat.value.muted) {
    items.push({
      icon: 'bell',
      label: t('CONTACT_PANEL.MUTE_CONTACT'),
      action: 'mute',
      value: 'mute',
    });
  } else {
    items.push({
      icon: 'bell',
      label: t('CONTACT_PANEL.UNMUTE_CONTACT'),
      action: 'unmute',
      value: 'unmute',
    });
  }

  items.push({
    icon: 'send',
    label: t('CONTACT_PANEL.SEND_TRANSCRIPT'),
    action: 'send_transcript',
    value: 'send_transcript',
  });

  // Sync messages button for Zalo Personal inboxes
  if (isAZaloPersonalChannel.value) {
    items.push({
      icon: 'arrow',
      label: isSyncing.value
        ? t('CONVERSATION.HEADER.ZALO_SYNC_IN_PROGRESS')
        : t('CONVERSATION.HEADER.ZALO_SYNC_MESSAGES'),
      action: 'sync_zalo',
      value: 'sync_zalo',
      disabled: isSyncing.value,
    });
  }

  return items;
});

// Assign / label / priority already live in the command bar (useConversationHotKeys);
// the overflow menu opens it on the matching sub-list.
const COMMAND_BAR_ITEMS = [
  { action: 'assign_an_agent', icon: 'users', labelKey: 'ASSIGN' },
  { action: 'assign_a_team', icon: 'users', labelKey: 'ASSIGN_TEAM' },
  { action: 'add_a_label_to_the_conversation', icon: 'tag', labelKey: 'LABEL' },
  { action: 'assign_priority', icon: 'zap', labelKey: 'PRIORITY' },
];

const commandBarItems = computed(() =>
  COMMAND_BAR_ITEMS.map(item => ({
    ...item,
    label: t(`KALO_CHAT_LIST.HEADER.${item.labelKey}`),
  }))
);

const openCommandBar = parent => {
  toggleDropdown(false);
  document.querySelector('ninja-keys')?.open({ parent });
};

// mitt calls listeners with the event payload (undefined), and vueuse's toggle treats any
// argument as the new value, so the command-bar event must open the modal explicitly.
const openTranscriptModal = () => toggleEmailModal(true);

const syncZaloMessages = async () => {
  if (isSyncing.value) return;

  const inboxId = currentChat.value.inbox_id;
  if (!inboxId) return;

  isSyncing.value = true;
  try {
    await ConversationAPI.syncZaloMessages(inboxId);
    useAlert(t('CONVERSATION.HEADER.ZALO_SYNC_SUCCESS'));
  } catch (error) {
    useAlert(t('CONVERSATION.HEADER.ZALO_SYNC_ERROR'));
  } finally {
    isSyncing.value = false;
  }
};

const handleActionClick = ({ action }) => {
  toggleDropdown(false);

  if (action === 'mute') {
    store.dispatch('muteConversation', currentChat.value.id);
    useAlert(t('CONTACT_PANEL.MUTED_SUCCESS'));
  } else if (action === 'unmute') {
    store.dispatch('unmuteConversation', currentChat.value.id);
    useAlert(t('CONTACT_PANEL.UNMUTED_SUCCESS'));
  } else if (action === 'send_transcript') {
    toggleEmailModal();
  } else if (action === 'sync_zalo') {
    syncZaloMessages();
  }
};

// These functions are needed for the event listeners
const mute = () => {
  store.dispatch('muteConversation', currentChat.value.id);
  useAlert(t('CONTACT_PANEL.MUTED_SUCCESS'));
};

const unmute = () => {
  store.dispatch('unmuteConversation', currentChat.value.id);
  useAlert(t('CONTACT_PANEL.UNMUTED_SUCCESS'));
};

emitter.on(CMD_MUTE_CONVERSATION, mute);
emitter.on(CMD_UNMUTE_CONVERSATION, unmute);
emitter.on(CMD_SEND_TRANSCRIPT, openTranscriptModal);

onUnmounted(() => {
  emitter.off(CMD_MUTE_CONVERSATION, mute);
  emitter.off(CMD_UNMUTE_CONVERSATION, unmute);
  emitter.off(CMD_SEND_TRANSCRIPT, openTranscriptModal);
});
</script>

<template>
  <div class="relative flex items-center gap-1.5 actions--container">
    <ResolveAction
      :conversation-id="currentChat.id"
      :status="currentChat.status"
    />
    <div
      v-on-clickaway="() => toggleDropdown(false)"
      class="relative flex items-center"
    >
      <button
        type="button"
        data-test-id="kalo-more-actions"
        :title="$t('KALO_CHAT_LIST.HEADER.MORE')"
        :aria-label="$t('KALO_CHAT_LIST.HEADER.MORE')"
        :aria-expanded="showActionsDropdown"
        class="grid rounded-lg size-8 place-items-center text-n-slate-11 transition-colors duration-150 motion-reduce:transition-none hover:bg-n-alpha-2 hover:text-n-slate-12"
        :class="{ 'bg-n-alpha-2 text-n-slate-12': showActionsDropdown }"
        @click="toggleDropdown()"
      >
        <KaloIcon name="more" class="size-5" />
      </button>
      <Transition
        enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
        enter-from-class="-translate-y-1 opacity-0"
        leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
        leave-to-class="-translate-y-1 opacity-0"
      >
        <div
          v-if="showActionsDropdown"
          role="menu"
          data-test-id="kalo-more-menu"
          class="absolute z-50 flex flex-col p-1.5 mt-2 border shadow-xl top-full w-60 rounded-2xl ltr:right-0 rtl:left-0 border-n-weak bg-n-surface-1"
        >
          <button
            v-for="item in commandBarItems"
            :key="item.action"
            type="button"
            role="menuitem"
            :data-test-id="`kalo-more-${item.action}`"
            class="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg text-start text-n-slate-12 hover:bg-n-alpha-2"
            @click="openCommandBar(item.action)"
          >
            <KaloIcon :name="item.icon" class="size-[18px] text-n-slate-11" />
            {{ item.label }}
          </button>
          <div class="my-1 border-t border-n-weak" />
          <button
            v-for="item in actionMenuItems"
            :key="item.action"
            type="button"
            role="menuitem"
            :disabled="item.disabled"
            :data-test-id="`kalo-more-${item.action}`"
            class="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg text-start text-n-slate-12 hover:bg-n-alpha-2 disabled:opacity-50 disabled:pointer-events-none"
            @click="handleActionClick(item)"
          >
            <KaloIcon :name="item.icon" class="size-[18px] text-n-slate-11" />
            {{ item.label }}
          </button>
        </div>
      </Transition>
    </div>
    <EmailTranscriptModal
      v-if="showEmailActionsModal"
      :show="showEmailActionsModal"
      :current-chat="currentChat"
      @cancel="toggleEmailModal"
    />
  </div>
</template>
