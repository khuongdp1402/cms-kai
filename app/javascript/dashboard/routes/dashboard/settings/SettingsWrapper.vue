<script setup>
import { useRoute } from 'vue-router';

defineProps({
  keepAlive: {
    type: Boolean,
    default: true,
  },
});

const route = useRoute();
</script>

<template>
  <div
    class="flex flex-col w-full h-full px-4 pt-4 pb-8 m-0 overflow-auto sm:px-6 sm:pt-6 bg-n-surface-1"
  >
    <div class="flex items-start w-full max-w-5xl mx-auto min-w-0 [&>*]:w-full">
      <router-view v-slot="{ Component }">
        <keep-alive v-if="keepAlive">
          <component :is="Component" :key="route.fullPath" />
        </keep-alive>
        <component :is="Component" v-else :key="route.fullPath" />
      </router-view>
    </div>
  </div>
</template>
