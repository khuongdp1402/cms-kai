<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, default: '' },
  imageUrl: { type: String, default: null },
});

// Each art symbol of public/kalo-icons.svg gets its own gradient tile.
const TILES = [
  { symbol: 'p-candle', tile: 'from-[#F3DCC4] to-[#C99A6B]' },
  { symbol: 'p-cup', tile: 'from-[#F5E4D2] to-[#D4A074]' },
  { symbol: 'p-plate', tile: 'from-[#F7EED5] to-[#D8BE77]' },
  { symbol: 'p-gift', tile: 'from-[#FBE0D6] to-[#E58C6E]' },
  { symbol: 'p-leaf', tile: 'from-[#F8E3C8] to-[#E0A96D]' },
  { symbol: 'p-teapot', tile: 'from-[#F3DDD3] to-[#C98B7B]' },
  { symbol: 'p-basket', tile: 'from-[#F1E6DA] to-[#B8957A]' },
];

const art = computed(() => {
  const hash = [...props.name].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) % 997,
    7
  );
  return TILES[hash % TILES.length];
});
</script>

<template>
  <div
    class="grid overflow-hidden place-items-center rounded-lg size-full"
    :class="imageUrl ? 'bg-n-alpha-2' : ['bg-gradient-to-br', art.tile]"
  >
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="name"
      class="object-cover size-full"
    />
    <svg
      v-else
      aria-hidden="true"
      class="w-3/5 h-3/5 text-[#7A4A32] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
      data-test="product-art"
    >
      <use :href="`/kalo-icons.svg#${art.symbol}`" />
    </svg>
  </div>
</template>
