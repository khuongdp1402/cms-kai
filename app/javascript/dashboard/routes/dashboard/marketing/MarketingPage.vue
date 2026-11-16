<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="flex-1 p-6 overflow-auto">
    <h1 class="text-xl font-extrabold text-n-slate-12">
      {{ t('KALO_NAV.PAGES.MARKETING') }}
    </h1>
  </section>
</template>
