<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { alertKchatError } from 'dashboard/helper/kchatErrors';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import { parseDelta } from './productForm';

// Relative stock change ("+5 hàng về", "-1 hỏng"), applied atomically by the backend.
const props = defineProps({
  product: { type: Object, required: true },
});
const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const store = useStore();

const delta = ref('');
const submitted = ref(false);
const saving = ref(false);

const current = computed(() => Number(props.product.stock) || 0);
const parsed = computed(() => parseDelta(delta.value));
const result = computed(() =>
  parsed.value === null ? null : current.value + parsed.value
);
const error = computed(() => {
  if (parsed.value === null) return 'DELTA_INVALID';
  return result.value < 0 ? 'NEGATIVE' : '';
});

const save = async () => {
  submitted.value = true;
  if (error.value || saving.value) return;
  saving.value = true;
  try {
    const product = await store.dispatch('kchatProducts/adjustStock', {
      id: props.product.id,
      delta: parsed.value,
    });
    useAlert(t('KALO_PRODUCTS.TOAST.STOCK_UPDATED'));
    emit('saved', product);
  } catch (err) {
    alertKchatError(err, t);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <KaloDrawer
    data-test="stock-drawer"
    :title="t('KALO_PRODUCTS.STOCK_FORM.TITLE')"
    :description="product.name"
    @close="emit('close')"
  >
    <form
      id="kalo-stock-form"
      class="flex flex-col gap-4"
      novalidate
      @submit.prevent="save"
    >
      <p class="text-sm text-n-slate-11">
        {{ t('KALO_PRODUCTS.STOCK_FORM.CURRENT', { count: current }) }}
      </p>
      <label class="block text-sm font-semibold text-n-slate-12">
        {{ t('KALO_PRODUCTS.STOCK_FORM.DELTA') }}
        <input
          v-model="delta"
          type="text"
          inputmode="numeric"
          data-test="stock-delta"
          :placeholder="t('KALO_PRODUCTS.STOCK_FORM.DELTA_PLACEHOLDER')"
          :aria-invalid="submitted && Boolean(error)"
          class="w-full px-3 py-2 mt-1 mb-0 text-sm border border-solid rounded-[10px] outline-none dark:focus:outline-none bg-n-solid-1 text-n-slate-12 focus:border-n-brand focus:ring-2 focus:ring-n-brand/15"
          :class="submitted && error ? 'border-n-ruby-9' : 'border-n-strong'"
        />
        <span
          v-if="submitted && error"
          data-test="stock-error"
          class="block mt-1 text-xs font-medium text-n-ruby-11"
        >
          {{ t(`KALO_PRODUCTS.STOCK_FORM.${error}`) }}
        </span>
        <span v-else class="block mt-1 text-xs font-normal text-n-slate-11">
          {{ t('KALO_PRODUCTS.STOCK_FORM.DELTA_HINT') }}
        </span>
      </label>
      <p
        v-if="result !== null && result >= 0"
        data-test="stock-result"
        class="text-sm font-semibold text-n-slate-12"
      >
        {{ t('KALO_PRODUCTS.STOCK_FORM.RESULT', { count: result }) }}
      </p>
    </form>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold border rounded-[10px] border-n-weak text-n-slate-12 hover:bg-n-alpha-2"
          @click="emit('close')"
        >
          {{ t('KALO_PRODUCTS.FORM.CANCEL') }}
        </button>
        <button
          type="submit"
          form="kalo-stock-form"
          data-test="stock-save"
          :disabled="saving"
          class="px-4 py-2 text-sm font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
        >
          {{ t('KALO_PRODUCTS.STOCK_FORM.SAVE') }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
