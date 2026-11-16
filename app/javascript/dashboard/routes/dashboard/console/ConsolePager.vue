<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  meta: { type: Object, required: true },
});
const emit = defineEmits(['change']);

const { t } = useI18n();
const pages = computed(() =>
  Math.max(1, Math.ceil(props.meta.count / props.meta.per_page))
);
</script>

<template>
  <div
    v-if="pages > 1"
    class="flex items-center justify-end gap-3 px-4 py-3 text-sm text-console-muted"
  >
    <button
      data-testid="prev-page"
      class="px-3 py-1 font-semibold border rounded-lg border-console-line text-console-accent disabled:opacity-40"
      :disabled="meta.current_page <= 1"
      @click="emit('change', meta.current_page - 1)"
    >
      {{ t('KALO_CONSOLE.COMMON.PREV') }}
    </button>
    <span>
      {{ t('KALO_CONSOLE.COMMON.PAGE', { page: meta.current_page, pages }) }}
    </span>
    <button
      data-testid="next-page"
      class="px-3 py-1 font-semibold border rounded-lg border-console-line text-console-accent disabled:opacity-40"
      :disabled="meta.current_page >= pages"
      @click="emit('change', meta.current_page + 1)"
    >
      {{ t('KALO_CONSOLE.COMMON.NEXT') }}
    </button>
  </div>
</template>
