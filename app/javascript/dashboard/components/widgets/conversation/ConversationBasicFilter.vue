<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { vOnClickOutside } from '@vueuse/components';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useMapGetter, useStore } from 'dashboard/composables/store.js';
import wootConstants from 'dashboard/constants/globals';
import KaloIcon from 'next/icon/KaloIcon.vue';
import KaloChatQuickViews from './KaloChatQuickViews.vue';

defineProps({
  isOnExpandedLayout: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits([
  'changeFilter',
  'openAdvancedFilter',
  'toggleLayout',
]);

const store = useStore();
const { t } = useI18n();

const { updateUISettings } = useUISettings();

const chatStatusFilter = useMapGetter('getChatStatusFilter');
const chatSortFilter = useMapGetter('getChatSortFilter');

// Plain ref (not vueuse useToggle): vueuse refs do not re-render under vitest in this repo.
const showActionsDropdown = ref(false);
const toggleDropdown = value => {
  showActionsDropdown.value =
    typeof value === 'boolean' ? value : !showActionsDropdown.value;
};

const currentStatusFilter = computed(() => {
  return chatStatusFilter.value || wootConstants.STATUS_TYPE.OPEN;
});

const currentSortBy = computed(() => {
  return (
    chatSortFilter.value || wootConstants.SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC
  );
});

const chatStatusOptions = computed(() => [
  {
    label: t('KALO_CHAT_LIST.STATUS.OPEN'),
    value: 'open',
  },
  {
    label: t('KALO_CHAT_LIST.STATUS.RESOLVED'),
    value: 'resolved',
  },
  {
    label: t('KALO_CHAT_LIST.STATUS.PENDING'),
    value: 'pending',
  },
  {
    label: t('KALO_CHAT_LIST.STATUS.SNOOZED'),
    value: 'snoozed',
  },
  {
    label: t('KALO_CHAT_LIST.STATUS.ALL'),
    value: 'all',
  },
]);

const chatSortOptions = computed(() => [
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.last_activity_at_asc.TEXT'),
    value: 'last_activity_at_asc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.last_activity_at_desc.TEXT'),
    value: 'last_activity_at_desc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.created_at_desc.TEXT'),
    value: 'created_at_desc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.created_at_asc.TEXT'),
    value: 'created_at_asc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.unread.TEXT'),
    value: 'unread',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.priority_desc.TEXT'),
    value: 'priority_desc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.priority_asc.TEXT'),
    value: 'priority_asc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.priority_desc_created_at_asc.TEXT'),
    value: 'priority_desc_created_at_asc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.waiting_since_asc.TEXT'),
    value: 'waiting_since_asc',
  },
  {
    label: t('CHAT_LIST.SORT_ORDER_ITEMS.waiting_since_desc.TEXT'),
    value: 'waiting_since_desc',
  },
]);

// A dot on the trigger tells the list is not on the default status / order.
const isCustomized = computed(
  () =>
    currentStatusFilter.value !== wootConstants.STATUS_TYPE.OPEN ||
    currentSortBy.value !== wootConstants.SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC
);

const closeDropdown = () => toggleDropdown(false);

const openAdvancedFilter = () => {
  closeDropdown();
  emit('openAdvancedFilter');
};

const saveSelectedFilter = (type, value) => {
  updateUISettings({
    conversations_filter_by: {
      status: type === 'status' ? value : currentStatusFilter.value,
      order_by: type === 'sort' ? value : currentSortBy.value,
    },
  });
};

const handleStatusChange = value => {
  emit('changeFilter', value, 'status');
  store.dispatch('setChatStatusFilter', value);
  saveSelectedFilter('status', value);
};

const handleSortChange = value => {
  emit('changeFilter', value, 'sort');
  store.dispatch('setChatSortFilter', value);
  saveSelectedFilter('sort', value);
};
</script>

<template>
  <div v-on-click-outside="closeDropdown" class="relative flex">
    <button
      type="button"
      data-test-id="kalo-filter-trigger"
      :aria-expanded="showActionsDropdown"
      :title="$t('KALO_CHAT_LIST.FILTER.OPEN')"
      class="relative inline-flex items-center gap-1.5 h-8 px-2.5 text-sm font-medium rounded-lg transition-colors duration-150 motion-reduce:transition-none text-n-slate-12 hover:bg-n-alpha-2"
      :class="{ 'bg-n-alpha-2': showActionsDropdown }"
      @click="toggleDropdown()"
    >
      <KaloIcon name="set" class="size-5" />
      <span class="hidden sm:inline">{{
        $t('KALO_CHAT_LIST.FILTER.OPEN')
      }}</span>
      <span
        v-if="isCustomized"
        data-test-id="kalo-filter-dot"
        class="absolute top-1 rounded-full end-1 size-2 bg-n-blue-9"
      />
    </button>
    <Transition
      enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="-translate-y-1 opacity-0"
      leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
      leave-to-class="-translate-y-1 opacity-0"
    >
      <div
        v-if="showActionsDropdown"
        data-test-id="kalo-filter-panel"
        class="absolute z-40 flex flex-col gap-4 p-4 mt-2 border shadow-xl top-full w-[19rem] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-2xl border-n-weak bg-n-surface-1 ltr:right-0 rtl:left-0"
      >
        <section>
          <h3 class="mb-2 text-xs font-semibold text-n-slate-10">
            {{ $t('KALO_CHAT_LIST.FILTER.STATUS') }}
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in chatStatusOptions"
              :key="option.value"
              type="button"
              :data-test-id="`kalo-status-${option.value}`"
              :aria-pressed="currentStatusFilter === option.value"
              class="px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-150 motion-reduce:transition-none"
              :class="
                currentStatusFilter === option.value
                  ? 'bg-n-slate-12 text-n-solid-1'
                  : 'bg-n-alpha-1 text-n-slate-11 hover:bg-n-alpha-2'
              "
              @click="handleStatusChange(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </section>
        <section>
          <label
            for="kalo-chat-sort"
            class="block mb-2 text-xs font-semibold text-n-slate-10"
          >
            {{ $t('KALO_CHAT_LIST.FILTER.SORT') }}
          </label>
          <select
            id="kalo-chat-sort"
            data-test-id="kalo-sort-select"
            :value="currentSortBy"
            class="w-full h-9 px-2.5 mb-0 text-sm border rounded-lg border-n-weak bg-n-surface-1 text-n-slate-12"
            @change="handleSortChange($event.target.value)"
          >
            <option
              v-for="option in chatSortOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </section>
        <section>
          <h3 class="mb-1 text-xs font-semibold text-n-slate-10">
            {{ $t('KALO_CHAT_LIST.FILTER.VIEWS') }}
          </h3>
          <KaloChatQuickViews @navigate="closeDropdown" />
        </section>
        <div
          class="flex flex-wrap items-center gap-2 pt-3 border-t border-n-weak"
        >
          <button
            type="button"
            data-test-id="kalo-advanced-filter"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-[10px] text-n-blue-11 bg-n-blue-3 hover:bg-n-blue-4 transition-colors duration-150 motion-reduce:transition-none"
            @click="openAdvancedFilter"
          >
            <KaloIcon name="plus" class="size-4" />
            {{ $t('KALO_CHAT_LIST.FILTER.ADVANCED') }}
          </button>
          <button
            type="button"
            data-test-id="kalo-layout-toggle"
            class="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium rounded-[10px] ms-auto text-n-slate-11 hover:bg-n-alpha-2"
            @click="emit('toggleLayout')"
          >
            {{
              isOnExpandedLayout
                ? $t('KALO_CHAT_LIST.FILTER.LAYOUT_COMPACT')
                : $t('KALO_CHAT_LIST.FILTER.LAYOUT_EXPANDED')
            }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
