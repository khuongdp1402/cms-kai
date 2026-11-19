import { computed, reactive } from 'vue';
import assistantAPI from 'dashboard/api/kchat/assistant';
import brandGrowthAPI from 'dashboard/api/kchat/brandGrowth';
import { useMapGetter } from 'dashboard/composables/store';

export const MODES = ['help', 'write', 'insights'];
export const HISTORY_TURNS = 6;

// In-memory only: one session per account, gone on page reload.
const sessions = reactive({});
const availability = reactive({});

const session = accountId => {
  if (!sessions[accountId]) {
    sessions[accountId] = {
      messages: [],
      mode: 'help',
      isLoading: false,
      error: null,
    };
  }
  return sessions[accountId];
};

export const buildHistory = messages =>
  messages
    .slice(-HISTORY_TURNS)
    .map(({ role, content }) => ({ role, content }));

// Maps an API failure to a KALO_ASSISTANT.ERRORS key.
export const errorKey = error => {
  const status = error?.response?.status;
  const code = error?.response?.data?.error;
  if (status === 403 && code === 'subscription_expired') return 'EXPIRED';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 422 && code === 'message_too_long') return 'TOO_LONG';
  if (status === 422 && code === 'prompt_too_large') return 'CONTEXT_TOO_LONG';
  if (status === 502 || status === 503) return 'UNAVAILABLE';
  return 'GENERIC';
};

export const resetAssistantState = () => {
  Object.keys(sessions).forEach(key => delete sessions[key]);
  Object.keys(availability).forEach(key => delete availability[key]);
};

export function useKaloAssistant() {
  const accountId = useMapGetter('getCurrentAccountId');
  const current = computed(() => session(accountId.value));

  const setMode = mode => {
    if (MODES.includes(mode)) current.value.mode = mode;
  };

  const reset = () => {
    delete sessions[accountId.value];
  };

  // Resolves true when a reply was added. On failure the user turn is removed
  // and `error` is set, so the caller can put the text back into the input.
  const send = async text => {
    const state = current.value;
    const message = (text || '').trim();
    if (!message || state.isLoading) return false;
    const history = buildHistory(state.messages);
    state.error = null;
    state.messages.push({ role: 'user', content: message });
    state.isLoading = true;
    try {
      const { data } = await assistantAPI.send({
        message,
        mode: state.mode,
        history,
      });
      state.messages.push({ role: 'assistant', content: data.reply });
      return true;
    } catch (error) {
      state.messages.pop();
      state.error = errorKey(error);
      return false;
    } finally {
      state.isLoading = false;
    }
  };

  return {
    messages: computed(() => current.value.messages),
    mode: computed(() => current.value.mode),
    isLoading: computed(() => current.value.isLoading),
    error: computed(() => current.value.error),
    setMode,
    send,
    reset,
  };
}

// Entry-point visibility: AI key configured and answering (ai_health
// available is false while recent provider calls failed) and the account flag
// kalo_ai_assistant on. Health is asked once per account and cached.
export function useKaloAssistantAvailability() {
  const accountId = useMapGetter('getCurrentAccountId');
  const isFeatureEnabled = useMapGetter('accounts/isFeatureEnabledonAccount');

  const load = async () => {
    const id = accountId.value;
    if (!id || availability[id] !== undefined) return;
    availability[id] = false;
    try {
      const { data } = await brandGrowthAPI.aiHealth();
      availability[id] = !!data?.configured && data?.available !== false;
    } catch {
      availability[id] = false;
    }
  };

  const isAvailable = computed(
    () =>
      !!availability[accountId.value] &&
      !!isFeatureEnabled.value(accountId.value, 'kalo_ai_assistant')
  );

  return { isAvailable, load };
}
