<script setup>
import { computed } from 'vue';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { formatNumber } from '@chatwoot/utils';
import wootConstants from 'dashboard/constants/globals';

import { useAccount } from 'dashboard/composables/useAccount';
import ConversationBasicFilter from './widgets/conversation/ConversationBasicFilter.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import KaloIcon from 'next/icon/KaloIcon.vue';

const props = defineProps({
  pageTitle: { type: String, required: true },
  hasAppliedFilters: { type: Boolean, required: true },
  hasActiveFolders: { type: Boolean, required: true },
  activeStatus: { type: String, required: true },
  isOnExpandedLayout: { type: Boolean, required: true },
  conversationStats: { type: Object, required: true },
  isListLoading: { type: Boolean, required: true },
});

const emit = defineEmits([
  'addFolders',
  'deleteFolders',
  'resetFilters',
  'basicFilterChange',
  'filtersModal',
]);

const { uiSettings, updateUISettings } = useUISettings();
const { accountScopedRoute } = useAccount();
const searchRoute = computed(() => accountScopedRoute('search'));

const onBasicFilterChange = (value, type) => {
  emit('basicFilterChange', value, type);
};

const hasAppliedFiltersOrActiveFolders = computed(() => {
  return props.hasAppliedFilters || props.hasActiveFolders;
});

const allCount = computed(() => props.conversationStats?.allCount || 0);
const formattedAllCount = computed(() => formatNumber(allCount.value));

const toggleConversationLayout = () => {
  const { LAYOUT_TYPES } = wootConstants;
  const {
    conversation_display_type: conversationDisplayType = LAYOUT_TYPES.CONDENSED,
  } = uiSettings.value;
  const newViewType =
    conversationDisplayType === LAYOUT_TYPES.CONDENSED
      ? LAYOUT_TYPES.EXPANDED
      : LAYOUT_TYPES.CONDENSED;
  updateUISettings({
    conversation_display_type: newViewType,
    previously_used_conversation_display_type: newViewType,
  });
};
</script>

<template>
  <div
    class="flex flex-col gap-3 px-4 pt-4 pb-3"
    :class="{ 'border-b border-n-weak': hasAppliedFiltersOrActiveFolders }"
  >
    <div class="flex items-center justify-between gap-2 min-h-8">
      <div class="flex items-center min-w-0 gap-2">
        <h1
          class="text-xl font-extrabold truncate text-n-slate-12"
          :title="pageTitle"
        >
          {{ pageTitle }}
        </h1>
        <span
          v-if="
            allCount > 0 && hasAppliedFiltersOrActiveFolders && !isListLoading
          "
          class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-alpha-2 text-n-slate-11 shrink-0"
          :title="allCount"
        >
          {{ formattedAllCount }}
        </span>
        <span
          v-if="!hasAppliedFiltersOrActiveFolders"
          data-test-id="kalo-active-status"
          class="px-2 py-0.5 text-xs font-semibold rounded-full bg-n-blue-3 text-n-blue-11 shrink-0"
        >
          {{ $t(`KALO_CHAT_LIST.STATUS.${activeStatus.toUpperCase()}`) }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <template v-if="hasAppliedFilters && !hasActiveFolders">
          <div class="relative">
            <NextButton
              v-tooltip.top-end="$t('FILTER.CUSTOM_VIEWS.ADD.SAVE_BUTTON')"
              icon="i-lucide-save"
              slate
              xs
              faded
              @click="emit('addFolders')"
            />
            <div
              id="saveFilterTeleportTarget"
              class="absolute z-50 mt-2"
              :class="{ 'ltr:right-0 rtl:left-0': isOnExpandedLayout }"
            />
          </div>
          <NextButton
            v-tooltip.top-end="$t('FILTER.CLEAR_BUTTON_LABEL')"
            icon="i-lucide-circle-x"
            ruby
            faded
            xs
            @click="emit('resetFilters')"
          />
        </template>
        <template v-if="hasActiveFolders">
          <div class="relative">
            <NextButton
              id="toggleConversationFilterButton"
              v-tooltip.top-end="$t('FILTER.CUSTOM_VIEWS.EDIT.EDIT_BUTTON')"
              icon="i-lucide-pen-line"
              slate
              xs
              faded
              @click="emit('filtersModal')"
            />
            <div
              id="conversationFilterTeleportTarget"
              class="absolute z-50 mt-2"
              :class="{ 'ltr:right-0 rtl:left-0': isOnExpandedLayout }"
            />
          </div>
          <NextButton
            id="toggleConversationFilterButton"
            v-tooltip.top-end="$t('FILTER.CUSTOM_VIEWS.DELETE.DELETE_BUTTON')"
            icon="i-lucide-trash-2"
            ruby
            xs
            faded
            @click="emit('deleteFolders')"
          />
        </template>
        <template v-else>
          <NextButton
            v-if="hasAppliedFilters"
            id="toggleConversationFilterButton"
            v-tooltip.top-end="$t('FILTER.TOOLTIP_LABEL')"
            icon="i-lucide-list-filter"
            slate
            xs
            faded
            @click="emit('filtersModal')"
          />
          <div class="relative">
            <div
              id="conversationFilterTeleportTarget"
              class="absolute z-50 mt-6"
              :class="
                isOnExpandedLayout
                  ? 'ltr:right-0 rtl:left-0'
                  : 'ltr:left-0 rtl:right-0'
              "
            />
          </div>
        </template>
        <ConversationBasicFilter
          v-if="!hasAppliedFiltersOrActiveFolders"
          :is-on-expanded-layout="isOnExpandedLayout"
          @change-filter="onBasicFilterChange"
          @open-advanced-filter="emit('filtersModal')"
          @toggle-layout="toggleConversationLayout"
        />
      </div>
    </div>
    <router-link
      v-if="!hasAppliedFiltersOrActiveFolders"
      :to="searchRoute"
      data-test-id="kalo-chat-search"
      class="flex items-center gap-2 px-3 py-2 text-sm border rounded-[10px] border-n-weak bg-n-background text-n-slate-10 transition-colors duration-150 motion-reduce:transition-none hover:border-n-strong hover:text-n-slate-11"
    >
      <KaloIcon name="search" class="size-[18px]" />
      <span class="truncate">{{ $t('KALO_CHAT_LIST.SEARCH') }}</span>
    </router-link>
  </div>
</template>
