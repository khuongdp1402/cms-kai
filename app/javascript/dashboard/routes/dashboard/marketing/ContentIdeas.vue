<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAdmin } from 'dashboard/composables/useAdmin';
import contentIdeasAPI from 'dashboard/api/kchat/contentIdeas';
import Button from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();
const { isAdmin } = useAdmin();

const topic = ref('');
const job = ref(null);
const decisions = ref({});
const pending = ref({});
const isLoading = ref(false);
const notice = ref('');
const needsRenewal = ref(false);

const explainError = error => {
  const status = error?.response?.status;
  const code = error?.response?.data?.error;
  if (status === 503 && code === 'ai_not_configured') {
    return 'KALO_MARKETING.IDEAS.AI_OFF';
  }
  if (status === 403 && code === 'subscription_expired') {
    needsRenewal.value = true;
    return 'KALO_MARKETING.IDEAS.EXPIRED';
  }
  return null;
};

const submit = async () => {
  if (!topic.value.trim()) return;
  isLoading.value = true;
  notice.value = '';
  needsRenewal.value = false;
  try {
    const { data } = await contentIdeasAPI.repurpose(topic.value.trim());
    job.value = data;
    decisions.value = {};
    pending.value = {};
  } catch (error) {
    job.value = null;
    notice.value = explainError(error) || 'KALO_MARKETING.IDEAS.ERROR';
  } finally {
    isLoading.value = false;
  }
};

const decide = async (index, action) => {
  if (pending.value[index]) return;
  notice.value = '';
  pending.value = { ...pending.value, [index]: true };
  try {
    await contentIdeasAPI.decide(job.value.id, action);
    decisions.value = { ...decisions.value, [index]: action };
  } catch (error) {
    notice.value = explainError(error) || 'KALO_MARKETING.IDEAS.DECIDE_ERROR';
  } finally {
    pending.value = { ...pending.value, [index]: false };
  }
};
</script>

<template>
  <div class="flex flex-col gap-4 max-w-3xl">
    <form class="flex flex-wrap items-end gap-3" @submit.prevent="submit">
      <label
        class="flex flex-col flex-1 gap-1 text-sm font-semibold text-n-slate-12 min-w-60"
      >
        {{ t('KALO_MARKETING.IDEAS.TOPIC_LABEL') }}
        <input
          v-model="topic"
          type="text"
          :placeholder="t('KALO_MARKETING.IDEAS.TOPIC_PLACEHOLDER')"
          class="px-3 py-2 text-sm font-normal border rounded-lg bg-n-solid-1 border-n-weak text-n-slate-12"
        />
      </label>
      <Button
        type="submit"
        :label="t('KALO_MARKETING.IDEAS.SUBMIT')"
        :is-loading="isLoading"
      />
    </form>

    <div
      v-if="notice"
      data-test="notice"
      class="flex flex-wrap items-center gap-3 text-sm text-n-slate-11"
    >
      <span>{{ t(notice) }}</span>
      <router-link
        v-if="needsRenewal && isAdmin"
        data-test="renew-link"
        :to="accountScopedRoute('kalo_billing')"
        class="font-semibold text-n-brand"
      >
        {{ t('KALO_MARKETING.IDEAS.RENEW') }}
      </router-link>
      <span v-else-if="needsRenewal" data-test="renew-ask-admin">
        {{ t('KALO_MARKETING.IDEAS.ASK_ADMIN') }}
      </span>
    </div>

    <ul v-if="job" class="flex flex-col gap-3 list-none">
      <li
        v-for="(item, index) in job.angles"
        :key="index"
        data-test="angle"
        class="flex flex-col gap-2 p-4 border rounded-2xl bg-n-solid-1 border-n-weak"
      >
        <h3 class="text-sm font-bold text-n-slate-12">
          {{
            t('KALO_MARKETING.IDEAS.ANGLE_TITLE', {
              index: index + 1,
              angle: item.angle,
            })
          }}
        </h3>
        <p class="text-base font-semibold text-n-slate-12">{{ item.hook }}</p>
        <p class="text-sm whitespace-pre-line text-n-slate-11">
          {{ item.body }}
        </p>
        <p class="text-sm font-semibold text-n-slate-12">{{ item.cta }}</p>
        <p
          v-if="decisions[index]"
          class="text-sm font-semibold text-n-slate-11"
        >
          {{
            decisions[index] === 'approve'
              ? t('KALO_MARKETING.IDEAS.APPROVED')
              : t('KALO_MARKETING.IDEAS.REJECTED')
          }}
        </p>
        <div v-else class="flex gap-2">
          <Button
            :label="t('KALO_MARKETING.IDEAS.APPROVE')"
            size="sm"
            :disabled="pending[index]"
            @click="decide(index, 'approve')"
          />
          <Button
            :label="t('KALO_MARKETING.IDEAS.REJECT')"
            size="sm"
            variant="faded"
            color="slate"
            :disabled="pending[index]"
            @click="decide(index, 'reject')"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
