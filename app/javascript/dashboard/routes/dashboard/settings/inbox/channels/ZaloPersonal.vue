<script>
// Component remounts in the same tab must share the in-flight create request.
// The Rails service provides the authoritative cross-process idempotency guard.
const connectionAttemptRequests = new Map();
</script>

<script setup>
/* global axios */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useAlert } from 'dashboard/composables';
import PageHeader from '../../SettingsSubPageHeader.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const accountId = computed(() => route.params.accountId || 1);
const inboxName = ref('Zalo Personal');
const isSubmitting = ref(false);
const isInitializing = ref(true);
const attemptId = ref(null);
const qrDataUrl = ref(null);
const status = ref('pending');
const errorCode = ref(null);
const expiresAt = ref(null);
const authenticatedProfile = ref(null);
const remainingSeconds = ref(120);
const attemptStorageKey = computed(
  () => `zalo-personal-connection-attempt:${accountId.value}`
);

const terminalStatuses = ['expired', 'declined', 'failed', 'cancelled'];
const isQrInteractionActive = computed(
  () =>
    !terminalStatuses.includes(status.value) &&
    status.value !== 'authenticated' &&
    status.value !== 'consumed'
);
let pollTimer = null;
let countdownTimer = null;

const statusBadgeColor = computed(() => {
  switch (status.value) {
    case 'authenticated':
    case 'consumed':
      return 'bg-emerald-500 text-white';
    case 'scanned':
    case 'awaiting_confirmation':
      return 'bg-amber-500 text-white';
    case 'expired':
    case 'declined':
    case 'failed':
      return 'bg-rose-500 text-white';
    default:
      return 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
  }
});

const statusLabel = computed(() => {
  switch (status.value) {
    case 'qr_ready':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.QR_READY');
    case 'scanned':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.SCANNED');
    case 'awaiting_confirmation':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.AWAITING_CONFIRMATION');
    case 'authenticated':
    case 'consumed':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.AUTHENTICATED');
    case 'expired':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.EXPIRED');
    case 'declined':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.DECLINED');
    case 'cancelled':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.CANCELLED');
    case 'failed':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.FAILED');
    default:
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.STATUS.PENDING');
  }
});

const failureMessage = computed(() => {
  switch (errorCode.value) {
    case 'qr_flow_unavailable':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.ERRORS.QR_FLOW_UNAVAILABLE');
    case 'zalo_login_incomplete':
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.ERRORS.ZALO_LOGIN_INCOMPLETE');
    default:
      return t('INBOX_MGMT.ADD.ZALO_PERSONAL.ERRORS.ZALO_LOGIN_FAILED');
  }
});

function rememberAttempt(publicId) {
  attemptId.value = publicId;
  window.sessionStorage.setItem(attemptStorageKey.value, publicId);
}

function forgetAttempt() {
  window.sessionStorage.removeItem(attemptStorageKey.value);
}

function applyAttempt(data) {
  status.value = data.status;
  errorCode.value = data.error_code || null;
  authenticatedProfile.value = data.profile;

  if (terminalStatuses.includes(data.status)) {
    qrDataUrl.value = null;
  }

  if (data.expires_at) {
    expiresAt.value = new Date(data.expires_at).getTime();
    remainingSeconds.value = Math.max(
      0,
      Math.floor((expiresAt.value - Date.now()) / 1000)
    );
  }

  if (data.qr_data_url) {
    qrDataUrl.value = data.qr_data_url;
  }
}

function startTrackingAttempt() {
  if (!isQrInteractionActive.value) {
    stopPolling();
    stopCountdown();
    if (status.value === 'failed') {
      useAlert(failureMessage.value);
    }
    return;
  }

  startPolling();
  startCountdown();
}

async function continueAttempt(data) {
  applyAttempt(data);

  if (data.status === 'consumed' && data.target_inbox_id) {
    stopPolling();
    stopCountdown();
    await goToCreatedInbox(data.target_inbox_id);
  } else if (data.status === 'authenticated') {
    stopPolling();
    stopCountdown();
    await consumeAttempt();
  } else {
    startTrackingAttempt();
  }
}

async function goToCreatedInbox(inboxId) {
  forgetAttempt();
  useAlert(t('INBOX_MGMT.ADD.ZALO_PERSONAL.SUCCESS_ALERT'));
  await router.replace({
    name: 'settings_inboxes_add_agents',
    params: {
      accountId: accountId.value,
      inbox_id: inboxId,
    },
  });
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

async function consumeAttempt() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const res = await axios.post(
      `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${attemptId.value}/consume`,
      {
        inbox_name: inboxName.value.trim(),
      }
    );
    await goToCreatedInbox(res.data.inbox_id);
  } catch (err) {
    useAlert(
      err.response?.data?.error ||
        t('INBOX_MGMT.ADD.ZALO_PERSONAL.CONSUME_ERROR')
    );
  } finally {
    isSubmitting.value = false;
  }
}

async function pollStatus() {
  if (!attemptId.value) return;

  try {
    const res = await axios.get(
      `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${attemptId.value}`
    );
    applyAttempt(res.data);

    if (res.data.status === 'consumed' && res.data.target_inbox_id) {
      stopPolling();
      stopCountdown();
      await goToCreatedInbox(res.data.target_inbox_id);
    } else if (res.data.status === 'authenticated') {
      stopPolling();
      stopCountdown();
      await consumeAttempt();
    } else if (terminalStatuses.includes(res.data.status)) {
      stopPolling();
      stopCountdown();
      if (res.data.status === 'failed') {
        useAlert(failureMessage.value);
      }
    }
  } catch (err) {
    const responseStatus = err.response?.status;
    if (responseStatus >= 400 && responseStatus < 500) {
      status.value = 'failed';
      stopPolling();
      stopCountdown();
      useAlert(
        err.response?.data?.error ||
          t('INBOX_MGMT.ADD.ZALO_PERSONAL.INIT_ERROR')
      );
    }
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollStatus, 2000);
}

function startCountdown() {
  stopCountdown();
  countdownTimer = setInterval(() => {
    if (!expiresAt.value) return;

    const diff = Math.max(0, Math.floor((expiresAt.value - Date.now()) / 1000));
    remainingSeconds.value = diff;
    if (diff === 0 && status.value !== 'authenticated') {
      status.value = 'expired';
      stopCountdown();
      stopPolling();
    }
  }, 1000);
}

async function initConnectionAttempt() {
  isInitializing.value = true;
  const requestKey = attemptStorageKey.value;
  let request = connectionAttemptRequests.get(requestKey);

  try {
    if (!request) {
      request = axios.post(
        `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts`,
        { purpose: 'create_channel' }
      );
      connectionAttemptRequests.set(requestKey, request);
    }

    const res = await request;
    rememberAttempt(res.data.public_id);
    await continueAttempt(res.data);
  } catch (err) {
    useAlert(
      err.response?.data?.error || t('INBOX_MGMT.ADD.ZALO_PERSONAL.INIT_ERROR')
    );
  } finally {
    if (connectionAttemptRequests.get(requestKey) === request) {
      connectionAttemptRequests.delete(requestKey);
    }
    isInitializing.value = false;
  }
}

async function resumeConnectionAttempt() {
  const storedAttemptId = window.sessionStorage.getItem(
    attemptStorageKey.value
  );
  if (!storedAttemptId) return false;

  isInitializing.value = true;
  rememberAttempt(storedAttemptId);

  try {
    const res = await axios.get(
      `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${storedAttemptId}`
    );

    if (res.data.status === 'consumed' && res.data.target_inbox_id) {
      applyAttempt(res.data);
      await goToCreatedInbox(res.data.target_inbox_id);
      return true;
    }

    if (res.data.status === 'authenticated') {
      applyAttempt(res.data);
      await consumeAttempt();
      return true;
    }

    if (!terminalStatuses.includes(res.data.status)) {
      applyAttempt(res.data);
      startPolling();
      startCountdown();
      return true;
    }

    // Attempt has reached a terminal state (expired, declined, cancelled, failed).
    // Discard stored attempt so onMounted will generate a fresh QR code attempt.
    forgetAttempt();
    attemptId.value = null;
    return false;
  } catch (err) {
    if (err.response?.status === 404) {
      forgetAttempt();
      attemptId.value = null;
      return false;
    }

    status.value = 'failed';
    useAlert(
      err.response?.data?.error || t('INBOX_MGMT.ADD.ZALO_PERSONAL.INIT_ERROR')
    );
    return true;
  } finally {
    isInitializing.value = false;
  }
}

async function refreshQr() {
  if (!attemptId.value) return;
  isInitializing.value = true;

  try {
    const res = await axios.post(
      `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${attemptId.value}/refresh_qr`
    );
    await continueAttempt(res.data);
  } catch (err) {
    useAlert(
      err.response?.data?.error ||
        t('INBOX_MGMT.ADD.ZALO_PERSONAL.REFRESH_ERROR')
    );
  } finally {
    isInitializing.value = false;
  }
}

async function cancelAttempt() {
  if (attemptId.value) {
    try {
      await axios.delete(
        `/api/v1/accounts/${accountId.value}/zalo_personal/connection_attempts/${attemptId.value}`
      );
    } catch {
      // Navigation away should not be blocked if cancellation fails.
    }
  }

  stopPolling();
  stopCountdown();
  forgetAttempt();
  await router.push({
    name: 'settings_inbox_list',
    params: { accountId: accountId.value },
  });
}

onMounted(async () => {
  if (!(await resumeConnectionAttempt())) {
    await initConnectionAttempt();
  }
});

onBeforeUnmount(() => {
  stopPolling();
  stopCountdown();
});
</script>

<template>
  <div class="h-full w-full p-6 col-span-6 flex flex-col gap-6 max-w-4xl">
    <div class="flex items-center justify-between">
      <PageHeader
        :header-title="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.TITLE')"
        :header-content="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.DESC')"
      />
    </div>

    <!-- QR Code Scan Card -->
    <div
      class="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
    >
      <div class="flex items-center gap-2 mb-4">
        <span
          class="px-2.5 py-1 text-xs font-semibold rounded-full"
          :class="statusBadgeColor"
        >
          {{ statusLabel }}
        </span>
        <span
          v-if="isQrInteractionActive"
          class="text-xs text-slate-500 dark:text-slate-400"
        >
          {{
            $t('INBOX_MGMT.ADD.ZALO_PERSONAL.SECONDS_REMAINING', {
              count: remainingSeconds,
            })
          }}
        </span>
      </div>

      <!-- QR Display / Loader / Expired Overlay -->
      <div
        class="relative w-64 h-64 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800"
      >
        <div
          v-if="isInitializing"
          class="flex flex-col items-center gap-2 text-slate-500"
        >
          <i class="i-ri-loader-4-line animate-spin text-3xl" />
          <span class="text-xs font-medium">{{
            $t('INBOX_MGMT.ADD.ZALO_PERSONAL.GENERATING_QR')
          }}</span>
        </div>

        <img
          v-else-if="qrDataUrl && !terminalStatuses.includes(status)"
          :src="qrDataUrl"
          alt="Zalo QR Code"
          class="w-full h-full object-contain p-2"
        />

        <div
          v-else-if="status === 'expired'"
          class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center"
        >
          <i class="i-ri-time-line text-3xl text-rose-400" />
          <span class="text-sm font-medium text-white">{{
            $t('INBOX_MGMT.ADD.ZALO_PERSONAL.QR_EXPIRED')
          }}</span>
          <NextButton
            solid
            blue
            size="sm"
            :is-loading="isInitializing"
            :disabled="isInitializing"
            :label="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.REFRESH_QR')"
            @click="refreshQr"
          />
        </div>

        <div
          v-else-if="terminalStatuses.includes(status)"
          class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center"
        >
          <i class="i-ri-error-warning-line text-3xl text-rose-400" />
          <span class="text-sm font-medium text-white">
            {{ status === 'failed' ? failureMessage : statusLabel }}
          </span>
          <NextButton
            v-if="status !== 'cancelled'"
            solid
            blue
            size="sm"
            :is-loading="isInitializing"
            :disabled="isInitializing"
            :label="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.REFRESH_QR')"
            @click="refreshQr"
          />
        </div>

        <div v-else class="flex flex-col items-center gap-2 text-slate-400">
          <i class="i-ri-qr-code-line text-4xl" />
          <span class="text-xs">{{
            $t('INBOX_MGMT.ADD.ZALO_PERSONAL.WAITING_FOR_QR')
          }}</span>
        </div>
      </div>

      <p
        v-if="isQrInteractionActive"
        class="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center max-w-sm"
      >
        {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.INSTRUCTION') }}
      </p>

      <div class="mt-6 flex items-center gap-3">
        <NextButton
          v-if="status === 'authenticated'"
          solid
          blue
          size="sm"
          :is-loading="isSubmitting"
          :disabled="isSubmitting"
          :label="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.SUBMIT_BUTTON')"
          @click="consumeAttempt"
        />
        <NextButton
          ghost
          red
          size="sm"
          :label="$t('INBOX_MGMT.ADD.ZALO_PERSONAL.CANCEL')"
          @click="cancelAttempt"
        />
      </div>
    </div>

    <!-- Inbox Configuration Form -->
    <div
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
    >
      <div class="max-w-md">
        <label
          class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          {{ $t('INBOX_MGMT.ADD.ZALO_PERSONAL.CHANNEL_NAME.LABEL') }}
        </label>
        <input
          v-model="inboxName"
          type="text"
          class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="
            $t('INBOX_MGMT.ADD.ZALO_PERSONAL.CHANNEL_NAME.PLACEHOLDER')
          "
        />
      </div>
    </div>
  </div>
</template>
