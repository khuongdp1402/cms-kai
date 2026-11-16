<script setup>
import { useI18n } from 'vue-i18n';
import { formatMoney } from './formatMoney';

defineProps({
  products: { type: Array, required: true },
});

const { t } = useI18n();

const LOW_STOCK_LIMIT = 5;
const isLow = stock => typeof stock === 'number' && stock <= LOW_STOCK_LIMIT;
</script>

<template>
  <div class="overflow-x-auto border rounded-2xl bg-n-solid-1 border-n-weak">
    <table class="w-full text-sm text-left">
      <thead class="text-n-slate-11">
        <tr>
          <th class="px-4 py-3 font-semibold">
            {{ t('KALO_REPORTS.PRODUCTS.TITLE') }}
          </th>
          <th class="px-4 py-3 font-semibold">
            {{ t('KALO_REPORTS.PRODUCTS.SOLD') }}
          </th>
          <th class="px-4 py-3 font-semibold">
            {{ t('KALO_REPORTS.PRODUCTS.REVENUE') }}
          </th>
          <th class="px-4 py-3 font-semibold">
            {{ t('KALO_REPORTS.PRODUCTS.STOCK') }}
          </th>
        </tr>
      </thead>
      <tbody class="text-n-slate-12">
        <tr
          v-for="product in products"
          :key="product.name"
          class="border-t border-n-weak"
        >
          <td class="px-4 py-3">{{ product.name }}</td>
          <td class="px-4 py-3">{{ product.sold }}</td>
          <td class="px-4 py-3 font-bold">
            {{ formatMoney(product.revenue) }}
          </td>
          <td class="px-4 py-3">
            <span
              v-if="isLow(product.stock)"
              data-test="low-stock"
              class="px-2 py-1 text-xs font-semibold rounded-full bg-n-amber-3 text-n-amber-11"
            >
              {{ t('KALO_REPORTS.PRODUCTS.LOW', { count: product.stock }) }}
            </span>
            <span v-else-if="product.stock === null">
              {{ t('KALO_REPORTS.PRODUCTS.NO_STOCK_TRACKING') }}
            </span>
            <span v-else>{{ product.stock }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
