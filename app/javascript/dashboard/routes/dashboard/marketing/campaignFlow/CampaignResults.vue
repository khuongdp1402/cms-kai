<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import broadcastsAPI from 'dashboard/api/kchat/broadcasts';
import { formatVnd } from 'dashboard/helper/formatVnd';
import {
  RESULTS_POLL_MAX_MS,
  RESULTS_POLL_MS,
  SENDING_STATUSES,
  STATUS_TONES,
  channelKey,
  formatVietnamTime,
} from './campaignFlowHelpers';

// Step 6 and the detail view of a sent campaign. Every number comes from
// GET kchat/broadcasts/:id; "Đã xem" only exists where the channel reports it.
const props = defineProps({
  broadcastId: { type: String, required: true },
});
const emit = defineEmits(['loaded']);

const { t, te } = useI18n();
const broadcast = ref(null);
const results = ref(null);
const state = ref('loading');
let pollTimer = null;
let isUnmounted = false;
// Only the latest request may update the view (refresh, campaign change).
let latestRequest = 0;
let failedPolls = 0;

const stopPolling = () => {
  clearTimeout(pollTimer);
  pollTimer = null;
};

// While the campaign is sending, refresh every RESULTS_POLL_MS until it is
// done or the view closes (unmount), so it never stays on "Đang gửi".
// Failed refreshes wait twice as long each time, up to RESULTS_POLL_MAX_MS.
const schedulePoll = () => {
  stopPolling();
  if (isUnmounted || !SENDING_STATUSES.includes(broadcast.value?.status)) {
    return;
  }
  const delay = Math.min(
    RESULTS_POLL_MS * 2 ** failedPolls,
    RESULTS_POLL_MAX_MS
  );
  // eslint-disable-next-line no-use-before-define
  pollTimer = setTimeout(() => load({ silent: true }), delay);
};

const load = async ({ silent = false } = {}) => {
  stopPolling();
  latestRequest += 1;
  const request = latestRequest;
  if (!silent) {
    state.value = 'loading';
    failedPolls = 0;
  }
  try {
    const { data } = await broadcastsAPI.results(props.broadcastId);
    if (isUnmounted || request !== latestRequest) return;
    broadcast.value = data.broadcast;
    results.value = data.results;
    state.value = 'ready';
    failedPolls = 0;
    emit('loaded', data.broadcast);
  } catch {
    if (isUnmounted || request !== latestRequest) return;
    // A failed background refresh keeps the last numbers on screen.
    if (silent) failedPolls += 1;
    else state.value = 'error';
  }
  schedulePoll();
};

const status = computed(() => broadcast.value?.status);
const showNumbers = computed(() =>
  ['processing', 'sending', 'completed', 'failed'].includes(status.value)
);
const channelName = computed(() =>
  t(`KALO_CAMPAIGN_FLOW.CHANNELS.${channelKey(broadcast.value?.channel_type)}`)
);

const tiles = computed(() => {
  const r = results.value;
  if (!r) return [];
  return [
    { key: 'ELIGIBLE', value: r.eligible_count },
    {
      key: 'SENT',
      value: Math.max(0, r.sent_count - r.delivery_failed_count),
    },
    { key: 'FAILED_COUNT', value: r.failed_count + r.delivery_failed_count },
    broadcast.value?.requires_24h_window
      ? { key: 'SKIPPED_24H', value: r.skipped_24h_count }
      : null,
    r.read_supported ? { key: 'READ', value: r.read_count } : null,
    { key: 'REPLIED', value: r.replied_count },
    { key: 'ORDERS', value: r.orders_count },
    { key: 'REVENUE', value: formatVnd(r.revenue) },
  ].filter(Boolean);
});

watch(
  () => props.broadcastId,
  () => load()
);
onMounted(() => load());
onBeforeUnmount(() => {
  isUnmounted = true;
  stopPolling();
});
defineExpose({ load });
</script>

<template>
  <div class="flex flex-col gap-4" data-tour="campaign-results">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div v-if="broadcast" class="flex flex-wrap items-center min-w-0 gap-2">
        <b class="text-base truncate text-n-slate-12">{{ broadcast.title }}</b>
        <span
          data-test="campaign-results-status"
          class="px-2.5 py-0.5 text-xs font-semibold rounded-full"
          :class="STATUS_TONES[status]"
        >
          {{ t(`KALO_CAMPAIGN_FLOW.STATUS.${status}`) }}
        </span>
      </div>
      <button
        type="button"
        data-test="campaign-results-refresh"
        :disabled="state === 'loading'"
        class="px-3 py-1.5 text-xs font-semibold border rounded-[9px] border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-3 disabled:opacity-60"
        @click="load()"
      >
        {{ t('KALO_CAMPAIGN_FLOW.RESULTS.REFRESH') }}
      </button>
    </div>

    <p v-if="state === 'loading' && !results" class="text-sm text-n-slate-11">
      {{ t('KALO_CAMPAIGN_FLOW.RESULTS.LOADING') }}
    </p>
    <p v-else-if="state === 'error'" class="text-sm font-medium text-n-ruby-11">
      {{ t('KALO_CAMPAIGN_FLOW.RESULTS.LOAD_ERROR') }}
    </p>

    <template v-if="broadcast && results">
      <p
        v-if="status === 'scheduled'"
        data-test="campaign-results-scheduled"
        class="px-3 py-2 text-sm rounded-lg bg-n-amber-3 text-n-amber-11"
      >
        {{
          t('KALO_CAMPAIGN_FLOW.RESULTS.SCHEDULED', {
            time: formatVietnamTime(broadcast.scheduled_at),
          })
        }}
      </p>
      <p
        v-if="status === 'processing' || status === 'sending'"
        class="px-3 py-2 text-sm rounded-lg bg-n-alpha-2 text-n-slate-12"
      >
        {{ t('KALO_CAMPAIGN_FLOW.RESULTS.PROCESSING') }}
      </p>
      <p
        v-if="status === 'failed'"
        data-test="campaign-results-failed"
        class="px-3 py-2 text-sm rounded-lg bg-n-ruby-3 text-n-ruby-11"
      >
        {{
          broadcast.error &&
          te(`KALO_CAMPAIGN_FLOW.API_ERRORS.${broadcast.error}`)
            ? t(`KALO_CAMPAIGN_FLOW.API_ERRORS.${broadcast.error}`)
            : t('KALO_CAMPAIGN_FLOW.RESULTS.FAILED')
        }}
      </p>

      <dl
        v-if="showNumbers"
        class="grid grid-cols-2 gap-3 sm:grid-cols-3"
        data-test="campaign-results-tiles"
      >
        <div
          v-for="tile in tiles"
          :key="tile.key"
          :data-test="`campaign-result-${tile.key.toLowerCase()}`"
          class="flex flex-col gap-1 p-3 border rounded-xl border-n-weak bg-n-solid-1"
        >
          <dt class="text-xs font-semibold text-n-slate-11">
            {{ t(`KALO_CAMPAIGN_FLOW.RESULTS.${tile.key}`) }}
          </dt>
          <dd class="text-xl font-extrabold tabular-nums text-n-slate-12">
            {{ tile.value }}
          </dd>
        </div>
      </dl>

      <ul
        v-if="showNumbers"
        class="flex flex-col gap-1 text-xs list-disc ps-4 text-n-slate-11"
      >
        <li v-if="!results.read_supported" data-test="campaign-results-no-read">
          {{
            t('KALO_CAMPAIGN_FLOW.RESULTS.NO_READ', { channel: channelName })
          }}
        </li>
        <li>{{ t('KALO_CAMPAIGN_FLOW.RESULTS.SENT_NOTE') }}</li>
        <li>{{ t('KALO_CAMPAIGN_FLOW.RESULTS.REPLIED_NOTE') }}</li>
        <li>
          {{
            t('KALO_CAMPAIGN_FLOW.RESULTS.ORDERS_NOTE', {
              tag: broadcast.campaign_tag,
              days: results.attribution_days,
            })
          }}
        </li>
      </ul>
    </template>
  </div>
</template>
