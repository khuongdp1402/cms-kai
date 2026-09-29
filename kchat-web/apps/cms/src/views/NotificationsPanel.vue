<!-- kchat-web/apps/cms/src/views/NotificationsPanel.vue -->
<!-- P3-07: Notification center -->
<template>
  <div class="notif-panel">
    <div class="notif-header">
      <h3>Thông báo</h3>
      <button v-if="unreadCount > 0" class="btn-mark-all" @click="markAllRead">Đánh dấu tất cả</button>
    </div>

    <div class="notif-list" v-if="notifications.length">
      <div
        v-for="n in notifications"
        :key="n.id"
        :class="['notif-item', { 'notif-item--unread': !n.read_at }]"
        @click="handleNotifClick(n)"
      >
        <div class="notif-dot" v-if="!n.read_at" />
        <div class="notif-content">
          <p class="notif-text">{{ notifText(n) }}</p>
          <span class="notif-time">{{ formatTime(n.created_at) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="notif-empty">
      <span>🔔</span>
      <p>Không có thông báo nào</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)
const router = useRouter()

const notifications = ref<any[]>([])

const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)

function formatTime(ts: string) {
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: vi })
}

function notifText(n: any): string {
  const type = n.notification_type
  const conv = n.primary_actor?.id ?? ''
  if (type === 'conversation_creation') return `Hội thoại mới #${conv}`
  if (type === 'conversation_assignment') return `Hội thoại #${conv} được gán cho bạn`
  if (type === 'mentioned') return `Bạn được nhắc đến trong hội thoại #${conv}`
  if (type === 'reply_created') return `Có tin nhắn mới trong hội thoại #${conv}`
  return `Thông báo mới — hội thoại #${conv}`
}

async function handleNotifClick(n: any) {
  const convId = n.primary_actor?.id
  if (convId) await router.push(`/conversations/${convId}`)
}

async function markAllRead() {
  if (!currentAccountId.value) return
  await api.notifications.readAll(currentAccountId.value)
  notifications.value = notifications.value.map(n => ({ ...n, read_at: new Date().toISOString() }))
}

onMounted(async () => {
  if (!currentAccountId.value) return
  const res = await api.notifications.list(currentAccountId.value) as any
  notifications.value = res?.data ?? []
})

defineExpose({ unreadCount })
</script>

<style scoped>
.notif-panel { width: 360px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; overflow: hidden; }

.notif-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #f1f5f9; }
.notif-header h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }

.btn-mark-all { border: none; background: none; color: #0ea5e9; font-size: 13px; cursor: pointer; font-weight: 500; }

.notif-list { max-height: 420px; overflow-y: auto; }

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #f9fafb;
  cursor: pointer;
  transition: background 0.1s;
}

.notif-item:hover { background: #f8fafc; }
.notif-item--unread { background: #f0f9ff; }
.notif-item--unread:hover { background: #e0f2fe; }

.notif-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #0ea5e9; flex-shrink: 0; margin-top: 6px;
}

.notif-content { flex: 1; }
.notif-text { font-size: 13px; color: #0f172a; margin: 0 0 4px; line-height: 1.4; }
.notif-time { font-size: 11px; color: #94a3b8; }

.notif-empty { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #94a3b8; gap: 8px; }
.notif-empty span { font-size: 36px; }
.notif-empty p { margin: 0; font-size: 13px; }
</style>
