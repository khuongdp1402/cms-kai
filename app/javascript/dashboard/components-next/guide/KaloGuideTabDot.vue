<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKaloSetup } from './useKaloSetup';
import { useKaloTrial } from './useKaloTrial';

// Dot on the mobile "Thêm" tab (guided UX spec §3.1, §3.4): the setup list and
// the trial banner live in that sheet, so the tab signals them. The label is
// screen-reader text inside the tab button, so it joins the button's name.
const { t } = useI18n();
const { showBadge, remaining } = useKaloSetup();
const trial = useKaloTrial();

const isTrialUrgent = computed(
  () => trial.isVisible.value && trial.isUrgent.value
);
const label = computed(() =>
  [
    isTrialUrgent.value &&
      (trial.isExpired.value
        ? t('KALO_GUIDE.TRIAL.EXPIRED')
        : t('KALO_GUIDE.TRIAL.DAYS_LEFT', { count: trial.daysLeft.value })),
    showBadge.value &&
      t('KALO_GUIDE.SETUP.BADGE_TOOLTIP', { count: remaining.value }),
  ]
    .filter(Boolean)
    .join(', ')
);
</script>

<template>
  <span v-if="label" data-test-id="kalo-more-dot">
    <span
      aria-hidden="true"
      class="absolute top-0 border-2 rounded-full right-4 size-2.5 border-n-surface-1"
      :class="isTrialUrgent ? 'bg-n-ruby-9' : 'bg-n-blue-9'"
    />
    <span class="sr-only">{{ label }}</span>
  </span>
</template>
