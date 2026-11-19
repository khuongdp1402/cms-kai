<script setup>
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  CAMPAIGN_FLOW_KEY,
  MAX_RECIPIENTS_PER_RUN,
  channelKey,
  estimateSendMinutes,
  formatVietnamTime,
  vietnamLocalToIso,
} from './campaignFlowHelpers';

const { t } = useI18n();
const flow = inject(CAMPAIGN_FLOW_KEY);
const campaign = flow.campaign;

const channel = computed(() => flow.selectedChannel.value);
const recipients = computed(() =>
  Math.min(channel.value?.eligible_count || 0, MAX_RECIPIENTS_PER_RUN)
);

const audienceText = computed(() => {
  if (campaign.audienceMode === 'segment') {
    const segment = flow.segments.value.find(
      item => item.id === campaign.segmentId
    );
    return t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.AUDIENCE_SEGMENT', {
      name: segment?.name || '',
    });
  }
  if (campaign.audienceMode === 'labels') {
    return t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.AUDIENCE_LABELS', {
      labels: campaign.labels.map(label => `#${label}`).join(', '),
    });
  }
  return t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.AUDIENCE_ALL');
});

const whenText = computed(() =>
  campaign.scheduleMode === 'later' && campaign.scheduledLocal
    ? formatVietnamTime(vietnamLocalToIso(campaign.scheduledLocal))
    : t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.WHEN_NOW')
);

const minutes = computed(() =>
  estimateSendMinutes(recipients.value, channel.value?.rate_limit)
);

const rows = computed(() =>
  [
    { key: 'NAME', value: campaign.title.trim() },
    {
      key: 'GOAL',
      value: campaign.goal
        ? t(`KALO_CAMPAIGN_FLOW.GOALS.${campaign.goal}`)
        : '',
    },
    { key: 'AUDIENCE', value: audienceText.value },
    {
      key: 'CHANNEL',
      value: channel.value
        ? `${channel.value.inbox_name} · ${t(`KALO_CAMPAIGN_FLOW.CHANNELS.${channelKey(channel.value.channel_type)}`)}`
        : '',
    },
    { key: 'RECIPIENTS', value: String(recipients.value), test: 'recipients' },
    { key: 'WHEN', value: whenText.value },
    minutes.value === null
      ? null
      : {
          key: 'DURATION',
          test: 'duration',
          value: minutes.value
            ? t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.DURATION_MINUTES', {
                minutes: minutes.value,
              })
            : t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.DURATION_FAST'),
        },
  ].filter(Boolean)
);
</script>

<template>
  <div class="flex flex-col gap-5" data-test="campaign-step-review">
    <dl
      class="grid gap-x-4 gap-y-2.5 p-4 border rounded-xl border-n-weak bg-n-solid-2 sm:grid-cols-[180px_minmax(0,1fr)]"
    >
      <template v-for="row in rows" :key="row.key">
        <dt class="text-xs font-semibold text-n-slate-10 sm:text-sm">
          {{ t(`KALO_CAMPAIGN_FLOW.REVIEW_STEP.${row.key}`) }}
        </dt>
        <dd
          class="text-sm font-semibold break-words text-n-slate-12"
          :data-test="row.test ? `campaign-review-${row.test}` : undefined"
        >
          {{ row.value }}
        </dd>
      </template>
    </dl>

    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold text-n-slate-12">
        {{ t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.MESSAGE') }}
      </span>
      <p
        class="p-3 text-sm border rounded-xl whitespace-pre-wrap break-words border-n-weak bg-n-solid-1 text-n-slate-12"
      >
        {{ campaign.message.trim() }}
      </p>
    </div>

    <label
      class="flex items-start gap-2.5 p-3 text-sm border rounded-xl border-n-weak bg-n-solid-1 text-n-slate-12"
    >
      <input
        v-model="campaign.confirmed"
        data-test="campaign-confirm"
        type="checkbox"
        class="mt-0.5 mb-0"
      />
      {{
        t('KALO_CAMPAIGN_FLOW.REVIEW_STEP.CONFIRM', {
          count: recipients,
        })
      }}
    </label>
  </div>
</template>
