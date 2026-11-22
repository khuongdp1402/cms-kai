<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import TeleportWithDirection from 'dashboard/components-next/TeleportWithDirection.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import OrderForm from 'dashboard/routes/dashboard/orders/OrderForm.vue';
import KaloProductPitchDrawer from './KaloProductPitchDrawer.vue';

const props = defineProps({
  contactId: { type: Number, default: null },
  // Conversation display_id, as used by the dashboard routes.
  conversationId: { type: Number, required: true },
  isReplyRestricted: { type: Boolean, default: false },
});

const emit = defineEmits(['insertText', 'sendText']);

const { t } = useI18n();
const store = useStore();

const showPitchDrawer = ref(false);
const showForm = ref(false);
const pitchedItems = ref([]);
const createdOrder = ref(null);
const qrOptions = ref(null);
const isSending = ref(false);
const isPicking = ref(false);
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

const openPitchDrawer = () => {
  if (!props.contactId) return;
  opener = document.activeElement;
  showPitchDrawer.value = true;
};

const openForm = () => {
  if (!props.contactId) return;
  opener = document.activeElement;
  pitchedItems.value = [];
  showForm.value = true;
};

const closeDialogs = () => {
  const wasOpen =
    showPitchDrawer.value ||
    showForm.value ||
    createdOrder.value ||
    qrOptions.value;
  showPitchDrawer.value = false;
  showForm.value = false;
  pitchedItems.value = [];
  createdOrder.value = null;
  qrOptions.value = null;
  if (wasOpen) opener?.focus?.();
};

const onInsertPitch = text => {
  showPitchDrawer.value = false;
  emit('insertText', text);
};

const onSendPitch = text => {
  showPitchDrawer.value = false;
  emit('sendText', text);
};

const onCreateOrderFromPitch = items => {
  showPitchDrawer.value = false;
  pitchedItems.value = items;
  showForm.value = true;
};

const onKeydown = event => {
  if (event.key === 'Escape') closeDialogs();
};
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

const onCreated = order => {
  showForm.value = false;
  pitchedItems.value = [];
  if (order.payment_method === 'transfer_qr') {
    createdOrder.value = order;
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
    qrOptions.value = payable;
  } catch (error) {
    alertKchatError(error, t);
  } finally {
    isPicking.value = false;
  }
};

const chooseQr = async order => {
  if (await sendQr(order.id)) closeDialogs();
};

const orderPayableAmount = order => order.payable_amount ?? order.total;

const qrTitle = computed(() =>
  qrOptions.value?.length === 1
    ? t('KALO_POLISH3.CHAT.QR_CONFIRM_TITLE', {
        number: qrOptions.value[0].number,
      })
    : t('KALO_CHAT.QR_PICKER.TITLE')
);

defineExpose({ openForm, openPitchDrawer, pickQr });

const buttonClass =
  'inline-flex items-center gap-1.5 h-8 px-2 text-sm font-medium rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 transition-colors duration-150 motion-reduce:transition-none';
</script>

<template>
  <div
    v-if="contactId && !isReplyRestricted"
    data-tour="chat-order-qr"
    class="flex items-center gap-0.5"
  >
    <button
      type="button"
      data-test="pitch-products"
      :class="buttonClass"
      :title="t('KALO_CHAT.ACTIONS.PITCH_PRODUCTS')"
      :aria-label="t('KALO_CHAT.ACTIONS.PITCH_PRODUCTS')"
      @click="openPitchDrawer"
    >
      <KaloIcon name="spark" class="size-4" />
      <span class="hidden sm:inline">{{
        t('KALO_CHAT.ACTIONS.PITCH_PRODUCTS')
      }}</span>
    </button>
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

    <TeleportWithDirection to="body">
      <KaloProductPitchDrawer
        v-if="showPitchDrawer"
        @close="closeDialogs"
        @insert="onInsertPitch"
        @send="onSendPitch"
        @create-order="onCreateOrderFromPitch"
      />

      <KaloDrawer
        v-if="showForm"
        :title="t('KALO_ORDERS.FORM.TITLE')"
        :aria-label="t('KALO_ORDERS.FORM.TITLE')"
        data-test="order-form-drawer"
        @close="closeDialogs"
      >
        <OrderForm
          :contact-id="contactId"
          :conversation-id="conversationId"
          v-bind="pitchedItems.length ? { initialItems: pitchedItems } : {}"
          in-drawer
          @created="onCreated"
          @cancel="closeDialogs"
        />
      </KaloDrawer>

      <KaloDrawer
        v-if="createdOrder"
        :title="t('KALO_CHAT.CREATED.TITLE', { number: createdOrder.number })"
        data-test="created-dialog"
        @close="closeDialogs"
      >
        <p class="mb-0 text-sm text-n-slate-11">
          {{ formatVnd(orderPayableAmount(createdOrder)) }}
        </p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold border border-solid rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
              @click="closeDialogs"
            >
              {{ t('KALO_CHAT.CREATED.LATER') }}
            </button>
            <button
              type="button"
              data-test="created-send-qr"
              :disabled="isSending"
              class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-n-brand hover:opacity-90 disabled:opacity-50"
              @click="sendCreatedQr"
            >
              {{ t('KALO_CHAT.CREATED.SEND_QR') }}
            </button>
          </div>
        </template>
      </KaloDrawer>

      <KaloDrawer
        v-if="qrOptions"
        :title="qrTitle"
        data-test="qr-picker"
        @close="closeDialogs"
      >
        <p
          v-if="!qrOptions.length"
          data-test="qr-empty"
          class="mb-0 text-sm text-n-slate-11"
        >
          {{ t('KALO_CHAT.QR_PICKER.EMPTY') }}
        </p>
        <p
          v-else-if="qrOptions.length === 1"
          data-test="qr-confirm-note"
          class="mb-0 text-sm text-n-slate-11"
        >
          {{
            t('KALO_POLISH3.CHAT.QR_CONFIRM', {
              amount: formatVnd(orderPayableAmount(qrOptions[0])),
            })
          }}
        </p>
        <ul v-if="qrOptions.length" class="flex flex-col gap-2 list-none">
          <li v-for="order in qrOptions" :key="order.id">
            <button
              type="button"
              data-test="qr-option"
              :disabled="isSending"
              class="flex items-center justify-between w-full gap-4 px-3 py-2.5 text-sm border border-solid rounded-lg disabled:opacity-50"
              :class="
                qrOptions.length === 1
                  ? 'border-transparent bg-n-brand text-white hover:opacity-90'
                  : 'border-n-weak text-n-slate-12 hover:bg-n-alpha-2'
              "
              @click="chooseQr(order)"
            >
              <span
                v-if="qrOptions.length === 1"
                class="inline-flex items-center justify-center flex-1 gap-2 font-semibold"
              >
                <KaloIcon name="qr" class="size-4" />
                {{
                  t('KALO_POLISH4.CHAT.QR_SEND_ONE', {
                    number: order.number,
                    amount: formatVnd(orderPayableAmount(order)),
                  })
                }}
              </span>
              <template v-else>
                <span class="inline-flex items-center gap-2">
                  <KaloIcon name="qr" class="size-4" />
                  <b>#{{ order.number }}</b>
                </span>
                <span>{{ formatVnd(orderPayableAmount(order)) }}</span>
              </template>
            </button>
          </li>
        </ul>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold border border-solid rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
              @click="closeDialogs"
            >
              {{ t('KALO_CHAT.ACTIONS.CLOSE') }}
            </button>
          </div>
        </template>
      </KaloDrawer>
    </TeleportWithDirection>
  </div>
</template>
