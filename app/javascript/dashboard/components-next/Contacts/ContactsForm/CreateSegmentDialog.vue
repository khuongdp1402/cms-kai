<script setup>
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';

import Button from 'dashboard/components-next/button/Button.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import Input from 'dashboard/components-next/input/Input.vue';

const emit = defineEmits(['create']);

const FILTER_TYPE_CONTACT = 1;

const { t } = useI18n();

const uiFlags = useMapGetter('customViews/getUIFlags');
const isCreating = computed(() => uiFlags.value.isCreating);

// Kalo: saving a segment opens in the standard right drawer (spec §2);
// `dialogRef.open()` / `dialogRef.close()` keep the old Dialog contract.
const isOpen = ref(false);
const dialogRef = {
  open: () => {
    isOpen.value = true;
  },
  close: () => {
    isOpen.value = false;
  },
};

const state = reactive({
  name: '',
});

const validationRules = {
  name: { required },
};

const v$ = useVuelidate(validationRules, state);

const handleDialogConfirm = async () => {
  const isNameValid = await v$.value.$validate();
  if (!isNameValid) return;
  emit('create', {
    name: state.name,
    filter_type: FILTER_TYPE_CONTACT,
  });
  state.name = '';
  v$.value.$reset();
};

defineExpose({ dialogRef });
</script>

<template>
  <KaloDrawer
    v-if="isOpen"
    data-test-id="create-segment-drawer"
    :title="t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.TITLE')"
    @close="dialogRef.close()"
  >
    <form id="kalo-create-segment-form" @submit.prevent="handleDialogConfirm">
      <Input
        v-model="state.name"
        :label="
          t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.LABEL')
        "
        :placeholder="
          t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.PLACEHOLDER')
        "
        :message="
          v$.name.$error
            ? t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.ERROR')
            : ''
        "
        :message-type="v$.name.$error ? 'error' : 'info'"
      />
    </form>
    <template #footer>
      <div class="flex items-center justify-end w-full gap-3">
        <Button
          :label="t('DIALOG.BUTTONS.CANCEL')"
          variant="outline"
          color="slate"
          type="button"
          @click="dialogRef.close()"
        />
        <Button
          type="submit"
          form="kalo-create-segment-form"
          data-test-id="create-segment-confirm"
          :label="
            t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.CONFIRM')
          "
          color="blue"
          :is-loading="isCreating"
          :disabled="isCreating"
        />
      </div>
    </template>
  </KaloDrawer>
</template>
