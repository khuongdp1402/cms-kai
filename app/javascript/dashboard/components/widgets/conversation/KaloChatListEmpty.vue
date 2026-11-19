<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloSetupChecklist from 'next/guide/KaloSetupChecklist.vue';

const props = defineProps({
  isFiltered: { type: Boolean, default: false },
  // Conversations waiting in "Chưa ai nhận" while this tab ("Của tôi") is empty.
  unassignedCount: { type: Number, default: 0 },
});

const emit = defineEmits(['clearFilters', 'openUnassigned']);

const hasUnassigned = computed(
  () => !props.isFiltered && props.unassignedCount > 0
);

const { t } = useI18n();
const { width } = useWindowSize();
// Desktop shows the checklist beside the list (OnboardingView): mount it here only on mobile.
const isMobile = computed(() => width.value < 768);
</script>

<template>
  <div
    data-test-id="kalo-chat-list-empty"
    class="flex flex-col items-center gap-3 px-6 py-12 text-center"
  >
    <span
      class="grid rounded-2xl size-14 place-items-center bg-n-blue-2 text-n-blue-11"
    >
      <KaloIcon :name="isFiltered ? 'search' : 'msg'" class="size-7" />
    </span>
    <template v-if="hasUnassigned">
      <p
        data-test-id="kalo-chat-list-unassigned"
        class="text-sm font-semibold text-n-slate-12"
      >
        {{
          t(
            'KALO_POLISH3.CHAT.UNASSIGNED_WAITING',
            { count: unassignedCount },
            unassignedCount
          )
        }}
      </p>
      <p class="text-sm text-n-slate-11">
        {{ t('KALO_POLISH3.CHAT.UNASSIGNED_HINT') }}
      </p>
      <button
        type="button"
        data-test-id="kalo-chat-list-open-unassigned"
        class="px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-n-brand hover:opacity-90"
        @click="emit('openUnassigned')"
      >
        {{ t('KALO_POLISH3.CHAT.OPEN_UNASSIGNED') }}
      </button>
    </template>
    <template v-else>
      <p class="text-sm font-semibold text-n-slate-12">
        {{
          isFiltered
            ? t('KALO_CHAT_LIST.EMPTY.FILTERED')
            : t('KALO_CHAT_LIST.EMPTY.TITLE')
        }}
      </p>
      <p class="text-sm text-n-slate-11">
        {{
          isFiltered
            ? t('KALO_CHAT_LIST.EMPTY.FILTERED_HINT')
            : t('KALO_CHAT_LIST.EMPTY.HINT')
        }}
      </p>
    </template>
    <button
      v-if="isFiltered"
      type="button"
      data-test-id="kalo-chat-list-clear"
      class="px-3.5 py-2 text-sm font-semibold rounded-[10px] text-n-blue-11 bg-n-blue-3 hover:bg-n-blue-4"
      @click="emit('clearFilters')"
    >
      {{ t('KALO_CHAT_LIST.EMPTY.CLEAR') }}
    </button>
    <!-- Mobile shows only this list, so the setup list lives here too (spec §3.1). -->
    <div v-if="!isFiltered && isMobile" class="w-full pt-2">
      <KaloSetupChecklist variant="compact" />
    </div>
  </div>
</template>
