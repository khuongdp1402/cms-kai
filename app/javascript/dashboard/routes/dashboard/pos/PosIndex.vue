<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { kchatErrorKey } from 'dashboard/helper/kchatErrors';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import ProductGrid from './ProductGrid.vue';
import PosCart from './PosCart.vue';

const { t } = useI18n();
const store = useStore();

const cart = ref(null);
const search = ref('');
const showForm = ref(false);
const form = ref({ name: '', price: '', stock: '' });
let searchTimer = null;

const products = computed(() => store.getters['kchatProducts/getProducts']);
const isFetching = computed(
  () => store.getters['kchatProducts/getUIFlags'].isFetching
);
const isEmpty = computed(
  () => !isFetching.value && !products.value.length && !search.value
);
const isWholeNumber = value =>
  value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0;
// An empty stock means the shop does not track stock for this product.
const canSave = computed(
  () =>
    form.value.name.trim() &&
    isWholeNumber(form.value.price) &&
    (form.value.stock === '' || isWholeNumber(form.value.stock))
);

const load = () =>
  store.dispatch('kchatProducts/fetch', {
    query: search.value || undefined,
    active: true,
  });

const onSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 300);
};

const openProductModal = () => {
  form.value = { name: '', price: '', stock: '' };
  showForm.value = true;
};

const closeProductModal = () => {
  showForm.value = false;
};

const saveProduct = async () => {
  if (!canSave.value) return;
  const payload = {
    name: form.value.name.trim(),
    price: Number(form.value.price),
  };
  if (form.value.stock !== '') payload.stock = Number(form.value.stock);
  try {
    await store.dispatch('kchatProducts/create', payload);
    form.value = { name: '', price: '', stock: '' };
    showForm.value = false;
    useAlert(t('KALO_POS.PRODUCT_FORM.SAVED'));
  } catch (error) {
    useAlert(t(kchatErrorKey(error)));
  }
};

const onKeydown = event => {
  if (event.key === 'Escape' && showForm.value && !isEmpty.value) {
    closeProductModal();
  }
};

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  load();
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

const PRODUCT_FIELDS = [
  { key: 'name', type: 'text', dataTest: 'product-name', labelKey: 'NAME' },
  {
    key: 'price',
    type: 'number',
    min: '0',
    step: '1',
    dataTest: 'product-price',
    labelKey: 'PRICE',
  },
  {
    key: 'stock',
    type: 'number',
    min: '0',
    step: '1',
    dataTest: 'product-stock',
    labelKey: 'STOCK',
  },
];

const inputClass =
  'w-full px-3 py-2 mb-0 text-sm border rounded-[10px] outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15';
</script>

<template>
  <section
    class="flex flex-col flex-1 overflow-auto md:flex-row bg-n-background"
  >
    <div class="flex flex-col flex-1 gap-4 p-5 overflow-auto">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="text-lg font-extrabold text-n-slate-12">
          {{ t('KALO_POS.TITLE') }}
        </h1>
        <input
          v-model="search"
          type="search"
          :aria-label="t('KALO_POS.SEARCH')"
          :placeholder="t('KALO_POS.SEARCH')"
          class="flex-1 min-w-44"
          :class="[inputClass]"
          @input="onSearch"
        />
        <button
          v-if="!isEmpty"
          type="button"
          data-test="pos-open-product-modal"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 whitespace-nowrap"
          @click="openProductModal"
        >
          <KaloIcon name="plus" class="size-4" />
          {{ t('KALO_POS.ADD_PRODUCT') }}
        </button>
        <router-link
          :to="{ name: 'kalo_orders' }"
          class="px-3.5 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2 whitespace-nowrap"
        >
          {{ t('KALO_POS.EXIT') }}
        </router-link>
      </header>

      <div
        v-if="isEmpty"
        data-test="pos-empty"
        class="flex flex-col items-center gap-4 py-16"
      >
        <p class="text-sm text-n-slate-11">{{ t('KALO_POS.EMPTY') }}</p>
        <button
          v-if="!showForm"
          type="button"
          class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
          @click="showForm = true"
        >
          {{ t('KALO_POS.ADD_PRODUCT') }}
        </button>
        <form
          v-else
          class="flex flex-col w-full max-w-sm gap-3"
          @submit.prevent="saveProduct"
        >
          <input
            v-for="field in PRODUCT_FIELDS"
            :key="field.key"
            v-model="form[field.key]"
            :type="field.type"
            :min="field.min"
            :step="field.step"
            :data-test="field.dataTest"
            :aria-label="t(`KALO_POS.PRODUCT_FORM.${field.labelKey}`)"
            :placeholder="t(`KALO_POS.PRODUCT_FORM.${field.labelKey}`)"
            :class="inputClass"
          />
          <button
            type="submit"
            data-test="product-save"
            :disabled="!canSave"
            class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
          >
            {{ t('KALO_POS.PRODUCT_FORM.SUBMIT') }}
          </button>
        </form>
      </div>

      <ProductGrid v-else :products="products" @add="cart.add($event)" />
    </div>
    <PosCart ref="cart" />

    <div
      v-if="showForm && !isEmpty"
      data-test="pos-product-modal"
      class="fixed inset-0 z-50 grid p-4 overflow-auto bg-black/50 backdrop-blur-sm place-items-center"
      @click.self="closeProductModal"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="t('KALO_POS.PRODUCT_FORM.TITLE')"
        class="w-full max-w-md p-6 border shadow-2xl rounded-2xl border-n-weak bg-n-solid-1"
      >
        <h2 class="mb-4 text-lg font-extrabold text-n-slate-12">
          {{ t('KALO_POS.PRODUCT_FORM.TITLE') }}
        </h2>
        <form class="flex flex-col gap-3" @submit.prevent="saveProduct">
          <input
            v-for="field in PRODUCT_FIELDS"
            :key="field.key"
            v-model="form[field.key]"
            :type="field.type"
            :min="field.min"
            :step="field.step"
            :data-test="field.dataTest"
            :aria-label="t(`KALO_POS.PRODUCT_FORM.${field.labelKey}`)"
            :placeholder="t(`KALO_POS.PRODUCT_FORM.${field.labelKey}`)"
            :class="inputClass"
          />
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              data-test="product-cancel"
              class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
              @click="closeProductModal"
            >
              {{ t('KALO_POS.PRODUCT_FORM.CANCEL') }}
            </button>
            <button
              type="submit"
              data-test="product-save"
              :disabled="!canSave"
              class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
            >
              {{ t('KALO_POS.PRODUCT_FORM.SUBMIT') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
