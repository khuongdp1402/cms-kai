<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

const props = defineProps({
  messages: { type: Array, default: () => [] },
  isPrivate: { type: Boolean, default: false },
});
const emit = defineEmits(['select']);

const { t } = useI18n();

const INCOMING = 0;
const OUTGOING = 1;
const HISTORY_LIMIT = 6;

const suggestions = ref([]);
let requestId = 0;

// Public text messages only: activity lines and private notes are not part of the dialog.
const dialog = computed(() =>
  props.messages.filter(
    m => !m.private && [INCOMING, OUTGOING].includes(m.message_type)
  )
);
const lastMessage = computed(() => dialog.value.at(-1));
const triggerMessage = computed(() => {
  const last = lastMessage.value;
  return last?.message_type === INCOMING && last.content ? last : null;
});

const toHistory = () =>
  dialog.value
    .slice(0, -1)
    .filter(m => m.content)
    .slice(-HISTORY_LIMIT)
    .map(m => ({
      role: m.message_type === INCOMING ? 'user' : 'assistant',
      content: m.content,
    }));

let requestedFor = null;

const load = async message => {
  requestId += 1;
  const mine = requestId;
  suggestions.value = [];
  requestedFor = message?.id ?? null;
  if (!message) return;
  try {
    const { data } = await brandGrowthAPI.chatReply({
      message: message.content,
      history: toHistory(),
    });
    if (mine === requestId && data.reply) suggestions.value = [data.reply];
  } catch {
    // 503 ai_not_configured and 403 subscription_expired: stay silent, the strip just stays hidden.
  }
};

// Re-request only when a different incoming message arrives (never for private notes).
watch(
  [() => triggerMessage.value?.id, () => props.isPrivate],
  () => {
    if (props.isPrivate) return;
    const message = triggerMessage.value;
    if ((message?.id ?? null) !== requestedFor) load(message);
  },
  { immediate: true }
);

const isVisible = computed(
  () => !props.isPrivate && triggerMessage.value && suggestions.value.length
);
</script>

<template>
  <div
    v-if="isVisible"
    data-test="ai-suggestions"
    class="flex flex-wrap items-center gap-2 px-4 py-2"
    role="group"
    :aria-label="t('KALO_CHAT.AI.LABEL')"
  >
    <button
      v-for="text in suggestions"
      :key="text"
      type="button"
      data-test="ai-suggestion"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-start rounded-full bg-woot-50 text-woot-600 hover:bg-woot-100"
      @click="emit('select', text)"
    >
      <KaloIcon name="spark" class="size-4" />
      {{ text }}
    </button>
  </div>
</template>
