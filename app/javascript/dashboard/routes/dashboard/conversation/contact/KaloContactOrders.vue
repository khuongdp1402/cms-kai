<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import OrdersAPI from 'dashboard/api/kchat/orders';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { paymentChip } from 'dashboard/routes/dashboard/orders/orderStatus';

const props = defineProps({
  contactId: { type: Number, default: null },
});

const RECENT_LIMIT = 3;
const { t } = useI18n();

const orders = ref([]);
const meta = ref({});
let requestId = 0;

const recent = computed(() => orders.value.slice(0, RECENT_LIMIT));

const load = async contactId => {
  requestId += 1;
  const mine = requestId;
  orders.value = [];
  meta.value = {};
  if (!contactId) return;
  try {
    const { data } = await OrdersAPI.get({ contactId });
    if (mine !== requestId) return;
    orders.value = data.payload;
    meta.value = data.meta;
  } catch {
    // The blocks simply stay empty when orders cannot be loaded (e.g. expired plan).
  }
};

watch(() => props.contactId, load, { immediate: true });
</script>

<template>
  <div class="flex flex-col gap-3 px-2 py-3 text-n-slate-12">
    <section>
      <h3 class="mb-2 text-sm font-semibold">
        {{ t('KALO_CHAT.PANEL.PURCHASE') }}
      </h3>
      <dl data-test="purchase-summary" class="flex flex-col gap-1 text-sm">
        <div class="flex justify-between">
          <dt class="text-n-slate-11">
            {{ t('KALO_CHAT.PANEL.ORDERS_COUNT') }}
          </dt>
          <dd class="font-medium">{{ meta.count || 0 }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-n-slate-11">{{ t('KALO_CHAT.PANEL.PAID_TOTAL') }}</dt>
          <dd class="font-medium">{{ formatVnd(meta.paid_total) }}</dd>
        </div>
      </dl>
    </section>
    <section>
      <h3 class="mb-2 text-sm font-semibold">
        {{ t('KALO_CHAT.PANEL.RECENT') }}
      </h3>
      <p
        v-if="!recent.length"
        data-test="recent-empty"
        class="text-sm text-n-slate-11"
      >
        {{ t('KALO_CHAT.PANEL.EMPTY') }}
      </p>
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="order in recent"
          :key="order.id"
          data-test="recent-order"
          class="flex flex-wrap items-center gap-2 text-sm"
        >
          <b>#{{ order.number }}</b>
          <span>{{ formatVnd(order.total) }}</span>
          <span
            class="px-2 py-0.5 text-xs font-semibold rounded-full ltr:ml-auto rtl:mr-auto"
            :class="paymentChip(order).tone"
          >
            {{ t(`KALO_ORDERS.PAYMENT_CHIP.${paymentChip(order).key}`) }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
