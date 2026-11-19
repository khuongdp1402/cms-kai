<script setup>
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
</script>

<template>
  <KaloPage
    data-test="kalo-feature-off"
    :title="t('KALO_CONSOLE_SHOP.FEATURE_OFF.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.FEATURE_OFF.DESC')"
    max-width-class="max-w-2xl"
  >
    <KaloCard>
      <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span
          class="grid rounded-xl size-11 shrink-0 place-items-center bg-n-amber-3 text-n-amber-11"
        >
          <KaloIcon name="lock" class="size-5" />
        </span>
        <p class="flex-1 mb-0 text-sm text-n-slate-12">
          {{ t('KALO_CONSOLE_SHOP.FEATURE_OFF.BODY') }}
        </p>
        <router-link
          :to="accountScopedRoute('kalo_overview')"
          data-test="kalo-feature-off-home"
          class="inline-flex items-center h-9 px-4 text-sm font-semibold text-white rounded-[10px] bg-n-brand hover:opacity-90 shrink-0"
        >
          {{ t('KALO_CONSOLE_SHOP.FEATURE_OFF.HOME') }}
        </router-link>
      </div>
    </KaloCard>
  </KaloPage>
</template>
