<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import subscriptionAPI from 'dashboard/api/kchat/subscription';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import { chipClass, linkClass } from './consoleStyles';

// Same data as the plan page (kalo_billing), shown as a summary.
const { t } = useI18n();
const { accountScopedRoute } = useAccount();

const STATUS_STYLES = {
  trial: 'bg-n-amber-3 text-n-amber-11',
  active: 'bg-n-teal-3 text-n-teal-11',
  expired: 'bg-n-ruby-3 text-n-ruby-11',
};

const subscription = ref(null);
const state = ref('loading');

const planName = computed(() =>
  subscription.value?.plan
    ? t(`KALO_BILLING.PLANS.${subscription.value.plan}`)
    : t('KALO_BILLING.TRIAL')
);
const validUntil = computed(() => {
  const iso = subscription.value?.valid_until;
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
});

onMounted(async () => {
  try {
    const { data } = await subscriptionAPI.get();
    subscription.value = data;
    state.value = 'ready';
  } catch (error) {
    state.value =
      error?.response?.data?.error === 'billing_not_configured'
        ? 'not_configured'
        : 'error';
  }
});
</script>

<template>
  <KaloCard
    data-test="console-plan"
    :title="t('KALO_CONSOLE_SHOP.PLAN.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.PLAN.DESC')"
  >
    <div v-if="state === 'ready'" class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-lg font-bold text-n-slate-12">{{ planName }}</span>
        <!-- Without a paid plan the name already says "Dùng thử". -->
        <span
          v-if="subscription.plan || subscription.status !== 'trial'"
          data-test="console-plan-status"
          :class="[chipClass, STATUS_STYLES[subscription.status]]"
        >
          {{ t(`KALO_CONSOLE_SHOP.PLAN.STATUS.${subscription.status}`) }}
        </span>
      </div>
      <p v-if="validUntil" class="mb-0 text-sm text-n-slate-11">
        {{ t('KALO_CONSOLE_SHOP.PLAN.VALID_UNTIL', { date: validUntil }) }}
        <template v-if="subscription.days_left > 0">
          {{
            t('KALO_CONSOLE_SHOP.PLAN.DAYS_LEFT', {
              count: subscription.days_left,
            })
          }}
        </template>
      </p>
    </div>
    <p
      v-else-if="state === 'not_configured'"
      class="mb-0 text-sm text-n-slate-11"
    >
      {{ t('KALO_CONSOLE_SHOP.PLAN.NOT_CONFIGURED') }}
    </p>
    <p v-else-if="state === 'error'" class="mb-0 text-sm text-n-ruby-11">
      {{ t('KALO_CONSOLE_SHOP.PLAN.ERROR') }}
    </p>
    <div v-else class="h-12 rounded-lg animate-pulse bg-n-alpha-2" />
    <template #footer>
      <router-link
        :to="accountScopedRoute('kalo_billing')"
        data-test="console-plan-link"
        :class="linkClass"
      >
        {{ t('KALO_CONSOLE_SHOP.PLAN.VIEW') }}
      </router-link>
    </template>
  </KaloCard>
</template>
