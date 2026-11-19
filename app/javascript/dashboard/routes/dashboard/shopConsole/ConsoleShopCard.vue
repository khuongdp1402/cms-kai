<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { useAccount } from 'dashboard/composables/useAccount';
import { useConfig } from 'dashboard/composables/useConfig';
import KaloCard from 'dashboard/components-next/layout/KaloCard.vue';
import {
  inputClass,
  selectClass,
  labelClass,
  linkClass,
  primaryButtonClass,
} from './consoleStyles';

// Shop name and language, saved through the same accounts/update action as
// the account settings page (which keeps the less used fields).
const { t } = useI18n();
const store = useStore();
const { currentAccount, accountScopedRoute } = useAccount();
const { enabledLanguages } = useConfig();
const uiFlags = useMapGetter('accounts/getUIFlags');

const name = ref('');
const locale = ref('');
const submitted = ref(false);

const languages = computed(() =>
  [...(enabledLanguages || [])].sort((a, b) =>
    a.iso_639_1_code.localeCompare(b.iso_639_1_code)
  )
);
const nameError = computed(() => submitted.value && !name.value.trim());

watch(
  () => currentAccount.value?.id,
  id => {
    if (!id) return;
    name.value = currentAccount.value.name || '';
    locale.value = currentAccount.value.locale || '';
  },
  { immediate: true }
);

const save = async () => {
  submitted.value = true;
  if (nameError.value) return;
  try {
    await store.dispatch('accounts/update', {
      name: name.value.trim(),
      locale: locale.value,
    });
    useAlert(t('KALO_CONSOLE_SHOP.SHOP.SAVED'));
  } catch {
    useAlert(t('KALO_CONSOLE_SHOP.SHOP.ERROR'));
  }
};
</script>

<template>
  <KaloCard
    data-test="console-shop"
    :title="t('KALO_CONSOLE_SHOP.SHOP.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.SHOP.DESC')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="save">
      <label :class="labelClass">
        {{ t('KALO_CONSOLE_SHOP.SHOP.NAME') }}
        <input
          v-model="name"
          type="text"
          data-test="console-shop-name"
          :class="[inputClass, { '!border-n-ruby-9': nameError }]"
        />
        <span v-if="nameError" class="text-xs font-normal text-n-ruby-11">
          {{ t('KALO_CONSOLE_SHOP.SHOP.NAME_REQUIRED') }}
        </span>
      </label>
      <label :class="labelClass">
        {{ t('KALO_CONSOLE_SHOP.SHOP.LOCALE') }}
        <select
          v-model="locale"
          data-test="console-shop-locale"
          :class="selectClass"
        >
          <option
            v-for="lang in languages"
            :key="lang.iso_639_1_code"
            :value="lang.iso_639_1_code"
          >
            {{ lang.name }}
          </option>
        </select>
      </label>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <router-link
          :to="accountScopedRoute('general_settings_index')"
          :class="linkClass"
        >
          {{ t('KALO_CONSOLE_SHOP.SHOP.MORE') }}
        </router-link>
        <button
          type="submit"
          data-test="console-shop-save"
          :disabled="uiFlags?.isUpdating"
          :class="primaryButtonClass"
        >
          {{ t('KALO_CONSOLE_SHOP.SHOP.SAVE') }}
        </button>
      </div>
    </form>
  </KaloCard>
</template>
