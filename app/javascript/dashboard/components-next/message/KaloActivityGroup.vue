<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { format, fromUnixTime } from 'date-fns';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

defineProps({
  messages: {
    type: Array,
    required: true,
  },
});

const { t } = useI18n();
const isOpen = ref(false);

const formatTime = createdAt => {
  if (!createdAt) return '';
  return format(fromUnixTime(createdAt), 'HH:mm');
};
</script>

<template>
  <li
    data-test="kalo-activity-group"
    class="flex flex-col items-center my-2.5 list-none"
  >
    <button
      type="button"
      data-test="kalo-activity-group-toggle"
      :aria-expanded="isOpen"
      class="inline-flex items-center gap-2 px-3.5 py-1 text-xs font-medium border rounded-full shadow-sm bg-n-surface-1 border-n-weak text-n-slate-11 hover:border-n-strong hover:text-n-slate-12"
      @click="isOpen = !isOpen"
    >
      <span>
        {{
          t('KALO_CHAT_THREAD.ACTIVITY_GROUP.SUMMARY', {
            count: messages.length,
          })
        }}
      </span>
      <span class="font-semibold text-n-blue-11">
        {{
          isOpen
            ? t('KALO_CHAT_THREAD.ACTIVITY_GROUP.COLLAPSE')
            : t('KALO_CHAT_THREAD.ACTIVITY_GROUP.EXPAND')
        }}
      </span>
      <KaloIcon
        name="chevron"
        class="size-3.5 transition-transform duration-150"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <ul
      v-if="isOpen"
      data-test="kalo-activity-group-list"
      class="w-full max-w-lg px-3.5 py-2 mt-1.5 text-xs border shadow-sm list-none rounded-xl bg-n-surface-1 border-n-weak text-n-slate-11 divide-y divide-n-weak"
    >
      <li
        v-for="msg in messages"
        :key="msg.id"
        class="flex items-start justify-between gap-3 py-1.5"
      >
        <span class="min-w-0 break-words">{{ msg.content }}</span>
        <span class="shrink-0 text-n-slate-10 tabular-nums">
          {{ formatTime(msg.createdAt) }}
        </span>
      </li>
    </ul>
  </li>
</template>
