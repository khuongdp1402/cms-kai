<script setup>
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  CAMPAIGN_FLOW_KEY,
  GOALS,
  MAX_TITLE_CHARS,
  campaignTagFrom,
} from './campaignFlowHelpers';

const { t } = useI18n();
const flow = inject(CAMPAIGN_FLOW_KEY);
const campaign = flow.campaign;

const tag = computed(() => campaignTagFrom(campaign.title));
</script>

<template>
  <div class="flex flex-col gap-5" data-test="campaign-step-goal">
    <label class="flex flex-col gap-1.5 text-sm font-semibold text-n-slate-12">
      {{ t('KALO_CAMPAIGN_FLOW.GOAL_STEP.NAME') }}
      <input
        v-model="campaign.title"
        data-test="campaign-title"
        type="text"
        :maxlength="MAX_TITLE_CHARS"
        :placeholder="t('KALO_CAMPAIGN_FLOW.GOAL_STEP.NAME_PLACEHOLDER')"
        class="px-3 py-2 mb-0 text-sm font-normal border rounded-[10px] outline-none bg-n-solid-1 border-n-strong text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15"
      />
      <span
        v-if="campaign.title.trim()"
        class="text-xs font-normal text-n-slate-11"
      >
        {{ t('KALO_CAMPAIGN_FLOW.GOAL_STEP.NAME_HINT', { tag }) }}
      </span>
    </label>

    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_CAMPAIGN_FLOW.GOAL_STEP.GOAL') }}
      </legend>
      <label
        v-for="goal in GOALS"
        :key="goal"
        data-test="campaign-goal"
        class="flex items-start gap-3 p-3 border cursor-pointer rounded-xl transition-colors"
        :class="
          campaign.goal === goal
            ? 'border-n-brand bg-n-brand/5'
            : 'border-n-weak bg-n-solid-1 hover:bg-n-solid-2'
        "
      >
        <input
          v-model="campaign.goal"
          type="radio"
          name="campaign-goal"
          :value="goal"
          class="mt-1 mb-0"
        />
        <span class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold text-n-slate-12">
            {{ t(`KALO_CAMPAIGN_FLOW.GOALS.${goal}`) }}
          </span>
          <span class="text-xs text-n-slate-11">
            {{ t(`KALO_CAMPAIGN_FLOW.GOAL_DESC.${goal}`) }}
          </span>
        </span>
      </label>
    </fieldset>
  </div>
</template>
