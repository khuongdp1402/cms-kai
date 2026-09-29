<!-- kchat-web/apps/cms/src/App.vue -->
<!-- KChat CMS — App shell (P2-05) -->
<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { loadAuthFromStorage } from '@kchat/api-client'

onMounted(() => {
  loadAuthFromStorage()
})
</script>
