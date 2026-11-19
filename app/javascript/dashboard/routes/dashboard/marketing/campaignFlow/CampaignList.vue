<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import {
  STATUS_TONES,
  channelKey,
  formatVietnamTime,
} from './campaignFlowHelpers';

// Campaign rows with only the numbers the backend stored for them.
defineProps({
  broadcasts: { type: Array, required: true },
  isAdmin: { type: Boolean, default: false },
});
const emit = defineEmits(['open', 'delete', 'create']);

const { t, te } = useI18n();

// Known backend reasons (subscription_expired, stalled) have their own sentence.
const errorKey = code => {
  const key = `KALO_CAMPAIGN_FLOW.API_ERRORS.${code}`;
  return code && te(key) ? key : '';
};
const armedDelete = ref(null);

const onDelete = item => {
  if (armedDelete.value === item.id) {
    armedDelete.value = null;
    emit('delete', item);
    return;
  }
  armedDelete.value = item.id;
};

// Not created (dispatcher) plus rejected later by the channel.
const failedOf = item =>
  (item.failed_count || 0) + (item.delivery_failed_count || 0);

const statusOf = item => (STATUS_TONES[item.status] ? item.status : 'failed');
</script>

<template>
  <div
    v-if="!broadcasts.length"
    data-test="campaign-empty"
    class="flex flex-col items-center gap-3 px-6 py-14 text-center"
  >
    <span
      class="grid rounded-2xl size-12 place-content-center bg-woot-50 text-woot-600 dark:bg-n-blue-3 dark:text-n-blue-11"
    >
      <KaloIcon name="mega" class="size-6" />
    </span>
    <b class="text-base text-n-slate-12">
      {{ t('KALO_CAMPAIGN_FLOW.LIST.EMPTY_TITLE') }}
    </b>
    <p class="max-w-sm text-sm text-n-slate-11">
      {{ t('KALO_CAMPAIGN_FLOW.LIST.EMPTY_DESC') }}
    </p>
    <button
      v-if="isAdmin"
      type="button"
      data-test="campaign-empty-create"
      class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
      @click="emit('create')"
    >
      {{ t('KALO_CAMPAIGN_FLOW.CREATE') }}
    </button>
  </div>

  <ul v-else class="divide-y divide-n-weak">
    <li
      v-for="item in broadcasts"
      :key="item.id"
      data-test="campaign-row"
      class="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
    >
      <button
        type="button"
        data-test="campaign-row-open"
        class="flex flex-col w-full min-w-0 gap-1 sm:w-auto sm:flex-1 text-start group"
        @click="emit('open', item)"
      >
        <span class="flex flex-wrap items-center min-w-0 gap-2">
          <b class="text-sm truncate text-n-slate-12 group-hover:underline">
            {{ item.title }}
          </b>
          <span
            data-test="campaign-status"
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full"
            :class="STATUS_TONES[statusOf(item)]"
          >
            {{ t(`KALO_CAMPAIGN_FLOW.STATUS.${statusOf(item)}`) }}
          </span>
          <span
            v-if="item.goal"
            class="px-2 py-0.5 text-xs rounded-full bg-n-alpha-2 text-n-slate-11"
          >
            {{ t(`KALO_CAMPAIGN_FLOW.GOALS.${item.goal}`) }}
          </span>
        </span>
        <span
          class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-n-slate-11"
        >
          <span>
            {{
              item.inbox_name
                ? `${item.inbox_name} · ${t(`KALO_CAMPAIGN_FLOW.CHANNELS.${channelKey(item.channel_type)}`)}`
                : t('KALO_CAMPAIGN_FLOW.LIST.NO_CHANNEL')
            }}
          </span>
          <span
            v-if="item.status === 'completed'"
            data-test="campaign-row-numbers"
            class="font-semibold tabular-nums text-n-slate-12"
          >
            {{
              t('KALO_CAMPAIGN_FLOW.LIST.SENT', {
                sent: Math.max(
                  0,
                  (item.sent_count || 0) - (item.delivery_failed_count || 0)
                ),
                eligible: item.eligible_count || 0,
              })
            }}
          </span>
          <span
            v-if="item.status === 'completed' && failedOf(item)"
            data-test="campaign-row-failed"
            class="font-semibold text-n-ruby-11"
          >
            {{ t('KALO_CAMPAIGN_FLOW.LIST.FAILED', { count: failedOf(item) }) }}
          </span>
          <span v-if="item.status === 'scheduled' && item.scheduled_at">
            {{
              t('KALO_CAMPAIGN_FLOW.LIST.SCHEDULED_AT', {
                time: formatVietnamTime(item.scheduled_at),
              })
            }}
          </span>
          <span v-if="['processing', 'sending'].includes(item.status)">
            {{ t('KALO_CAMPAIGN_FLOW.LIST.PROCESSING') }}
          </span>
          <span
            v-if="item.status === 'failed' && errorKey(item.error)"
            data-test="campaign-row-error"
            class="font-semibold text-n-ruby-11"
          >
            {{ t(errorKey(item.error)) }}
          </span>
          <span v-if="item.status === 'draft'">
            {{ t('KALO_CAMPAIGN_FLOW.LIST.DRAFT_HINT') }}
          </span>
        </span>
      </button>
      <div class="flex items-center gap-2 ms-auto shrink-0">
        <button
          v-if="item.status === 'draft' && isAdmin"
          type="button"
          data-test="campaign-row-delete"
          class="px-3 py-1.5 text-xs font-semibold rounded-[9px] text-n-ruby-11 hover:bg-n-ruby-3"
          @click="onDelete(item)"
        >
          {{
            armedDelete === item.id
              ? t('KALO_CAMPAIGN_FLOW.LIST.DELETE_CONFIRM')
              : t('KALO_CAMPAIGN_FLOW.LIST.DELETE')
          }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border rounded-[9px] border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-3"
          @click="emit('open', item)"
        >
          {{
            item.status === 'draft'
              ? t('KALO_CAMPAIGN_FLOW.LIST.CONTINUE')
              : t('KALO_CAMPAIGN_FLOW.LIST.VIEW')
          }}
          <KaloIcon name="arrow" class="size-3.5" />
        </button>
      </div>
    </li>
  </ul>
</template>
