<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { paymentChip, deliveryChip, rowAction } from './orderStatus';

const props = defineProps({
  order: { type: Object, required: true },
});
const emit = defineEmits(['close', 'action']);

const { t } = useI18n();

const itemLabel = item => `${item.name} ×${item.quantity}`;

const primary = computed(() => rowAction(props.order));
const canCancel = computed(() =>
  ['pending_payment', 'paid'].includes(props.order.status)
);
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex justify-end bg-black/40"
    @click.self="emit('close')"
  >
    <aside
      class="flex flex-col w-full max-w-md gap-5 p-6 overflow-auto bg-n-solid-1"
      data-test="order-drawer"
    >
      <header class="flex items-center gap-3">
        <h2 class="text-lg font-extrabold text-n-slate-12">
          #{{ order.number }}
        </h2>
        <span
          class="px-2 py-0.5 text-xs font-semibold rounded-full"
          :class="paymentChip(order).tone"
        >
          {{ t(`KALO_ORDERS.PAYMENT_CHIP.${paymentChip(order).key}`) }}
        </span>
        <span
          class="px-2 py-0.5 text-xs font-semibold rounded-full"
          :class="deliveryChip(order).tone"
        >
          {{ t(`KALO_ORDERS.DELIVERY_CHIP.${deliveryChip(order).key}`) }}
        </span>
        <button
          type="button"
          class="text-sm font-medium ltr:ml-auto rtl:mr-auto text-n-slate-11 hover:text-n-slate-12"
          @click="emit('close')"
        >
          {{ t('KALO_ORDERS.ACTIONS.CLOSE') }}
        </button>
      </header>

      <dl class="flex flex-col gap-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-n-slate-11">{{ t('KALO_ORDERS.DRAWER.CONTACT') }}</dt>
          <dd class="font-medium text-n-slate-12">
            {{ order.contact?.name || t('KALO_ORDERS.WALK_IN') }}
          </dd>
        </div>
        <div v-if="order.shipping_address" class="flex justify-between gap-4">
          <dt class="text-n-slate-11">{{ t('KALO_ORDERS.DRAWER.ADDRESS') }}</dt>
          <dd class="font-medium text-end text-n-slate-12">
            {{ order.shipping_address }}
          </dd>
        </div>
      </dl>

      <div>
        <h3 class="mb-2 text-xs font-semibold text-n-slate-11">
          {{ t('KALO_ORDERS.DRAWER.ITEMS') }}
        </h3>
        <ul class="flex flex-col divide-y divide-n-weak">
          <li
            v-for="item in order.items"
            :key="item.id"
            class="flex justify-between gap-4 py-2 text-sm text-n-slate-12"
          >
            <span>{{ itemLabel(item) }}</span>
            <span class="font-medium">
              {{ formatVnd(item.unit_price * item.quantity) }}
            </span>
          </li>
        </ul>
      </div>

      <dl class="flex flex-col gap-1 text-sm">
        <div class="flex justify-between text-n-slate-11">
          <dt>{{ t('KALO_ORDERS.DRAWER.SUBTOTAL') }}</dt>
          <dd>{{ formatVnd(order.subtotal) }}</dd>
        </div>
        <div class="flex justify-between text-n-slate-11">
          <dt>{{ t('KALO_ORDERS.DRAWER.SHIPPING_FEE') }}</dt>
          <dd>{{ formatVnd(order.shipping_fee) }}</dd>
        </div>
        <div class="flex justify-between text-lg font-bold text-n-slate-12">
          <dt>{{ t('KALO_ORDERS.DRAWER.TOTAL') }}</dt>
          <dd>{{ formatVnd(order.total) }}</dd>
        </div>
      </dl>

      <div class="flex gap-2 mt-auto">
        <button
          v-if="primary"
          type="button"
          class="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
          @click="emit('action', primary)"
        >
          {{ t(`KALO_ORDERS.ACTIONS.${primary.key}`) }}
        </button>
        <button
          v-if="canCancel"
          type="button"
          class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
          @click="emit('action', { key: 'CANCEL', event: 'cancel' })"
        >
          {{ t('KALO_ORDERS.ACTIONS.CANCEL') }}
        </button>
      </div>
    </aside>
  </div>
</template>
