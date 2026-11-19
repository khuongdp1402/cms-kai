<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useAdmin } from 'dashboard/composables/useAdmin';
import commentRulesAPI from 'dashboard/api/kchat/commentRules';
import Button from 'dashboard/components-next/button/Button.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

const { t } = useI18n();
const { isAdmin } = useAdmin();

const INPUT_CLASS =
  'px-3 py-2 mb-0 text-sm border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500 disabled:opacity-70';

const form = ref({
  enabled: true,
  auto_hide_phone: true,
  hide_keywords: '',
  auto_private_reply: false,
  private_reply_template: '',
});

const isLoading = ref(false);
const isSaving = ref(false);

// Placeholders the backend fills when it sends the private reply
// (Kchat::SocialComments::IngestService): customer name and shop name.
const NAME_TOKEN = '{{name}}';
const TEMPLATE_VARS = [
  { token: NAME_TOKEN, labelKey: 'KALO_POLISH3.COMMENTS.VAR_NAME' },
  { token: '{{shop_name}}', labelKey: 'KALO_POLISH3.COMMENTS.VAR_SHOP' },
];

const insertVar = token => {
  const current = form.value.private_reply_template;
  const glue = current && !current.endsWith(' ') ? ' ' : '';
  form.value.private_reply_template = `${current}${glue}${token}`;
};

const loadRules = async () => {
  if (typeof commentRulesAPI.get !== 'function') return;
  isLoading.value = true;
  try {
    const { data } = await commentRulesAPI.get();
    const rules = data?.rules || {};
    form.value = {
      enabled: rules.enabled !== false,
      auto_hide_phone: rules.auto_hide_phone !== false,
      hide_keywords: Array.isArray(rules.hide_keywords)
        ? rules.hide_keywords.join(', ')
        : '',
      auto_private_reply: Boolean(rules.auto_private_reply),
      private_reply_template: rules.private_reply_template || '',
    };
  } catch {
    useAlert(t('KALO_MARKETING.COMMENTS.LOAD_ERROR'));
  } finally {
    isLoading.value = false;
  }
};

const save = async () => {
  if (!isAdmin.value) return;
  isSaving.value = true;
  try {
    await commentRulesAPI.update({ ...form.value });
    useAlert(t('KALO_MARKETING.COMMENTS.SAVED'));
  } catch {
    useAlert(t('KALO_MARKETING.COMMENTS.SAVE_ERROR'));
  } finally {
    isSaving.value = false;
  }
};

onMounted(loadRules);
</script>

<template>
  <form
    data-test="comment-rules-form"
    class="flex flex-col max-w-2xl gap-4 p-5 border rounded-2xl bg-n-solid-1 border-n-weak"
    @submit.prevent="save"
  >
    <div>
      <h2 class="text-base font-bold text-n-slate-12">
        {{ t('KALO_MARKETING.COMMENTS.TITLE') }}
      </h2>
      <p class="mt-1 text-sm text-n-slate-11">
        {{ t('KALO_MARKETING.COMMENTS.DESC') }}
      </p>
    </div>

    <label class="flex items-center gap-2 text-sm font-medium text-n-slate-12">
      <input
        v-model="form.enabled"
        data-test="rules-enabled"
        type="checkbox"
        class="mb-0"
        :disabled="!isAdmin || isLoading"
      />
      {{ t('KALO_MARKETING.COMMENTS.ENABLED') }}
    </label>

    <label class="flex items-center gap-2 text-sm font-medium text-n-slate-12">
      <input
        v-model="form.auto_hide_phone"
        data-test="rules-auto-hide-phone"
        type="checkbox"
        class="mb-0"
        :disabled="!isAdmin || isLoading"
      />
      {{ t('KALO_MARKETING.COMMENTS.AUTO_HIDE_PHONE') }}
    </label>

    <label class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12">
      {{ t('KALO_MARKETING.COMMENTS.KEYWORDS') }}
      <input
        v-model="form.hide_keywords"
        data-test="rules-keywords"
        type="text"
        :disabled="!isAdmin || isLoading"
        :placeholder="t('KALO_MARKETING.COMMENTS.KEYWORDS_PLACEHOLDER')"
        :class="INPUT_CLASS"
      />
    </label>

    <label class="flex items-center gap-2 text-sm font-medium text-n-slate-12">
      <input
        v-model="form.auto_private_reply"
        data-test="rules-private-reply"
        type="checkbox"
        class="mb-0"
        :disabled="!isAdmin || isLoading"
      />
      {{ t('KALO_MARKETING.COMMENTS.AUTO_PRIVATE_REPLY') }}
    </label>

    <label class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12">
      {{ t('KALO_MARKETING.COMMENTS.PRIVATE_TEMPLATE') }}
      <textarea
        v-model="form.private_reply_template"
        data-test="rules-template"
        rows="3"
        :disabled="!isAdmin || isLoading"
        :placeholder="t('KALO_MARKETING.COMMENTS.PRIVATE_TEMPLATE_PLACEHOLDER')"
        :class="INPUT_CLASS"
      />
      <span
        class="flex flex-wrap items-center gap-1.5 text-xs font-normal text-n-slate-11"
      >
        {{ t('KALO_POLISH3.COMMENTS.VARS_LABEL') }}
        <button
          v-for="item in TEMPLATE_VARS"
          :key="item.token"
          type="button"
          data-test="rules-template-var"
          :disabled="!isAdmin || isLoading"
          class="inline-flex items-center gap-1 px-2 py-0.5 m-0 text-xs font-semibold border border-solid rounded-full border-n-weak bg-n-alpha-1 text-n-slate-12 hover:bg-n-alpha-2"
          @click="insertVar(item.token)"
        >
          <KaloIcon name="plus" class="size-3" />
          {{ t(item.labelKey) }}
        </button>
      </span>
      <span class="text-xs font-normal text-n-slate-11">
        {{ t('KALO_POLISH3.COMMENTS.VARS_EXAMPLE', { token: NAME_TOKEN }) }}
      </span>
    </label>

    <p v-if="!isAdmin" class="text-xs text-n-slate-11">
      {{ t('KALO_MARKETING.COMMENTS.READONLY_NOTE') }}
    </p>

    <div v-if="isAdmin" class="flex justify-end">
      <Button
        type="submit"
        data-test="rules-save"
        :disabled="isSaving || isLoading"
        :is-loading="isSaving"
        :label="t('KALO_MARKETING.COMMENTS.SAVE')"
      />
    </div>
  </form>
</template>
