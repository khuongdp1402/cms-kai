<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BackButton from 'dashboard/components/widgets/BackButton.vue';
import KaloPageHeader from 'dashboard/components-next/layout/KaloPageHeader.vue';

const props = defineProps({
  headerTitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  keepAlive: { type: Boolean, default: true },
  showBackButton: { type: Boolean, default: false },
  backUrl: { type: [String, Object], default: '' },
});

const { t } = useI18n();

const showSettingsHeader = computed(
  () => props.headerTitle || props.icon || props.showBackButton
);
</script>

<!-- Multi-step settings flows (new inbox, team, macro editor, inbox settings)
     inside the KaloPage frame (guided UX spec §2): sticky KaloPageHeader with
     the back button, the step body on the canvas. -->
<template>
  <section
    data-test-id="kalo-page"
    class="flex flex-col flex-1 w-full h-full min-w-0 m-0 overflow-y-auto bg-n-background"
  >
    <KaloPageHeader
      v-if="showSettingsHeader"
      :title="headerTitle ? t(headerTitle) : ''"
      max-width-class="max-w-7xl"
    >
      <template v-if="showBackButton" #leading>
        <BackButton compact :back-url="backUrl" />
      </template>
    </KaloPageHeader>

    <router-view
      v-slot="{ Component }"
      class="w-full min-w-0 px-4 py-4 mx-auto sm:px-6 lg:px-8 max-w-7xl"
    >
      <component :is="Component" v-if="!keepAlive" :key="$route.fullPath" />
      <keep-alive v-else>
        <component :is="Component" :key="$route.fullPath" />
      </keep-alive>
    </router-view>
  </section>
</template>
