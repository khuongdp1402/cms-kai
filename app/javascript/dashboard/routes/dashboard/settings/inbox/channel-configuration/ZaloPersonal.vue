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
const isDisconnecting = ref(false);
const showQrModal = ref(false);
const showDisconnectModal = ref(false);
const qrAttempt = ref(null);
const remainingSeconds = ref(120);

let pollTimer = null;
let countdownTimer = null;

const connectionStatus = computed(() => {
  return connection.value?.connection_status || props.inbox?.connection_status || 'unknown';
});

const isConnected = computed(() => connectionStatus.value === 'connected');

const statusBadgeClass = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    case 'reconnecting':
    case 'connecting':
    case 'degraded':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
    case 'reauthorization_required':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
    case 'disconnected':
    case 'error':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
    default:
      return 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
  }
});

const statusLabel = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.STATUS_CONNECTED');
    case 'disconnected':
      return t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.STATUS_DISCONNECTED');
    case 'reauthorization_required':
      return t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.STATUS_REAUTH');
    case 'connecting':
    case 'reconnecting':
      return t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.STATUS_CONNECTING');
    default:
      return connectionStatus.value;
  }
});

const formattedLastSync = computed(() => {
  const ts = connection.value?.last_connected_at || props.inbox?.last_connected_at;
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN');
});

const fetchConnection = async () => {
  isLoading.value = true;
  try {
    const res = await axios.get(
      `/api/v1/accounts/${accountId.value}/inboxes/${props.inbox.id}/zalo_personal/connection`
    );
    connection.value = res.data;
  } catch (err) {
    // Fallback to inbox attributes
    if (props.inbox) {
      connection.value = {
        display_name: props.inbox.display_name || props.inbox.name,
        avatar_url: props.inbox.avatar_url,
        zalo_user_id: props.inbox.zalo_user_id,
        connection_status: props.inbox.connection_status,
      };
    }
  } finally {
    isLoading.value = false;
  }
};

const startReconnect = async () => {
  isReconnecting.value = true;
  try {
    const res = await axios.post(
      `/api/v1/accounts/${accountId.value}/inboxes/${props.inbox.id}/zalo_personal/connection/reconnect`
    );
    qrAttempt.value = res.data;
    showQrModal.value = true;
    startPolling();
    startCountdown();
  } catch (err) {
    useAlert(
      err.response?.data?.error ||
        t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.RECONNECT_ERROR')
    );
  } finally {
    isReconnecting.value = false;
  }
};

const pollReconnectStatus = async () => {
  if (!qrAttempt.value?.public_id) return;

  try {
    const res = await axios.get(
      `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${qrAttempt.value.public_id}`
    );
    qrAttempt.value.status = res.data.status;
    if (res.data.qr_data_url) {
      qrAttempt.value.qr_data_url = res.data.qr_data_url;
    }

    if (res.data.status === 'authenticated') {
      stopPolling();
      stopCountdown();
      // Consume the session
      await axios.post(
        `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${qrAttempt.value.public_id}/consume`
      );
      showQrModal.value = false;
      useAlert(t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.RECONNECT_SUCCESS'));
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
  isDisconnecting.value = true;
  try {
    await axios.delete(
      `/api/v1/accounts/${accountId.value}/inboxes/${props.inbox.id}/zalo_personal/connection`
    );
    useAlert(t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.DISCONNECT_SUCCESS'));
    showDisconnectModal.value = false;
    await fetchConnection();
  } catch (err) {
    useAlert(
      err.response?.data?.error ||
        t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.DISCONNECT_ERROR')
    );
  } finally {
    isDisconnecting.value = false;
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
    <!-- Profile & Connection Card -->
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
    >
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          {{ $t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.TITLE') }}
        </h3>
        <span
          class="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5"
          :class="statusBadgeClass"
        >
          <span
            class="size-2 rounded-full"
            :class="isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
          />
          {{ statusLabel }}
        </span>
      </div>

      <!-- Account Profile Section -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 mb-5">
        <div class="relative shrink-0">
          <img
            v-if="connection?.avatar_url"
            :src="connection.avatar_url"
            alt="Zalo Avatar"
            class="size-16 rounded-full border-2 border-blue-500 shadow-md object-cover"
          />
          <div
            v-else
            class="size-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold text-xl flex items-center justify-center border-2 border-blue-500/30"
          >
            {{ (connection?.display_name || 'Z')[0] }}
          </div>
          <span
            class="absolute bottom-0 right-0 size-4 rounded-full border-2 border-white dark:border-slate-900"
            :class="isConnected ? 'bg-emerald-500' : 'bg-rose-500'"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {{ connection?.display_name || props.inbox.name || 'Tài khoản Zalo Cá nhân' }}
            </h4>
          </div>
          <div class="mt-1 flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
            <div v-if="connection?.zalo_user_id" class="flex items-center gap-1.5">
              <span class="font-medium text-slate-600 dark:text-slate-300">Zalo User ID:</span>
              <code class="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                {{ connection.zalo_user_id }}
              </code>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span>{{ $t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.LAST_SYNC') }}:</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ formattedLastSync }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 pt-2">
        <NextButton
          solid
          blue
          size="sm"
          :is-loading="isReconnecting"
          :label="$t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.RECONNECT_BUTTON')"
          @click="startReconnect"
        />
        <NextButton
          v-if="isConnected"
          ghost
          red
          size="sm"
          :label="$t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.DISCONNECT_BUTTON')"
          @click="showDisconnectModal = true"
        />
      </div>
    </div>

    <!-- Reconnect QR Modal -->
    <div
      v-if="showQrModal"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200"
      >
        <h4 class="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 text-center">
          {{ $t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.SCAN_QR_RECONNECT') }}
        </h4>
        <span class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {{ remainingSeconds }} {{ $t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.REMAINING') }}
        </span>

        <div
          class="w-60 h-60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-inner mb-4"
        >
          <img
            v-if="qrAttempt?.qr_data_url"
            :src="qrAttempt.qr_data_url"
            alt="Zalo Reconnect QR"
            class="w-full h-full object-contain p-2"
          />
          <div v-else class="flex flex-col items-center gap-2 text-slate-400">
            <i class="i-ri-loader-4-line animate-spin text-3xl" />
            <span class="text-xs">Đang nạp mã QR...</span>
          </div>
        </div>

        <p class="text-xs text-center text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          Mở ứng dụng Zalo trên điện thoại, chọn biểu tượng Quét mã QR và xác nhận đăng nhập.
        </p>

        <NextButton
          ghost
          slate
          size="sm"
          :label="$t('INBOX_MGMT.ZALO_PERSONAL_SETTINGS.CLOSE')"
          @click="showQrModal = false; stopPolling(); stopCountdown();"
        />
      </div>
    </div>

    <!-- Disconnect / Logout Confirmation Modal -->
    <div
      v-if="showDisconnectModal"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div class="flex items-center gap-3 text-rose-600 mb-3">
          <div class="size-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
            <i class="i-ri-error-warning-line text-xl" />
          </div>
          <h4 class="text-base font-bold text-slate-900 dark:text-slate-100">
            Xác nhận đăng xuất Zalo Cá nhân
          </h4>
        </div>

        <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          Bạn có chắc chắn muốn đăng xuất tài khoản Zalo 
          <strong class="text-slate-900 dark:text-slate-100">{{ connection?.display_name || 'này' }}</strong>?
          Sau khi đăng xuất, hệ thống sẽ ngắt kết nối với Zalo Web và dừng đồng bộ, nhận hoặc gửi tin nhắn qua tài khoản này.
        </p>

        <div class="flex items-center justify-end gap-3">
          <NextButton
            ghost
            slate
            size="sm"
            label="Hủy bỏ"
            @click="showDisconnectModal = false"
          />
          <NextButton
            solid
            red
            size="sm"
            :is-loading="isDisconnecting"
            label="Đăng xuất tài khoản"
            @click="disconnect"
          />
        </div>
      </div>
    </div>
  </div>
</template>
