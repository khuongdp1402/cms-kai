<script setup>
import { formatVnd } from 'dashboard/helper/formatVnd';
import KaloProductThumb from 'dashboard/components-next/icon/KaloProductThumb.vue';

defineProps({
  products: { type: Array, required: true },
});
const emit = defineEmits(['add']);
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
      <div class="text-sm font-bold text-woot-600">
        {{ formatVnd(product.price) }}
      </div>
    </button>
  </div>
</template>
