<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { kchatErrorKey } from 'dashboard/helper/kchatErrors';

const props = defineProps({
  contactId: { type: Number, default: null },
  // Conversation display_id, as used by the dashboard routes.
  conversationId: { type: Number, default: null },
  // Prefilled products when jumping from chat pitch drawer.
  initialItems: { type: Array, default: () => [] },
  // Inside a KaloDrawer: the drawer shows the title, the buttons stick to the bottom.
  inDrawer: { type: Boolean, default: false },
});
const emit = defineEmits(['created', 'cancel']);

const { t } = useI18n();
const store = useStore();

const emptyLine = () => ({ productId: '', name: '', price: '', quantity: 1 });
const initialLines = () =>
  props.initialItems?.length
    ? props.initialItems.map(item => ({
        productId: String(item.id),
        name: '',
        price: '',
        quantity: Number(item.quantity || 1),
      }))
    : [emptyLine()];

const lines = ref(initialLines());
const paymentMethod = ref('transfer_qr');
const shippingAddress = ref('');
const shippingFee = ref('');
const depositAmount = ref('');
const note = ref('');
const errorMessage = ref('');

const products = computed(() => store.getters['kchatProducts/getProducts']);
const isCreating = computed(
  () => store.getters['kchatOrders/getUIFlags'].isCreating
);

const productById = id => products.value.find(p => p.id === Number(id));
const isCustom = line => line.productId === 'custom';

const productOptionLabel = product => {
  const mode = product.availability_mode;
  const suffix =
    mode && mode !== 'in_stock'
      ? ` · ${t(`KALO_PRODUCTS.AVAILABILITY.${mode}`)}`
      : '';
  return `${product.name} · ${formatVnd(product.price)}${suffix}`;
};

const isLineValid = line => {
  if (!line.productId || Number(line.quantity) < 1) return false;
  return !isCustom(line) || (line.name.trim() && Number(line.price) > 0);
};
const filledLines = computed(() => lines.value.filter(isLineValid));
const canSubmit = computed(
  () => filledLines.value.length > 0 && !isCreating.value
);

const lineTotal = line => {
  const price = isCustom(line)
    ? Number(line.price)
    : productById(line.productId)?.price;
  return (price || 0) * Number(line.quantity);
};
const total = computed(
  () =>
    filledLines.value.reduce((sum, line) => sum + lineTotal(line), 0) +
    (Number(shippingFee.value) || 0)
);

const toPayloadItem = line =>
  isCustom(line)
    ? {
        name: line.name.trim(),
        unit_price: Number(line.price),
        quantity: Number(line.quantity),
      }
    : { product_id: Number(line.productId), quantity: Number(line.quantity) };

const submit = async () => {
  if (!canSubmit.value) return;
  errorMessage.value = '';
  const deposit = Number(depositAmount.value) || 0;
  if (deposit > total.value) {
    errorMessage.value = t('KALO_ORDERS.FORM.DEPOSIT_TOO_HIGH');
    return;
  }
  const payload = {
    source: props.conversationId ? 'chat' : 'manual',
    payment_method: paymentMethod.value,
    items: filledLines.value.map(toPayloadItem),
  };
  if (props.contactId) payload.contact_id = props.contactId;
  if (props.conversationId) payload.conversation_id = props.conversationId;
  if (shippingAddress.value.trim()) {
    payload.shipping_address = shippingAddress.value.trim();
  }
  if (Number(shippingFee.value) > 0) {
    payload.shipping_fee = Number(shippingFee.value);
  }
  if (deposit > 0) {
    payload.deposit_amount = deposit;
  }
  if (note.value.trim()) {
    payload.note = note.value.trim();
  }
  try {
    const order = await store.dispatch('kchatOrders/create', payload);
    emit('created', order);
  } catch (error) {
    errorMessage.value = t(kchatErrorKey(error));
  }
};

onMounted(() => store.dispatch('kchatProducts/fetch', { active: true }));

const inputClass =
  'w-full px-3 py-2 mb-0 text-sm border border-solid rounded-lg outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-woot-500';
const selectClass = `${inputClass} pr-8 bg-origin-padding !bg-[position:right_0.75rem_center]`;
</script>

<template>
  <form
    class="flex flex-col gap-4"
    :class="{ 'flex-1': inDrawer }"
    @submit.prevent="submit"
  >
    <h2 v-if="!inDrawer" class="text-lg font-extrabold text-n-slate-12">
      {{ t('KALO_ORDERS.FORM.TITLE') }}
    </h2>

    <div
      v-for="(line, index) in lines"
      :key="index"
      class="flex flex-wrap items-end gap-2"
    >
      <label class="flex-1 min-w-40 text-xs font-medium text-n-slate-11">
        {{ t('KALO_ORDERS.FORM.PRODUCT') }}
        <select
          v-model="line.productId"
          data-test="line-product"
          :class="selectClass"
        >
          <option value="" />
          <option v-for="p in products" :key="p.id" :value="String(p.id)">
            {{ productOptionLabel(p) }}
          </option>
          <option value="custom">
            {{ t('KALO_ORDERS.FORM.CUSTOM_ITEM') }}
          </option>
        </select>
      </label>
      <template v-if="isCustom(line)">
        <label class="flex-1 text-xs font-medium min-w-32 text-n-slate-11">
          {{ t('KALO_ORDERS.FORM.NAME') }}
          <input v-model="line.name" type="text" :class="inputClass" />
        </label>
        <label class="w-28 text-xs font-medium text-n-slate-11">
          {{ t('KALO_ORDERS.FORM.PRICE') }}
          <input
            v-model="line.price"
            type="number"
            min="1"
            :class="inputClass"
          />
        </label>
      </template>
      <label class="w-20 text-xs font-medium text-n-slate-11">
        {{ t('KALO_ORDERS.FORM.QUANTITY') }}
        <input
          v-model="line.quantity"
          type="number"
          min="1"
          data-test="line-quantity"
          :class="inputClass"
        />
      </label>
      <button
        v-if="lines.length > 1"
        type="button"
        class="px-2 py-2 text-sm text-n-slate-11 hover:text-n-slate-12"
        @click="lines.splice(index, 1)"
      >
        {{ t('KALO_ORDERS.FORM.REMOVE_ITEM') }}
      </button>
    </div>
    <button
      type="button"
      class="self-start text-sm font-semibold text-woot-600"
      @click="lines.push(emptyLine())"
    >
      {{ t('KALO_ORDERS.FORM.ADD_ITEM') }}
    </button>

    <label class="text-xs font-medium text-n-slate-11">
      {{ t('KALO_ORDERS.FORM.PAYMENT_METHOD') }}
      <select v-model="paymentMethod" :class="selectClass">
        <option value="transfer_qr">
          {{ t('KALO_ORDERS.FORM.METHOD_QR') }}
        </option>
        <option value="cod">{{ t('KALO_ORDERS.FORM.METHOD_COD') }}</option>
      </select>
    </label>

    <div class="grid gap-3 sm:grid-cols-2">
      <label class="text-xs font-medium text-n-slate-11">
        {{ t('KALO_ORDERS.FORM.DEPOSIT') }}
        <input
          v-model="depositAmount"
          type="number"
          min="0"
          data-test="order-deposit"
          :class="inputClass"
        />
        <span class="block mt-1 font-normal text-[11px] text-n-slate-10">
          {{ t('KALO_ORDERS.FORM.DEPOSIT_HINT') }}
        </span>
      </label>
      <label class="text-xs font-medium text-n-slate-11">
        {{ t('KALO_ORDERS.FORM.SHIPPING_FEE') }}
        <input
          v-model="shippingFee"
          type="number"
          min="0"
          :class="inputClass"
        />
      </label>
    </div>

    <label class="text-xs font-medium text-n-slate-11">
      {{ t('KALO_ORDERS.FORM.ADDRESS') }}
      <input v-model="shippingAddress" type="text" :class="inputClass" />
    </label>

    <label class="text-xs font-medium text-n-slate-11">
      {{ t('KALO_ORDERS.FORM.NOTE') }}
      <textarea
        v-model="note"
        rows="2"
        data-test="order-note"
        :placeholder="t('KALO_ORDERS.FORM.NOTE_PLACEHOLDER')"
        :class="inputClass"
      />
    </label>

    <p
      v-if="errorMessage"
      role="alert"
      class="text-sm font-medium text-n-ruby-11"
    >
      {{ errorMessage }}
    </p>

    <div
      class="flex items-center gap-3"
      :class="{
        'sticky bottom-0 -mx-5 -mb-5 px-5 py-3.5 mt-auto border-t sm:-mx-6 sm:px-6 border-n-weak bg-n-solid-2':
          inDrawer,
      }"
    >
      <span class="text-sm text-n-slate-11">
        {{ t('KALO_ORDERS.FORM.TOTAL') }}
        <b class="text-n-slate-12">{{ formatVnd(total) }}</b>
      </span>
      <button
        type="button"
        class="px-3 py-2 text-sm font-semibold ltr:ml-auto rtl:mr-auto text-n-slate-11 hover:text-n-slate-12"
        @click="emit('cancel')"
      >
        {{ t('KALO_ORDERS.ACTIONS.CLOSE') }}
      </button>
      <button
        type="submit"
        data-test="submit"
        :disabled="!canSubmit"
        class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
      >
        {{ t('KALO_ORDERS.FORM.SUBMIT') }}
      </button>
    </div>
  </form>
</template>
