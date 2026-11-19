<script setup>
import { useI18n } from 'vue-i18n';
import { formatVnd } from 'dashboard/helper/formatVnd';
import KaloProductThumb from 'dashboard/components-next/icon/KaloProductThumb.vue';

defineProps({
  products: { type: Array, required: true },
});
const emit = defineEmits(['add']);
const { t } = useI18n();

// Products without stock tracking (stock null) show no stock line.
const isTracked = product =>
  product.stock !== null && product.stock !== undefined;
</script>

<template>
  <div class="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
    <button
      v-for="product in products"
      :key="product.id"
      type="button"
      data-test="product-card"
      class="p-2.5 text-start border rounded-[14px] border-n-weak bg-n-solid-1 hover:border-woot-300"
      @click="emit('add', product)"
    >
      <div class="h-28 mb-2.5">
        <KaloProductThumb :name="product.name" :image-url="product.image_url" />
      </div>
      <div class="text-sm text-n-slate-12">{{ product.name }}</div>
      <div class="flex flex-wrap items-baseline justify-between gap-x-2">
        <span class="text-sm font-bold text-woot-600">
          {{ formatVnd(product.price) }}
        </span>
        <span
          v-if="isTracked(product)"
          data-test="product-card-stock"
          class="text-xs font-semibold"
          :class="product.stock > 0 ? 'text-n-slate-11' : 'text-n-ruby-11'"
        >
          {{
            product.stock > 0
              ? t('KALO_PRODUCTS.TILE_STOCK', { count: product.stock })
              : t('KALO_PRODUCTS.TILE_OUT')
          }}
        </span>
      </div>
    </button>
  </div>
</template>
