<!-- kchat-web/apps/cms/src/views/conversations/ConversationDetailView.vue -->
<!-- KChat Conversation Detail — P3-02, P3-03, P3-04, P3-05 -->
<template>
  <div class="conversation-detail" v-if="conversation">
    <!-- Top bar -->
    <div class="conv-header">
      <RouterLink to="/conversations" class="back-btn">← Quay lại</RouterLink>
      <div class="conv-header-info">
        <h2 class="conv-title">{{ conversation.meta?.sender?.name ?? 'Hội thoại' }}</h2>
        <span class="conv-inbox">{{ conversation.inbox_id }}</span>
      </div>

      <!-- Actions -->
      <div class="conv-actions">
        <select v-model="selectedAssignee" class="assignee-select" @change="assignAgent">
          <option value="">Chưa gán</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
        </select>

        <button
          v-if="conversation.status !== 'resolved'"
          class="btn btn--resolve"
          @click="resolveConversation"
        >✓ Giải quyết</button>

        <button
          v-else
          class="btn btn--reopen"
          @click="reopenConversation"
        >↺ Mở lại</button>
      </div>
    </div>

    <!-- Main content: messages + sidebar -->
    <div class="conv-body">
      <!-- Messages -->
      <div class="messages-panel">
        <div class="messages-list" ref="messagesContainer">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-wrapper"
            :class="msg.message_type === 'outgoing' ? 'message-wrapper--outgoing' : 'message-wrapper--incoming'"
          >
            <!-- Private note badge -->
            <div v-if="msg.private" class="private-badge">🔒 Ghi chú nội bộ</div>

            <div class="message-bubble" :class="{
              'message-bubble--outgoing': msg.message_type === 'outgoing',
              'message-bubble--incoming': msg.message_type !== 'outgoing',
              'message-bubble--private': msg.private,
            }">
              <!-- Attachments -->
              <div v-if="msg.attachments?.length" class="attachments">
                <img
                  v-for="att in imageAttachments(msg)"
                  :key="att.id"
                  :src="att.data_url"
                  class="attachment-image"
                  @click="openImage(att.data_url)"
                />
                <a
                  v-for="att in fileAttachments(msg)"
                  :key="att.id"
                  :href="att.data_url"
                  target="_blank"
                  class="attachment-file"
                >
                  📎 {{ att.file_name ?? 'File đính kèm' }}
                </a>
              </div>

              <!-- Content -->
              <p class="message-content" v-if="msg.content">{{ msg.content }}</p>

              <span class="message-time">{{ formatTime(msg.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Composer P3-03 -->
        <div class="composer">
          <div class="composer-tabs">
            <button :class="['composer-tab', { active: !isPrivate }]" @click="isPrivate = false">Trả lời</button>
            <button :class="['composer-tab', { active: isPrivate }]" @click="isPrivate = true">Ghi chú</button>
          </div>

          <div class="composer-body" :class="{ 'composer-body--private': isPrivate }">
            <textarea
              v-model="newMessage"
              class="composer-textarea"
              :placeholder="isPrivate ? 'Ghi chú nội bộ (chỉ agent thấy)...' : 'Nhập tin nhắn...'"
              rows="3"
              @keydown.ctrl.enter="sendMessage"
            />
            <!-- File upload -->
            <input ref="fileInput" type="file" hidden multiple @change="handleFileSelect" />

            <div class="composer-footer">
              <button class="btn-icon" title="Đính kèm file" @click="fileInput?.click()">📎</button>
              <span v-if="selectedFiles.length" class="file-count">{{ selectedFiles.length }} file</span>
              <button
                class="btn-send"
                :disabled="!canSend || sending"
                @click="sendMessage"
              >
                {{ sending ? '...' : isPrivate ? '🔒 Lưu ghi chú' : 'Gửi ↵' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact sidebar P3-05 -->
      <aside class="contact-sidebar">
        <div class="sidebar-section">
          <h3 class="sidebar-title">Thông tin liên hệ</h3>
          <div class="contact-info" v-if="contact">
            <div class="contact-avatar">{{ contact.name?.charAt(0)?.toUpperCase() }}</div>
            <div>
              <p class="contact-name">{{ contact.name }}</p>
              <p class="contact-detail" v-if="contact.email">✉️ {{ contact.email }}</p>
              <p class="contact-detail" v-if="contact.phone_number">📱 {{ contact.phone_number }}</p>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <h3 class="sidebar-title">Labels</h3>
          <div class="labels-list">
            <span
              v-for="label in conversation.labels"
              :key="label"
              class="label-tag"
            >{{ label }}</span>
            <span v-if="!conversation.labels?.length" class="empty-labels">Chưa có label</span>
          </div>
        </div>

        <div class="sidebar-section">
          <h3 class="sidebar-title">Lịch sử hội thoại</h3>
          <div class="history-list">
            <RouterLink
              v-for="conv in contactHistory"
              :key="conv.id"
              :to="`/conversations/${conv.id}`"
              class="history-item"
            >
              <span class="history-id">#{{ conv.id }}</span>
              <span :class="`status-dot status-dot--${conv.status}`" />
            </RouterLink>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <div v-else class="loading-conversation">
    <div class="spinner" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { api } from '@kchat/api-client'
import { storeToRefs } from 'pinia'
import { useRealtime } from '../../composables/useRealtime'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const props = defineProps<{ conversationId: string }>()
const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const conversation = ref<any>(null)
const messages = ref<any[]>([])
const contact = ref<any>(null)
const contactHistory = ref<any[]>([])
const agents = ref<any[]>([])
const newMessage = ref('')
const isPrivate = ref(false)
const sending = ref(false)
const selectedFiles = ref<File[]>([])
const selectedAssignee = ref<number | ''>('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const canSend = computed(() => newMessage.value.trim() || selectedFiles.value.length > 0)

function formatTime(ts: string | number) {
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: vi })
}

function imageAttachments(msg: any) {
  return (msg.attachments ?? []).filter((a: any) => a.file_type === 'image')
}

function fileAttachments(msg: any) {
  return (msg.attachments ?? []).filter((a: any) => a.file_type !== 'image')
}

function openImage(url: string) {
  window.open(url, '_blank')
}

function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) selectedFiles.value = Array.from(files)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function fetchConversation() {
  if (!currentAccountId.value) return
  const res = await api.conversations.get(currentAccountId.value, Number(props.conversationId)) as any
  conversation.value = res
  selectedAssignee.value = res.meta?.assignee?.id ?? ''

  // Fetch contact info
  if (res.contact?.id) {
    const contactRes = await api.contacts.get(currentAccountId.value, res.contact.id) as any
    contact.value = contactRes
    const histRes = await api.contacts.conversations(currentAccountId.value, res.contact.id) as any
    contactHistory.value = (histRes?.payload ?? []).filter((c: any) => c.id !== res.id).slice(0, 5)
  }
}

async function fetchMessages() {
  if (!currentAccountId.value) return
  const res = await api.conversations.messages(currentAccountId.value, Number(props.conversationId)) as any
  messages.value = res?.payload ?? []
  scrollToBottom()
}

async function sendMessage() {
  if (!canSend.value || sending.value || !currentAccountId.value) return
  sending.value = true
  try {
    const res = await api.conversations.sendMessage(
      currentAccountId.value,
      Number(props.conversationId),
      newMessage.value,
      isPrivate.value
    )
    messages.value.push(res)
    newMessage.value = ''
    selectedFiles.value = []
    scrollToBottom()
  } finally {
    sending.value = false
  }
}

async function resolveConversation() {
  if (!currentAccountId.value) return
  await api.conversations.update(currentAccountId.value, Number(props.conversationId), { status: 'resolved' })
  if (conversation.value) conversation.value.status = 'resolved'
}

async function reopenConversation() {
  if (!currentAccountId.value) return
  await api.conversations.update(currentAccountId.value, Number(props.conversationId), { status: 'open' })
  if (conversation.value) conversation.value.status = 'open'
}

async function assignAgent() {
  if (!currentAccountId.value) return
  await api.conversations.update(currentAccountId.value, Number(props.conversationId), {
    assignee_id: selectedAssignee.value || null
  })
}

// Realtime: nhận message mới qua ActionCable
if (currentAccountId.value) {
  useRealtime(currentAccountId.value, {
    'message.created': (data: any) => {
      if (String(data?.conversation_id) === props.conversationId) {
        messages.value.push(data)
        scrollToBottom()
      }
    },
  })
}

onMounted(async () => {
  await fetchConversation()
  await fetchMessages()
  const agentsRes = await api.agents.list(currentAccountId.value!) as any
  agents.value = agentsRes?.payload ?? []
  await api.conversations.markRead(currentAccountId.value!, Number(props.conversationId))
})
</script>

<style scoped>
.conversation-detail { display: flex; flex-direction: column; height: 100%; }

.conv-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.back-btn { color: #64748b; text-decoration: none; font-size: 14px; }
.back-btn:hover { color: #0ea5e9; }

.conv-header-info { flex: 1; }
.conv-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
.conv-inbox { font-size: 12px; color: #94a3b8; }

.conv-actions { display: flex; gap: 8px; align-items: center; }

.assignee-select {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
  max-width: 160px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn--resolve { background: #22c55e; color: white; }
.btn--resolve:hover { background: #16a34a; }
.btn--reopen { background: #e2e8f0; color: #64748b; }
.btn--reopen:hover { background: #cbd5e1; }

.conv-body { display: flex; flex: 1; overflow: hidden; }

.messages-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
}

.message-wrapper { display: flex; flex-direction: column; }
.message-wrapper--outgoing { align-items: flex-end; }
.message-wrapper--incoming { align-items: flex-start; }

.private-badge { font-size: 11px; color: #7c3aed; margin-bottom: 4px; }

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  position: relative;
}

.message-bubble--incoming { background: white; border: 1px solid #e2e8f0; }
.message-bubble--outgoing { background: #0ea5e9; color: white; }
.message-bubble--private { background: #ede9fe; border: 1px solid #c4b5fd; color: #5b21b6; }

.message-content { margin: 0 0 4px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.message-time { font-size: 11px; opacity: 0.6; display: block; text-align: right; }

.attachments { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.attachment-image { max-width: 200px; border-radius: 8px; cursor: pointer; }
.attachment-file { color: #0ea5e9; font-size: 13px; text-decoration: none; display: flex; align-items: center; gap: 4px; }

/* Composer */
.composer {
  border-top: 1px solid #e2e8f0;
  background: white;
  flex-shrink: 0;
}

.composer-tabs { display: flex; border-bottom: 1px solid #f1f5f9; }

.composer-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #94a3b8;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.composer-tab.active { color: #0ea5e9; border-bottom-color: #0ea5e9; }

.composer-body { padding: 12px; }
.composer-body--private { background: #fdf4ff; }

.composer-textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.composer-textarea:focus { border-color: #0ea5e9; }

.composer-footer { display: flex; align-items: center; gap: 8px; margin-top: 8px; }

.btn-icon {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 16px;
}

.file-count { font-size: 12px; color: #64748b; }

.btn-send {
  margin-left: auto;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

/* Contact sidebar */
.contact-sidebar {
  width: 280px;
  border-left: 1px solid #e2e8f0;
  background: white;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-section { padding: 16px; border-bottom: 1px solid #f1f5f9; }
.sidebar-title { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }

.contact-info { display: flex; gap: 10px; align-items: flex-start; }
.contact-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; color: white; flex-shrink: 0;
}

.contact-name { font-weight: 600; font-size: 14px; margin: 0 0 4px; }
.contact-detail { font-size: 12px; color: #64748b; margin: 2px 0; }

.labels-list { display: flex; flex-wrap: wrap; gap: 6px; }
.label-tag { background: #eff6ff; color: #2563eb; font-size: 12px; padding: 3px 10px; border-radius: 12px; }
.empty-labels { font-size: 12px; color: #94a3b8; }

.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item { display: flex; align-items: center; gap: 8px; text-decoration: none; font-size: 13px; color: #64748b; }
.history-item:hover { color: #0ea5e9; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot--open { background: #22c55e; }
.status-dot--resolved { background: #94a3b8; }
.status-dot--pending { background: #f59e0b; }

.loading-conversation { display: flex; align-items: center; justify-content: center; height: 100%; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0ea5e9; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
