<script setup>
import { useI18n } from 'vue-i18n';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloSetupChecklist from 'next/guide/KaloSetupChecklist.vue';

defineProps({
  isFiltered: { type: Boolean, default: false },
});

const emit = defineEmits(['clearFilters']);

const { t } = useI18n();
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
    <div v-if="!isFiltered" class="w-full pt-2 md:hidden">
      <KaloSetupChecklist variant="compact" />
    </div>
  </div>
</template>
