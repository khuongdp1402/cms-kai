<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { useAlert } from 'dashboard/composables';
import { kchatErrorKey } from 'dashboard/helper/kchatErrors';
import { useShopAdmin } from 'dashboard/components-next/guide/useShopAdmin';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPageHeader from 'dashboard/components-next/layout/KaloPageHeader.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import ProductGrid from './ProductGrid.vue';
import PosCart from './PosCart.vue';

const { t } = useI18n();
const store = useStore();
const route = useRoute();
// Only shop administrators manage products (agents sell what exists).
const { isAdmin } = useShopAdmin();

const cart = ref(null);
const search = ref('');
// ?add_product=1 (setup checklist) opens the add-product form.
const showForm = ref(route?.query?.add_product === '1');
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
  'w-full px-3 py-2 mb-0 text-sm border border-solid rounded-[10px] outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15';
</script>

<template>
  <section
    data-test-id="kalo-page"
    class="flex flex-col flex-1 min-w-0 overflow-auto md:overflow-hidden bg-n-background"
  >
    <KaloPageHeader
      :title="t('KALO_POS.TITLE')"
      :description="t('KALO_SHELL2.POS.DESC')"
      max-width-class="max-w-none"
    >
      <template #actions>
        <input
          v-model="search"
          data-tour="pos-search"
          type="search"
          :aria-label="t('KALO_POS.SEARCH')"
          :placeholder="t('KALO_POS.SEARCH')"
          class="flex-1 sm:w-64 min-w-44"
          :class="[inputClass]"
          @input="onSearch"
        />
        <router-link
          :to="{ name: 'kalo_orders' }"
          class="px-3.5 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2 whitespace-nowrap"
        >
          {{ t('KALO_POS.EXIT') }}
        </router-link>
        <router-link
          v-if="isAdmin"
          :to="{ name: 'kalo_products' }"
          data-test="pos-manage-products"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2 whitespace-nowrap"
        >
          <KaloIcon name="tag" class="size-4" />
          {{ t('KALO_PRODUCTS.MANAGE') }}
        </router-link>
        <button
          v-if="!isEmpty && isAdmin"
          type="button"
          data-test="pos-open-product-modal"
          data-tour="pos-add"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 whitespace-nowrap"
          @click="openProductModal"
        >
          <KaloIcon name="plus" class="size-4" />
          {{ t('KALO_POS.ADD_PRODUCT') }}
        </button>
      </template>
    </KaloPageHeader>
    <div class="flex flex-col flex-1 min-h-0 md:flex-row">
      <div
        data-tour="pos-products"
        class="flex flex-col flex-1 gap-4 p-5 md:overflow-auto"
      >
        <div
          v-if="isEmpty"
          data-test="pos-empty"
          class="flex flex-col items-center gap-4 py-16"
        >
          <p class="text-sm text-n-slate-11">{{ t('KALO_POS.EMPTY') }}</p>
          <button
            v-if="isAdmin && !showForm"
            type="button"
            data-tour="pos-add"
            class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600"
            @click="showForm = true"
          >
            {{ t('KALO_POS.ADD_PRODUCT') }}
          </button>
          <form
            v-else-if="isAdmin"
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
      <PosCart ref="cart" data-tour="pos-cart" />
    </div>

    <KaloDrawer
      v-if="showForm && !isEmpty && isAdmin"
      data-test="pos-product-modal"
      :title="t('KALO_POS.PRODUCT_FORM.TITLE')"
      @close="closeProductModal"
    >
      <form
        id="pos-product-form"
        class="flex flex-col gap-3"
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
      </form>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
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
            form="pos-product-form"
            data-test="product-save"
            :disabled="!canSave"
            class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
          >
            {{ t('KALO_POS.PRODUCT_FORM.SUBMIT') }}
          </button>
        </div>
      </template>
    </KaloDrawer>
  </section>
</template>
