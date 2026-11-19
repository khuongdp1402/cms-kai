<script setup>
import { computed, useSlots } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import Button from 'dashboard/components-next/button/Button.vue';
import Breadcrumb from 'dashboard/components-next/breadcrumb/Breadcrumb.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';
import VoiceCallButton from 'dashboard/components-next/Contacts/VoiceCallButton.vue';
import KaloPage from 'dashboard/components-next/layout/KaloPage.vue';
import KaloPageHeader from 'dashboard/components-next/layout/KaloPageHeader.vue';

const props = defineProps({
  selectedContact: {
    type: Object,
    default: () => ({}),
  },
  isUpdating: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['goToContactsList', 'toggleBlock']);

const { t } = useI18n();
const slots = useSlots();
const route = useRoute();

const contactId = computed(() => route.params.contactId);

const selectedContactName = computed(() => props.selectedContact?.name);

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: t('KALO_SHELL.CONTACTS.TITLE'),
      link: '#',
    },
  ];
  if (props.selectedContact) {
    items.push({
      label: selectedContactName.value,
    });
  }
  return items;
});

const isContactBlocked = computed(() => props.selectedContact?.blocked);

const handleBreadcrumbClick = () => {
  emit('goToContactsList');
};

const toggleBlock = () => {
  emit('toggleBlock', isContactBlocked.value);
};
</script>

<template>
  <KaloPage
    :right-title="t('KALO_SHELL.CONTACTS.DETAILS_PANEL')"
    right-width-class="w-[440px]"
  >
    <template #header="{ isDesktop, open }">
      <KaloPageHeader>
        <template #title>
          <Breadcrumb :items="breadcrumbItems" @click="handleBreadcrumbClick" />
        </template>
        <template #actions>
          <Button
            :label="
              !isContactBlocked
                ? $t('CONTACTS_LAYOUT.HEADER.BLOCK_CONTACT')
                : $t('CONTACTS_LAYOUT.HEADER.UNBLOCK_CONTACT')
            "
            size="sm"
            variant="outline"
            slate
            :is-loading="isUpdating"
            :disabled="isUpdating"
            @click="toggleBlock"
          />
          <VoiceCallButton
            :phone="selectedContact?.phoneNumber"
            :contact-id="contactId"
            :label="$t('CONTACT_PANEL.CALL')"
            size="sm"
          />
          <Button
            v-if="slots.sidebar && !isDesktop"
            data-test-id="contact-open-details"
            :label="t('KALO_SHELL.CONTACTS.DETAILS_PANEL')"
            size="sm"
            variant="outline"
            slate
            @click="open('right')"
          />
          <ComposeConversation :contact-id="contactId">
            <template #trigger>
              <Button
                :label="$t('CONTACTS_LAYOUT.HEADER.SEND_MESSAGE')"
                size="sm"
              />
            </template>
          </ComposeConversation>
        </template>
      </KaloPageHeader>
    </template>

    <div class="min-w-0" :class="{ 'max-w-3xl': !slots.sidebar }">
      <slot name="default" />
    </div>

    <template v-if="slots.sidebar" #right>
      <div
        data-test-id="contact-details-panel"
        class="flex flex-col min-w-0 overflow-hidden border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
      >
        <div class="shrink-0">
          <slot name="sidebarHeader" />
        </div>
        <div class="flex-1 min-h-0 py-4">
          <slot name="sidebar" />
        </div>
      </div>
    </template>
  </KaloPage>
</template>
