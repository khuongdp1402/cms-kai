<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useAlert } from 'dashboard/composables';
import paymentSettingsAPI from 'dashboard/api/kchat/paymentSettings';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import ComboBox from 'dashboard/components-next/combobox/ComboBox.vue';
import { VN_BANKS, OTHER_BANK, findBank } from './vnBanks';

const { t } = useI18n();
const route = useRoute();

// Same limits as Kchat::PaymentSettings.
const BIN_FORMAT = /^\d{6}$/;
const ACCOUNT_NUMBER_FORMAT = /^\d{6,19}$/;
const NAME_LIMIT = 60;
const PREVIEW_DELAY_MS = 400;

const form = reactive({
  bank: '',
  bankBin: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
});
const saved = ref(null);
const isLoading = ref(true);
const hasLoadError = ref(false);
const isSaving = ref(false);
const submitted = ref(false);

const bankOptions = [
  ...VN_BANKS.map(bank => ({
    value: bank.bin,
    label: `${bank.shortName} (${bank.code}) · ${bank.bin}`,
  })),
  { value: OTHER_BANK, label: t('KALO_PAYMENT.FORM.OTHER_BANK') },
];

const isOther = computed(() => form.bank === OTHER_BANK);
const bin = computed(() => (isOther.value ? form.bankBin : form.bank));
const bankName = computed(() =>
  isOther.value ? form.bankName.trim() : findBank(form.bank)?.shortName || ''
);
const accountName = computed(() => form.accountName.trim());

const isNameValid = name => name.length > 0 && name.length <= NAME_LIMIT;

const errors = computed(() => {
  const list = {};
  if (!form.bank) list.bank = 'BANK';
  if (isOther.value && !BIN_FORMAT.test(form.bankBin)) list.bankBin = 'BIN';
  if (isOther.value && !isNameValid(bankName.value))
    list.bankName = 'BANK_NAME';
  if (!ACCOUNT_NUMBER_FORMAT.test(form.accountNumber))
    list.accountNumber = 'ACCOUNT_NUMBER';
  if (!isNameValid(accountName.value)) list.accountName = 'ACCOUNT_NAME';
  return list;
});
const errorFor = field =>
  submitted.value && errors.value[field]
    ? t(`KALO_PAYMENT.ERRORS.${errors.value[field]}`)
    : '';

const isConfigured = computed(
  () => !!(saved.value?.bank_bin && saved.value?.account_number)
);

// Bank apps show the holder name in capitals without accents.
const toBankName = value =>
  value
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();

const setAccountNumber = value => {
  form.accountNumber = String(value).replace(/\D/g, '');
};
const setAccountName = value => {
  form.accountName = toBankName(String(value));
};
const setBankBin = value => {
  form.bankBin = String(value).replace(/\D/g, '');
};

const fillForm = settings => {
  const known = findBank(settings.bank_bin);
  form.bank = known ? known.bin : '';
  if (settings.bank_bin && !known) {
    form.bank = OTHER_BANK;
    form.bankBin = settings.bank_bin;
    form.bankName = settings.bank_name || '';
  }
  form.accountNumber = settings.account_number || '';
  form.accountName = settings.account_name || '';
};

// Live preview of the values being typed, debounced; owns its object URLs.
const previewUrl = ref('');
const isPreviewLoading = ref(false);
const hasPreviewError = ref(false);
let previewTimer = null;
let previewRequest = 0;

const releasePreview = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
};

const canPreview = computed(
  () =>
    BIN_FORMAT.test(bin.value) && ACCOUNT_NUMBER_FORMAT.test(form.accountNumber)
);

const loadPreview = async () => {
  previewRequest += 1;
  const mine = previewRequest;
  isPreviewLoading.value = true;
  try {
    const { data } = await paymentSettingsAPI.previewQr({
      bankBin: bin.value,
      accountNumber: form.accountNumber,
    });
    if (mine !== previewRequest) return;
    previewUrl.value = URL.createObjectURL(data);
  } catch {
    if (mine === previewRequest) hasPreviewError.value = true;
  } finally {
    if (mine === previewRequest) isPreviewLoading.value = false;
  }
};

watch([bin, () => form.accountNumber], () => {
  clearTimeout(previewTimer);
  previewRequest += 1;
  releasePreview();
  hasPreviewError.value = false;
  isPreviewLoading.value = false;
  if (canPreview.value) {
    previewTimer = setTimeout(loadPreview, PREVIEW_DELAY_MS);
  }
});

onBeforeUnmount(() => {
  clearTimeout(previewTimer);
  previewRequest += 1;
  releasePreview();
});

onMounted(async () => {
  try {
    const { data } = await paymentSettingsAPI.get();
    saved.value = data;
    fillForm(data);
  } catch {
    hasLoadError.value = true;
  } finally {
    isLoading.value = false;
  }
});

const onSubmit = async () => {
  submitted.value = true;
  if (Object.keys(errors.value).length || isSaving.value) return;
  isSaving.value = true;
  try {
    const { data } = await paymentSettingsAPI.save({
      bank_bin: bin.value,
      bank_name: bankName.value,
      account_number: form.accountNumber,
      account_name: accountName.value,
    });
    saved.value = data;
    useAlert(t('KALO_PAYMENT.SAVED'));
  } catch (error) {
    useAlert(
      t(
        error?.response?.status === 422
          ? 'KALO_PAYMENT.ERRORS.VALIDATION'
          : 'KALO_PAYMENT.ERRORS.SAVE'
      )
    );
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section
    class="flex-1 px-4 py-4 overflow-auto sm:px-6 sm:py-6 bg-n-surface-1"
  >
    <div class="w-full max-w-5xl mx-auto">
      <router-link
        v-if="route.params.accountId"
        :to="{
          name: 'kalo_console',
          params: { accountId: route.params.accountId },
        }"
        data-test="settings-back-to-hub"
        class="inline-flex items-center gap-1 py-1 -ms-1 text-sm font-medium rounded-lg text-n-slate-11 hover:text-n-slate-12"
      >
        <KaloIcon name="back" class="size-4 rtl:rotate-180" />
        {{ t('KALO_CONSOLE_SHOP.BACK_TO_CONSOLE') }}
      </router-link>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-extrabold text-n-slate-12">
          {{ t('KALO_PAYMENT.TITLE') }}
        </h1>
        <span
          v-if="!isLoading && !hasLoadError"
          data-test="payment-status"
          class="px-3 py-1 text-xs font-semibold rounded-full"
          :class="
            isConfigured
              ? 'bg-n-teal-3 text-n-teal-11'
              : 'bg-n-amber-3 text-n-amber-11'
          "
        >
          {{
            isConfigured
              ? t('KALO_PAYMENT.STATUS.CONFIGURED')
              : t('KALO_PAYMENT.STATUS.MISSING')
          }}
        </span>
      </div>
      <p class="mb-0 text-sm text-n-slate-11">
        {{ t('KALO_PAYMENT.DESC') }}
      </p>

      <p
        v-if="hasLoadError"
        data-test="payment-load-error"
        role="alert"
        class="mt-6 text-sm text-n-slate-11"
      >
        {{ t('KALO_PAYMENT.ERRORS.LOAD') }}
      </p>
      <p v-else-if="isLoading" class="mt-6 text-sm text-n-slate-11">
        {{ t('KALO_PAYMENT.LOADING') }}
      </p>

      <div
        v-else
        class="grid gap-4 mt-5 lg:grid-cols-[minmax(0,1fr)_18rem] items-start"
      >
        <form
          novalidate
          class="flex flex-col gap-4 p-5 border rounded-2xl bg-n-solid-1 border-n-weak"
          @submit.prevent="onSubmit"
        >
          <div class="flex flex-col gap-1">
            <span class="mb-0.5 text-heading-3 text-n-slate-12">
              {{ t('KALO_PAYMENT.FORM.BANK') }}
            </span>
            <ComboBox
              v-model="form.bank"
              data-test="bank-picker"
              :options="bankOptions"
              :placeholder="t('KALO_PAYMENT.FORM.BANK_PLACEHOLDER')"
              :search-placeholder="t('KALO_PAYMENT.FORM.BANK_SEARCH')"
              :empty-state="t('KALO_PAYMENT.FORM.BANK_EMPTY')"
              :has-error="!!errorFor('bank')"
              :message="errorFor('bank')"
            />
          </div>

          <div v-if="isOther" class="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                :model-value="form.bankBin"
                data-test="bank-bin"
                inputmode="numeric"
                maxlength="6"
                :label="t('KALO_PAYMENT.FORM.BIN')"
                :message="errorFor('bankBin')"
                :message-type="errorFor('bankBin') ? 'error' : 'info'"
                @update:model-value="setBankBin"
              />
              <p
                v-if="!errorFor('bankBin')"
                class="mt-1 mb-0 text-xs text-n-slate-11"
              >
                {{ t('KALO_PAYMENT.FORM.BIN_HINT') }}
              </p>
            </div>
            <Input
              v-model="form.bankName"
              data-test="bank-name"
              maxlength="60"
              :label="t('KALO_PAYMENT.FORM.BANK_NAME')"
              :message="errorFor('bankName')"
              :message-type="errorFor('bankName') ? 'error' : 'info'"
            />
          </div>

          <div>
            <Input
              :model-value="form.accountNumber"
              data-test="account-number"
              inputmode="numeric"
              autocomplete="off"
              maxlength="19"
              :label="t('KALO_PAYMENT.FORM.ACCOUNT_NUMBER')"
              :message="errorFor('accountNumber')"
              :message-type="errorFor('accountNumber') ? 'error' : 'info'"
              @update:model-value="setAccountNumber"
            />
            <p
              v-if="!errorFor('accountNumber')"
              class="mt-1 mb-0 text-xs text-n-slate-11"
            >
              {{ t('KALO_PAYMENT.FORM.ACCOUNT_NUMBER_HINT') }}
            </p>
          </div>

          <div>
            <Input
              :model-value="form.accountName"
              data-test="account-name"
              autocomplete="off"
              maxlength="60"
              :label="t('KALO_PAYMENT.FORM.ACCOUNT_NAME')"
              :message="errorFor('accountName')"
              :message-type="errorFor('accountName') ? 'error' : 'info'"
              @update:model-value="setAccountName"
            />
            <p
              v-if="!errorFor('accountName')"
              class="mt-1 mb-0 text-xs text-n-slate-11"
            >
              {{ t('KALO_PAYMENT.FORM.ACCOUNT_NAME_HINT') }}
            </p>
          </div>

          <div class="flex justify-end">
            <Button
              type="submit"
              data-test="save-payment"
              :label="t('KALO_PAYMENT.FORM.SAVE')"
              :is-loading="isSaving"
              :disabled="isSaving"
            />
          </div>
        </form>

        <aside
          class="flex flex-col items-center gap-3 p-5 text-center border rounded-2xl bg-n-solid-1 border-n-weak"
          :aria-label="t('KALO_PAYMENT.PREVIEW.TITLE')"
        >
          <h2 class="text-base font-bold text-n-slate-12">
            {{ t('KALO_PAYMENT.PREVIEW.TITLE') }}
          </h2>
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="t('KALO_PAYMENT.PREVIEW.ALT')"
            data-test="qr-preview"
            class="object-contain bg-white rounded-xl w-52 h-52"
          />
          <p
            v-else-if="!canPreview"
            data-test="qr-preview-empty"
            class="grid p-4 text-sm border border-dashed rounded-xl w-52 h-52 place-items-center border-n-weak text-n-slate-11"
          >
            {{ t('KALO_PAYMENT.PREVIEW.EMPTY') }}
          </p>
          <p
            v-else-if="hasPreviewError"
            data-test="qr-preview-error"
            role="alert"
            class="text-sm font-medium text-n-ruby-11"
          >
            {{ t('KALO_PAYMENT.PREVIEW.ERROR') }}
          </p>
          <p
            v-else
            class="grid text-sm w-52 h-52 place-items-center text-n-slate-11"
          >
            {{ t('KALO_PAYMENT.PREVIEW.LOADING') }}
          </p>
          <p v-if="previewUrl" class="mb-0 text-xs text-n-slate-11">
            {{ t('KALO_PAYMENT.PREVIEW.HINT') }}
          </p>
        </aside>
      </div>
    </div>
  </section>
</template>
