<!-- kchat-web/apps/cms/src/views/contacts/ContactDetailView.vue -->
<!-- P4-01 follow-up: Contact detail với thông tin đầy đủ, notes và hội thoại -->
<template>
  <div class="contact-detail-page" v-if="contact">
    <div class="page-header">
      <RouterLink to="/contacts" class="back-btn">← Contacts</RouterLink>
      <div class="header-actions">
        <button class="btn-secondary" @click="showEdit = true">✏️ Sửa</button>
        <button class="btn-danger-sm" @click="deleteContact">🗑 Xóa</button>
      </div>
    </div>

    <div class="detail-layout">
      <!-- Left: Contact info -->
      <aside class="contact-sidebar">
        <div class="contact-hero">
          <div class="big-avatar" :style="avatarBg">{{ contact.name?.charAt(0)?.toUpperCase() }}</div>
          <h2 class="contact-name">{{ contact.name }}</h2>
          <p v-if="contact.email" class="contact-meta">✉️ {{ contact.email }}</p>
          <p v-if="contact.phone_number" class="contact-meta">📱 {{ contact.phone_number }}</p>
          <p v-if="contact.location" class="contact-meta">📍 {{ contact.location }}</p>
        </div>

        <!-- Additional attributes -->
        <div class="attr-section" v-if="contact.additional_attributes && Object.keys(contact.additional_attributes).length">
          <h4 class="attr-title">Thông tin bổ sung</h4>
          <div v-for="(val, key) in contact.additional_attributes" :key="key" class="attr-row">
            <span class="attr-key">{{ key }}</span>
            <span class="attr-val">{{ val }}</span>
          </div>
        </div>

        <!-- Labels -->
        <div class="attr-section" v-if="contact.labels?.length">
          <h4 class="attr-title">Labels</h4>
          <div class="contact-labels">
            <span v-for="label in contact.labels" :key="label" class="label-chip">{{ label }}</span>
          </div>
        </div>
      </aside>

      <!-- Right: Conversations + Notes tabs -->
      <div class="contact-main">
        <div class="tab-bar">
          <button :class="['tab', { 'tab--active': activeTab === 'conversations' }]" @click="activeTab = 'conversations'">
            Hội thoại ({{ conversations.length }})
          </button>
          <button :class="['tab', { 'tab--active': activeTab === 'notes' }]" @click="activeTab = 'notes'">
            Ghi chú ({{ notes.length }})
          </button>
        </div>

        <!-- Conversations tab -->
        <div v-if="activeTab === 'conversations'" class="tab-content">
          <RouterLink
            v-for="conv in conversations"
            :key="conv.id"
            :to="`/conversations/${conv.id}`"
            class="conv-row"
          >
            <span class="conv-id">#{{ conv.id }}</span>
            <span class="conv-inbox">{{ conv.inbox_id }}</span>
            <span :class="['conv-status', `conv-status--${conv.status}`]">{{ conv.status }}</span>
            <span class="conv-date">{{ formatTime(conv.created_at) }}</span>
          </RouterLink>
          <div v-if="!conversations.length" class="empty">Chưa có hội thoại</div>
        </div>

        <!-- Notes tab -->
        <div v-if="activeTab === 'notes'" class="tab-content">
          <!-- Add note -->
          <div class="note-composer">
            <textarea v-model="newNote" class="note-textarea" placeholder="Ghi chú về contact này..." rows="3" />
            <button class="btn-primary-sm" :disabled="!newNote.trim()" @click="addNote">Lưu ghi chú</button>
          </div>

          <div v-for="note in notes" :key="note.id" class="note-item">
            <p class="note-text">{{ note.content }}</p>
            <div class="note-meta">
              <span>{{ note.user?.name }}</span>
              <span>{{ formatTime(note.created_at) }}</span>
            </div>
          </div>

          <div v-if="!notes.length" class="empty">Chưa có ghi chú nào</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const props = defineProps<{ contactId: string }>()
const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)
const router = useRouter()

const contact = ref<any>(null)
const conversations = ref<any[]>([])
const notes = ref<any[]>([])
const newNote = ref('')
const activeTab = ref<'conversations' | 'notes'>('conversations')
const showEdit = ref(false)

const COLORS = ['#38bdf8','#818cf8','#34d399','#f472b6','#fb923c']
const avatarBg = computed(() => {
  const bg = COLORS[(contact.value?.name?.charCodeAt(0) ?? 0) % COLORS.length]
  return { background: `linear-gradient(135deg, ${bg}, #818cf8)` }
})

function formatTime(ts: string) {
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: vi })
}

async function addNote() {
  if (!currentAccountId.value || !newNote.value.trim()) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/contacts/${props.contactId}/notes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: newNote.value })
  })
  notes.value.unshift(await res.json())
  newNote.value = ''
}

async function deleteContact() {
  if (!currentAccountId.value || !confirm('Xóa contact này?')) return
  await fetch(`/api/v1/accounts/${currentAccountId.value}/contacts/${props.contactId}`, { method: 'DELETE' })
  router.push('/contacts')
}

onMounted(async () => {
  if (!currentAccountId.value) return
  const id = Number(props.contactId)
  const [contactRes, convsRes, notesRes] = await Promise.all([
    api.contacts.get(currentAccountId.value, id) as any,
    api.contacts.conversations(currentAccountId.value, id) as any,
    fetch(`/api/v1/accounts/${currentAccountId.value}/contacts/${id}/notes`).then(r => r.json()) as any,
  ])
  contact.value = contactRes
  conversations.value = convsRes?.payload ?? []
  notes.value = notesRes?.payload ?? []
})
</script>

<style scoped>
.contact-detail-page { height: 100%; display: flex; flex-direction: column; background: #f8fafc; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; background: white; border-bottom: 1px solid #e2e8f0;
}

.back-btn { color: #64748b; text-decoration: none; font-size: 14px; }
.back-btn:hover { color: #0ea5e9; }
.header-actions { display: flex; gap: 8px; }

.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
.btn-danger-sm { background: #fee2e2; color: #b91c1c; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }

.detail-layout { flex: 1; display: flex; overflow: hidden; }

.contact-sidebar {
  width: 280px; flex-shrink: 0;
  background: white; border-right: 1px solid #e2e8f0;
  overflow-y: auto; padding: 24px;
}

.contact-hero { text-align: center; margin-bottom: 24px; }
.big-avatar { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 28px; margin: 0 auto 12px; }
.contact-name { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
.contact-meta { font-size: 13px; color: #64748b; margin: 0 0 4px; }

.attr-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.attr-title { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px; }
.attr-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.attr-key { color: #94a3b8; }
.attr-val { color: #374151; font-weight: 500; }

.contact-labels { display: flex; flex-wrap: wrap; gap: 6px; }
.label-chip { background: #eff6ff; color: #2563eb; font-size: 11px; padding: 3px 9px; border-radius: 9999px; }

.contact-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.tab-bar { display: flex; border-bottom: 1px solid #e2e8f0; background: white; }
.tab { padding: 12px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab--active { color: #0ea5e9; border-bottom-color: #0ea5e9; }

.tab-content { flex: 1; overflow-y: auto; padding: 16px 24px; }

.conv-row { display: flex; align-items: center; gap: 14px; padding: 12px; background: white; border-radius: 10px; margin-bottom: 8px; text-decoration: none; color: inherit; border: 1px solid #f1f5f9; transition: box-shadow 0.15s; }
.conv-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.conv-id { font-family: monospace; font-size: 13px; color: #94a3b8; }
.conv-inbox { font-size: 13px; color: #64748b; flex: 1; }
.conv-status { font-size: 11px; padding: 3px 9px; border-radius: 9999px; }
.conv-status--open { background: #dcfce7; color: #15803d; }
.conv-status--resolved { background: #f1f5f9; color: #94a3b8; }
.conv-date { font-size: 12px; color: #94a3b8; }

.note-composer { margin-bottom: 16px; }
.note-textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 14px; resize: none; outline: none; }
.note-textarea:focus { border-color: #0ea5e9; }
.btn-primary-sm { margin-top: 8px; background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.btn-primary-sm:disabled { opacity: 0.5; }

.note-item { background: white; border-radius: 10px; padding: 14px; margin-bottom: 10px; border: 1px solid #f1f5f9; }
.note-text { font-size: 14px; color: #374151; margin: 0 0 8px; line-height: 1.5; white-space: pre-wrap; }
.note-meta { display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }

.empty { text-align: center; color: #94a3b8; padding: 32px; font-size: 14px; }
</style>
