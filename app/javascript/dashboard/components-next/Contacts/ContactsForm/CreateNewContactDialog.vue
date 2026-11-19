<script setup>
import { ref, computed } from 'vue';
import { useMapGetter } from 'dashboard/composables/store';
import { useI18n } from 'vue-i18n';

import Button from 'dashboard/components-next/button/Button.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';
import ContactsForm from 'dashboard/components-next/Contacts/ContactsForm/ContactsForm.vue';

// Kalo: "Thêm khách" opens in the standard right drawer (guided UX spec §2).
// `dialogRef.open()` / `dialogRef.close()` keep the contract of the old Dialog.
const emit = defineEmits(['create']);

const { t } = useI18n();

const isOpen = ref(false);
const contactsFormRef = ref(null);
const contact = ref(null);

const uiFlags = useMapGetter('contacts/getUIFlags');
const isCreatingContact = computed(() => uiFlags.value.isCreating);

const dialogRef = {
  open: () => {
    isOpen.value = true;
  },
  close: () => {
    isOpen.value = false;
  },
};

const createNewContact = contactItem => {
  contact.value = contactItem;
};

const handleDialogConfirm = async () => {
  if (!contact.value) return;
  emit('create', contact.value);
};

const onSuccess = () => {
  contactsFormRef.value?.resetForm();
  dialogRef.close();
};

defineExpose({ dialogRef, contactsFormRef, onSuccess });
</script>

<template>
  <KaloDrawer
    v-if="isOpen"
    data-test-id="create-contact-drawer"
    :title="t('KALO_SHELL.CONTACTS.ADD')"
    @close="dialogRef.close()"
  >
    <form
      id="kalo-create-contact-form"
      class="contents"
      @submit.prevent="handleDialogConfirm"
    >
      <ContactsForm
        ref="contactsFormRef"
        is-new-contact
        @update="createNewContact"
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
          form="kalo-create-contact-form"
          data-test-id="create-contact-submit"
          :label="
            t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.SAVE_CONTACT')
          "
          color="blue"
          :disabled="contactsFormRef?.isFormInvalid"
          :is-loading="isCreatingContact"
        />
      </div>
    </template>
  </KaloDrawer>
</template>
