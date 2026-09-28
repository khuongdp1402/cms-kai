<script setup>
/* global axios */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAlert } from 'dashboard/composables';
import NextButton from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  inbox: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();
const route = useRoute();
const accountId = computed(() => route.params.accountId || 1);

const connection = ref(null);
const isLoading = ref(true);
const isReconnecting = ref(false);
const showQrModal = ref(false);
const qrAttempt = ref(null);
const remainingSeconds = ref(120);

let pollTimer = null;
let countdownTimer = null;

const connectionStatus = computed(() => {
  return connection.value?.connection_status || props.inbox?.connection_status || 'unknown';
});

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'bg-emerald-500 text-white';
    case 'reconnecting':
    case 'connecting':
    case 'degraded':
      return 'bg-amber-500 text-white';
    case 'reauthorization_required':
    case 'disconnected':
    case 'error':
      return 'bg-rose-500 text-white';
    default:
      return 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
  }
});

const fetchConnection = async () => {
  isLoading.value = true;
  try {
    const res = await axios.get(`/api/v1/accounts/${accountId.value}/inboxes/${props.inbox.id}/zalo_personal/connection`);
    connection.value = res.data;
  } catch (err) {
    //
  } finally {
    isLoading.value = false;
  }
};

const startReconnect = async () => {
  isReconnecting.value = true;
  try {
    const res = await axios.post(`/api/v1/accounts/${accountId.value}/inboxes/${props.inbox.id}/zalo_personal/connection/reconnect`);
    qrAttempt.value = res.data;
    showQrModal.value = true;
    startPolling();
    startCountdown();
  } catch (err) {
    useAlert(err.response?.data?.error || t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.RECONNECT_ERROR'));
  } finally {
    isReconnecting.value = false;
  }
};

const pollReconnectStatus = async () => {
  if (!qrAttempt.value?.public_id) return;

  try {
    const res = await axios.get(`/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${qrAttempt.value.public_id}`);
    qrAttempt.value.status = res.data.status;
    if (res.data.qr_data_url) {
      qrAttempt.value.qr_data_url = res.data.qr_data_url;
    }

    if (res.data.status === 'authenticated') {
      stopPolling();
      stopCountdown();
      // Consume
      await axios.post(`/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${qrAttempt.value.public_id}/consume`);
      showQrModal.value = false;
      useAlert(t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.RECONNECT_SUCCESS'));
      await fetchConnection();
    }
  } catch {}
};

const startPolling = () => {
  stopPolling();
  pollTimer = setInterval(pollReconnectStatus, 2000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const startCountdown = () => {
  stopCountdown();
  remainingSeconds.value = 120;
  countdownTimer = setInterval(() => {
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
    if (remainingSeconds.value === 0) {
      stopCountdown();
      stopPolling();
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const disconnect = async () => {
  if (!confirm(t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.DISCONNECT_CONFIRM'))) return;

  try {
    await axios.delete(`/api/v1/accounts/${accountId.value}/inboxes/${props.inbox.id}/zalo_personal/connection`);
    useAlert(t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.DISCONNECT_SUCCESS'));
    await fetchConnection();
  } catch (err) {
    useAlert(err.response?.data?.error || t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.DISCONNECT_ERROR'));
  }
};

onMounted(() => {
  fetchConnection();
});

onBeforeUnmount(() => {
  stopPolling();
  stopCountdown();
});
</script>

<template>
  <div class="flex flex-col gap-6 max-w-3xl">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
        {{ $t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.TITLE') }}
      </h3>

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
          <span class="text-sm font-medium text-slate-600 dark:text-slate-400">
            {{ $t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.STATUS_LABEL') }}
          </span>
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full" :class="statusColor">
            {{ connectionStatus }}
          </span>
        </div>

        <div v-if="connection?.display_name" class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
          <span class="text-sm font-medium text-slate-600 dark:text-slate-400">
            {{ $t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.ACCOUNT_NAME') }}
          </span>
          <span class="text-sm font-medium text-slate-900 dark:text-slate-100">
            {{ connection.display_name }}
          </span>
        </div>

        <div v-if="connection?.last_connected_at" class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
          <span class="text-sm font-medium text-slate-600 dark:text-slate-400">
            {{ $t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.LAST_SYNC') }}
          </span>
          <span class="text-sm text-slate-600 dark:text-slate-400">
            {{ new Date(connection.last_connected_at).toLocaleString() }}
          </span>
        </div>

        <div class="flex items-center gap-3 mt-4">
          <NextButton
            solid
            blue
            size="sm"
            :is-loading="isReconnecting"
            :label="$t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.RECONNECT_BUTTON')"
            @click="startReconnect"
          />
          <NextButton
            ghost
            red
            size="sm"
            :label="$t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.DISCONNECT_BUTTON')"
            @click="disconnect"
          />
        </div>
      </div>
    </div>

    <!-- Reconnect QR Modal -->
    <div
      v-if="showQrModal"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col items-center">
        <h4 class="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {{ $t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.SCAN_QR_RECONNECT') }}
        </h4>
        <span class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {{ remainingSeconds }}s {{ $t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.REMAINING') }}
        </span>

        <div class="w-56 h-56 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800 mb-4">
          <img
            v-if="qrAttempt?.qr_data_url"
            :src="qrAttempt.qr_data_url"
            alt="Zalo Reconnect QR"
            class="w-full h-full object-contain p-2"
          />
          <i v-else class="i-ri-loader-4-line animate-spin text-3xl text-slate-400" />
        </div>

        <NextButton
          ghost
          slate
          size="sm"
          :label="$t('INBOX_MGMT.SETTINGS.ZALO_PERSONAL.CLOSE')"
          @click="showQrModal = false; stopPolling(); stopCountdown();"
        />
      </div>
    </div>
  </div>
</template>
