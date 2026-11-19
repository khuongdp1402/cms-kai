<script setup>
import { ref, watch } from 'vue';
import { useMapGetter } from 'dashboard/composables/store';
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

const accountId = useMapGetter('getCurrentAccountId');
watch(accountId, load, { immediate: true });
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
        class="grid transition-colors duration-150 rounded-xl place-content-center text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
        :class="
          isExpanded
            ? 'w-full px-3 py-2 !flex items-center justify-start gap-2.5 text-sm font-semibold'
            : 'size-11'
        "
        @click="isOpen = true"
      >
        <!-- Same box and icon size as the rail items (KaloRail). -->
        <KaloIcon
          name="spark"
          class="shrink-0"
          :class="isExpanded ? 'size-5' : 'size-6'"
        />
        <span v-if="isExpanded" class="truncate">
          {{ t('KALO_ASSISTANT.BUTTON') }}
        </span>
      </button>
    </KaloRailTooltip>
    <KaloAssistantDrawer v-if="isOpen" @close="isOpen = false" />
  </template>
</template>
