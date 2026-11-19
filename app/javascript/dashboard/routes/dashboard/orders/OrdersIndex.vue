<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { useKaloFeatures } from 'dashboard/composables/useKaloFeatures';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { useAlert } from 'dashboard/composables';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import OrderForm from './OrderForm.vue';
import OrderDrawer from './OrderDrawer.vue';
import {
  STATUS_TABS,
  paymentChip,
  deliveryChip,
  awaitsDelivery,
  rowAction,
} from './orderStatus';

const { t } = useI18n();
const { isOn } = useKaloFeatures();
const isPosOn = computed(() => isOn(FEATURE_FLAGS.KALO_POS));
const store = useStore();
const route = useRoute();

const status = ref(undefined);
const delivery = ref(undefined);
const query = ref('');
// ?new=1 (setup checklist, "Tạo đơn" links) opens the create form.
const showForm = ref(route?.query?.new === '1');
const openOrderId = ref(null);
let searchTimer = null;

const orders = computed(() => store.getters['kchatOrders/getOrders']);
const uiFlags = computed(() => store.getters['kchatOrders/getUIFlags']);
const openOrder = computed(() =>
  openOrderId.value
    ? store.getters['kchatOrders/getOrderById'](openOrderId.value)
    : null
);
const meta = computed(() => store.getters['kchatOrders/getMeta']);
const busyIds = ref([]);
const isEmpty = computed(
  () =>
    !uiFlags.value.isFetching &&
    !orders.value.length &&
    !query.value &&
    status.value === undefined
);
const hasMore = computed(
  () => meta.value.current_page * meta.value.per_page < meta.value.count
);
const isBusy = id => busyIds.value.includes(id);

const summaryKpis = computed(() => {
  const list = orders.value || [];
  const pendingCount = list.filter(o => o.status === 'pending_payment').length;
  const processingCount = list.filter(awaitsDelivery).length;
  const visibleValue = list
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  return [
    { key: 'COUNT', value: meta.value?.count ?? list.length },
    { key: 'PENDING_PAYMENT', value: pendingCount },
    { key: 'PROCESSING', value: processingCount },
    { key: 'VALUE', value: formatVnd(visibleValue) },
  ];
});

const load = () =>
  store.dispatch('kchatOrders/fetch', {
    status: status.value,
    delivery: delivery.value,
    query: query.value || undefined,
    page: 1,
  });

const loadMore = () =>
  store.dispatch('kchatOrders/fetch', {
    status: status.value,
    delivery: delivery.value,
    query: query.value || undefined,
    page: meta.value.current_page + 1,
  });

const chooseTab = tab => {
  status.value = tab.status;
  delivery.value = tab.delivery;
  load();
};

const onSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 300);
};

const itemsSummary = order =>
  order.items
    .map(item =>
      item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name
    )
    .join(', ');

const timeLabel = order =>
  new Date(order.created_at).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const run = async work => {
  try {
    await work();
  } catch (error) {
    alertKchatError(error, t);
  }
};

const runAction = async (order, action) => {
  if (isBusy(order.id)) return;
  busyIds.value.push(order.id);
  await run(async () => {
    if (action.sendQr) {
      await store.dispatch('kchatOrders/sendQr', {
        id: order.id,
        conversationId: order.conversation_id,
      });
      useAlert(t('KALO_ORDERS.QR_SENT'));
    } else {
      await store.dispatch('kchatOrders/transition', {
        id: order.id,
        event: action.event,
      });
    }
  });
  busyIds.value = busyIds.value.filter(id => id !== order.id);
};

const onCreated = () => {
  showForm.value = false;
  load();
};

onMounted(load);
</script>

<template>
  <KaloPage
    :title="t('KALO_ORDERS.TITLE')"
    :description="t('KALO_SHELL.ORDERS.DESCRIPTION')"
  >
    <template #actions>
      <router-link
        :to="{ name: 'kalo_products' }"
        data-test="orders-open-products"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2"
      >
        <KaloIcon name="tag" class="size-4" />
        {{ t('KALO_PRODUCTS.OPEN') }}
      </router-link>
      <router-link
        v-if="isPosOn"
        :to="{ name: 'kalo_pos' }"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2"
      >
        <KaloIcon name="store" class="size-4" />
        {{ t('KALO_ORDERS.OPEN_POS') }}
      </router-link>
      <button
        v-if="!isEmpty"
        type="button"
        data-tour="orders-create"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
        @click="showForm = true"
      >
        <KaloIcon name="plus" class="size-4" />
        {{ t('KALO_ORDERS.CREATE') }}
      </button>
    </template>

    <div
      v-if="isEmpty"
      data-test="orders-empty"
      class="flex flex-col items-center gap-4 py-20 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
    >
      <p class="text-sm text-n-slate-11">{{ t('KALO_ORDERS.EMPTY') }}</p>
      <button
        type="button"
        data-tour="orders-create"
        class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
        @click="showForm = true"
      >
        {{ t('KALO_ORDERS.CREATE') }}
      </button>
    </div>

    <template v-else>
      <div
        data-tour="orders-kpis"
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          v-for="kpi in summaryKpis"
          :key="kpi.key"
          :data-test="`orders-kpi-${kpi.key}`"
          class="flex flex-col gap-1 p-4 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <span class="text-xs font-semibold text-n-slate-10">
            {{ t(`KALO_ORDERS.KPI.${kpi.key}`) }}
          </span>
          <b class="text-2xl font-extrabold text-n-slate-12 tabular-nums">
            {{ kpi.value }}
          </b>
        </div>
      </div>

      <KaloCard flush data-tour="orders-table">
        <div
          class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b bg-n-solid-2 border-n-weak"
        >
          <div
            data-tour="orders-tabs"
            class="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-n-solid-3"
          >
            <button
              v-for="tab in STATUS_TABS"
              :key="tab.key"
              type="button"
              :data-test="`tab-${tab.status || 'all'}`"
              class="px-3 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors"
              :class="
                status === tab.status
                  ? 'bg-n-solid-1 text-n-slate-12 shadow-sm'
                  : 'text-n-slate-10 hover:text-n-slate-12'
              "
              @click="chooseTab(tab)"
            >
              {{ t(`KALO_ORDERS.TABS.${tab.key}`) }}
            </button>
          </div>
          <input
            v-model="query"
            type="search"
            :aria-label="t('KALO_ORDERS.SEARCH')"
            :placeholder="t('KALO_ORDERS.SEARCH')"
            class="w-full h-9 px-3 py-1.5 mb-0 text-sm border rounded-[10px] outline-none sm:w-72 border-n-strong bg-n-solid-1 text-n-slate-12 hover:border-n-slate-6 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15"
            @input="onSearch"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm text-n-slate-12">
            <thead>
              <tr
                class="text-xs uppercase border-b bg-n-solid-2 border-n-weak text-n-slate-10"
              >
                <th class="px-4 py-3 font-semibold text-start">
                  {{ t('KALO_ORDERS.COLUMNS.ORDER') }}
                </th>
                <th class="px-4 py-3 font-semibold text-start">
                  {{ t('KALO_ORDERS.COLUMNS.CUSTOMER') }}
                </th>
                <th class="px-4 py-3 font-semibold text-start">
                  {{ t('KALO_ORDERS.COLUMNS.PRODUCTS') }}
                </th>
                <th class="px-4 py-3 font-semibold text-end">
                  {{ t('KALO_ORDERS.COLUMNS.TOTAL') }}
                </th>
                <th class="px-4 py-3 font-semibold text-start">
                  {{ t('KALO_ORDERS.COLUMNS.PAYMENT') }}
                </th>
                <th class="px-4 py-3 font-semibold text-start">
                  {{ t('KALO_ORDERS.COLUMNS.DELIVERY') }}
                </th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in orders"
                :key="order.id"
                data-test="order-row"
                class="border-t cursor-pointer border-n-weak hover:bg-n-solid-2"
                @click="openOrderId = order.id"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <b class="tabular-nums">#{{ order.number }}</b>
                  <div class="text-xs text-n-slate-10 tabular-nums">
                    {{ timeLabel(order) }}
                  </div>
                </td>
                <td class="px-4 py-3 font-medium whitespace-nowrap">
                  {{
                    order.contact?.name ||
                    t(`KALO_ORDERS.SOURCE.${order.source.toUpperCase()}`)
                  }}
                </td>
                <td class="px-4 py-3 max-w-64 truncate text-n-slate-11">
                  {{ itemsSummary(order) }}
                </td>
                <td
                  class="px-4 py-3 font-bold text-end whitespace-nowrap tabular-nums"
                >
                  {{ formatVnd(order.total) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="px-2.5 py-0.5 text-xs font-semibold rounded-full"
                    :class="paymentChip(order).tone"
                  >
                    {{
                      t(`KALO_ORDERS.PAYMENT_CHIP.${paymentChip(order).key}`)
                    }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    v-if="order.status === 'cancelled'"
                    class="text-xs text-n-slate-10"
                  >
                    —
                  </span>
                  <span
                    v-else
                    class="px-2.5 py-0.5 text-xs font-semibold rounded-full"
                    :class="deliveryChip(order).tone"
                  >
                    {{ t(deliveryChip(order).labelKey) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-end">
                  <button
                    v-if="rowAction(order)"
                    type="button"
                    data-test="row-action"
                    :disabled="isBusy(order.id)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[9px] bg-woot-50 text-woot-600 hover:bg-woot-75 disabled:opacity-50"
                    @click.stop="runAction(order, rowAction(order))"
                  >
                    <KaloIcon
                      v-if="rowAction(order).icon"
                      :name="rowAction(order).icon"
                      class="size-3.5"
                    />
                    {{ t(`KALO_ORDERS.ACTIONS.${rowAction(order).key}`) }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </KaloCard>

      <p
        v-if="!orders.length && !uiFlags.isFetching"
        data-test="orders-none"
        class="py-10 text-sm text-center text-n-slate-11"
      >
        {{ t('KALO_ORDERS.NONE') }}
      </p>
      <button
        v-if="hasMore"
        type="button"
        data-test="load-more"
        :disabled="uiFlags.isFetching"
        class="self-center px-4 py-2 text-sm font-semibold border rounded-[10px] bg-n-solid-1 border-n-strong text-n-slate-12 hover:bg-n-solid-2 disabled:opacity-50"
        @click="loadMore"
      >
        {{ t('KALO_ORDERS.LOAD_MORE') }}
      </button>
    </template>

    <KaloDrawer
      v-if="showForm"
      data-test="order-form-drawer"
      :title="t('KALO_ORDERS.FORM.TITLE')"
      @close="showForm = false"
    >
      <OrderForm in-drawer @created="onCreated" @cancel="showForm = false" />
    </KaloDrawer>

    <OrderDrawer
      v-if="openOrder"
      :order="openOrder"
      :busy="isBusy(openOrder.id)"
      @close="openOrderId = null"
      @action="runAction(openOrder, $event)"
    />
  </KaloPage>
</template>
