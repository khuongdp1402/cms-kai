<!-- kchat-web/apps/cms/src/views/GlobalSearch.vue -->
<!-- P3-08: Global search — conversations + contacts + messages -->
<template>
  <KModal :model-value="open" size="lg" @update:model-value="$emit('close')">
    <div class="gsearch">
      <div class="gsearch-input-wrap">
        <span class="gsearch-icon">🔍</span>
        <input
          ref="inputRef"
          v-model="query"
          class="gsearch-input"
          placeholder="Tìm kiếm hội thoại, contact..."
          @input="debouncedSearch"
        />
        <kbd class="gsearch-esc" @click="$emit('close')">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="gsearch-results" v-if="query">
        <!-- Conversations -->
        <section v-if="convResults.length">
          <p class="gsearch-section-title">💬 Hội thoại</p>
          <RouterLink
            v-for="c in convResults"
            :key="`conv-${c.id}`"
            :to="`/conversations/${c.id}`"
            class="gsearch-item"
            @click="$emit('close')"
          >
            <span class="gsearch-item-id">#{{ c.id }}</span>
            <span class="gsearch-item-name">{{ c.meta?.sender?.name }}</span>
            <KBadge :variant="c.status === 'open' ? 'success' : 'default'" size="sm">{{ c.status }}</KBadge>
          </RouterLink>
        </section>

        <!-- Contacts -->
        <section v-if="contactResults.length">
          <p class="gsearch-section-title">👥 Contacts</p>
          <RouterLink
            v-for="c in contactResults"
            :key="`contact-${c.id}`"
            :to="`/contacts/${c.id}`"
            class="gsearch-item"
            @click="$emit('close')"
          >
            <span class="gsearch-item-name">{{ c.name }}</span>
            <span class="gsearch-item-email">{{ c.email }}</span>
          </RouterLink>
        </section>

        <!-- Empty -->
        <div v-if="!convResults.length && !contactResults.length && !loading" class="gsearch-empty">
          Không tìm thấy kết quả cho "<strong>{{ query }}</strong>"
        </div>

        <div v-if="loading" class="gsearch-empty">Đang tìm kiếm...</div>
      </div>

      <div v-else class="gsearch-hint">
        <p>Gõ để tìm kiếm hoặc dùng các phím tắt:</p>
        <div class="gsearch-shortcuts">
          <span><kbd>↑</kbd><kbd>↓</kbd> Di chuyển</span>
          <span><kbd>↵</kbd> Chọn</span>
          <span><kbd>ESC</kbd> Đóng</span>
        </div>
      </div>
    </div>
  </KModal>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'
import KModal from '../../../packages/ui/src/components/KModal.vue'
import KBadge from '../../../packages/ui/src/components/KBadge.vue'

const props = defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const query = ref('')
const convResults = ref<any[]>([])
const contactResults = ref<any[]>([])
const loading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.open, (val) => {
  if (val) nextTick(() => inputRef.value?.focus())
  else { query.value = ''; convResults.value = []; contactResults.value = [] }
})

let searchTimer: ReturnType<typeof setTimeout>
function debouncedSearch() {
  clearTimeout(searchTimer)
  if (!query.value.trim()) { convResults.value = []; contactResults.value = []; return }
  searchTimer = setTimeout(doSearch, 300)
}

async function doSearch() {
  if (!currentAccountId.value || !query.value.trim()) return
  loading.value = true
  try {
    const [convRes, contactRes] = await Promise.all([
      api.conversations.list(currentAccountId.value, { q: query.value, page: 1 }) as any,
      api.contacts.search(currentAccountId.value, query.value) as any,
    ])
    convResults.value = (convRes?.data?.payload ?? []).slice(0, 5)
    contactResults.value = (contactRes?.payload ?? []).slice(0, 5)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.gsearch { min-height: 240px; }

.gsearch-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 16px;
  border-bottom: 1px solid #f1f5f9;
}

.gsearch-icon { font-size: 18px; color: #94a3b8; }

.gsearch-input {
  flex: 1; border: none; outline: none;
  font-size: 16px; color: #0f172a;
}

.gsearch-input::placeholder { color: #94a3b8; }

.gsearch-esc {
  border: 1px solid #e2e8f0; border-radius: 6px;
  padding: 3px 8px; font-size: 12px; color: #94a3b8;
  cursor: pointer; font-family: inherit;
}

.gsearch-results { margin-top: 12px; max-height: 360px; overflow-y: auto; }

.gsearch-section-title {
  font-size: 11px; font-weight: 600; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.05em;
  margin: 12px 0 6px; padding: 0;
}

.gsearch-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 8px; border-radius: 8px;
  text-decoration: none; color: inherit;
  transition: background 0.1s;
}

.gsearch-item:hover { background: #f8fafc; }

.gsearch-item-id { font-size: 12px; color: #94a3b8; font-family: monospace; }
.gsearch-item-name { font-size: 14px; color: #0f172a; font-weight: 500; flex: 1; }
.gsearch-item-email { font-size: 13px; color: #64748b; }

.gsearch-empty { text-align: center; padding: 32px; color: #94a3b8; font-size: 14px; }

.gsearch-hint { padding: 24px 0; color: #94a3b8; }
.gsearch-hint p { font-size: 13px; margin: 0 0 12px; }

.gsearch-shortcuts { display: flex; gap: 20px; font-size: 12px; }
.gsearch-shortcuts span { display: flex; align-items: center; gap: 4px; }

kbd {
  background: #f1f5f9; border: 1px solid #e2e8f0;
  border-radius: 4px; padding: 2px 6px;
  font-size: 11px; font-family: inherit;
}
</style>
