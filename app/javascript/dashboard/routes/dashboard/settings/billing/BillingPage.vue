<script setup>
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import subscriptionAPI from 'dashboard/api/kchat/subscription';
import Button from 'dashboard/components-next/button/Button.vue';
import { formatMoney } from 'dashboard/routes/dashboard/reports/formatMoney';

const { t } = useI18n();
const route = useRoute();

const PLAN_KEYS = ['starter', 'growth', 'enterprise'];
const STATUS_STYLES = {
  trial: 'bg-n-amber-3 text-n-amber-11',
  active: 'bg-n-teal-3 text-n-teal-11',
  expired: 'bg-n-ruby-3 text-n-ruby-11',
};

const subscription = ref(null);
const hasError = ref(false);
const isNotConfigured = ref(false);
const copied = ref(false);

const isExpired = computed(() => subscription.value?.status === 'expired');
const planName = computed(() =>
  subscription.value?.plan
    ? t(`KALO_BILLING.PLANS.${subscription.value.plan}`)
    : t('KALO_BILLING.TRIAL')
);
const validUntil = computed(() => {
  const iso = subscription.value?.valid_until;
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
});

const copyMemo = async () => {
  try {
    await navigator.clipboard.writeText(subscription.value.memo);
    copied.value = true;
  } catch {
    copied.value = false;
  }
};

onMounted(async () => {
  try {
    const { data } = await subscriptionAPI.get();
    subscription.value = data;
  } catch (error) {
    if (error?.response?.data?.error === 'billing_not_configured') {
      isNotConfigured.value = true;
    } else {
      hasError.value = true;
    }
  }
});
</script>

<template>
  <section
    class="flex-1 px-4 py-4 overflow-auto sm:px-6 sm:py-6 bg-n-surface-1"
  >
    <div class="w-full max-w-5xl mx-auto">
      <router-link
        v-if="route.params.accountId"
        :to="{
          name: 'kalo_settings_hub',
          params: { accountId: route.params.accountId },
        }"
        data-test="settings-back-to-hub"
        class="inline-flex items-center gap-1 py-1 -ms-1 text-sm font-medium rounded-lg text-n-slate-11 hover:text-n-slate-12"
      >
        <KaloIcon name="back" class="size-4 rtl:rotate-180" />
        {{ t('KALO_SETTINGS_UI.BACK_TO_HUB') }}
      </router-link>
      <h1 class="text-xl font-extrabold text-n-slate-12">
        {{ t('KALO_BILLING.TITLE') }}
      </h1>
      <p class="mb-0 text-sm text-n-slate-11">
        {{ t('KALO_SETTINGS_UI.PAGES.PLAN.DESC') }}
      </p>
      <p
        v-if="isNotConfigured"
        data-test="billing-not-configured"
        role="status"
        class="p-4 mt-6 text-sm font-medium border rounded-2xl bg-n-amber-3 text-n-amber-11 border-n-amber-5"
      >
        {{ t('KALO_PAYMENT.BILLING_NOT_CONFIGURED') }}
      </p>
      <p
        v-else-if="hasError"
        data-test="error"
        class="mt-6 text-sm text-n-slate-11"
      >
        {{ t('KALO_BILLING.ERROR') }}
      </p>
      <p v-else-if="!subscription" class="mt-6 text-sm text-n-slate-11">
        {{ t('KALO_BILLING.LOADING') }}
      </p>

      <div v-else class="flex flex-col max-w-3xl gap-4 mt-5">
        <div
          class="flex flex-wrap items-center justify-between gap-3 p-5 border rounded-2xl bg-n-solid-1 border-n-weak"
        >
          <div>
            <p class="text-sm text-n-slate-11">{{ t('KALO_BILLING.PLAN') }}</p>
            <b data-test="plan" class="text-xl font-extrabold text-n-slate-12">
              {{ planName }}
            </b>
            <p
              v-if="validUntil"
              data-test="valid-until"
              class="mt-1 text-sm text-n-slate-11"
            >
              {{ t('KALO_BILLING.VALID_UNTIL', { date: validUntil }) }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span
              data-test="status"
              class="px-3 py-1 text-xs font-semibold rounded-full"
              :class="STATUS_STYLES[subscription.status]"
            >
              {{ t(`KALO_BILLING.STATUS.${subscription.status}`) }}
            </span>
            <span
              v-if="!isExpired"
              data-test="days-left"
              class="text-sm font-semibold text-n-slate-12"
            >
              {{
                t('KALO_BILLING.DAYS_LEFT', { count: subscription.days_left })
              }}
            </span>
          </div>
        </div>

        <div
          data-test="renew"
          :data-primary="isExpired"
          class="flex flex-col gap-3 p-5 border rounded-2xl"
          :class="
            isExpired
              ? 'bg-n-brand text-white border-transparent'
              : 'bg-n-solid-1 text-n-slate-12 border-n-weak'
          "
        >
          <h2 class="text-base font-bold">
            {{ t('KALO_BILLING.RENEW_TITLE') }}
          </h2>
          <p class="text-sm">{{ t('KALO_BILLING.RENEW_STEPS') }}</p>
          <dl
            class="grid gap-2 p-4 text-sm rounded-xl bg-n-solid-1 text-n-slate-12 sm:grid-cols-[auto_1fr]"
          >
            <dt class="text-n-slate-11">{{ t('KALO_BILLING.BANK') }}</dt>
            <dd class="font-semibold">{{ subscription.bank.bank }}</dd>
            <dt class="text-n-slate-11">
              {{ t('KALO_BILLING.ACCOUNT_NUMBER') }}
            </dt>
            <dd class="font-semibold">
              {{ subscription.bank.account_number }}
            </dd>
            <dt class="text-n-slate-11">
              {{ t('KALO_BILLING.ACCOUNT_NAME') }}
            </dt>
            <dd class="font-semibold">{{ subscription.bank.account_name }}</dd>
            <dt class="text-n-slate-11">{{ t('KALO_BILLING.MEMO') }}</dt>
            <dd class="flex flex-wrap items-center gap-2">
              <code data-test="memo" class="font-bold">{{
                subscription.memo
              }}</code>
              <Button
                data-test="copy-memo"
                size="xs"
                variant="faded"
                color="slate"
                :label="
                  copied ? t('KALO_BILLING.COPIED') : t('KALO_BILLING.COPY')
                "
                @click="copyMemo"
              />
            </dd>
          </dl>
        </div>

        <div class="p-5 border rounded-2xl bg-n-solid-1 border-n-weak">
          <h2 class="mb-3 text-base font-bold text-n-slate-12">
            {{ t('KALO_BILLING.PRICES_TITLE') }}
          </h2>
          <ul class="grid gap-3 sm:grid-cols-3 list-none">
            <li
              v-for="key in PLAN_KEYS"
              :key="key"
              class="p-3 border rounded-xl border-n-weak"
            >
              <p class="text-sm text-n-slate-11">
                {{ t(`KALO_BILLING.PLANS.${key}`) }}
              </p>
              <b class="text-lg text-n-slate-12">{{
                formatMoney(subscription.prices[key])
              }}</b>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
