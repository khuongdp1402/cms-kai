<script setup>
import { ref, computed } from 'vue';
import { useMapGetter } from 'dashboard/composables/store';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import filterQueryGenerator from 'dashboard/helper/filterQueryGenerator';

import Button from 'dashboard/components-next/button/Button.vue';
import KaloDrawer from 'dashboard/components-next/layout/KaloDrawer.vue';

const emit = defineEmits(['export']);

const { t } = useI18n();
const route = useRoute();

// Kalo: export opens in the standard right drawer (guided UX spec §2);
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

const segments = useMapGetter('customViews/getContactCustomViews');
const appliedFilters = useMapGetter('contacts/getAppliedContactFilters');
const uiFlags = useMapGetter('contacts/getUIFlags');
const isExportingContact = computed(() => uiFlags.value.isExporting);

const activeSegmentId = computed(() => route.params.segmentId);
const activeSegment = computed(() =>
  activeSegmentId.value
    ? segments.value.find(view => view.id === Number(activeSegmentId.value))
    : undefined
);

const exportContacts = async () => {
  let query = { payload: [] };

  if (activeSegmentId.value && activeSegment.value) {
    query = activeSegment.value.query;
  } else if (Object.keys(appliedFilters.value).length > 0) {
    query = filterQueryGenerator(appliedFilters.value);
  }

  emit('export', {
    ...query,
    label: route.params.label || '',
  });
};

const handleDialogConfirm = async () => {
  await exportContacts();
  dialogRef.close();
};

defineExpose({ dialogRef });
</script>

<template>
  <KaloDrawer
    v-if="isOpen"
    data-test-id="contact-export-drawer"
    :title="t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.TITLE')"
    @close="dialogRef.close()"
  >
    <p class="mb-0 text-sm text-n-slate-11">
      {{ t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.DESCRIPTION') }}
    </p>
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
          data-test-id="contact-export-confirm"
          :label="t('CONTACTS_LAYOUT.HEADER.ACTIONS.EXPORT_CONTACT.CONFIRM')"
          color="blue"
          :is-loading="isExportingContact"
          :disabled="isExportingContact"
          @click="handleDialogConfirm"
        />
      </div>
    </template>
  </KaloDrawer>
</template>
