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

<!-- Settings pages share the KaloPage frame (guided UX spec §2): one canvas
     that scrolls; SettingsLayout renders the sticky KaloPageHeader band and
     centres the body. -->
<template>
  <section
    data-test-id="kalo-page"
    class="flex flex-col flex-1 w-full h-full min-w-0 m-0 overflow-y-auto bg-n-background"
  >
    <router-view v-slot="{ Component }">
      <keep-alive v-if="keepAlive">
        <component :is="Component" :key="route.fullPath" />
      </keep-alive>
      <component :is="Component" v-else :key="route.fullPath" />
    </router-view>
  </section>
</template>
