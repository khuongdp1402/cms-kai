<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'next/icon/KaloIcon.vue';
import { useKaloSetup } from './useKaloSetup';

// "Bắt đầu với Kalo" (guided UX spec §3.1). `variant="card"` is the first card
// on Tổng quan; `compact` sits inside the Tin nhắn empty states.
const props = defineProps({
  variant: {
    type: String,
    default: 'card',
    validator: value => ['card', 'compact'].includes(value),
  },
});

const { t } = useI18n();
const {
  steps,
  doneCount,
  remaining,
  total,
  isVisible,
  skip,
  unskip,
  hide,
  refresh,
} = useKaloSetup();

const ICONS = {
  CHANNEL: 'plug',
  PRODUCT: 'tag',
  PAYMENT: 'wallet',
  ORDER: 'qr',
  INVITE: 'users',
};

const isComplete = computed(() => remaining.value === 0);
const isCompact = computed(() => props.variant === 'compact');

// The card is where people come back after a step: re-read the data.
onMounted(() => refresh());
</script>

<template>
  <section
    v-if="isVisible"
    data-test-id="kalo-setup-checklist"
    data-tour="setup-checklist"
    :aria-label="t('KALO_GUIDE.SETUP.TITLE')"
    class="flex flex-col w-full min-w-0 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak text-start"
  >
    <header
      class="flex flex-wrap items-start justify-between gap-3 border-b border-n-weak"
      :class="isCompact ? 'px-4 py-3' : 'px-5 py-4'"
    >
      <div class="flex flex-col min-w-0 gap-1">
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_GUIDE.SETUP.TITLE') }}
        </h2>
        <p class="mb-0 text-xs text-n-slate-11">
          {{
            isComplete
              ? t('KALO_GUIDE.SETUP.ALL_DONE')
              : t('KALO_GUIDE.SETUP.SUBTITLE')
          }}
        </p>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <span
          data-test-id="kalo-setup-progress"
          class="text-sm font-bold text-n-slate-12 tabular-nums"
        >
          {{ t('KALO_GUIDE.SETUP.PROGRESS', { done: doneCount, total }) }}
        </span>
        <button
          type="button"
          data-test-id="kalo-setup-hide"
          class="px-2.5 py-1 text-xs font-semibold rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
          @click="hide"
        >
          {{ t('KALO_GUIDE.SETUP.HIDE') }}
        </button>
      </div>
    </header>
    <div
      class="grid grid-cols-5 gap-1"
      :class="isCompact ? 'px-4 pt-2.5' : 'px-5 pt-3'"
      role="progressbar"
      :aria-valuenow="doneCount"
      aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="t('KALO_GUIDE.SETUP.PROGRESS', { done: doneCount, total })"
    >
      <span
        v-for="index in total"
        :key="index"
        class="h-1.5 rounded-full"
        :class="index <= doneCount ? 'bg-n-teal-9' : 'bg-n-alpha-2'"
      />
    </div>
    <ol class="flex flex-col p-0 m-0 list-none divide-y divide-n-weak">
      <li
        v-for="step in steps"
        :key="step.key"
        :data-test-id="`kalo-setup-step-${step.key.toLowerCase()}`"
        :data-state="step.done ? 'done' : step.skipped ? 'skipped' : 'todo'"
        class="flex flex-wrap items-center gap-3 m-0"
        :class="isCompact ? 'px-4 py-2.5' : 'px-5 py-3'"
      >
        <span
          aria-hidden="true"
          class="grid rounded-xl size-9 shrink-0 place-items-center"
          :class="
            step.done
              ? 'bg-n-teal-3 text-n-teal-11'
              : step.skipped
                ? 'bg-n-alpha-2 text-n-slate-10'
                : 'bg-n-blue-3 text-n-blue-11'
          "
        >
          <KaloIcon
            :name="step.done ? 'check' : ICONS[step.key]"
            class="size-5"
          />
        </span>
        <span class="flex flex-col flex-1 min-w-[10rem]">
          <span
            class="text-sm font-semibold"
            :class="
              step.done || step.skipped
                ? 'text-n-slate-11 line-through decoration-n-slate-9'
                : 'text-n-slate-12'
            "
          >
            {{ t(`KALO_GUIDE.SETUP.STEPS.${step.key}.TITLE`) }}
          </span>
          <span class="text-xs text-n-slate-11">
            <template v-if="step.done">
              {{ t('KALO_GUIDE.SETUP.DONE') }}
            </template>
            <template v-else-if="step.skipped">
              {{ t('KALO_GUIDE.SETUP.SKIPPED') }}
            </template>
            <template v-else>
              {{ t(`KALO_GUIDE.SETUP.STEPS.${step.key}.DESC`) }}
            </template>
          </span>
        </span>
        <span v-if="!step.done" class="flex items-center gap-1.5 shrink-0">
          <button
            v-if="step.skipped"
            type="button"
            data-test-id="kalo-setup-unskip"
            class="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
            @click="unskip(step.key)"
          >
            {{ t('KALO_GUIDE.SETUP.UNDO_SKIP') }}
          </button>
          <template v-else>
            <button
              type="button"
              data-test-id="kalo-setup-skip"
              class="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12"
              @click="skip(step.key)"
            >
              {{ t('KALO_GUIDE.SETUP.SKIP') }}
            </button>
            <router-link
              :to="step.to"
              data-test-id="kalo-setup-cta"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-n-brand hover:brightness-110"
            >
              {{ t(`KALO_GUIDE.SETUP.STEPS.${step.key}.CTA`) }}
              <KaloIcon name="arrow" class="size-3.5 rtl:rotate-180" />
            </router-link>
          </template>
        </span>
      </li>
    </ol>
  </section>
</template>
