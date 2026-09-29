<!-- kchat-web/apps/cms/src/views/settings/InboxesView.vue -->
<!-- KChat Inbox Settings — P4-02 -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">Inboxes</h1>
      <p class="page-subtitle">Quản lý các kênh kết nối (Zalo, Facebook, Email, Website...)</p>
    </div>

    <div class="inboxes-list" v-if="!loading">
      <div class="inbox-card" v-for="inbox in inboxes" :key="inbox.id">
        <div class="inbox-icon">{{ channelIcon(inbox.channel_type) }}</div>
        <div class="inbox-info">
          <h3 class="inbox-name">{{ inbox.name }}</h3>
          <p class="inbox-type">{{ inbox.channel_type }}</p>
        </div>
        <div class="inbox-stats">
          <span class="stat">{{ inbox.conversations_count ?? 0 }} hội thoại</span>
        </div>
        <div class="inbox-status" :class="inbox.working_hours_enabled ? 'status--active' : 'status--inactive'">
          {{ inbox.working_hours_enabled ? '🟢 Active' : '⚫ Inactive' }}
        </div>
      </div>

      <div v-if="inboxes.length === 0" class="empty-state">
        <p>Chưa có inbox nào. Tạo inbox từ Chatwoot API hoặc dashboard cũ.</p>
      </div>
    </div>
    <div v-else class="loading-state">Đang tải...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const inboxes = ref<any[]>([])
const loading = ref(false)

const CHANNEL_ICONS: Record<string, string> = {
  'Channel::Api': '🔌',
  'Channel::Email': '✉️',
  'Channel::WebWidget': '💬',
  'Channel::FacebookPage': '📘',
  'Channel::Instagram': '📸',
  'Channel::Telegram': '📱',
  'Channel::Line': '💚',
  'Channel::Whatsapp': '🟢',
  'Channel::ZaloPersonal': '💙',
  default: '📬',
}

function channelIcon(type: string) {
  return CHANNEL_ICONS[type] ?? CHANNEL_ICONS.default
}

onMounted(async () => {
  if (!currentAccountId.value) return
  loading.value = true
  const res = await api.inboxes.list(currentAccountId.value) as any
  inboxes.value = res?.payload ?? []
  loading.value = false
})
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }

.page-header {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }

.inboxes-list { padding: 24px; display: flex; flex-direction: column; gap: 12px; }

.inbox-card {
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #f1f5f9;
}

.inbox-icon { font-size: 28px; }
.inbox-info { flex: 1; }
.inbox-name { font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 2px; }
.inbox-type { font-size: 12px; color: #94a3b8; margin: 0; }
.inbox-stats .stat { font-size: 13px; color: #64748b; }
.inbox-status { font-size: 12px; padding: 4px 10px; border-radius: 12px; }
.status--active { background: #dcfce7; color: #16a34a; }
.status--inactive { background: #f1f5f9; color: #94a3b8; }

.empty-state { color: #94a3b8; text-align: center; padding: 48px; font-size: 14px; }
.loading-state { padding: 48px; text-align: center; color: #94a3b8; }
</style>
