<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { formatVnd } from 'dashboard/helper/formatVnd';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import KaloProductThumb from 'dashboard/components-next/icon/KaloProductThumb.vue';
import {
  IMAGE_TYPES,
  buildPayload,
  emptyForm,
  formFromProduct,
  parseVnd,
  validateForm,
} from './productForm';

// Create (product = null) or edit a product in the standard Kalo drawer.
const props = defineProps({
  product: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const store = useStore();

const isEdit = computed(() => Boolean(props.product));
const form = ref(props.product ? formFromProduct(props.product) : emptyForm());
const submitted = ref(false);
const saving = ref(false);

const errors = computed(() => validateForm(form.value));
// Messages show after the first save attempt, then follow the typing.
const shownErrors = computed(() => (submitted.value ? errors.value : {}));
const pricePreview = computed(() => {
  const price = parseVnd(form.value.price);
  return price === null || form.value.price === ''
    ? ''
    : t('KALO_PRODUCTS.FORM.PRICE_PREVIEW', { amount: formatVnd(price) });
});

const onImage = event => {
  form.value.image = event.target.files?.[0] || null;
};

const save = async () => {
  submitted.value = true;
  if (Object.keys(errors.value).length || saving.value) return;
  saving.value = true;
  const payload = buildPayload(form.value);
  const isForm = payload instanceof FormData;
  try {
    const product = isEdit.value
      ? await store.dispatch(
          'kchatProducts/update',
          isForm
            ? { id: props.product.id, formData: payload }
            : { id: props.product.id, ...payload }
        )
      : await store.dispatch('kchatProducts/create', payload);
    useAlert(
      t(
        isEdit.value
          ? 'KALO_PRODUCTS.TOAST.UPDATED'
          : 'KALO_PRODUCTS.TOAST.CREATED'
      )
    );
    emit('saved', product);
  } catch (error) {
    alertKchatError(error, t);
  } finally {
    saving.value = false;
  }
};

const inputClass =
  'w-full px-3 py-2 mt-1 mb-0 text-sm border border-solid rounded-[10px] outline-none bg-n-solid-1 text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15';
const fieldClass = field =>
  `${inputClass} ${shownErrors.value[field] ? 'border-n-ruby-9' : 'border-n-strong'}`;
const labelClass = 'block text-sm font-semibold text-n-slate-12';
</script>

<template>
  <KaloDrawer
    data-test="product-drawer"
    :title="
      t(
        isEdit
          ? 'KALO_PRODUCTS.FORM.EDIT_TITLE'
          : 'KALO_PRODUCTS.FORM.CREATE_TITLE'
      )
    "
    @close="emit('close')"
  >
    <form
      id="kalo-product-form"
      class="flex flex-col gap-4"
      novalidate
      @submit.prevent="save"
    >
      <label :class="labelClass">
        {{ t('KALO_PRODUCTS.FORM.NAME') }}
        <input
          v-model="form.name"
          type="text"
          data-test="product-form-name"
          :placeholder="t('KALO_PRODUCTS.FORM.NAME_PLACEHOLDER')"
          :aria-invalid="Boolean(shownErrors.name)"
          :class="fieldClass('name')"
        />
        <span
          v-if="shownErrors.name"
          data-test="product-form-error-name"
          class="block mt-1 text-xs font-medium text-n-ruby-11"
        >
          {{ t(`KALO_PRODUCTS.FORM.ERRORS.${shownErrors.name}`) }}
        </span>
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label :class="labelClass">
          {{ t('KALO_PRODUCTS.FORM.PRICE') }}
          <input
            v-model="form.price"
            type="text"
            inputmode="numeric"
            data-test="product-form-price"
            :placeholder="t('KALO_PRODUCTS.FORM.PRICE_PLACEHOLDER')"
            :aria-invalid="Boolean(shownErrors.price)"
            :class="fieldClass('price')"
          />
          <span
            v-if="shownErrors.price"
            data-test="product-form-error-price"
            class="block mt-1 text-xs font-medium text-n-ruby-11"
          >
            {{ t(`KALO_PRODUCTS.FORM.ERRORS.${shownErrors.price}`) }}
          </span>
          <span
            v-else-if="pricePreview"
            data-test="product-form-price-preview"
            class="block mt-1 text-xs font-normal text-n-slate-11"
          >
            {{ pricePreview }}
          </span>
        </label>

        <label :class="labelClass">
          {{ t('KALO_PRODUCTS.FORM.STOCK') }}
          <input
            v-model="form.stock"
            type="text"
            inputmode="numeric"
            data-test="product-form-stock"
            :aria-invalid="Boolean(shownErrors.stock)"
            :class="fieldClass('stock')"
          />
          <span
            v-if="shownErrors.stock"
            data-test="product-form-error-stock"
            class="block mt-1 text-xs font-medium text-n-ruby-11"
          >
            {{ t(`KALO_PRODUCTS.FORM.ERRORS.${shownErrors.stock}`) }}
          </span>
          <span v-else class="block mt-1 text-xs font-normal text-n-slate-11">
            {{ t('KALO_PRODUCTS.FORM.STOCK_HINT') }}
          </span>
        </label>
      </div>

      <label :class="labelClass">
        {{ t('KALO_PRODUCTS.FORM.SKU') }}
        <input
          v-model="form.sku"
          type="text"
          data-test="product-form-sku"
          :class="fieldClass('sku')"
        />
      </label>

      <div class="flex items-start gap-3">
        <div class="overflow-hidden size-16 shrink-0 rounded-xl">
          <KaloProductThumb
            :name="form.name || product?.name || ''"
            :image-url="product?.image_url || null"
          />
        </div>
        <label :class="labelClass" class="flex-1 min-w-0">
          {{ t('KALO_PRODUCTS.FORM.IMAGE') }}
          <input
            type="file"
            data-test="product-form-image"
            :accept="IMAGE_TYPES.join(',')"
            class="block w-full mt-1 mb-0 text-sm text-n-slate-11 file:mr-3 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:border file:border-solid file:rounded-lg file:border-n-strong file:bg-n-solid-2 file:text-n-slate-12"
            @change="onImage"
          />
          <span
            v-if="shownErrors.image"
            data-test="product-form-error-image"
            class="block mt-1 text-xs font-medium text-n-ruby-11"
          >
            {{ t(`KALO_PRODUCTS.FORM.ERRORS.${shownErrors.image}`) }}
          </span>
          <span v-else class="block mt-1 text-xs font-normal text-n-slate-11">
            {{ t('KALO_PRODUCTS.FORM.IMAGE_HINT') }}
          </span>
        </label>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          data-test="product-form-cancel"
          class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
          @click="emit('close')"
        >
          {{ t('KALO_PRODUCTS.FORM.CANCEL') }}
        </button>
        <button
          type="submit"
          form="kalo-product-form"
          data-test="product-form-save"
          :disabled="saving"
          class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
        >
          {{ t('KALO_PRODUCTS.FORM.SAVE') }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
