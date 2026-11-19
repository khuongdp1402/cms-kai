<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloRailTooltip from 'dashboard/components-next/sidebar/KaloRailTooltip.vue';
import KaloAssistantDrawer from './KaloAssistantDrawer.vue';
import { useKaloAssistantAvailability } from './useKaloAssistant';

/**
 * Self-contained entry point of the AI assistant (guided UX spec §6): renders
 * nothing unless the AI key is configured and the account flag is on.
 * `rail` = sidebar footer (icon + tooltip when collapsed), `sheet` = row in
 * the mobile "Thêm" sheet.
 */
defineProps({
  variant: {
    type: String,
    default: 'rail',
    validator: value => ['rail', 'sheet'].includes(value),
  },
  isExpanded: { type: Boolean, default: false },
});

const { t } = useI18n();
const { isAvailable, load } = useKaloAssistantAvailability();
const isOpen = ref(false);

onMounted(load);
</script>

<template>
  <template v-if="isAvailable">
    <button
      v-if="variant === 'sheet'"
      type="button"
      data-test-id="kalo-assistant-button"
      class="flex items-center w-full gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-start text-n-slate-12 hover:bg-n-alpha-2"
      @click="isOpen = true"
    >
      <span class="grid size-8 shrink-0 place-content-center">
        <KaloIcon name="spark" class="size-5" />
      </span>
      {{ t('KALO_ASSISTANT.BUTTON') }}
    </button>
    <KaloRailTooltip
      v-else
      :label="t('KALO_ASSISTANT.BUTTON')"
      :enabled="!isExpanded"
      :class="{ 'w-full': isExpanded }"
    >
      <button
        type="button"
        data-test-id="kalo-assistant-button"
        :aria-label="t('KALO_ASSISTANT.BUTTON')"
        class="grid rounded-lg place-content-center hover:bg-n-alpha-1 text-n-slate-11"
        :class="
          isExpanded
            ? 'w-full h-8 px-2 !flex items-center justify-start gap-2 text-xs font-medium'
            : 'size-8'
        "
        @click="isOpen = true"
      >
        <KaloIcon name="spark" class="size-5 shrink-0" />
        <span v-if="isExpanded" class="truncate">
          {{ t('KALO_ASSISTANT.BUTTON') }}
        </span>
      </button>
    </KaloRailTooltip>
    <KaloAssistantDrawer v-if="isOpen" @close="isOpen = false" />
  </template>
</template>
