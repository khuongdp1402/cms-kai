<!-- kchat-web/apps/cms/src/views/contacts/ContactsView.vue -->
<!-- KChat Contacts — P4-01 -->
<template>
  <div class="contacts-page">
    <div class="page-header">
      <h1 class="page-title">Contacts</h1>
      <button class="btn-primary" @click="showCreateModal = true">+ Tạo contact</button>
    </div>

    <!-- Search + filter -->
    <div class="filter-bar">
      <input v-model="searchQuery" class="search-input" placeholder="Tìm theo tên, email, SĐT..." @input="debouncedSearch" />
    </div>

    <!-- Table -->
    <div class="contacts-table-wrapper">
      <table class="contacts-table" v-if="!loading && contacts.length">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Email</th>
            <th>Điện thoại</th>
            <th>Số hội thoại</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in contacts" :key="c.id">
            <td>
              <div class="contact-cell">
                <div class="mini-avatar">{{ c.name?.charAt(0)?.toUpperCase() }}</div>
                <RouterLink :to="`/contacts/${c.id}`" class="contact-link">{{ c.name }}</RouterLink>
              </div>
            </td>
            <td>{{ c.email ?? '—' }}</td>
            <td>{{ c.phone_number ?? '—' }}</td>
            <td>{{ c.conversations_count ?? 0 }}</td>
            <td>
              <RouterLink :to="`/contacts/${c.id}`" class="btn-view">Xem</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else-if="loading" class="loading-state">Đang tải...</div>
      <div v-else class="empty-state">
        <span>👥</span>
        <p>Không có contact nào</p>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page === 1" @click="page--">← Trước</button>
      <span>Trang {{ page }}/{{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="page++">Sau →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const contacts = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const totalCount = ref(0)
const searchQuery = ref('')
const showCreateModal = ref(false)
const PAGE_SIZE = 25

const totalPages = computed(() => Math.ceil(totalCount.value / PAGE_SIZE))

let searchTimer: ReturnType<typeof setTimeout>
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchContacts() }, 300)
}

async function fetchContacts() {
  if (!currentAccountId.value) return
  loading.value = true
  try {
    const params: Record<string, string | number> = { page: page.value }
    if (searchQuery.value) params.q = searchQuery.value

    const endpoint = searchQuery.value ? api.contacts.search : api.contacts.list
    const fn = searchQuery.value
      ? () => api.contacts.search(currentAccountId.value!, searchQuery.value)
      : () => api.contacts.list(currentAccountId.value!, params)

    const res = await fn() as any
    contacts.value = res?.payload ?? []
    totalCount.value = res?.meta?.count ?? contacts.value.length
  } finally {
    loading.value = false
  }
}

watch(page, fetchContacts)
onMounted(fetchContacts)
</script>

<style scoped>
.contacts-page { height: 100%; display: flex; flex-direction: column; background: #f8fafc; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }

.btn-primary {
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.filter-bar { padding: 12px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.search-input { width: 320px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }

.contacts-table-wrapper { flex: 1; overflow: auto; padding: 16px 24px; }

.contacts-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.contacts-table th { text-align: left; padding: 12px 16px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
.contacts-table td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f9fafb; }
.contacts-table tr:hover td { background: #f8fafc; }

.contact-cell { display: flex; align-items: center; gap: 10px; }
.mini-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 12px; flex-shrink: 0;
}

.contact-link { color: #0f172a; text-decoration: none; font-weight: 500; }
.contact-link:hover { color: #0ea5e9; }

.btn-view {
  color: #0ea5e9;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  padding: 4px 10px;
  border: 1px solid #bae6fd;
  border-radius: 6px;
}
.btn-view:hover { background: #f0f9ff; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #94a3b8; font-size: 36px; gap: 8px; }
.loading-state { padding: 24px; color: #94a3b8; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; background: white; border-top: 1px solid #e2e8f0; }
.pagination button { border: 1px solid #e2e8f0; background: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: 14px; color: #64748b; }
</style>
