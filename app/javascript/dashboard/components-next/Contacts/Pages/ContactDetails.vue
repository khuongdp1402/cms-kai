<script setup>
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { fromUnixTime } from 'date-fns';
import { relativeTime } from 'shared/helpers/dateLocale';

import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import ContactLabels from 'dashboard/components-next/Contacts/ContactLabels/ContactLabels.vue';
import ContactsForm from 'dashboard/components-next/Contacts/ContactsForm/ContactsForm.vue';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog.vue';
import Policy from 'dashboard/components/policy.vue';

const props = defineProps({
  selectedContact: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['goToContactsList']);

const { t } = useI18n();
const store = useStore();

const confirmDeleteContactDialogRef = ref(null);

const avatarFile = ref(null);
const avatarUrl = ref('');

const contactsFormRef = ref(null);

const uiFlags = useMapGetter('contacts/getUIFlags');
const isUpdating = computed(() => uiFlags.value.isUpdating);

const isFormInvalid = computed(() => contactsFormRef.value?.isFormInvalid);

const contactData = ref({});

const getInitialContactData = () => {
  if (!props.selectedContact) return {};
  return { ...props.selectedContact };
};

onMounted(() => {
  Object.assign(contactData.value, getInitialContactData());
});

const createdAt = computed(() => {
  return contactData.value?.createdAt
    ? relativeTime(fromUnixTime(contactData.value.createdAt))
    : '';
});

const lastActivityAt = computed(() => {
  return contactData.value?.lastActivityAt
    ? relativeTime(fromUnixTime(contactData.value.lastActivityAt))
    : '';
});

const avatarSrc = computed(() => {
  return avatarUrl.value ? avatarUrl.value : contactData.value?.thumbnail;
});

const handleFormUpdate = updatedData => {
  Object.assign(contactData.value, updatedData);
};

const updateContact = async () => {
  try {
    const { customAttributes, ...basicContactData } = contactData.value;
    await store.dispatch('contacts/update', basicContactData);
    await store.dispatch(
      'contacts/fetchContactableInbox',
      props.selectedContact.id
    );
    useAlert(t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.SUCCESS_MESSAGE'));
  } catch (error) {
    useAlert(t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.ERROR_MESSAGE'));
  }
};

const openConfirmDeleteContactDialog = () => {
  confirmDeleteContactDialogRef.value?.dialogRef.open();
};

const handleAvatarUpload = async ({ file, url }) => {
  avatarFile.value = file;
  avatarUrl.value = url;

  try {
    await store.dispatch('contacts/update', {
      ...contactsFormRef.value?.state,
      avatar: file,
      isFormData: true,
    });
    useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.UPLOAD.SUCCESS_MESSAGE'));
  } catch {
    useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.UPLOAD.ERROR_MESSAGE'));
  }
};

const handleAvatarDelete = async () => {
  try {
    if (props.selectedContact && props.selectedContact.id) {
      await store.dispatch('contacts/deleteAvatar', props.selectedContact.id);
      useAlert(t('CONTACTS_LAYOUT.DETAILS.AVATAR.DELETE.SUCCESS_MESSAGE'));
    }
    avatarFile.value = null;
    avatarUrl.value = '';
    contactData.value.thumbnail = null;
  } catch (error) {
    useAlert(
      error.message
        ? error.message
        : t('CONTACTS_LAYOUT.DETAILS.AVATAR.DELETE.ERROR_MESSAGE')
    );
  }
};
</script>

<template>
  <div class="flex flex-col w-full gap-5">
    <div
      class="flex flex-col w-full gap-6 p-6 border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
    >
      <div class="flex flex-col items-start gap-3">
        <Avatar
          :src="avatarSrc || ''"
          :name="selectedContact?.name || ''"
          :size="68"
          allow-upload
          @upload="handleAvatarUpload"
          @delete="handleAvatarDelete"
        />
        <div class="flex flex-col gap-1">
          <h3 class="text-lg font-extrabold text-n-slate-12">
            {{ selectedContact?.name }}
          </h3>
          <div class="flex flex-col gap-1.5">
            <span
              v-if="selectedContact?.identifier"
              class="inline-flex items-center gap-1 text-sm text-n-slate-11"
            >
              <span class="i-ph-user-gear text-n-slate-10 size-4" />
              {{ selectedContact?.identifier }}
            </span>
            <span
              class="inline-flex items-center gap-1 text-xs text-n-slate-10"
            >
              <span
                v-if="selectedContact?.identifier"
                class="i-ph-activity text-n-slate-10 size-4"
              />
              {{ $t('CONTACTS_LAYOUT.DETAILS.CREATED_AT', { date: createdAt }) }}
              •
              {{
                $t('CONTACTS_LAYOUT.DETAILS.LAST_ACTIVITY', {
                  date: lastActivityAt,
                })
              }}
            </span>
          </div>
        </div>
        <ContactLabels :contact-id="selectedContact?.id" />
      </div>

      <div class="flex flex-col w-full gap-5 pt-5 border-t border-n-weak">
        <ContactsForm
          ref="contactsFormRef"
          :contact-data="contactData"
          is-details-view
          @update="handleFormUpdate"
        />
        <div class="flex justify-end">
          <Button
            :label="t('CONTACTS_LAYOUT.CARD.EDIT_DETAILS_FORM.UPDATE_BUTTON')"
            size="sm"
            :is-loading="isUpdating"
            :disabled="isUpdating || isFormInvalid"
            @click="updateContact"
          />
        </div>
      </div>
    </div>

    <Policy :permissions="['administrator']">
      <div
        class="flex flex-wrap items-center justify-between w-full gap-4 p-5 border shadow-sm rounded-2xl bg-n-solid-1 border-n-ruby-6/50"
      >
        <div class="flex flex-col min-w-0 gap-1">
          <h6 class="text-sm font-bold text-n-ruby-11">
            {{ t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT') }}
          </h6>
          <span class="text-xs text-n-slate-10">
            {{ t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT_DESCRIPTION') }}
          </span>
        </div>
        <Button
          :label="t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT')"
          variant="outline"
          color="ruby"
          size="sm"
          @click="openConfirmDeleteContactDialog"
        />
      </div>
      <ConfirmContactDeleteDialog
        ref="confirmDeleteContactDialogRef"
        :selected-contact="selectedContact"
        @go-to-contacts-list="emit('goToContactsList')"
      />
    </Policy>
  </div>
</template>
