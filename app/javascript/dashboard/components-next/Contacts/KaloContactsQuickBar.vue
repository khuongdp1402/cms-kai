<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useStore();
const { accountScopedRoute } = useAccount();

const segments = computed(
  () => store.getters['customViews/getContactCustomViews'] || []
);
const labels = computed(() => store.getters['labels/getLabels'] || []);
const activeLabel = computed(() => String(route.params.label || ''));
const activeSegmentId = computed(() => Number(route.params.segmentId || 0));

const pillClass = active =>
  active
    ? 'bg-n-slate-12 text-n-solid-1 border-n-slate-12'
    : 'bg-n-solid-1 text-n-slate-11 border-n-weak hover:bg-n-alpha-2 hover:text-n-slate-12';

const onLabelChange = event => {
  const title = event.target.value;
  if (!title) {
    router.push(accountScopedRoute('contacts_dashboard_index'));
    return;
  }
  router.push(
    accountScopedRoute('contacts_dashboard_labels_index', { label: title })
  );
};
</script>

<template>
  <nav
    :aria-label="t('KALO_CONTACTS.QUICK_BAR_LABEL')"
    class="w-full border-b border-n-weak bg-n-surface-1"
  >
    <div
      class="flex flex-wrap items-center w-full max-w-5xl gap-1.5 px-6 py-2.5 mx-auto"
    >
      <router-link
        :to="accountScopedRoute('contacts_dashboard_index')"
        data-test="contacts-quick-all"
        class="px-3 py-1 text-xs font-semibold border rounded-full transition-colors"
        :class="pillClass(route.name === 'contacts_dashboard_index')"
      >
        {{ t('KALO_CONTACTS.ALL') }}
      </router-link>
      <router-link
        :to="accountScopedRoute('contacts_dashboard_active')"
        data-test="contacts-quick-active"
        class="px-3 py-1 text-xs font-semibold border rounded-full transition-colors"
        :class="pillClass(route.name === 'contacts_dashboard_active')"
      >
        {{ t('KALO_CONTACTS.ACTIVE') }}
      </router-link>
      <router-link
        v-for="segment in segments"
        :key="segment.id"
        :to="
          accountScopedRoute('contacts_dashboard_segments_index', {
            segmentId: segment.id,
          })
        "
        data-test="contacts-quick-segment"
        class="px-3 py-1 text-xs font-semibold truncate border rounded-full max-w-44 transition-colors"
        :class="
          pillClass(
            route.name === 'contacts_dashboard_segments_index' &&
              activeSegmentId === segment.id
          )
        "
      >
        {{ segment.name }}
      </router-link>
      <select
        v-if="labels.length"
        data-test="contacts-quick-label"
        :aria-label="t('KALO_CONTACTS.LABELS')"
        :value="activeLabel"
        class="w-auto h-7 py-0 mb-0 text-xs font-semibold border rounded-full ltr:pl-3 ltr:pr-8 rtl:pr-3 rtl:pl-8 border-n-weak bg-n-solid-1 text-n-slate-12 ltr:ml-auto rtl:mr-auto"
        @change="onLabelChange"
      >
        <option value="">{{ t('KALO_CONTACTS.LABELS_ALL') }}</option>
        <option v-for="label in labels" :key="label.id" :value="label.title">
          {{ `#${label.title}` }}
        </option>
      </select>
    </div>
  </nav>
</template>
