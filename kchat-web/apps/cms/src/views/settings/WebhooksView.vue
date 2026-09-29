<!-- kchat-web/apps/cms/src/views/settings/WebhooksView.vue -->
<!-- P4-06: Webhooks management -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Webhooks</h1>
        <p class="page-subtitle">Nhận HTTP callbacks khi có sự kiện trong KChat</p>
      </div>
      <button class="btn-primary" @click="showCreate = true">+ Tạo Webhook</button>
    </div>

    <div class="webhooks-list" v-if="webhooks.length">
      <div v-for="wh in webhooks" :key="wh.id" class="webhook-card">
        <div class="wh-url">
          <span class="wh-protocol">POST</span>
          <code>{{ wh.url }}</code>
        </div>
        <div class="wh-events">
          <span v-for="ev in wh.subscriptions" :key="ev" class="event-badge">{{ formatEvent(ev) }}</span>
        </div>
        <button class="btn-del" @click="deleteWebhook(wh.id)">🗑</button>
      </div>
    </div>
    <div v-else class="empty-state">
      <span>🔗</span>
      <p>Chưa có webhook nào</p>
    </div>

    <!-- Create Modal -->
    <KModal v-model="showCreate" title="Tạo Webhook mới" size="md">
      <form @submit.prevent="createWebhook">
        <div class="form-field">
          <label>URL nhận webhook</label>
          <input v-model="form.url" class="form-input" type="url" placeholder="https://your-server.com/webhook" required />
        </div>
        <div class="form-field">
          <label>Sự kiện đăng ký</label>
          <div class="events-grid">
            <label v-for="ev in EVENT_OPTIONS" :key="ev.value" class="event-checkbox">
              <input type="checkbox" :value="ev.value" v-model="form.subscriptions" />
              {{ ev.label }}
            </label>
          </div>
        </div>
        <template #footer>
          <button type="button" class="btn-secondary" @click="showCreate = false">Hủy</button>
          <button type="submit" class="btn-primary" :disabled="!form.url || !form.subscriptions.length">Tạo Webhook</button>
        </template>
      </form>
    </KModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'
import KModal from '../../../../../packages/ui/src/components/KModal.vue'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const webhooks = ref<any[]>([])
const showCreate = ref(false)
const form = ref({ url: '', subscriptions: [] as string[] })

const EVENT_OPTIONS = [
  { value: 'conversation_created', label: 'Hội thoại mới' },
  { value: 'conversation_status_changed', label: 'Trạng thái hội thoại thay đổi' },
  { value: 'conversation_updated', label: 'Hội thoại cập nhật' },
  { value: 'message_created', label: 'Tin nhắn mới' },
  { value: 'message_updated', label: 'Tin nhắn cập nhật' },
  { value: 'webwidget_triggered', label: 'Widget được kích hoạt' },
  { value: 'contact_created', label: 'Contact mới' },
  { value: 'contact_updated', label: 'Contact cập nhật' },
]

const EVENT_LABELS = Object.fromEntries(EVENT_OPTIONS.map(e => [e.value, e.label]))
function formatEvent(ev: string) { return EVENT_LABELS[ev] ?? ev }

async function createWebhook() {
  if (!currentAccountId.value) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/webhooks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value)
  })
  webhooks.value.unshift(await res.json())
  showCreate.value = false
  form.value = { url: '', subscriptions: [] }
}

async function deleteWebhook(id: number) {
  if (!currentAccountId.value || !confirm('Xóa webhook này?')) return
  await fetch(`/api/v1/accounts/${currentAccountId.value}/webhooks/${id}`, { method: 'DELETE' })
  webhooks.value = webhooks.value.filter(w => w.id !== id)
}

onMounted(async () => {
  if (!currentAccountId.value) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/webhooks`)
  const data = await res.json()
  webhooks.value = data?.payload ?? []
})
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.btn-primary { background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }

.webhooks-list { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
.webhook-card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.wh-url { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.wh-protocol { background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 4px; flex-shrink: 0; }
.wh-url code { font-size: 13px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wh-events { display: flex; flex-wrap: wrap; gap: 6px; }
.event-badge { font-size: 11px; padding: 3px 9px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9999px; color: #64748b; }
.btn-del { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 4px; flex-shrink: 0; }
.btn-del:hover { background: #fee2e2; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px; color: #94a3b8; font-size: 36px; gap: 8px; }
.empty-state p { font-size: 14px; margin: 0; }

.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-field label { font-size: 13px; font-weight: 500; color: #475569; }
.form-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; width: 100%; }
.form-input:focus { border-color: #0ea5e9; }

.events-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.event-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }

.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; }
</style>
