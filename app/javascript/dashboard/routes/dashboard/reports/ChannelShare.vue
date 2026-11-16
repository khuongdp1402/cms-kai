<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  channels: { type: Array, required: true },
});

const { t, te } = useI18n();

// "Channel::WebWidget" -> "webwidget"; plain keys such as "zalo" pass through.
const channelName = channel => {
  const key = String(channel)
    .replace(/^Channel::/, '')
    .toLowerCase();
  return te(`KALO_REPORTS.CHANNELS.${key}`)
    ? t(`KALO_REPORTS.CHANNELS.${key}`)
    : t('KALO_REPORTS.CHANNELS.OTHER');
};
</script>

<template>
  <div
    class="flex flex-col gap-3 p-5 border rounded-2xl bg-n-solid-1 border-n-weak"
  >
    <h2 class="text-base font-bold text-n-slate-12">
      {{ t('KALO_REPORTS.CHANNELS.TITLE') }}
    </h2>
    <div v-for="item in channels" :key="item.channel" data-test="channel">
      <div
        class="flex items-center justify-between mb-1 text-sm text-n-slate-12"
      >
        <span>{{ channelName(item.channel) }}</span>
        <span class="font-semibold">{{ item.share_pct }}%</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-n-alpha-2">
        <div
          class="h-full rounded-full bg-n-brand"
          :style="{ width: `${item.share_pct}%` }"
        />
      </div>
    </div>
  </div>
</template>
