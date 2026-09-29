<!-- kchat-web/apps/cms/src/views/settings/AutomationsView.vue -->
<!-- P4-05: Automation rules builder (read-only + trigger list) -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Tự động hóa</h1>
        <p class="page-subtitle">Cài đặt quy tắc tự động xử lý hội thoại</p>
      </div>
      <button class="btn-primary" @click="showCreate = true">+ Tạo quy tắc</button>
    </div>

    <div class="automations-list" v-if="automations.length">
      <div v-for="a in automations" :key="a.id" class="automation-card">
        <div class="auto-header">
          <h3 class="auto-name">{{ a.name }}</h3>
          <div class="auto-controls">
            <label class="toggle-switch" :title="a.active ? 'Tắt' : 'Bật'">
              <input type="checkbox" :checked="a.active" @change="toggleAutomation(a)" />
              <span class="toggle-slider" />
            </label>
            <button class="btn-icon-del" @click="deleteAutomation(a.id)">🗑</button>
          </div>
        </div>

        <div class="auto-meta">
          <span class="trigger-badge">⚡ {{ formatEvent(a.event_name) }}</span>
        </div>

        <div class="auto-conditions" v-if="a.conditions?.length">
          <p class="auto-sub">Điều kiện:</p>
          <div v-for="(cond, i) in a.conditions" :key="i" class="condition-chip">
            {{ cond.attribute_key }} {{ cond.filter_operator }} {{ cond.value }}
          </div>
        </div>

        <div class="auto-actions-list" v-if="a.actions?.length">
          <p class="auto-sub">Hành động:</p>
          <div v-for="(act, i) in a.actions" :key="i" class="action-chip">
            {{ formatAction(act.action_name) }}
            <span v-if="act.action_params?.length"> → {{ act.action_params.join(', ') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <span class="empty-icon">⚡</span>
      <p>Chưa có quy tắc tự động hóa nào</p>
      <p class="empty-sub">Tạo quy tắc để tự động gán agent, gắn label hoặc gửi reply khi hội thoại mới đến</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const automations = ref<any[]>([])
const showCreate = ref(false)

const EVENT_LABELS: Record<string, string> = {
  conversation_created: 'Hội thoại mới',
  conversation_updated: 'Hội thoại cập nhật',
  message_created: 'Tin nhắn mới',
  conversation_opened: 'Hội thoại mở lại',
}

const ACTION_LABELS: Record<string, string> = {
  assign_team: 'Gán team',
  assign_agent: 'Gán agent',
  add_label: 'Gắn label',
  remove_label: 'Xóa label',
  send_message: 'Gửi tin nhắn',
  send_email_transcript: 'Gửi email transcript',
  mute_conversation: 'Tắt thông báo hội thoại',
  snooze_conversation: 'Hoãn hội thoại',
}

function formatEvent(event: string) { return EVENT_LABELS[event] ?? event }
function formatAction(action: string) { return ACTION_LABELS[action] ?? action }

async function toggleAutomation(a: any) {
  if (!currentAccountId.value) return
  await fetch(`/api/v1/accounts/${currentAccountId.value}/automation_rules/${a.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: !a.active })
  })
  a.active = !a.active
}

async function deleteAutomation(id: number) {
  if (!currentAccountId.value || !confirm('Xóa quy tắc này?')) return
  await fetch(`/api/v1/accounts/${currentAccountId.value}/automation_rules/${id}`, { method: 'DELETE' })
  automations.value = automations.value.filter(a => a.id !== id)
}

onMounted(async () => {
  if (!currentAccountId.value) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/automation_rules`)
  const data = await res.json()
  automations.value = data?.payload ?? []
})
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.btn-primary { background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }

.automations-list { padding: 24px; display: flex; flex-direction: column; gap: 14px; }

.automation-card { background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; }
.auto-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.auto-name { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
.auto-controls { display: flex; align-items: center; gap: 10px; }
.auto-meta { margin-bottom: 10px; }
.trigger-badge { background: #eff6ff; color: #1d4ed8; font-size: 12px; padding: 4px 10px; border-radius: 6px; font-weight: 500; }
.auto-sub { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 8px 0 4px; }
.condition-chip, .action-chip { display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; padding: 3px 10px; border-radius: 6px; margin: 3px 4px 3px 0; color: #374151; }
.action-chip { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.btn-icon-del { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; border-radius: 4px; }
.btn-icon-del:hover { background: #fee2e2; }

/* Toggle switch */
.toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; inset: 0; background: #e2e8f0; border-radius: 11px; transition: 0.2s; }
.toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
.toggle-switch input:checked + .toggle-slider { background: #22c55e; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 80px 24px; color: #94a3b8; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { margin: 0 0 4px; font-size: 15px; font-weight: 500; color: #64748b; }
.empty-sub { font-size: 13px; color: #94a3b8; text-align: center; max-width: 360px; }
</style>
