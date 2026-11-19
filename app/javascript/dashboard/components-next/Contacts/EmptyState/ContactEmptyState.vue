<script setup>
import { ref } from 'vue';

import CreateNewContactDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateNewContactDialog.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import KaloIcon from 'dashboard/components-next/icon/KaloIcon.vue';

// Kalo empty state (guided UX spec §3): one sentence and one action, no fake
// demo contacts behind it.
defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  showButton: {
    type: Boolean,
    default: true,
  },
  buttonLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['create']);

const createNewContactDialogRef = ref(null);

const onClick = () => {
  createNewContactDialogRef.value?.dialogRef.open();
};
</script>

<template>
  <section
    data-test-id="contacts-empty-state"
    class="flex flex-col items-center gap-4 px-6 py-16 text-center border shadow-sm rounded-2xl bg-n-solid-1 border-n-weak"
  >
    <span
      class="grid rounded-2xl size-12 place-items-center bg-n-blue-3 text-n-blue-11"
    >
      <KaloIcon name="users" class="size-6" />
    </span>
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-bold text-n-slate-12">{{ title }}</h2>
      <p v-if="subtitle" class="max-w-md text-sm text-n-slate-11">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="showButton">
      <Button :label="buttonLabel" icon="i-lucide-plus" @click="onClick" />
      <CreateNewContactDialog
        ref="createNewContactDialogRef"
        @create="emit('create', $event)"
      />
    </div>
  </section>
</template>
