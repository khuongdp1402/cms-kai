<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import OrderForm from 'dashboard/routes/dashboard/orders/OrderForm.vue';

const props = defineProps({
  contactId: { type: Number, default: null },
  // Conversation display_id, as used by the dashboard routes.
  conversationId: { type: Number, required: true },
  isReplyRestricted: { type: Boolean, default: false },
});

const { t } = useI18n();
const store = useStore();

const showForm = ref(false);
const createdOrder = ref(null);
const qrOptions = ref(null);
const isSending = ref(false);
const isPicking = ref(false);
const dialogEl = ref(null);
let opener = null;

const sendQr = async orderId => {
  if (isSending.value) return false;
  isSending.value = true;
  try {
    await store.dispatch('kchatOrders/sendQr', {
      id: orderId,
      conversationId: props.conversationId,
    });
    useAlert(t('KALO_ORDERS.QR_SENT'));
    return true;
  } catch (error) {
    alertKchatError(error, t);
    return false;
  } finally {
    isSending.value = false;
  }
};

const focusDialog = async () => {
  await nextTick();
  dialogEl.value?.focus();
};

const openForm = () => {
  if (!props.contactId) return;
  opener = document.activeElement;
  showForm.value = true;
  focusDialog();
};

const closeDialogs = () => {
  const wasOpen = showForm.value || createdOrder.value || qrOptions.value;
  showForm.value = false;
  createdOrder.value = null;
  qrOptions.value = null;
  if (wasOpen) opener?.focus?.();
};

const onKeydown = event => {
  if (event.key === 'Escape') closeDialogs();
};
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

const onCreated = order => {
  showForm.value = false;
  if (order.payment_method === 'transfer_qr') {
    createdOrder.value = order;
    focusDialog();
  } else {
    opener?.focus?.();
  }
};

const sendCreatedQr = async () => {
  if (await sendQr(createdOrder.value.id)) closeDialogs();
};

const pickQr = async () => {
  // Without a contact the filter is dropped and every pending order of the shop would be listed.
  if (!props.contactId || isPicking.value) return;
  opener = document.activeElement;
  isPicking.value = true;
  try {
    const { data } = await OrdersAPI.get({
      status: 'pending_payment',
      contactId: props.contactId,
    });
    const payable = data.payload.filter(
      order => order.payment_method === 'transfer_qr'
    );
    if (payable.length === 1) {
      await sendQr(payable[0].id);
    } else {
      qrOptions.value = payable;
      focusDialog();
    }
  } catch (error) {
    alertKchatError(error, t);
  } finally {
    isPicking.value = false;
  }
};

const chooseQr = async order => {
  if (await sendQr(order.id)) closeDialogs();
};

defineExpose({ openForm, pickQr });

const buttonClass =
  'inline-flex items-center gap-1.5 h-8 px-2 text-sm font-medium rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 transition-colors duration-150 motion-reduce:transition-none';
const overlayClass =
  'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm';
const dialogClass =
  'flex flex-col w-full max-w-md gap-4 p-6 overflow-y-auto rounded-2xl border border-n-strong shadow-2xl bg-n-solid-2 max-h-[90vh]';
</script>

<template>
  <div v-if="contactId && !isReplyRestricted" class="flex items-center gap-0.5">
    <button
      type="button"
      data-test="create-order"
      :class="buttonClass"
      :title="t('KALO_CHAT.ACTIONS.CREATE_ORDER')"
      :aria-label="t('KALO_CHAT.ACTIONS.CREATE_ORDER')"
      @click="openForm"
    >
      <KaloIcon name="bag" class="size-4" />
      <span class="hidden sm:inline">{{
        t('KALO_CHAT.ACTIONS.CREATE_ORDER')
      }}</span>
    </button>
    <button
      type="button"
      data-test="pick-qr"
      :class="buttonClass"
      :title="t('KALO_CHAT.ACTIONS.QR')"
      :aria-label="t('KALO_CHAT.ACTIONS.QR')"
      @click="pickQr"
    >
      <KaloIcon name="qr" class="size-4" />
      <span class="hidden sm:inline">{{ t('KALO_CHAT.ACTIONS.QR') }}</span>
    </button>

    <Teleport to="body">
      <div v-if="showForm" :class="overlayClass" @click.self="closeDialogs">
        <div
          ref="dialogEl"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-label="t('KALO_ORDERS.FORM.TITLE')"
          :class="dialogClass"
        >
          <OrderForm
            :contact-id="contactId"
            :conversation-id="conversationId"
            @created="onCreated"
            @cancel="closeDialogs"
          />
        </div>
      </div>

      <div v-if="createdOrder" :class="overlayClass" @click.self="closeDialogs">
        <div
          ref="dialogEl"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          aria-labelledby="kalo-created-title"
          data-test="created-dialog"
          :class="dialogClass"
        >
          <h2
            id="kalo-created-title"
            class="text-lg font-extrabold text-n-slate-12"
          >
            {{ t('KALO_CHAT.CREATED.TITLE', { number: createdOrder.number }) }}
          </h2>
          <p class="text-sm text-n-slate-11">
            {{ formatVnd(createdOrder.total) }}
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              data-test="created-send-qr"
              :disabled="isSending"
              class="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
              @click="sendCreatedQr"
            >
              {{ t('KALO_CHAT.CREATED.SEND_QR') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
              @click="closeDialogs"
            >
              {{ t('KALO_CHAT.CREATED.LATER') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="qrOptions" :class="overlayClass" @click.self="closeDialogs">
        <div
          ref="dialogEl"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          aria-labelledby="kalo-qr-title"
          data-test="qr-picker"
          :class="dialogClass"
        >
          <h2 id="kalo-qr-title" class="text-lg font-extrabold text-n-slate-12">
            {{ t('KALO_CHAT.QR_PICKER.TITLE') }}
          </h2>
          <p
            v-if="!qrOptions.length"
            data-test="qr-empty"
            class="text-sm text-n-slate-11"
          >
            {{ t('KALO_CHAT.QR_PICKER.EMPTY') }}
          </p>
          <ul v-else class="flex flex-col gap-2 list-none">
            <li v-for="order in qrOptions" :key="order.id">
              <button
                type="button"
                data-test="qr-option"
                :disabled="isSending"
                class="flex items-center justify-between w-full gap-4 px-3 py-2 text-sm border rounded-lg border-n-weak text-n-slate-12 hover:bg-n-alpha-2 disabled:opacity-50"
                @click="chooseQr(order)"
              >
                <b>#{{ order.number }}</b>
                <span>{{ formatVnd(order.total) }}</span>
              </button>
            </li>
          </ul>
          <button
            type="button"
            class="self-end text-sm font-medium text-n-slate-11 hover:text-n-slate-12"
            @click="closeDialogs"
          >
            {{ t('KALO_CHAT.ACTIONS.CLOSE') }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
