<script setup>
import { computed } from 'vue';
import { INBOX_TYPES } from 'dashboard/helper/inbox';

const props = defineProps({
  inbox: { type: Object, default: () => ({}) },
});

// Brand marks of the Kalo design board (docs/design/kalo/index.html `.ch.*`):
// a sprite glyph from public/kalo-icons.svg (`c-*`) or the brand letter.
const BADGES = {
  [INBOX_TYPES.ZALO_PERSONAL]: { mark: 'Z', tone: 'bg-[#0068FF]' },
  [INBOX_TYPES.FB]: { mark: 'f', tone: 'bg-[#1877F2]' },
  [INBOX_TYPES.INSTAGRAM]: { glyph: 'c-ig', tone: 'bg-[#D62976]' },
  [INBOX_TYPES.TIKTOK]: { glyph: 'c-tt', tone: 'bg-[#111111]' },
  [INBOX_TYPES.WEB]: { glyph: 'c-live', tone: 'bg-n-blue-8' },
  [INBOX_TYPES.WHATSAPP]: { mark: 'W', tone: 'bg-[#128C4B]' },
  [INBOX_TYPES.TELEGRAM]: { mark: 'T', tone: 'bg-[#1C7FB5]' },
  [INBOX_TYPES.LINE]: { mark: 'L', tone: 'bg-[#048A3D]' },
  [INBOX_TYPES.EMAIL]: { mark: '@', tone: 'bg-n-slate-10' },
  [INBOX_TYPES.SMS]: { mark: 'S', tone: 'bg-n-slate-10' },
  [INBOX_TYPES.TWILIO]: { mark: 'S', tone: 'bg-n-slate-10' },
};

const badge = computed(() => BADGES[props.inbox?.channel_type] || null);
</script>

<template>
  <span
    v-if="badge"
    data-test-id="kalo-channel-badge"
    :title="inbox.name"
    class="grid place-items-center size-4 rounded-[5px] text-[10px] font-extrabold leading-none text-white shrink-0"
    :class="badge.tone"
  >
    <svg v-if="badge.glyph" aria-hidden="true" class="size-3/4">
      <use :href="`/kalo-icons.svg#${badge.glyph}`" />
    </svg>
    <span v-else aria-hidden="true">{{ badge.mark }}</span>
  </span>
</template>
