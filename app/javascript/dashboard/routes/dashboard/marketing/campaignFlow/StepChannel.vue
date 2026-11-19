<script setup>
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  CAMPAIGN_FLOW_KEY,
  MAX_RECIPIENTS_PER_RUN,
  channelKey,
  defaultScheduleLocal,
} from './campaignFlowHelpers';

const { t } = useI18n();
const flow = inject(CAMPAIGN_FLOW_KEY);
const campaign = flow.campaign;

const channels = computed(() => flow.audience.value?.channels || []);
const selected = computed(() => flow.selectedChannel.value);

const chooseLater = () => {
  campaign.scheduleMode = 'later';
  if (!campaign.scheduledLocal)
    campaign.scheduledLocal = defaultScheduleLocal();
};
</script>

<template>
  <div class="flex flex-col gap-5" data-test="campaign-step-channel">
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.PICK') }}
      </legend>
      <label
        v-for="row in channels"
        :key="row.inbox_id"
        data-test="campaign-channel"
        class="flex items-start gap-3 p-3 border rounded-xl"
        :class="[
          campaign.inboxId === row.inbox_id
            ? 'border-n-brand bg-n-brand/5'
            : 'border-n-weak bg-n-solid-1',
          row.eligible_count
            ? 'cursor-pointer hover:bg-n-solid-2'
            : 'opacity-60 cursor-not-allowed',
        ]"
      >
        <input
          v-model="campaign.inboxId"
          type="radio"
          name="campaign-inbox"
          :value="row.inbox_id"
          :disabled="!row.eligible_count"
          class="mt-1 mb-0"
        />
        <span class="flex flex-col min-w-0 gap-0.5">
          <span class="text-sm font-semibold truncate text-n-slate-12">
            {{ row.inbox_name }}
            <span class="font-normal text-n-slate-10">
              {{
                `· ${t(`KALO_CAMPAIGN_FLOW.CHANNELS.${channelKey(row.channel_type)}`)}`
              }}
            </span>
          </span>
          <span class="text-xs text-n-slate-11">
            {{
              row.eligible_count
                ? t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.REACH', {
                    count: row.eligible_count,
                  })
                : t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.EMPTY')
            }}
          </span>
          <span
            v-if="row.rate_limit"
            class="text-xs text-n-amber-11"
            data-test="campaign-channel-rate"
          >
            {{
              t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.ZALO_RATE', {
                perMinute: row.rate_limit.per_minute,
              })
            }}
          </span>
          <span
            v-if="row.requires_24h_window"
            class="text-xs text-n-amber-11"
            data-test="campaign-channel-24h"
          >
            {{ t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.META_24H') }}
          </span>
        </span>
      </label>
      <p
        v-if="selected && selected.eligible_count > MAX_RECIPIENTS_PER_RUN"
        data-test="campaign-cap-warning"
        class="text-xs font-medium text-n-amber-11"
      >
        {{
          t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.CAP', {
            max: MAX_RECIPIENTS_PER_RUN,
            rest: selected.eligible_count - MAX_RECIPIENTS_PER_RUN,
          })
        }}
      </p>
    </fieldset>

    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.WHEN') }}
      </legend>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          data-test="campaign-when-now"
          class="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border cursor-pointer rounded-xl"
          :class="
            campaign.scheduleMode === 'now'
              ? 'border-n-brand bg-n-brand/5 text-n-slate-12'
              : 'border-n-weak bg-n-solid-1 text-n-slate-11'
          "
        >
          <input
            :checked="campaign.scheduleMode === 'now'"
            type="radio"
            name="campaign-when"
            class="mb-0"
            @change="campaign.scheduleMode = 'now'"
          />
          {{ t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.NOW') }}
        </label>
        <label
          data-test="campaign-when-later"
          class="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border cursor-pointer rounded-xl"
          :class="
            campaign.scheduleMode === 'later'
              ? 'border-n-brand bg-n-brand/5 text-n-slate-12'
              : 'border-n-weak bg-n-solid-1 text-n-slate-11'
          "
        >
          <input
            :checked="campaign.scheduleMode === 'later'"
            type="radio"
            name="campaign-when"
            class="mb-0"
            @change="chooseLater"
          />
          {{ t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.LATER') }}
        </label>
      </div>
      <label
        v-if="campaign.scheduleMode === 'later'"
        class="flex flex-col gap-1 text-xs font-semibold text-n-slate-12"
      >
        {{ t('KALO_CAMPAIGN_FLOW.CHANNEL_STEP.LATER_LABEL') }}
        <input
          v-model="campaign.scheduledLocal"
          data-test="campaign-scheduled-at"
          type="datetime-local"
          class="px-3 py-2 mb-0 text-sm font-normal border rounded-[10px] outline-none sm:w-64 bg-n-solid-1 border-n-strong text-n-slate-12 focus:border-n-brand"
        />
      </label>
    </fieldset>
  </div>
</template>
