<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { kchatErrorKey } from 'dashboard/helper/kchatErrors';
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
  } catch (error) {
    useAlert(t(kchatErrorKey(error)));
  }
};

onMounted(load);

const inputClass =
  'w-full px-3 py-2 text-sm border rounded-lg border-n-weak bg-n-solid-1 text-n-slate-12';
</script>

<template>
  <section
    class="flex flex-col flex-1 overflow-auto md:flex-row bg-n-background"
  >
    <div class="flex flex-col flex-1 gap-4 p-5 overflow-auto">
      <header class="flex items-center gap-3">
        <h1 class="text-lg font-extrabold text-n-slate-12">
          {{ t('KALO_POS.TITLE') }}
        </h1>
        <input
          v-model="search"
          type="search"
          :aria-label="t('KALO_POS.SEARCH')"
          :placeholder="t('KALO_POS.SEARCH')"
          class="flex-1"
          :class="[inputClass]"
          @input="onSearch"
        />
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
            v-model="form.name"
            type="text"
            data-test="product-name"
            :aria-label="t('KALO_POS.PRODUCT_FORM.NAME')"
            :placeholder="t('KALO_POS.PRODUCT_FORM.NAME')"
            :class="inputClass"
          />
          <input
            v-model="form.price"
            type="number"
            min="0"
            step="1"
            data-test="product-price"
            :aria-label="t('KALO_POS.PRODUCT_FORM.PRICE')"
            :placeholder="t('KALO_POS.PRODUCT_FORM.PRICE')"
            :class="inputClass"
          />
          <input
            v-model="form.stock"
            type="number"
            min="0"
            step="1"
            data-test="product-stock"
            :aria-label="t('KALO_POS.PRODUCT_FORM.STOCK')"
            :placeholder="t('KALO_POS.PRODUCT_FORM.STOCK')"
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
  </section>
</template>
