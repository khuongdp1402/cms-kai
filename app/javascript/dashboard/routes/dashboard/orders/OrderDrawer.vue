<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatVnd } from 'dashboard/helper/formatVnd';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import { paymentChip, rowAction } from './orderStatus';
import { useOrderQr } from './useOrderQr';

const props = defineProps({
  order: { type: Object, required: true },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'action']);

const { t } = useI18n();

const itemLabel = item => `${item.name} ×${item.quantity}`;

const confirmingCancel = ref(false);
const qr = useOrderQr();

const needsQr = computed(
  () =>
    props.order.status === 'pending_payment' &&
    props.order.payment_method === 'transfer_qr'
);

const isCancelled = computed(() => props.order.status === 'cancelled');

const timelineSteps = computed(() => {
  const rank =
    {
      pending_payment: 1,
      paid: 2,
      shipping: 3,
      completed: 4,
    }[props.order.status] || 0;

  return [
    { key: 'CREATED', done: true },
    { key: 'PAID', done: rank >= 2 },
    { key: 'SHIP', done: rank >= 3 },
    { key: 'COMPLETE', done: rank >= 4 },
  ];
});

onMounted(() => {
  if (needsQr.value) qr.load(props.order.id);
});

watch(needsQr, needed => {
  if (!needed) qr.release();
});

const confirmCancel = () => {
  confirmingCancel.value = false;
  emit('action', { key: 'CANCEL', event: 'cancel' });
};

const primary = computed(() => rowAction(props.order));
const canCancel = computed(() =>
  ['pending_payment', 'paid'].includes(props.order.status)
);
</script>

<template>
  <KaloDrawer
    data-test="order-drawer"
    :title="`#${order.number}`"
    :aria-label="t('KALO_ORDERS.DRAWER.LABEL')"
    @close="emit('close')"
  >
    <template #headerExtra>
      <span
        :data-test="
          isCancelled ? 'drawer-cancelled-chip' : 'drawer-payment-chip'
        "
        class="px-2.5 py-0.5 text-xs font-semibold rounded-full"
        :class="paymentChip(order).tone"
      >
        {{ t(`KALO_ORDERS.PAYMENT_CHIP.${paymentChip(order).key}`) }}
      </span>
    </template>

    <div
      v-if="!isCancelled"
      data-test="order-timeline"
      class="grid grid-cols-4 gap-2 p-3 border rounded-xl bg-n-solid-2 border-n-weak"
    >
      <div
        v-for="(step, idx) in timelineSteps"
        :key="step.key"
        class="flex flex-col items-center gap-1 text-center"
      >
        <span
          class="grid text-[11px] font-bold rounded-full size-6 place-items-center"
          :class="
            step.done
              ? 'bg-n-teal-9 text-white'
              : 'bg-n-solid-1 border border-n-strong text-n-slate-10'
          "
        >
          {{ step.done ? '✓' : idx + 1 }}
        </span>
        <span
          class="text-[11px] font-medium"
          :class="step.done ? 'text-n-slate-12' : 'text-n-slate-10'"
        >
          {{ t(`KALO_ORDERS.DRAWER.TIMELINE.${step.key}`) }}
        </span>
      </div>
    </div>
    <div
      v-else
      data-test="order-timeline-cancelled"
      class="px-3.5 py-2.5 text-xs font-semibold border rounded-xl bg-n-ruby-3/50 border-n-ruby-6/40 text-n-ruby-11"
    >
      {{ t('KALO_ORDERS.DRAWER.TIMELINE.CANCELLED') }}
    </div>

    <dl
      class="flex flex-col gap-2 p-3.5 text-sm border rounded-xl bg-n-solid-2 border-n-weak"
    >
      <div class="flex justify-between gap-4">
        <dt class="text-n-slate-10">
          {{ t('KALO_ORDERS.DRAWER.CONTACT') }}
        </dt>
        <dd class="font-semibold text-n-slate-12">
          {{ order.contact?.name || t('KALO_ORDERS.WALK_IN') }}
        </dd>
      </div>
      <div v-if="order.shipping_address" class="flex justify-between gap-4">
        <dt class="text-n-slate-10">
          {{ t('KALO_ORDERS.DRAWER.ADDRESS') }}
        </dt>
        <dd class="font-medium text-end text-n-slate-12">
          {{ order.shipping_address }}
        </dd>
      </div>
    </dl>

    <div class="p-4 border rounded-xl bg-n-solid-1 border-n-weak">
      <h3
        class="mb-2 text-xs font-bold tracking-wide uppercase text-n-slate-10"
      >
        {{ t('KALO_ORDERS.DRAWER.ITEMS') }}
      </h3>
      <ul class="flex flex-col list-none divide-y divide-n-weak">
        <li
          v-for="item in order.items"
          :key="item.id"
          class="flex justify-between gap-4 py-2 text-sm text-n-slate-12"
        >
          <span>{{ itemLabel(item) }}</span>
          <span class="font-semibold tabular-nums">
            {{ formatVnd(item.unit_price * item.quantity) }}
          </span>
        </li>
      </ul>
      <dl
        class="flex flex-col gap-1.5 pt-3 mt-2 text-sm border-t border-n-weak"
      >
        <div class="flex justify-between text-n-slate-10">
          <dt>{{ t('KALO_ORDERS.DRAWER.SUBTOTAL') }}</dt>
          <dd class="tabular-nums">{{ formatVnd(order.subtotal) }}</dd>
        </div>
        <div class="flex justify-between text-n-slate-10">
          <dt>{{ t('KALO_ORDERS.DRAWER.SHIPPING_FEE') }}</dt>
          <dd class="tabular-nums">{{ formatVnd(order.shipping_fee) }}</dd>
        </div>
        <div
          class="flex justify-between pt-1.5 text-base font-extrabold border-t border-n-weak text-n-slate-12"
        >
          <dt>{{ t('KALO_ORDERS.DRAWER.TOTAL') }}</dt>
          <dd class="tabular-nums">{{ formatVnd(order.total) }}</dd>
        </div>
      </dl>
    </div>

    <div
      v-if="needsQr"
      class="flex flex-col items-center gap-2.5 p-4 border rounded-xl bg-n-solid-2 border-n-weak"
    >
      <span class="text-xs font-bold tracking-wide uppercase text-n-slate-10">
        {{ t('KALO_ORDERS.DRAWER.PAYMENT_SECTION') }}
      </span>
      <template v-if="qr.url.value">
        <div class="p-2 bg-white border rounded-xl border-n-weak">
          <img
            :src="qr.url.value"
            :alt="t('KALO_ORDERS.DRAWER.QR_ALT')"
            data-test="drawer-qr"
            class="object-contain w-48 h-48"
          />
        </div>
        <p class="text-xs text-center text-n-slate-10">
          {{ t('KALO_ORDERS.DRAWER.QR_HINT') }}
        </p>
      </template>
      <template v-else-if="qr.error.value">
        <p
          role="alert"
          data-test="drawer-qr-error"
          class="text-sm font-medium text-center text-n-ruby-11"
        >
          {{ qr.error.value }}
        </p>
        <router-link
          v-if="qr.needsSetup.value"
          :to="{ name: 'kalo_payment_settings' }"
          data-test="drawer-qr-setup"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white rounded-lg bg-n-brand hover:opacity-90"
        >
          <KaloIcon name="wallet" class="size-4" />
          {{ t('KALO_PAYMENT.SETUP_LINK') }}
        </router-link>
      </template>
      <p
        v-else-if="qr.isLoading.value"
        data-test="drawer-qr-loading"
        class="text-sm text-n-slate-11"
      >
        {{ t('KALO_ORDERS.DRAWER.QR_LOADING') }}
      </p>
    </div>

    <template v-if="confirmingCancel || primary || canCancel" #footer>
      <div v-if="confirmingCancel" class="flex flex-col gap-3">
        <p class="text-sm font-medium text-n-slate-12">
          {{ t('KALO_ORDERS.DRAWER.CONFIRM_CANCEL') }}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-3"
            @click="confirmingCancel = false"
          >
            {{ t('KALO_ORDERS.ACTIONS.KEEP') }}
          </button>
          <button
            type="button"
            data-test="confirm-cancel"
            :disabled="busy"
            class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
            @click="confirmCancel"
          >
            {{ t('KALO_ORDERS.ACTIONS.CANCEL') }}
          </button>
        </div>
      </div>
      <div v-else class="flex gap-2.5">
        <button
          v-if="canCancel"
          type="button"
          data-test="cancel"
          :disabled="busy"
          class="px-4 py-2 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-3 disabled:opacity-50"
          @click="confirmingCancel = true"
        >
          {{ t('KALO_ORDERS.ACTIONS.CANCEL') }}
        </button>
        <button
          v-if="primary"
          type="button"
          data-test="primary"
          :disabled="busy"
          class="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
          @click="emit('action', primary)"
        >
          {{ t(`KALO_ORDERS.ACTIONS.${primary.key}`) }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
