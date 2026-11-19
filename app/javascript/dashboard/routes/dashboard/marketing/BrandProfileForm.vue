<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import { useAdmin } from 'dashboard/composables/useAdmin';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import Button from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const { isAdmin } = useAdmin();

const form = reactive({
  brand_name: '',
  positioning: '',
  usp: '',
  persona: '',
  tone: '',
  hard_bans: '',
});

const aiStatus = ref({ configured: false, default_model: '' });
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');

const loadProfile = async () => {
  if (typeof contentIdeasAPI.overview !== 'function') return;
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await contentIdeasAPI.overview();
    const profile = data?.brand_profile || {};
    form.brand_name = profile.brand_name || '';
    form.positioning = profile.positioning || '';
    form.usp = profile.usp || '';
    form.persona = profile.persona || '';
    form.tone = profile.tone || '';
    form.hard_bans = Array.isArray(profile.hard_bans)
      ? profile.hard_bans.join(', ')
      : profile.hard_bans || '';
    aiStatus.value = data?.ai || { configured: false, default_model: '' };
  } catch {
    errorMessage.value = t('KALO_MARKETING.BRAND_PROFILE.LOAD_ERROR');
  } finally {
    isLoading.value = false;
  }
};

const save = async () => {
  if (!isAdmin.value || isSaving.value) return;
  isSaving.value = true;
  errorMessage.value = '';
  try {
    await contentIdeasAPI.saveProfile({ ...form });
    useAlert(t('KALO_MARKETING.BRAND_PROFILE.SAVED'));
  } catch {
    errorMessage.value = t('KALO_MARKETING.BRAND_PROFILE.SAVE_ERROR');
  } finally {
    isSaving.value = false;
  }
};

onMounted(loadProfile);

const fieldClass =
  'w-full px-3 py-2 mb-0 text-sm font-normal border rounded-lg outline-none bg-n-solid-1 border-n-weak text-n-slate-12 focus:border-woot-500 disabled:opacity-60';
</script>

<template>
  <div class="flex flex-col max-w-3xl gap-5">
    <div
      class="flex flex-wrap items-start justify-between gap-3 p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
    >
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-bold text-n-slate-12">
          {{ t('KALO_MARKETING.BRAND_PROFILE.TITLE') }}
        </h2>
        <p class="mb-0 text-sm text-n-slate-11">
          {{ t('KALO_MARKETING.BRAND_PROFILE.DESC') }}
        </p>
      </div>
      <span
        data-test="brand-ai-status"
        class="px-3 py-1 text-xs font-semibold rounded-full shrink-0"
        :class="
          aiStatus.configured
            ? 'bg-n-teal-3 text-n-teal-11'
            : 'bg-n-alpha-2 text-n-slate-11'
        "
      >
        {{
          aiStatus.configured
            ? t('KALO_MARKETING.BRAND_PROFILE.AI_READY', {
                model: aiStatus.default_model || 'AI',
              })
            : t('KALO_MARKETING.BRAND_PROFILE.AI_OFF')
        }}
      </span>
    </div>

    <p
      v-if="errorMessage"
      role="alert"
      data-test="brand-error"
      class="mb-0 text-sm font-medium text-n-ruby-11"
    >
      {{ errorMessage }}
    </p>

    <form
      class="flex flex-col gap-4 p-5 border rounded-2xl bg-n-solid-1 border-n-weak"
      @submit.prevent="save"
    >
      <label class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.BRAND_PROFILE.BRAND_NAME') }}
        <input
          v-model="form.brand_name"
          data-test="brand-name"
          type="text"
          :disabled="!isAdmin || isLoading"
          :placeholder="
            t('KALO_MARKETING.BRAND_PROFILE.BRAND_NAME_PLACEHOLDER')
          "
          :class="fieldClass"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.BRAND_PROFILE.POSITIONING') }}
        <textarea
          v-model="form.positioning"
          data-test="brand-positioning"
          rows="2"
          :disabled="!isAdmin || isLoading"
          :placeholder="
            t('KALO_MARKETING.BRAND_PROFILE.POSITIONING_PLACEHOLDER')
          "
          :class="fieldClass"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.BRAND_PROFILE.USP') }}
        <textarea
          v-model="form.usp"
          data-test="brand-usp"
          rows="2"
          :disabled="!isAdmin || isLoading"
          :placeholder="t('KALO_MARKETING.BRAND_PROFILE.USP_PLACEHOLDER')"
          :class="fieldClass"
        />
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label
          class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.BRAND_PROFILE.PERSONA') }}
          <input
            v-model="form.persona"
            data-test="brand-persona"
            type="text"
            :disabled="!isAdmin || isLoading"
            :placeholder="t('KALO_MARKETING.BRAND_PROFILE.PERSONA_PLACEHOLDER')"
            :class="fieldClass"
          />
        </label>

        <label
          class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12"
        >
          {{ t('KALO_MARKETING.BRAND_PROFILE.TONE') }}
          <input
            v-model="form.tone"
            data-test="brand-tone"
            type="text"
            :disabled="!isAdmin || isLoading"
            :placeholder="t('KALO_MARKETING.BRAND_PROFILE.TONE_PLACEHOLDER')"
            :class="fieldClass"
          />
        </label>
      </div>

      <label class="flex flex-col gap-1 text-sm font-semibold text-n-slate-12">
        {{ t('KALO_MARKETING.BRAND_PROFILE.HARD_BANS') }}
        <textarea
          v-model="form.hard_bans"
          data-test="brand-hard-bans"
          rows="2"
          :disabled="!isAdmin || isLoading"
          :placeholder="t('KALO_MARKETING.BRAND_PROFILE.HARD_BANS_PLACEHOLDER')"
          :class="fieldClass"
        />
      </label>

      <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p v-if="!isAdmin" class="mb-0 text-xs text-n-slate-11">
          {{ t('KALO_MARKETING.BRAND_PROFILE.READONLY_NOTE') }}
        </p>
        <Button
          v-if="isAdmin"
          type="submit"
          data-test="brand-save"
          class="ltr:ml-auto rtl:mr-auto"
          :label="t('KALO_MARKETING.BRAND_PROFILE.SAVE')"
          :is-loading="isSaving"
          :disabled="isSaving || isLoading"
        />
      </div>
    </form>
  </div>
</template>
