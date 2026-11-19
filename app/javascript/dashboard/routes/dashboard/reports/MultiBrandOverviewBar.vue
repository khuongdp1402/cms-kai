<script setup>
import { useI18n } from 'vue-i18n';
import { formatMoney } from './formatMoney';

defineProps({
  brands: { type: Array, required: true },
  currentAccountId: { type: [Number, String], default: null },
});

const { t } = useI18n();

const switchBrand = accountId => {
  window.location.href = `/app/accounts/${accountId}/reports`;
};
</script>

<template>
  <section
    v-if="brands.length > 1"
    data-test="multi-brand-bar"
    class="p-4 mt-5 border rounded-2xl bg-n-solid-1 border-n-weak"
  >
    <h2 class="text-sm font-bold text-n-slate-12">
      {{ t('KALO_REPORTS.BRANDS.TITLE') }}
    </h2>
    <div class="grid gap-3 mt-3 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="brand in brands"
        :key="brand.id"
        type="button"
        data-test="brand-card"
        class="flex flex-col gap-1 p-3 text-left transition-colors border rounded-xl"
        :class="
          Number(brand.id) === Number(currentAccountId)
            ? 'border-n-brand bg-n-alpha-1'
            : 'border-n-weak bg-n-surface-1 hover:bg-n-alpha-1'
        "
        @click="switchBrand(brand.id)"
      >
        <div class="flex items-center justify-between w-full gap-2">
          <span class="text-sm font-bold truncate text-n-slate-12">
            {{ brand.name }}
          </span>
          <span
            v-if="Number(brand.id) === Number(currentAccountId)"
            class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-brand text-white"
          >
            {{ t('KALO_REPORTS.BRANDS.ACTIVE') }}
          </span>
        </div>
        <strong class="text-lg font-extrabold text-n-slate-12">
          {{ formatMoney(brand.revenue) }}
        </strong>
        <span class="text-xs text-n-slate-11">
          {{ t('KALO_REPORTS.BRANDS.ORDERS', { count: brand.orders_count }) }} ·
          {{
            t('KALO_REPORTS.BRANDS.WAITING', { count: brand.waiting_messages })
          }}
        </span>
      </button>
    </div>
  </section>
</template>
