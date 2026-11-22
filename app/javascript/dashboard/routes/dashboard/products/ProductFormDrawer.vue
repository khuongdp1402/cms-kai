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
  AVAILABILITY_MODES,
  IMAGE_TYPES,
  buildPayload,
  emptyForm,
  formFromProduct,
  parseVnd,
  validateForm,
} from './productForm';

// Create (product = null) or edit a catalog item in the standard Kalo drawer.
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
const shownErrors = computed(() => (submitted.value ? errors.value : {}));
const isStockTracked = computed(
  () => form.value.availability_mode === 'in_stock'
);

const pricePreview = computed(() => {
  const price = parseVnd(form.value.price);
  return price === null || form.value.price === ''
    ? ''
    : t('KALO_PRODUCTS.FORM.PRICE_PREVIEW', { amount: formatVnd(price) });
});

const thumbPreviewUrl = computed(
  () => form.value.image_remote_url?.trim() || props.product?.image_url || null
);

const onImage = event => {
  form.value.image = event.target.files?.[0] || null;
};

const generatePitch = () => {
  const name = form.value.name.trim() || '{name}';
  const parsed = parseVnd(form.value.price);
  const priceText = parsed !== null ? formatVnd(parsed) : '{price}';
  const lines = [`• ${name} — ${priceText}`];
  if (form.value.category?.trim()) {
    lines.push(form.value.category.trim());
  }
  if (form.value.description?.trim()) {
    lines.push(form.value.description.trim());
  }
  form.value.pitch_template = lines.join('\n');
};

const save = async () => {
  submitted.value = true;
  if (Object.keys(errors.value).length || saving.value) return;
  saving.value = true;
  const payload = buildPayload(form.value, props.product);
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
  'w-full px-3 py-2 mt-1 mb-0 text-sm border border-solid rounded-[10px] outline-none dark:focus:outline-none bg-n-solid-1 text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15 disabled:opacity-50 disabled:bg-n-solid-2';
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

      <div>
        <span class="block text-sm font-semibold text-n-slate-12">
          {{ t('KALO_PRODUCTS.FORM.AVAILABILITY') }}
        </span>
        <div
          role="group"
          :aria-label="t('KALO_PRODUCTS.FORM.AVAILABILITY')"
          class="grid grid-cols-3 gap-1.5 p-1 mt-1 rounded-xl bg-n-solid-2 border border-n-weak"
        >
          <button
            v-for="mode in AVAILABILITY_MODES"
            :key="mode"
            type="button"
            :data-test="`product-mode-${mode}`"
            :aria-pressed="form.availability_mode === mode"
            class="px-2 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors"
            :class="
              form.availability_mode === mode
                ? 'bg-n-solid-1 text-n-brand shadow-sm border border-n-weak'
                : 'text-n-slate-11 hover:text-n-slate-12'
            "
            @click="form.availability_mode = mode"
          >
            {{ t(`KALO_PRODUCTS.AVAILABILITY.${mode}`) }}
          </button>
        </div>
      </div>

      <label :class="labelClass">
        {{ t('KALO_PRODUCTS.FORM.CATEGORY') }}
        <input
          v-model="form.category"
          type="text"
          data-test="product-form-category"
          :placeholder="t('KALO_PRODUCTS.FORM.CATEGORY_PLACEHOLDER')"
          :class="fieldClass('category')"
        />
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
            :disabled="!isStockTracked"
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
            {{
              t(
                isStockTracked
                  ? 'KALO_PRODUCTS.FORM.STOCK_HINT'
                  : 'KALO_PRODUCTS.FORM.STOCK_NOT_APPLICABLE'
              )
            }}
          </span>
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label :class="labelClass">
          {{ t('KALO_PRODUCTS.FORM.SKU') }}
          <input
            v-model="form.sku"
            type="text"
            data-test="product-form-sku"
            :class="fieldClass('sku')"
          />
        </label>
        <label :class="labelClass">
          {{ t('KALO_PRODUCTS.FORM.EXTERNAL_ID') }}
          <input
            v-model="form.external_id"
            type="text"
            data-test="product-form-external-id"
            :placeholder="t('KALO_PRODUCTS.FORM.EXTERNAL_ID_PLACEHOLDER')"
            :class="fieldClass('external_id')"
          />
        </label>
      </div>

      <label :class="labelClass">
        {{ t('KALO_PRODUCTS.FORM.DESCRIPTION') }}
        <textarea
          v-model="form.description"
          rows="2"
          data-test="product-form-description"
          :placeholder="t('KALO_PRODUCTS.FORM.DESCRIPTION_PLACEHOLDER')"
          :class="fieldClass('description')"
        />
      </label>

      <div>
        <div class="flex items-center justify-between gap-2">
          <label for="kalo-product-pitch" :class="labelClass">
            {{ t('KALO_PRODUCTS.FORM.PITCH_TEMPLATE') }}
          </label>
          <button
            type="button"
            data-test="product-form-generate-pitch"
            class="text-xs font-semibold text-n-brand hover:underline"
            @click="generatePitch"
          >
            {{ t('KALO_PRODUCTS.FORM.GENERATE_PITCH') }}
          </button>
        </div>
        <textarea
          id="kalo-product-pitch"
          v-model="form.pitch_template"
          rows="3"
          data-test="product-form-pitch"
          :placeholder="t('KALO_PRODUCTS.FORM.PITCH_PLACEHOLDER')"
          :class="fieldClass('pitch_template')"
        />
        <span class="block mt-1 text-xs font-normal text-n-slate-11">
          {{ t('KALO_PRODUCTS.FORM.PITCH_HINT') }}
        </span>
      </div>

      <div class="flex items-start gap-3">
        <div class="overflow-hidden size-16 shrink-0 rounded-xl">
          <KaloProductThumb
            :name="form.name || product?.name || ''"
            :image-url="thumbPreviewUrl"
          />
        </div>
        <label :class="labelClass" class="flex-1 min-w-0">
          {{ t('KALO_PRODUCTS.FORM.IMAGE') }}
          <input
            type="file"
            data-test="product-form-image"
            :accept="IMAGE_TYPES.join(',')"
            class="sr-only peer"
            @change="onImage"
          />
          <span
            class="flex items-center min-w-0 gap-2 mt-1 text-sm font-normal rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-n-brand/40"
          >
            <span
              class="px-3 py-1.5 font-semibold border border-solid rounded-lg cursor-pointer shrink-0 border-n-strong bg-n-solid-2 text-n-slate-12 hover:bg-n-solid-3"
            >
              {{ t('KALO_PRODUCTS.FORM.IMAGE_PICK') }}
            </span>
            <span
              data-test="product-form-image-name"
              class="truncate text-n-slate-11"
            >
              {{ form.image?.name || t('KALO_PRODUCTS.FORM.IMAGE_NONE') }}
            </span>
          </span>
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

      <label :class="labelClass">
        {{ t('KALO_PRODUCTS.FORM.IMAGE_REMOTE_URL') }}
        <input
          v-model="form.image_remote_url"
          type="url"
          data-test="product-form-image-url"
          :placeholder="t('KALO_PRODUCTS.FORM.IMAGE_REMOTE_PLACEHOLDER')"
          :aria-invalid="Boolean(shownErrors.image_remote_url)"
          :class="fieldClass('image_remote_url')"
        />
        <span
          v-if="shownErrors.image_remote_url"
          data-test="product-form-error-image-url"
          class="block mt-1 text-xs font-medium text-n-ruby-11"
        >
          {{ t(`KALO_PRODUCTS.FORM.ERRORS.${shownErrors.image_remote_url}`) }}
        </span>
      </label>
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
