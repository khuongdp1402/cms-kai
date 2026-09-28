<script setup>
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import Avatar from 'next/avatar/Avatar.vue';

const props = defineProps({
  conversationId: {
    type: Number,
    required: true,
  },
});

const { t } = useI18n();

const participants = ref([]);
const isLoading = ref(false);

const fetchParticipants = async () => {
  if (!props.conversationId) return;
  isLoading.value = true;
  try {
    const res = await axios.get(
      `/api/v1/accounts/1/conversations/${props.conversationId}/zalo_personal/participants`
    );
    participants.value = res.data.participants || [];
  } catch {
    participants.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.conversationId, fetchParticipants);

onMounted(fetchParticipants);
</script>

<template>
  <div v-if="participants.length > 0" class="flex flex-col gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {{ $t('CONVERSATION.PARTICIPANTS_HEADER') }} ({{ participants.length }})
      </span>
    </div>

    <div class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
      <div
        v-for="p in participants"
        :key="p.id"
        class="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <Avatar
          :name="p.name"
          :src="p.avatar_url"
          :size="24"
        />
        <div class="flex flex-col min-w-0 flex-1">
          <span class="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
            {{ p.name }}
          </span>
          <span v-if="p.role" class="text-[10px] text-slate-400">
            {{ p.role }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
