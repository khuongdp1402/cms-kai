<script setup>
import { computed } from 'vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import wootConstants from 'dashboard/constants/globals';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  activeTab: {
    type: String,
    default: wootConstants.ASSIGNEE_TYPE.ME,
  },
});

const emit = defineEmits(['chatTabChange']);

const activeTabIndex = computed(() => {
  return props.items.findIndex(item => item.key === props.activeTab);
});

const onTabChange = selectedTabIndex => {
  if (selectedTabIndex >= 0 && selectedTabIndex < props.items.length) {
    const selectedItem = props.items[selectedTabIndex];
    if (selectedItem.key !== props.activeTab) {
      emit('chatTabChange', selectedItem.key);
    }
  }
};

const keyboardEvents = {
  'Alt+KeyN': {
    action: () => {
      if (props.activeTab === wootConstants.ASSIGNEE_TYPE.ALL) {
        onTabChange(0);
      } else {
        const nextIndex = (activeTabIndex.value + 1) % props.items.length;
        onTabChange(nextIndex);
      }
    },
  },
};

useKeyboardEvents(keyboardEvents);
</script>

<template>
  <div
    role="tablist"
    class="flex items-center w-full gap-1 px-4 pb-2 overflow-x-auto [scrollbar-width:none]"
  >
    <button
      v-for="(item, index) in items"
      :key="item.key"
      type="button"
      role="tab"
      data-test-id="kalo-chat-tab"
      :aria-selected="index === activeTabIndex"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none"
      :class="
        index === activeTabIndex
          ? 'bg-n-slate-12 text-n-solid-1'
          : 'text-n-slate-11 hover:bg-n-alpha-2'
      "
      @click="onTabChange(index)"
    >
      {{ item.name }}
      <span
        v-if="item.count !== undefined"
        class="text-xs tabular-nums"
        :class="index === activeTabIndex ? 'opacity-80' : 'text-n-slate-10'"
      >
        {{ item.count }}
      </span>
    </button>
  </div>
</template>
