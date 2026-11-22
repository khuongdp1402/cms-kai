<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import {
  paymentChip,
  deliveryChip,
} from 'dashboard/routes/dashboard/orders/orderStatus';

const props = defineProps({
  orderId: { type: Number, required: true },
});

const { t } = useI18n();
const store = useStore();

const isSending = ref(false);
const loadFailed = ref(false);
const order = computed(() =>
  store.getters['kchatOrders/getOrderById'](props.orderId)
);
const conversationId = computed(() => store.getters.getSelectedChat?.id);

const chips = computed(() => {
  const chip = paymentChip(order.value);
  const delivery = deliveryChip(order.value);
  const shipped = ['SHIPPING', 'COMPLETED'].includes(delivery.key);
  return [
    { ...chip, label: `KALO_ORDERS.PAYMENT_CHIP.${chip.key}` },
    ...(shipped
      ? [{ ...delivery, label: `KALO_ORDERS.DELIVERY_CHIP.${delivery.key}` }]
      : []),
  ];
});

const canSendQr = computed(
  () =>
    order.value.status === 'pending_payment' &&
    order.value.payment_method === 'transfer_qr'
);

const hasDeposit = computed(
  () =>
    Number(order.value?.deposit_amount) > 0 &&
    Number(order.value?.deposit_amount) < Number(order.value?.total)
);

const sendQr = async () => {
  if (isSending.value) return;
  isSending.value = true;
  try {
    await store.dispatch('kchatOrders/sendQr', {
      id: order.value.id,
      conversationId: conversationId.value,
    });
    useAlert(t('KALO_ORDERS.QR_SENT'));
  } catch (error) {
    alertKchatError(error, t);
  } finally {
    isSending.value = false;
  }
};

onMounted(async () => {
  if (order.value) return;
  try {
    await store.dispatch('kchatOrders/fetchOne', props.orderId);
  } catch {
    // Deleted, foreign or expired order: show a quiet note instead of an error.
    loadFailed.value = true;
  }
});
</script>

<template>
  <p
    v-if="!order && loadFailed"
    data-test="order-card-unavailable"
    class="text-xs text-n-slate-11"
  >
    {{ t('KALO_CHAT.CARD.UNAVAILABLE') }}
  </p>
  <div
    v-else-if="order"
    data-test="order-card"
    class="flex flex-col w-full max-w-sm gap-2 p-3 border rounded-xl border-n-weak bg-n-solid-1 text-n-slate-12"
  >
    <div class="flex flex-wrap items-center gap-2">
      <b class="text-sm">{{
        t('KALO_CHAT.CARD.TITLE', { number: order.number })
      }}</b>
      <span
        v-for="chip in chips"
        :key="chip.label"
        class="px-2 py-0.5 text-xs font-semibold rounded-full"
        :class="chip.tone"
      >
        {{ t(chip.label) }}
      </span>
    </div>
    <ul class="flex flex-col gap-1 text-sm list-none">
      <li v-for="item in order.items" :key="item.id">
        <span>{{ item.name }}</span>
        <span class="block text-xs text-n-slate-11">
          {{
            t('KALO_CHAT.CARD.LINE', {
              quantity: item.quantity,
              price: formatVnd(item.unit_price),
            })
          }}
        </span>
      </li>
    </ul>
    <div
      v-if="order.shipping_fee > 0"
      class="flex justify-between text-sm text-n-slate-11"
    >
      <span>{{ t('KALO_CHAT.CARD.SHIPPING') }}</span>
      <span>{{ formatVnd(order.shipping_fee) }}</span>
    </div>
    <div class="flex justify-between text-sm font-bold">
      <span>{{ t('KALO_CHAT.CARD.TOTAL') }}</span>
      <span>{{ formatVnd(order.total) }}</span>
    </div>
    <div
      v-if="hasDeposit"
      class="flex justify-between text-xs font-semibold text-n-brand"
    >
      <span>{{ t('KALO_CHAT.CARD.DEPOSIT') }}</span>
      <span>{{ formatVnd(order.deposit_amount) }}</span>
    </div>
    <p v-if="order.note" class="mb-0 text-xs text-n-slate-11 line-clamp-2">
      {{ `${t('KALO_CHAT.CARD.NOTE')}: ${order.note}` }}
    </p>
    <button
      v-if="canSendQr"
      type="button"
      data-test="send-qr"
      :disabled="isSending"
      class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
      @click="sendQr"
    >
      <KaloIcon name="qr" class="size-4" />
      {{
        isSending ? t('KALO_CHAT.CARD.SENDING') : t('KALO_CHAT.CARD.SEND_QR')
      }}
    </button>
  </div>
</template>
