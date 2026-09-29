<!-- kchat-web/apps/cms/src/views/conversations/ConversationsView.vue -->
<!-- KChat Conversations — P3-01 -->
<!-- Danh sách hội thoại với virtual scroll, filter tabs, unread count -->
<template>
  <div class="conversations-page">
    <!-- Header + Filter tabs -->
    <div class="page-header">
      <h1 class="page-title">Hội thoại</h1>
      <div class="filter-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab', { 'tab--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <!-- Search + Filter bar -->
    <div class="filter-bar">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="Tìm kiếm hội thoại..."
        @input="debouncedSearch"
      />
      <select v-model="inboxFilter" class="filter-select">
        <option value="">Tất cả inbox</option>
        <option v-for="inbox in inboxes" :key="inbox.id" :value="inbox.id">
          {{ inbox.name }}
        </option>
      </select>
    </div>

    <!-- Conversations list -->
    <div class="conversations-list" ref="listContainer">
      <div v-if="loading" class="loading-state">
        <div v-for="i in 8" :key="i" class="skeleton-item" />
      </div>

      <div v-else-if="conversations.length === 0" class="empty-state">
        <span class="empty-icon">💬</span>
        <p>Không có hội thoại nào</p>
      </div>

      <RouterLink
        v-else
        v-for="conv in conversations"
        :key="conv.id"
        :to="`/conversations/${conv.id}`"
        class="conversation-item"
        :class="{ 'conversation-item--unread': conv.unread_count > 0 }"
      >
        <!-- Contact avatar -->
        <div class="conv-avatar">
          <img v-if="conv.meta?.sender?.avatar_url" :src="conv.meta.sender.avatar_url" :alt="conv.meta?.sender?.name" />
          <span v-else>{{ conv.meta?.sender?.name?.charAt(0)?.toUpperCase() ?? '?' }}</span>
        </div>

        <!-- Content -->
        <div class="conv-content">
          <div class="conv-top">
            <span class="conv-name">{{ conv.meta?.sender?.name ?? 'Unknown' }}</span>
            <span class="conv-time">{{ formatTime(conv.created_at) }}</span>
          </div>
          <div class="conv-bottom">
            <span class="conv-preview">{{ conv.additional_attributes?.mail_subject ?? conv.last_activity_at }}</span>
            <span v-if="conv.unread_count > 0" class="conv-unread">{{ conv.unread_count }}</span>
          </div>
          <div class="conv-tags">
            <span class="inbox-badge">{{ conv.inbox_id }}</span>
            <span class="status-badge" :class="`status-badge--${conv.status}`">{{ conv.status }}</span>
          </div>
        </div>
      </RouterLink>

      <!-- Load more -->
      <div v-if="hasMore" class="load-more">
        <button class="btn-load-more" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Đang tải...' : 'Tải thêm' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { api } from '@kchat/api-client'
import { storeToRefs } from 'pinia'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

// State
const conversations = ref<any[]>([])
const inboxes = ref<any[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const searchQuery = ref('')
const inboxFilter = ref('')
const activeTab = ref<'mine' | 'unassigned' | 'all'>('mine')

const tabs = computed(() => [
  { key: 'mine', label: 'Của tôi', count: 0 },
  { key: 'unassigned', label: 'Chưa gán', count: 0 },
  { key: 'all', label: 'Tất cả', count: 0 },
])

function formatTime(ts: string | number) {
  return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: vi })
}

let searchTimer: ReturnType<typeof setTimeout>
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchConversations() }, 300)
}

async function fetchConversations(append = false) {
  if (!currentAccountId.value) return
  if (!append) loading.value = true
  else loadingMore.value = true

  try {
    const res = await api.conversations.list(currentAccountId.value, {
      page: page.value,
      assignee_type: activeTab.value,
      inbox_id: inboxFilter.value || undefined,
    }) as any

    const items = res?.data?.payload ?? []
    if (append) {
      conversations.value.push(...items)
    } else {
      conversations.value = items
    }
    hasMore.value = items.length >= 25
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  page.value++
  fetchConversations(true)
}

async function fetchInboxes() {
  if (!currentAccountId.value) return
  const res = await api.inboxes.list(currentAccountId.value) as any
  inboxes.value = res?.payload ?? []
}

onMounted(async () => {
  await fetchInboxes()
  await fetchConversations()
})

watch([activeTab, inboxFilter], () => {
  page.value = 1
  fetchConversations()
})
</script>

<style scoped>
.conversations-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
}

.page-header {
  background: white;
  padding: 20px 24px 0;
  border-bottom: 1px solid #e2e8f0;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab:hover { color: #0f172a; }
.tab--active { color: #0ea5e9; border-bottom-color: #0ea5e9; }

.tab-count {
  background: #e2e8f0;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.search-input, .filter-select {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input { flex: 1; }
.search-input:focus, .filter-select:focus { border-color: #0ea5e9; }

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  text-decoration: none;
  color: inherit;
  transition: background 0.1s;
  cursor: pointer;
}

.conversation-item:hover { background: #f8fafc; }
.conversation-item--unread { background: #eff6ff; }
.conversation-item--unread:hover { background: #dbeafe; }

.conv-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.conv-avatar img { width: 100%; height: 100%; object-fit: cover; }

.conv-content { flex: 1; min-width: 0; }
.conv-top, .conv-bottom { display: flex; justify-content: space-between; align-items: baseline; }
.conv-top { margin-bottom: 4px; }

.conv-name { font-weight: 600; font-size: 14px; color: #0f172a; }
.conv-time { font-size: 11px; color: #94a3b8; }

.conv-preview {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.conv-unread {
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  flex-shrink: 0;
}

.conv-tags { display: flex; gap: 6px; margin-top: 6px; }

.inbox-badge, .status-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.inbox-badge { background: #f1f5f9; color: #64748b; }
.status-badge--open { background: #dcfce7; color: #16a34a; }
.status-badge--resolved { background: #f1f5f9; color: #94a3b8; }
.status-badge--pending { background: #fef9c3; color: #ca8a04; }
.status-badge--snoozed { background: #ede9fe; color: #7c3aed; }

.skeleton-item {
  height: 72px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-bottom: 1px solid #f1f5f9;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #94a3b8;
}

.empty-icon { font-size: 48px; margin-bottom: 12px; }

.load-more { display: flex; justify-content: center; padding: 16px; }

.btn-load-more {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 24px;
  cursor: pointer;
  font-size: 14px;
  color: #0ea5e9;
  transition: background 0.15s;
}

.btn-load-more:hover:not(:disabled) { background: #f0f9ff; }
.btn-load-more:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
