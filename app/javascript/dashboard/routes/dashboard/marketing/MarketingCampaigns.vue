<script setup>
import BroadcastCampaignsPanel from './BroadcastCampaignsPanel.vue';
import WebsiteCampaignsCard from './WebsiteCampaignsCard.vue';

// Chiến dịch tab of the former Marketing page (kept for bookmarks): the old
// broadcast panel plus the website greetings section shared with the
// Chiến dịch page (no upstream sample cards, no second create button).
defineProps({
  showBroadcasts: { type: Boolean, default: true },
});
</script>

<template>
  <BroadcastCampaignsPanel v-if="showBroadcasts" />
  <WebsiteCampaignsCard data-test="campaigns" />
</template>
