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

const openForm = () => {
  if (!props.contactId) return;
  opener = document.activeElement;
  showForm.value = true;
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
    // Even a single order gets a light confirm (order number and amount):
    // the QR is a chat message, it cannot be taken back once sent.
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

// One pending order: a light confirm that names it ("Gửi mã QR cho đơn #…?").
const qrTitle = computed(() =>
  qrOptions.value?.length === 1
    ? t('KALO_POLISH3.CHAT.QR_CONFIRM_TITLE', {
        number: qrOptions.value[0].number,
      })
    : t('KALO_CHAT.QR_PICKER.TITLE')
);

defineExpose({ openForm, pickQr });

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

    <!-- Create, created and QR popups are KaloDrawers (guided UX spec §2):
         460px on the right on desktop, full screen on mobile. -->
    <TeleportWithDirection to="body">
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
          {{ formatVnd(createdOrder.total) }}
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

      <!-- One pending order: a light confirm that names the order and amount
           before the QR goes out. Several: pick one. -->
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
              amount: formatVnd(qrOptions[0].total),
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
              <!-- One order: the button says what it does. -->
              <span
                v-if="qrOptions.length === 1"
                class="inline-flex items-center justify-center flex-1 gap-2 font-semibold"
              >
                <KaloIcon name="qr" class="size-4" />
                {{
                  t('KALO_POLISH4.CHAT.QR_SEND_ONE', {
                    number: order.number,
                    amount: formatVnd(order.total),
                  })
                }}
              </span>
              <template v-else>
                <span class="inline-flex items-center gap-2">
                  <KaloIcon name="qr" class="size-4" />
                  <b>#{{ order.number }}</b>
                </span>
                <span>{{ formatVnd(order.total) }}</span>
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
