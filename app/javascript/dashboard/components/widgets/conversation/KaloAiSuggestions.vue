<script setup>
import { computed, inject, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import {
  isAiHealthy,
  loadAiHealth,
} from 'dashboard/components-next/assistant/useKaloAssistant';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import {
  cacheKey,
  cacheReply,
  cacheSilent,
  getCachedSuggestion,
  isSilenced,
  silenceAll,
} from './kaloSuggestionCache';

const props = defineProps({
  messages: { type: Array, default: () => [] },
  isPrivate: { type: Boolean, default: false },
  isReplyRestricted: { type: Boolean, default: false },
  conversationId: { type: Number, required: true },
  contactId: { type: Number, default: null },
});
const emit = defineEmits(['select']);

const { t } = useI18n();

const INCOMING = 0;
const OUTGOING = 1;
const HISTORY_LIMIT = 6;
// 403 plan expired, 429 rate limited, 502 provider down, 503 not configured.
const ACCOUNT_WIDE_STATUSES = [403, 429, 502, 503];

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

const canSuggest = computed(
  () => !props.isPrivate && !props.isReplyRestricted && !!props.contactId
);

let requestedFor = null;

const load = async message => {
  requestId += 1;
  const mine = requestId;
  suggestions.value = [];
  requestedFor = message?.id ?? null;
  if (!message) return;
  const key = cacheKey(props.conversationId, message.id);
  const cached = getCachedSuggestion(key);
  if (cached) {
    if (cached.reply) suggestions.value = [cached.reply];
    return;
  }
  if (isSilenced()) return;
  try {
    const { data } = await brandGrowthAPI.chatReply({
      message: message.content,
      history: toHistory(),
    });
    if (data.reply) cacheReply(key, data.reply);
    if (mine === requestId && data.reply) suggestions.value = [data.reply];
  } catch (error) {
    // Any failure stays silent: the strip just stays hidden.
    cacheSilent(key);
    if (ACCOUNT_WIDE_STATUSES.includes(error?.response?.status)) silenceAll();
  }
};

// The store is optional here (specs mount without one).
const store = inject('store', null);
const healthKey = computed(
  () => store?.getters?.getCurrentAccountId ?? 'current'
);
const aiHealthy = computed(() => isAiHealthy(healthKey.value));

// Re-request only when a different incoming message arrives (never for private
// notes), and only once ai_health said AI answers: no call while health is
// unknown or unavailable.
watch(
  [() => triggerMessage.value?.id, () => canSuggest.value, aiHealthy],
  async () => {
    if (!canSuggest.value) return;
    if (!aiHealthy.value && !(await loadAiHealth(healthKey.value))) return;
    const message = triggerMessage.value;
    if ((message?.id ?? null) !== requestedFor) load(message);
  },
  { immediate: true }
);

const isVisible = computed(
  () => canSuggest.value && triggerMessage.value && suggestions.value.length
);
</script>

<template>
  <div
    v-if="isVisible"
    data-test="ai-suggestions"
    class="flex flex-wrap items-center gap-2 px-3 pt-1 pb-2"
    role="group"
    :aria-label="t('KALO_CHAT.AI.LABEL')"
  >
    <button
      v-for="text in suggestions"
      :key="text"
      type="button"
      data-test="ai-suggestion"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-start rounded-full border border-dashed border-n-brand/40 bg-n-solid-1 text-n-blue-11 hover:bg-n-solid-blue transition-colors duration-150 motion-reduce:transition-none"
      @click="emit('select', text)"
    >
      <KaloIcon name="spark" class="size-4" />
      {{ text }}
    </button>
  </div>
</template>
