<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { kchatErrorKey } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import OrderForm from './OrderForm.vue';
import OrderDrawer from './OrderDrawer.vue';
import {
  STATUS_TABS,
  paymentChip,
  deliveryChip,
  rowAction,
} from './orderStatus';

const { t } = useI18n();
const store = useStore();

const status = ref(undefined);
const query = ref('');
const showForm = ref(false);
const openOrderId = ref(null);
let searchTimer = null;

const orders = computed(() => store.getters['kchatOrders/getOrders']);
const uiFlags = computed(() => store.getters['kchatOrders/getUIFlags']);
const openOrder = computed(() =>
  openOrderId.value
    ? store.getters['kchatOrders/getOrderById'](openOrderId.value)
    : null
);
const isEmpty = computed(
  () => !uiFlags.value.isFetching && !orders.value.length && !query.value
);

const load = () =>
  store.dispatch('kchatOrders/fetch', {
    status: status.value,
    query: query.value || undefined,
    page: 1,
  });

const chooseTab = tab => {
  status.value = tab.status;
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
    useAlert(t(kchatErrorKey(error)));
  }
};

const runAction = (order, action) =>
  run(async () => {
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

const onCreated = () => {
  showForm.value = false;
  load();
};

onMounted(load);
</script>

<template>
  <section class="flex flex-col flex-1 gap-4 p-6 overflow-auto">
    <header class="flex flex-wrap items-center gap-3">
      <h1 class="text-xl font-extrabold text-n-slate-12">
        {{ t('KALO_ORDERS.TITLE') }}
      </h1>
      <div class="flex gap-2 ltr:ml-auto rtl:mr-auto">
        <router-link
          :to="{ name: 'kalo_pos' }"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
        >
          <KaloIcon name="store" class="size-4" />
          {{ t('KALO_ORDERS.OPEN_POS') }}
        </router-link>
        <button
          v-if="!isEmpty"
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
          @click="showForm = true"
        >
          <KaloIcon name="plus" class="size-4" />
          {{ t('KALO_ORDERS.CREATE') }}
        </button>
      </div>
    </header>

    <div
      v-if="isEmpty"
      data-test="orders-empty"
      class="flex flex-col items-center gap-4 py-20"
    >
      <p class="text-sm text-n-slate-11">{{ t('KALO_ORDERS.EMPTY') }}</p>
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
        @click="showForm = true"
      >
        {{ t('KALO_ORDERS.CREATE') }}
      </button>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex flex-wrap gap-1">
          <button
            v-for="tab in STATUS_TABS"
            :key="tab.key"
            type="button"
            :data-test="`tab-${tab.status || 'all'}`"
            class="px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap"
            :class="
              status === tab.status
                ? 'bg-n-slate-12 text-n-solid-1'
                : 'text-n-slate-11 hover:bg-n-alpha-2'
            "
            @click="chooseTab(tab)"
          >
            {{ t(`KALO_ORDERS.TABS.${tab.key}`) }}
          </button>
        </div>
        <input
          v-model="query"
          type="search"
          :placeholder="t('KALO_ORDERS.SEARCH')"
          class="w-full px-3 py-2 text-sm border rounded-lg sm:w-72 ltr:sm:ml-auto rtl:sm:mr-auto border-n-weak bg-n-solid-1 text-n-slate-12"
          @input="onSearch"
        />
      </div>

      <div class="overflow-x-auto border rounded-xl border-n-weak bg-n-solid-1">
        <table class="w-full text-sm text-n-slate-12">
          <thead>
            <tr class="text-xs text-start text-n-slate-11">
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
              class="border-t cursor-pointer border-n-weak hover:bg-n-alpha-1"
              @click="openOrderId = order.id"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <b>#{{ order.number }}</b>
                <div class="text-xs text-n-slate-11">
                  {{ timeLabel(order) }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                {{
                  order.contact?.name ||
                  t(`KALO_ORDERS.SOURCE.${order.source.toUpperCase()}`)
                }}
              </td>
              <td class="px-4 py-3 max-w-64 truncate">
                {{ itemsSummary(order) }}
              </td>
              <td class="px-4 py-3 font-bold text-end whitespace-nowrap">
                {{ formatVnd(order.total) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="px-2 py-0.5 text-xs font-semibold rounded-full"
                  :class="paymentChip(order).tone"
                >
                  {{ t(`KALO_ORDERS.PAYMENT_CHIP.${paymentChip(order).key}`) }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="px-2 py-0.5 text-xs font-semibold rounded-full"
                  :class="deliveryChip(order).tone"
                >
                  {{
                    t(`KALO_ORDERS.DELIVERY_CHIP.${deliveryChip(order).key}`)
                  }}
                </span>
              </td>
              <td class="px-4 py-3 text-end">
                <button
                  v-if="rowAction(order)"
                  type="button"
                  data-test="row-action"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold rounded-[10px] bg-woot-50 text-woot-600 hover:bg-woot-75"
                  @click.stop="runAction(order, rowAction(order))"
                >
                  <KaloIcon
                    v-if="rowAction(order).icon"
                    :name="rowAction(order).icon"
                    class="size-4"
                  />
                  {{ t(`KALO_ORDERS.ACTIONS.${rowAction(order).key}`) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div
      v-if="showForm"
      class="fixed inset-0 z-50 grid p-4 overflow-auto bg-black/40 place-items-center"
    >
      <div class="w-full max-w-lg p-6 rounded-2xl bg-n-solid-1">
        <OrderForm @created="onCreated" @cancel="showForm = false" />
      </div>
    </div>

    <OrderDrawer
      v-if="openOrder"
      :order="openOrder"
      @close="openOrderId = null"
      @action="runAction(openOrder, $event)"
    />
  </section>
</template>
