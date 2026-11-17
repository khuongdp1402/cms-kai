<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useElementSize } from '@vueuse/core';
import InboxName from '../InboxName.vue';
import MoreActions from './MoreActions.vue';
import Avatar from 'next/avatar/Avatar.vue';
import SLACardLabel from './components/SLACardLabel.vue';
import ConversationCallButton from './ConversationCallButton.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloChannelBadge from 'dashboard/components-next/icon/KaloChannelBadge.vue';
import wootConstants from 'dashboard/constants/globals';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import { snoozedReopenTime } from 'dashboard/helper/snoozeHelpers';
import { useInbox } from 'dashboard/composables/useInbox';
import { useAlert } from 'dashboard/composables';
import { useI18n } from 'vue-i18n';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

const props = defineProps({
  chat: {
    type: Object,
    default: () => ({}),
  },
  showBackButton: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();
const conversationHeader = ref(null);
const { width } = useElementSize(conversationHeader);
const { isAWebWidgetInbox } = useInbox();

const currentChat = computed(() => store.getters.getSelectedChat);
const accountId = computed(() => store.getters.getCurrentAccountId);

const chatMetadata = computed(() => props.chat.meta);

const backButtonUrl = computed(() => {
  const {
    params: { inbox_id: inboxId, label, teamId, id: customViewId },
    name,
  } = route;

  const conversationTypeMap = {
    conversation_through_mentions: 'mention',
    conversation_through_participating: 'participating',
    conversation_through_unattended: 'unattended',
  };
  return conversationListPageURL({
    accountId: accountId.value,
    inboxId,
    label,
    teamId,
    conversationType: conversationTypeMap[name],
    customViewId,
  });
});

const isHMACVerified = computed(() => {
  if (!isAWebWidgetInbox.value) {
    return true;
  }
  return chatMetadata.value.hmac_verified;
});

const currentContact = computed(() =>
  store.getters['contacts/getContact'](props.chat.meta.sender.id)
);

const isSnoozed = computed(
  () => currentChat.value.status === wootConstants.STATUS_TYPE.SNOOZED
);

const snoozedDisplayText = computed(() => {
  const { snoozed_until: snoozedUntil } = currentChat.value;
  if (snoozedUntil) {
    return `${t('CONVERSATION.HEADER.SNOOZED_UNTIL')} ${snoozedReopenTime(snoozedUntil)}`;
  }
  return t('CONVERSATION.HEADER.SNOOZED_UNTIL_NEXT_REPLY');
});

const inbox = computed(() => {
  const { inbox_id: inboxId } = props.chat;
  return store.getters['inboxes/getInbox'](inboxId);
});

const hasMultipleInboxes = computed(
  () => store.getters['inboxes/getInboxes'].length > 1
);

const hasSlaPolicyId = computed(
  () => props.chat?.applied_sla?.id && !currentContact.value?.blocked
);

const copyConversationId = async () => {
  try {
    await copyTextToClipboard(String(props.chat.id));
    useAlert(t('CONVERSATION.HEADER.COPY_ID_SUCCESS'));
  } catch (error) {
    // error
  }
};
</script>

<template>
  <div
    ref="conversationHeader"
    class="flex items-center justify-between flex-1 w-full min-w-0 gap-3 px-4 py-2.5 min-h-[3.75rem]"
  >
    <div class="flex items-center flex-1 min-w-0 gap-2.5">
      <button
        v-if="showBackButton"
        type="button"
        data-test-id="kalo-back-button"
        :aria-label="$t('GENERAL_SETTINGS.BACK')"
        :title="$t('GENERAL_SETTINGS.BACK')"
        class="grid rounded-lg size-8 shrink-0 place-items-center text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
        @click="router.push(backButtonUrl)"
      >
        <KaloIcon name="back" class="size-5 rtl:rotate-180" />
      </button>
      <Avatar
        :name="currentContact.name"
        :src="currentContact.thumbnail"
        :size="38"
        :status="currentContact.availability_status"
        rounded-full
        hide-offline-status
      />
      <div class="flex flex-col items-start min-w-0 overflow-hidden">
        <div class="flex flex-row items-center max-w-full gap-1">
          <span
            class="text-[15px] font-bold leading-tight truncate text-n-slate-12"
          >
            {{ currentContact.name }}
          </span>
          <fluent-icon
            v-if="!isHMACVerified"
            v-tooltip="$t('CONVERSATION.UNVERIFIED_SESSION')"
            size="14"
            class="text-n-amber-10 my-0 mx-0 min-w-[14px] flex-shrink-0"
            icon="warning"
          />
        </div>
        <div
          class="flex items-center max-w-full gap-1.5 overflow-hidden text-xs conversation--header--actions text-n-slate-11 whitespace-nowrap"
        >
          <KaloChannelBadge :inbox="inbox" class="!size-3.5 !text-[9px]" />
          <InboxName
            v-if="hasMultipleInboxes"
            :inbox="inbox"
            class="!mx-0 min-w-0 [&>:first-child]:hidden"
          />
          <span
            v-if="hasMultipleInboxes"
            aria-hidden="true"
            class="rounded-full size-1 shrink-0 bg-n-slate-8"
          />
          <button
            type="button"
            :title="$t('KALO_CHAT_LIST.HEADER.COPY_ID')"
            class="truncate text-xs text-n-slate-10 hover:text-n-slate-12 !p-0 cursor-pointer tabular-nums"
            @click="copyConversationId"
          >
            {{ `#${chat.id}` }}
          </button>
          <template v-if="isSnoozed">
            <span
              aria-hidden="true"
              class="rounded-full size-1 shrink-0 bg-n-slate-8"
            />
            <span class="font-semibold truncate text-n-amber-11">
              {{ snoozedDisplayText }}
            </span>
          </template>
        </div>
      </div>
    </div>
    <div
      class="flex flex-row items-center justify-end flex-shrink-0 gap-2 header-actions-wrap"
    >
      <SLACardLabel
        v-if="hasSlaPolicyId"
        :chat="chat"
        show-extended-info
        :parent-width="width"
        class="hidden md:flex"
      />
      <ConversationCallButton :inbox="inbox" :chat="currentChat" />
      <MoreActions :conversation-id="currentChat.id" />
    </div>
  </div>
</template>
