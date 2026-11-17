<script setup>
import { ref, computed, provide } from 'vue';
import { Virtualizer } from 'virtua/vue';
import { useBreakpoints } from '@vueuse/core';
import { useChatListKeyboardEvents } from 'dashboard/composables/chatlist/useChatListKeyboardEvents';
import ConversationItem from './ConversationItem.vue';
import IntersectionObserver from 'dashboard/components/IntersectionObserver.vue';

import wootConstants from 'dashboard/constants/globals';

const props = defineProps({
  conversationList: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  showEndOfListMessage: { type: Boolean, default: false },
  label: { type: String, default: '' },
  teamId: { type: [String, Number], default: 0 },
  foldersId: { type: [String, Number], default: 0 },
  conversationType: { type: String, default: '' },
  showAssignee: { type: Boolean, default: false },
  isOnExpandedLayout: { type: Boolean, default: false },
});

const emit = defineEmits(['loadMore']);

const conversationListRef = ref(null);
const virtualListRef = ref(null);
const isContextMenuOpen = ref(false);

provide('contextMenuElementTarget', virtualListRef);

const breakpoints = useBreakpoints({
  lg: wootConstants.LARGE_SCREEN_BREAKPOINT,
});
const isLgScreen = breakpoints.greaterOrEqual('lg');
const showExpandedCards = computed(
  () => props.isOnExpandedLayout && isLgScreen.value
);

useChatListKeyboardEvents(conversationListRef);

const intersectionObserverOptions = computed(() => ({
  root: conversationListRef.value,
  rootMargin: '100px 0px 100px 0px',
}));

const onContextMenuToggle = state => {
  isContextMenuOpen.value = state;
};

const loadMoreConversations = () => {
  emit('loadMore');
};

provide('toggleContextMenu', onContextMenuToggle);

defineExpose({ conversationListRef });
</script>

<template>
  <div
    ref="conversationListRef"
    class="flex-1 min-h-0 overflow-y-auto conversations-list"
    :class="{ '!overflow-hidden': isContextMenuOpen }"
  >
    <Virtualizer
      ref="virtualListRef"
      v-slot="{ item }"
      :data="conversationList"
    >
      <ConversationItem
        :source="item"
        :label="label"
        :team-id="teamId"
        :folders-id="foldersId"
        :conversation-type="conversationType"
        :show-assignee="showAssignee"
        :show-expanded="showExpandedCards"
      />
    </Virtualizer>
    <div
      v-if="isLoading"
      data-test-id="kalo-list-skeleton"
      role="status"
      :aria-label="$t('KALO_CHAT_LIST.LOADING')"
    >
      <div
        v-for="row in conversationList.length ? 2 : 8"
        :key="row"
        class="flex items-center gap-3 px-4 py-3 border-b border-n-weak animate-pulse motion-reduce:animate-none"
      >
        <span class="rounded-full size-10 shrink-0 bg-n-alpha-2" />
        <span class="flex flex-col flex-1 min-w-0 gap-2">
          <span class="w-2/5 h-3 rounded-full bg-n-alpha-2" />
          <span class="w-4/5 h-3 rounded-full bg-n-alpha-1" />
        </span>
      </div>
    </div>
    <p
      v-else-if="showEndOfListMessage"
      class="px-4 py-5 text-xs text-center text-n-slate-10"
    >
      {{ $t('CHAT_LIST.EOF') }}
    </p>
    <IntersectionObserver
      v-else
      :options="intersectionObserverOptions"
      @observed="loadMoreConversations"
    />
  </div>
</template>
