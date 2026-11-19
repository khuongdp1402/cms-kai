<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import {
  inputClass,
  selectClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './consoleStyles';

// Invite through the same agents/create action as the Nhân viên page; emits
// the created agent so the Console can offer "Thêm vào kênh" right away.
const emit = defineEmits(['close', 'invited']);

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['agent', 'administrator'];

const { t } = useI18n();
const store = useStore();
const agents = useMapGetter('agents/getAgents');

const name = ref('');
const email = ref('');
const role = ref('agent');
const submitted = ref(false);
const isSaving = ref(false);

const nameError = computed(() => submitted.value && !name.value.trim());
const emailError = computed(
  () => submitted.value && !EMAIL_FORMAT.test(email.value.trim())
);

const invite = async () => {
  submitted.value = true;
  if (nameError.value || emailError.value || isSaving.value) return;
  isSaving.value = true;
  const address = email.value.trim().toLowerCase();
  try {
    await store.dispatch('agents/create', {
      name: name.value.trim(),
      email: address,
      role: role.value,
    });
    useAlert(t('KALO_CONSOLE_SHOP.INVITE.SUCCESS'));
    const agent = (agents.value || []).find(
      item => String(item.email).toLowerCase() === address
    );
    emit('invited', agent);
  } catch (error) {
    useAlert(
      error?.response?.status === 422
        ? t('KALO_CONSOLE_SHOP.INVITE.EXISTS')
        : t('KALO_CONSOLE_SHOP.INVITE.ERROR')
    );
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <KaloDrawer
    data-test="console-invite-drawer"
    :title="t('KALO_CONSOLE_SHOP.INVITE.TITLE')"
    :description="t('KALO_CONSOLE_SHOP.INVITE.DESC')"
    @close="emit('close')"
  >
    <form
      id="console-invite-form"
      class="flex flex-col gap-4"
      @submit.prevent="invite"
    >
      <label :class="labelClass">
        {{ t('KALO_CONSOLE_SHOP.INVITE.NAME') }}
        <input
          v-model="name"
          type="text"
          data-test="console-invite-name"
          :placeholder="t('KALO_CONSOLE_SHOP.INVITE.NAME_PLACEHOLDER')"
          :class="[inputClass, { '!border-n-ruby-9': nameError }]"
        />
        <span v-if="nameError" class="text-xs font-normal text-n-ruby-11">
          {{ t('KALO_CONSOLE_SHOP.INVITE.NAME_REQUIRED') }}
        </span>
      </label>
      <label :class="labelClass">
        {{ t('KALO_CONSOLE_SHOP.INVITE.EMAIL') }}
        <input
          v-model="email"
          type="email"
          data-test="console-invite-email"
          :placeholder="t('KALO_CONSOLE_SHOP.INVITE.EMAIL_PLACEHOLDER')"
          :class="[inputClass, { '!border-n-ruby-9': emailError }]"
        />
        <span v-if="emailError" class="text-xs font-normal text-n-ruby-11">
          {{ t('KALO_CONSOLE_SHOP.INVITE.EMAIL_INVALID') }}
        </span>
      </label>
      <label :class="labelClass">
        {{ t('KALO_CONSOLE_SHOP.INVITE.ROLE') }}
        <select
          v-model="role"
          data-test="console-invite-role"
          :class="selectClass"
        >
          <option v-for="item in ROLES" :key="item" :value="item">
            {{ t(`KALO_CONSOLE_SHOP.TEAM.ROLES.${item.toUpperCase()}`) }}
          </option>
        </select>
      </label>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          :class="secondaryButtonClass"
          class="!h-9"
          @click="emit('close')"
        >
          {{ t('KALO_CONSOLE_SHOP.INVITE.CANCEL') }}
        </button>
        <button
          type="submit"
          form="console-invite-form"
          data-test="console-invite-submit"
          :disabled="isSaving"
          :class="primaryButtonClass"
        >
          {{ t('KALO_CONSOLE_SHOP.INVITE.SUBMIT') }}
        </button>
      </div>
    </template>
  </KaloDrawer>
</template>
