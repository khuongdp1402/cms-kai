<script>
import { mapGetters } from 'vuex';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useAccount } from 'dashboard/composables/useAccount';
import OnboardingView from '../OnboardingView.vue';
import EmptyStateMessage from './EmptyStateMessage.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';

export default {
  components: {
    OnboardingView,
    EmptyStateMessage,
    KaloIcon,
  },
  props: {
    isOnExpandedLayout: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    const { isAdmin } = useAdmin();

    const { accountScopedUrl } = useAccount();

    return {
      isAdmin,
      accountScopedUrl,
    };
  },
  computed: {
    ...mapGetters({
      currentChat: 'getSelectedChat',
      allConversations: 'getAllConversations',
      inboxesList: 'inboxes/getInboxes',
      uiFlags: 'inboxes/getUIFlags',
      loadingChatList: 'getChatListLoadingStatus',
    }),
    loadingIndicatorMessage() {
      if (this.uiFlags.isFetching) {
        return this.$t('KALO_CHAT_LIST.WELCOME.LOADING_INBOXES');
      }
      return this.$t('KALO_CHAT_LIST.WELCOME.LOADING_CONVERSATIONS');
    },
    conversationMissingMessage() {
      if (!this.isOnExpandedLayout) {
        return this.$t('KALO_CHAT_LIST.WELCOME.PICK');
      }
      return this.$t('KALO_CHAT_LIST.WELCOME.NOT_FOUND');
    },
    newInboxURL() {
      return this.accountScopedUrl('settings/inboxes/new');
    },
    emptyClassName() {
      if (
        !this.inboxesList.length &&
        !this.uiFlags.isFetching &&
        !this.loadingChatList &&
        this.isAdmin
      ) {
        return 'h-full overflow-auto w-full bg-n-background';
      }
      return 'flex-1 min-w-0 px-0 flex flex-col items-center justify-center h-full overflow-auto bg-n-background';
    },
  },
};
</script>

<template>
  <div :class="emptyClassName">
    <div
      v-if="uiFlags.isFetching || loadingChatList"
      role="status"
      class="flex flex-col items-center gap-3 text-sm text-n-slate-11"
    >
      <span
        aria-hidden="true"
        class="grid rounded-2xl size-14 bg-n-blue-2 place-items-center text-n-blue-9 animate-pulse motion-reduce:animate-none"
      >
        <KaloIcon name="msg" class="size-7" />
      </span>
      {{ loadingIndicatorMessage }}
    </div>
    <!-- No inboxes attached -->
    <div
      v-if="!inboxesList.length && !uiFlags.isFetching && !loadingChatList"
      class="flex items-center justify-center w-full min-h-full"
    >
      <OnboardingView v-if="isAdmin" />
      <EmptyStateMessage
        v-else
        :message="$t('KALO_CHAT_LIST.WELCOME.NO_INBOX_AGENT')"
      />
    </div>
    <div
      v-else-if="!uiFlags.isFetching && !loadingChatList"
      class="flex flex-col items-center justify-center w-full h-full"
    >
      <!-- No conversations available -->
      <EmptyStateMessage
        v-if="!allConversations.length"
        :message="$t('KALO_CHAT_LIST.WELCOME.NO_CONVERSATIONS')"
      />
      <!-- Nothing selected: Kalo welcome with the shop's next steps -->
      <OnboardingView
        v-else-if="allConversations.length && !currentChat.id"
        :message="conversationMissingMessage"
      />
    </div>
  </div>
</template>
