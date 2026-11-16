<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { kchatErrorKey } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloProductThumb from 'dashboard/components-next/icon/KaloProductThumb.vue';
import { useOrderQr } from '../orders/useOrderQr';

const { t } = useI18n();
const store = useStore();

const METHODS = [
  { key: 'transfer_qr', label: 'METHOD_QR', icon: 'qr' },
  { key: 'cash', label: 'METHOD_CASH', icon: 'cash' },
  { key: 'card', label: 'METHOD_CARD', icon: 'card' },
];

const lines = ref([]);
const method = ref('transfer_qr');
const pendingOrder = ref(null);
const qr = useOrderQr();
const isPaid = ref(false);
const errorMessage = ref('');
const isBusy = ref(false);

const total = computed(() =>
  lines.value.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
);

const add = product => {
  const line = lines.value.find(l => l.product.id === product.id);
  if (line) line.quantity += 1;
  else lines.value.push({ product, quantity: 1 });
};

const change = (line, delta) => {
  line.quantity += delta;
  if (line.quantity < 1) {
    lines.value = lines.value.filter(l => l !== line);
  }
};

const reset = () => {
  qr.release();
  lines.value = [];
  pendingOrder.value = null;
  isPaid.value = false;
  errorMessage.value = '';
  method.value = 'transfer_qr';
};

const pay = async () => {
  if (!lines.value.length || isBusy.value) return;
  isBusy.value = true;
  errorMessage.value = '';
  try {
    const order = await store.dispatch('kchatOrders/create', {
      source: 'pos',
      payment_method: method.value,
      items: lines.value.map(l => ({
        product_id: l.product.id,
        quantity: l.quantity,
      })),
    });
    if (method.value === 'transfer_qr') {
      pendingOrder.value = order;
      await qr.load(order.id);
    } else {
      isPaid.value = true;
    }
  } catch (error) {
    errorMessage.value = t(kchatErrorKey(error));
  } finally {
    isBusy.value = false;
  }
};

const cancelOrder = async () => {
  isBusy.value = true;
  errorMessage.value = '';
  try {
    await store.dispatch('kchatOrders/transition', {
      id: pendingOrder.value.id,
      event: 'cancel',
    });
    reset();
  } catch (error) {
    errorMessage.value = t(kchatErrorKey(error));
  } finally {
    isBusy.value = false;
  }
};

const confirmPaid = async () => {
  isBusy.value = true;
  errorMessage.value = '';
  try {
    await store.dispatch('kchatOrders/transition', {
      id: pendingOrder.value.id,
      event: 'mark_paid',
    });
    qr.release();
    isPaid.value = true;
  } catch (error) {
    errorMessage.value = t(kchatErrorKey(error));
  } finally {
    isBusy.value = false;
  }
};

defineExpose({ add });
</script>

<template>
  <aside
    class="flex flex-col w-full border-t md:w-96 md:border-t-0 ltr:md:border-l rtl:md:border-r border-n-weak bg-n-solid-1"
  >
    <h2 class="px-5 pt-5 pb-2 text-base font-bold text-n-slate-12">
      {{ t('KALO_POS.CART.TITLE') }}
    </h2>

    <div
      v-if="isPaid"
      data-test="paid-state"
      class="flex flex-col items-center justify-center flex-1 gap-4 p-6"
    >
      <KaloIcon name="check" class="size-12 text-woot-500" />
      <p class="text-lg font-bold text-n-slate-12">
        {{ t('KALO_POS.CART.PAID') }}
      </p>
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
        @click="reset"
      >
        {{ t('KALO_POS.CART.NEW_ORDER') }}
      </button>
    </div>

    <div
      v-else-if="pendingOrder"
      class="flex flex-col items-center flex-1 gap-4 p-6"
    >
      <p class="text-sm text-center text-n-slate-11">
        {{
          t('KALO_POS.CART.SCAN_TO_PAY', {
            amount: formatVnd(pendingOrder.total),
          })
        }}
      </p>
      <img
        v-if="qr.url.value"
        :src="qr.url.value"
        :alt="t('KALO_POS.CART.QR_ALT')"
        data-test="qr-image"
        class="object-contain w-60 h-60"
      />
      <p
        v-else-if="!qr.error.value && !errorMessage"
        class="text-sm text-n-slate-11"
      >
        {{ t('KALO_POS.CART.QR_LOADING') }}
      </p>
      <p
        v-if="qr.error.value || errorMessage"
        role="alert"
        class="text-sm font-medium text-n-ruby-11"
      >
        {{ qr.error.value || errorMessage }}
      </p>
      <div v-if="qr.error.value" class="flex w-full gap-2">
        <button
          type="button"
          data-test="qr-retry"
          :disabled="qr.isLoading.value"
          class="flex-1 px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2 disabled:opacity-50"
          @click="qr.load(pendingOrder.id)"
        >
          {{ t('KALO_POS.CART.RETRY') }}
        </button>
        <button
          type="button"
          data-test="cancel-order"
          :disabled="isBusy"
          class="flex-1 px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2 disabled:opacity-50"
          @click="cancelOrder"
        >
          {{ t('KALO_POS.CART.CANCEL_ORDER') }}
        </button>
      </div>
      <button
        type="button"
        data-test="confirm-paid"
        :disabled="isBusy"
        class="w-full px-5 py-3 text-base font-semibold text-white rounded-xl bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
        @click="confirmPaid"
      >
        {{ t('KALO_POS.CART.CONFIRM_PAID') }}
      </button>
    </div>

    <template v-else>
      <div class="flex-1 px-5 overflow-auto">
        <p v-if="!lines.length" class="py-6 text-sm text-n-slate-11">
          {{ t('KALO_POS.CART.EMPTY') }}
        </p>
        <div
          v-for="line in lines"
          :key="line.product.id"
          data-test="cart-line"
          class="flex items-center gap-2.5 py-3 border-b border-n-weak"
        >
          <div class="size-10 shrink-0">
            <KaloProductThumb
              :name="line.product.name"
              :image-url="line.product.image_url"
            />
          </div>
          <div class="flex-1 min-w-0 text-sm text-n-slate-12">
            <div class="truncate">{{ line.product.name }}</div>
            <div class="text-xs text-n-slate-11">
              {{ formatVnd(line.product.price) }}
            </div>
          </div>
          <div class="flex items-center border rounded-[9px] border-n-weak">
            <button
              type="button"
              :aria-label="t('KALO_POS.CART.DECREASE')"
              class="w-7 h-7 text-n-slate-11"
              @click="change(line, -1)"
            >
              −
            </button>
            <span
              data-test="line-qty"
              class="w-7 text-sm font-semibold text-center text-n-slate-12"
            >
              {{ line.quantity }}
            </span>
            <button
              type="button"
              :aria-label="t('KALO_POS.CART.INCREASE')"
              class="w-7 h-7 text-n-slate-11"
              @click="change(line, 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 p-5 border-t border-n-weak">
        <div
          class="flex items-center justify-between text-xl font-bold text-n-slate-12"
        >
          <span>{{ t('KALO_POS.CART.TOTAL') }}</span>
          <span data-test="cart-total">{{ formatVnd(total) }}</span>
        </div>
        <div class="grid grid-cols-3 gap-2 my-1">
          <button
            v-for="item in METHODS"
            :key="item.key"
            type="button"
            :data-test="`method-${item.key === 'transfer_qr' ? 'qr' : item.key}`"
            class="flex flex-col items-center gap-1 p-2 text-sm font-semibold border rounded-[10px]"
            :class="
              method === item.key
                ? 'border-woot-500 bg-woot-50 text-woot-600'
                : 'border-n-weak text-n-slate-12'
            "
            @click="method = item.key"
          >
            <KaloIcon :name="item.icon" class="size-5" />
            {{ t(`KALO_POS.CART.${item.label}`) }}
          </button>
        </div>
        <p
          v-if="errorMessage"
          role="alert"
          class="text-sm font-medium text-n-ruby-11"
        >
          {{ errorMessage }}
        </p>
        <button
          type="button"
          data-test="pay"
          :disabled="!lines.length || isBusy"
          class="px-5 py-3 text-base font-semibold text-white rounded-xl bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
          @click="pay"
        >
          {{ t('KALO_POS.CART.PAY', { amount: formatVnd(total) }) }}
        </button>
      </div>
    </template>
  </aside>
</template>
