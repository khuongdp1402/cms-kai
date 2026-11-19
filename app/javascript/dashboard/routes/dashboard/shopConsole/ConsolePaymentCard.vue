<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import { linkClass } from './consoleStyles';

// Summary of the bank account printed on order QR codes (kalo_payment_settings).
const { t } = useI18n();
const { accountScopedRoute } = useAccount();

const settings = ref(null);
const state = ref('loading');

const isSet = computed(() => Boolean(settings.value?.account_number));
const maskedNumber = computed(() => {
  const number = settings.value?.account_number || '';
  return number.length > 4 ? `•••• ${number.slice(-4)}` : number;
});

onMounted(async () => {
  try {
    const { data } = await paymentSettingsAPI.get();
    settings.value = data;
    state.value = 'ready';
  } catch {
    state.value = 'error';
  }
});
</script>

<template>
  <KaloCard
    data-test="console-payment"
    :title="t('KALO_CONSOLE_SHOP.PAYMENT.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PAYMENT.DESC')"
  >
    <div v-if="state === 'ready' && isSet" class="flex items-center gap-3">
      <span
        class="grid rounded-xl size-10 shrink-0 place-items-center bg-n-teal-3 text-n-teal-11"
      >
        <KaloIcon name="qr" class="size-5" />
      </span>
      <div class="min-w-0">
        <p class="mb-0 text-sm font-semibold truncate text-n-slate-12">
          {{
            t('KALO_CONSOLE_SHOP.PAYMENT.ACCOUNT_LINE', {
              bank: settings.bank_name,
              number: maskedNumber,
            })
          }}
        </p>
        <p class="mb-0 text-xs truncate text-n-slate-11">
          {{ settings.account_name }}
        </p>
      </div>
    </div>
    <p
      v-else-if="state === 'ready'"
      data-test="console-payment-empty"
      class="mb-0 text-sm text-n-slate-11"
    >
      {{ t('KALO_CONSOLE_SHOP.PAYMENT.NOT_SET') }}
    </p>
    <p v-else-if="state === 'error'" class="mb-0 text-sm text-n-ruby-11">
      {{ t('KALO_CONSOLE_SHOP.PAYMENT.ERROR') }}
    </p>
    <div v-else class="h-10 rounded-lg animate-pulse bg-n-alpha-2" />
    <template #footer>
      <router-link
        :to="accountScopedRoute('kalo_payment_settings')"
        data-test="console-payment-link"
        :class="linkClass"
      >
        {{
          t(
            isSet
              ? 'KALO_CONSOLE_SHOP.PAYMENT.EDIT'
              : 'KALO_CONSOLE_SHOP.PAYMENT.SETUP'
          )
        }}
      </router-link>
    </template>
  </KaloCard>
</template>
