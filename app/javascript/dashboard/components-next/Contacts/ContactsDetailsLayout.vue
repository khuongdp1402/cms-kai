<script setup>
import { computed, useSlots } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import Button from 'dashboard/components-next/button/Button.vue';
import Breadcrumb from 'dashboard/components-next/breadcrumb/Breadcrumb.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';
import VoiceCallButton from 'dashboard/components-next/Contacts/VoiceCallButton.vue';

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
      label: t('CONTACTS_LAYOUT.HEADER.BREADCRUMB.CONTACTS'),
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
  <section
    class="flex flex-col w-full h-full min-w-0 overflow-y-auto bg-n-background"
  >
    <header
      class="sticky top-0 z-20 border-b shrink-0 bg-n-surface-1/95 backdrop-blur-md border-n-weak"
    >
      <div
        class="flex flex-wrap items-center justify-between w-full gap-3 px-5 py-3.5 mx-auto max-w-[1360px] sm:px-6 lg:px-8"
      >
        <Breadcrumb :items="breadcrumbItems" @click="handleBreadcrumbClick" />
        <div class="flex flex-wrap items-center gap-2">
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
          <ComposeConversation :contact-id="contactId">
            <template #trigger>
              <Button
                :label="$t('CONTACTS_LAYOUT.HEADER.SEND_MESSAGE')"
                size="sm"
              />
            </template>
          </ComposeConversation>
        </div>
      </div>
    </header>

    <main class="w-full px-5 py-6 mx-auto max-w-[1360px] sm:px-6 lg:px-8">
      <div
        :class="
          slots.sidebar
            ? 'grid grid-cols-1 gap-6 xl:grid-cols-[5fr_7fr] items-start'
            : 'max-w-3xl'
        "
      >
        <div class="min-w-0">
          <slot name="default" />
        </div>

        <aside
          v-if="slots.sidebar"
          class="flex flex-col min-w-0 overflow-hidden border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak xl:sticky xl:top-20"
        >
          <div class="shrink-0">
            <slot name="sidebarHeader" />
          </div>
          <div class="flex-1 min-h-0 py-4 overflow-y-auto max-h-[calc(100dvh-11rem)]">
            <slot name="sidebar" />
          </div>
        </aside>
      </div>
    </main>
  </section>
</template>
