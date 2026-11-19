<script>
import Avatar from 'next/avatar/Avatar.vue';
import Spinner from 'shared/components/Spinner.vue';
import EmptyState from 'dashboard/components/widgets/EmptyState.vue';
import { dynamicTime } from 'shared/helpers/timeHelper';

export default {
  components: {
    Avatar,
    Spinner,
    EmptyState,
  },
  props: {
    notifications: {
      type: Array,
      default: () => [],
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    onClickNotification: {
      type: Function,
      default: () => {},
    },
  },
  computed: {
    showEmptyResult() {
      return !this.isLoading && this.notifications.length === 0;
    },
  },
  methods: {
    dynamicTime,
  },
};
</script>

<template>
  <!-- The page frame (title, "mark all done") lives in NotificationsView. -->
  <div class="w-full">
    <div v-if="!isLoading && notifications.length" class="overflow-x-auto">
      <table class="notifications-table">
        <tbody>
          <tr
            v-for="notificationItem in notifications"
            :key="notificationItem.id"
            :class="{
              'is-unread': notificationItem.read_at === null,
            }"
            class="border-b border-n-weak"
            @click="() => onClickNotification(notificationItem)"
          >
            <td class="p-3 text-n-slate-12">
              <div
                class="overflow-hidden flex-view notification-contant--wrap whitespace-nowrap text-ellipsis"
              >
                <h5 class="notification--title">
                  {{
                    `#${
                      notificationItem.primary_actor
                        ? notificationItem.primary_actor.id
                        : $t(`NOTIFICATIONS_PAGE.DELETE_TITLE`)
                    }`
                  }}
                </h5>
                <span
                  class="overflow-hidden notification--message-title whitespace-nowrap text-ellipsis"
                >
                  {{ notificationItem.push_message_title }}
                </span>
              </div>
            </td>
            <td class="text-right">
              <span class="notification--type text-n-slate-11">
                {{
                  $t(
                    `NOTIFICATIONS_PAGE.TYPE_LABEL.${notificationItem.notification_type}`
                  )
                }}
              </span>
            </td>
            <td class="thumbnail--column">
              <Avatar
                v-if="notificationItem.primary_actor?.meta?.assignee"
                :src="notificationItem.primary_actor.meta.assignee.thumbnail"
                :size="28"
                :name="notificationItem.primary_actor.meta.assignee.name"
                rounded-full
              />
            </td>
            <td>
              <div class="text-right timestamp--column ltr:mr-2 rtl:ml-2">
                <span class="notification--created-at">
                  {{ dynamicTime(notificationItem.last_activity_at) }}
                </span>
              </div>
            </td>
            <td class="pr-3">
              <div
                v-if="!notificationItem.read_at"
                class="notification--unread-indicator"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState
      v-if="showEmptyResult"
      :title="$t('NOTIFICATIONS_PAGE.LIST.404')"
    />
    <div v-if="isLoading" class="notifications--loader text-n-slate-11">
      <Spinner />
      <span>{{ $t('NOTIFICATIONS_PAGE.LIST.LOADING_MESSAGE') }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notification--title {
  @apply text-sm m-0 text-n-slate-12;
}

.notifications-table {
  > tbody {
    > tr {
      @apply cursor-pointer transition-colors;

      &:hover {
        @apply bg-n-alpha-1;
      }

      &.is-active {
        @apply bg-n-alpha-2;
      }

      > td {
        &.conversation-count-item {
          @apply pl-6 rtl:pl-0 rtl:pr-6;
        }
      }

      &:last-child {
        @apply border-b-0;
      }
    }
  }
}

.is-unread {
  @apply font-semibold;
}

.notifications--loader {
  @apply text-base flex items-center justify-center p-10;
}

.notification--unread-indicator {
  @apply w-2.5 h-2.5 rounded-full bg-n-brand;
}

.notification--created-at {
  @apply text-n-slate-11 text-xs;
}

.notification--type {
  @apply text-xs;
}

.thumbnail--column {
  @apply w-[3.25rem];
}

.timestamp--column {
  @apply min-w-[9.125rem] text-right;
}

.notification-contant--wrap {
  @apply flex-col max-w-[31.25rem];
}

.notification--message-title {
  @apply text-n-slate-12;
}
</style>
