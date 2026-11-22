<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { formatVnd } from 'dashboard/helper/formatVnd';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloProductThumb from 'dashboard/components-next/icon/KaloProductThumb.vue';

const emit = defineEmits(['close', 'insert', 'send', 'createOrder']);

const { t } = useI18n();
const store = useStore();

const query = ref('');
const activeCategory = ref('');
const selectedIds = ref([]);
const includeImageLinks = ref(true);
const previewText = ref('');
const sending = ref(false);

const allProducts = computed(() => {
  const list = store.getters['kchatProducts/getProducts'];
  return Array.isArray(list) ? list : [];
});

const categories = computed(() => [
  ...new Set(allProducts.value.map(p => p.category).filter(Boolean)),
]);

const filteredProducts = computed(() => {
  const q = query.value.trim().toLowerCase();
  return allProducts.value.filter(product => {
    if (product.active === false) return false;
    if (activeCategory.value && product.category !== activeCategory.value) {
      return false;
    }
    if (!q) return true;
    return [product.name, product.sku, product.category, product.description]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(q));
  });
});

const selectedProducts = computed(() =>
  selectedIds.value
    .map(id => allProducts.value.find(p => p.id === id))
    .filter(Boolean)
);

const formatPitchFor = product => {
  const base =
    product.formatted_pitch ||
    [`• ${product.name} — ${formatVnd(product.price)}`, product.description]
      .filter(Boolean)
      .join('\n');
  if (includeImageLinks.value && product.image_url) {
    return `${base}\n${product.image_url}`;
  }
  return base;
};

watch(
  [selectedProducts, includeImageLinks],
  ([items]) => {
    previewText.value = items.map(formatPitchFor).join('\n\n');
  },
  { immediate: true }
);

const toggleProduct = id => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter(item => item !== id);
  } else {
    selectedIds.value = [...selectedIds.value, id];
  }
};

const onSend = () => {
  if (!previewText.value.trim() || sending.value) return;
  sending.value = true;
  emit('send', previewText.value.trim());
};

onMounted(() => {
  if (store.hasModule?.('kchatProducts')) {
    store.dispatch('kchatProducts/fetch', { active: true });
  }
});
</script>

<template>
  <KaloDrawer
    data-test="product-pitch-drawer"
    :title="t('KALO_CHAT.PRODUCT_PITCH.TITLE')"
    @close="emit('close')"
  >
    <p class="mb-0 text-xs text-n-slate-11">
      {{ t('KALO_CHAT.PRODUCT_PITCH.SUBTITLE') }}
    </p>

    <div class="relative">
      <KaloIcon
        name="search"
        class="absolute -translate-y-1/2 pointer-events-none size-4 text-n-slate-10 left-3 top-1/2"
      />
      <input
        v-model="query"
        type="search"
        data-test="pitch-search"
        :placeholder="t('KALO_CHAT.PRODUCT_PITCH.SEARCH')"
        :aria-label="t('KALO_CHAT.PRODUCT_PITCH.SEARCH')"
        class="w-full h-9 pl-9 pr-3 mb-0 text-sm border rounded-[10px] outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-n-brand"
      />
    </div>

    <div v-if="categories.length" class="flex flex-wrap gap-1.5">
      <button
        type="button"
        data-test="pitch-cat-all"
        class="px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors"
        :class="
          !activeCategory
            ? 'bg-n-brand text-white border-transparent'
            : 'bg-n-solid-1 border-n-weak text-n-slate-11 hover:text-n-slate-12'
        "
        @click="activeCategory = ''"
      >
        {{ t('KALO_CHAT.PRODUCT_PITCH.ALL_CATEGORIES') }}
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        data-test="pitch-cat-chip"
        class="px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors"
        :class="
          activeCategory === cat
            ? 'bg-n-brand text-white border-transparent'
            : 'bg-n-solid-1 border-n-weak text-n-slate-11 hover:text-n-slate-12'
        "
        @click="activeCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <p
      v-if="!allProducts.length"
      data-test="pitch-empty"
      class="py-8 mb-0 text-sm text-center text-n-slate-11"
    >
      {{ t('KALO_CHAT.PRODUCT_PITCH.EMPTY') }}
    </p>
    <p
      v-else-if="!filteredProducts.length"
      data-test="pitch-no-match"
      class="py-8 mb-0 text-sm text-center text-n-slate-11"
    >
      {{ t('KALO_CHAT.PRODUCT_PITCH.NO_MATCH') }}
    </p>

    <ul
      v-else
      class="flex flex-col gap-2 overflow-y-auto max-h-64 list-none pr-0.5"
    >
      <li v-for="product in filteredProducts" :key="product.id">
        <button
          type="button"
          data-test="pitch-item"
          class="flex items-start w-full gap-3 p-2.5 text-start border rounded-xl transition-colors"
          :class="
            selectedIds.includes(product.id)
              ? 'border-n-brand bg-n-blue-2/40'
              : 'border-n-weak bg-n-solid-1 hover:bg-n-solid-2'
          "
          @click="toggleProduct(product.id)"
        >
          <span
            class="grid mt-1 border rounded size-4 shrink-0 place-items-center"
            :class="
              selectedIds.includes(product.id)
                ? 'bg-n-brand border-n-brand text-white'
                : 'border-n-strong bg-n-solid-1'
            "
          >
            <KaloIcon
              v-if="selectedIds.includes(product.id)"
              name="check"
              class="size-3"
            />
          </span>
          <div class="overflow-hidden size-10 shrink-0 rounded-lg">
            <KaloProductThumb
              :name="product.name"
              :image-url="product.image_url"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-sm font-semibold truncate text-n-slate-12">
                {{ product.name }}
              </span>
              <span
                class="text-xs font-bold shrink-0 text-n-brand tabular-nums"
              >
                {{ formatVnd(product.price) }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span
                v-if="product.category"
                class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-n-solid-2 text-n-slate-11"
              >
                {{ product.category }}
              </span>
              <span
                v-if="
                  product.availability_mode &&
                  product.availability_mode !== 'in_stock'
                "
                class="px-1.5 py-0.5 text-[10px] font-medium rounded bg-n-blue-3 text-n-blue-11"
              >
                {{
                  t(`KALO_PRODUCTS.AVAILABILITY.${product.availability_mode}`)
                }}
              </span>
            </div>
            <p
              v-if="product.description"
              class="mt-1 mb-0 text-xs text-n-slate-11 line-clamp-2"
            >
              {{ product.description }}
            </p>
          </div>
        </button>
      </li>
    </ul>

    <div class="flex flex-col gap-2 pt-2 border-t border-n-weak">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-n-slate-12">
          {{ t('KALO_CHAT.PRODUCT_PITCH.PREVIEW_LABEL') }}
        </span>
        <span
          v-if="selectedProducts.length"
          data-test="pitch-selected-count"
          class="text-xs font-semibold text-n-brand"
        >
          {{
            t('KALO_CHAT.PRODUCT_PITCH.SELECTED_COUNT', {
              count: selectedProducts.length,
            })
          }}
        </span>
      </div>
      <textarea
        v-model="previewText"
        rows="4"
        data-test="pitch-preview"
        :placeholder="t('KALO_CHAT.PRODUCT_PITCH.PREVIEW_PLACEHOLDER')"
        class="w-full p-2.5 mb-0 text-xs leading-relaxed border border-solid rounded-xl outline-none border-n-strong bg-n-solid-1 text-n-slate-12 focus:border-n-brand"
      />
      <label
        class="inline-flex items-center gap-2 text-xs text-n-slate-11 cursor-pointer"
      >
        <input v-model="includeImageLinks" type="checkbox" class="mb-0" />
        <span>{{ t('KALO_CHAT.PRODUCT_PITCH.INCLUDE_IMAGE_LINKS') }}</span>
      </label>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          data-test="pitch-create-order"
          :disabled="!selectedProducts.length"
          class="px-3 py-2 text-xs font-semibold border rounded-[10px] border-n-strong text-n-slate-12 hover:bg-n-alpha-2 disabled:opacity-50"
          @click="emit('createOrder', selectedProducts)"
        >
          {{ t('KALO_CHAT.PRODUCT_PITCH.CREATE_ORDER') }}
        </button>
        <button
          type="button"
          data-test="pitch-insert"
          :disabled="!previewText.trim()"
          class="px-3.5 py-2 text-xs font-semibold border rounded-[10px] border-n-strong bg-n-solid-1 text-n-slate-12 hover:bg-n-solid-2 disabled:opacity-50"
          @click="emit('insert', previewText.trim())"
        >
          {{ t('KALO_CHAT.PRODUCT_PITCH.INSERT') }}
        </button>
        <button
          type="button"
          data-test="pitch-send"
          :disabled="!previewText.trim() || sending"
          class="px-3.5 py-2 text-xs font-semibold text-white rounded-[10px] bg-woot-500 hover:bg-woot-600 disabled:opacity-50"
          @click="onSend"
        >
          {{ t('KALO_CHAT.PRODUCT_PITCH.SEND_NOW') }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
