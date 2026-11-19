<script>
import { mapGetters } from 'vuex';
import { useTrack } from 'dashboard/composables';
import TableFooter from 'dashboard/components/widgets/TableFooter.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';

import NotificationTable from './NotificationTable.vue';

import { ACCOUNT_EVENTS } from '../../../../helper/AnalyticsHelper/events';
export default {
  components: {
    NotificationTable,
    TableFooter,
    NextButton,
    KaloPage,
    KaloCard,
  },
  computed: {
    ...mapGetters({
      accountId: 'getCurrentAccountId',
      meta: 'notifications/getMeta',
      records: 'notifications/getNotifications',
      uiFlags: 'notifications/getUIFlags',
    }),
  },
  mounted() {
    this.$store.dispatch('notifications/get', { page: 1 });
  },
  methods: {
    onPageChange(page) {
      window.history.pushState({}, null, `${this.$route.path}?page=${page}`);
      this.$store.dispatch('notifications/get', { page });
    },
    openConversation(notification) {
      const {
        primary_actor_id: primaryActorId,
        primary_actor_type: primaryActorType,
        primary_actor: { id: conversationId },
        notification_type: notificationType,
      } = notification;

      useTrack(ACCOUNT_EVENTS.OPEN_CONVERSATION_VIA_NOTIFICATION, {
        notificationType,
      });
      this.$store.dispatch('notifications/read', {
        id: notification.id,
        primaryActorId,
        primaryActorType,
        unreadCount: this.meta.unreadCount,
      });

      this.$router.push(
        `/app/accounts/${this.accountId}/conversations/${conversationId}`
      );
    },
    onMarkAllDoneClick() {
      useTrack(ACCOUNT_EVENTS.MARK_AS_READ_NOTIFICATIONS);
      this.$store.dispatch('notifications/readAll');
    },
  },
};
</script>

<template>
  <KaloPage
    :title="$t('NOTIFICATIONS_PAGE.HEADER')"
    :description="$t('KALO_SHELL2.NOTIFICATIONS.DESC')"
    max-width-class="max-w-5xl"
  >
    <template v-if="meta.unreadCount" #actions>
      <NextButton
        data-test="notifications-mark-all-done"
        type="submit"
        sm
        :label="$t('NOTIFICATIONS_PAGE.MARK_ALL_DONE')"
        :is-loading="uiFlags.isUpdating"
        @click="onMarkAllDoneClick"
      />
    </template>
    <KaloCard flush>
      <NotificationTable
        :notifications="records"
        :is-loading="uiFlags.isFetching"
        :on-click-notification="openConversation"
      />
      <template v-if="Number(meta.count) > 15" #footer>
        <TableFooter
          :current-page="Number(meta.currentPage)"
          :total-count="meta.count"
          :page-size="15"
          @page-change="onPageChange"
        />
      </template>
    </KaloCard>
  </KaloPage>
</template>
