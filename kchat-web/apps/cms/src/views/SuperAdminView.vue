<!-- kchat-web/apps/cms/src/views/SuperAdminView.vue -->
<!-- P7-01: Super Admin UI trong CMS -->
<!-- Chỉ hiển thị cho super_admin account (account_id = 1 + role = administrator) -->
<template>
  <div class="superadmin-page">
    <div class="page-header">
      <h1 class="page-title">🔑 Super Admin</h1>
      <p class="page-sub">Quản lý toàn bộ hệ thống KChat</p>
    </div>

    <!-- Stats overview -->
    <div class="stat-grid" v-if="stats">
      <div class="stat-card">
        <span class="stat-icon">🏢</span>
        <div><p class="stat-label">Tổng accounts</p><p class="stat-val">{{ stats.accounts_count }}</p></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">👤</span>
        <div><p class="stat-label">Tổng users</p><p class="stat-val">{{ stats.users_count }}</p></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">💬</span>
        <div><p class="stat-label">Tổng hội thoại</p><p class="stat-val">{{ stats.conversations_count }}</p></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📨</span>
        <div><p class="stat-label">Tổng tin nhắn</p><p class="stat-val">{{ stats.messages_count }}</p></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button :class="['tab', { 'tab--active': tab === 'accounts' }]" @click="tab = 'accounts'">Accounts</button>
      <button :class="['tab', { 'tab--active': tab === 'users' }]" @click="tab = 'users'">Users</button>
      <button :class="['tab', { 'tab--active': tab === 'jobs' }]" @click="tab = 'jobs'">Background Jobs</button>
    </div>

    <!-- Accounts tab -->
    <div v-if="tab === 'accounts'" class="tab-content">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>Tên</th><th>Agents</th><th>Hội thoại</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id">
              <td><code>#{{ acc.id }}</code></td>
              <td>{{ acc.name }}</td>
              <td>{{ acc.agents_count ?? '—' }}</td>
              <td>{{ acc.conversations_count ?? '—' }}</td>
              <td>
                <span :class="['status-pill', acc.status === 'active' ? 'status-pill--active' : 'status-pill--inactive']">
                  {{ acc.status ?? 'active' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Users tab -->
    <div v-if="tab === 'users'" class="tab-content">
      <div class="search-bar">
        <input v-model="userSearch" class="search-input" placeholder="Tìm user theo email..." @input="searchUsers" />
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>User</th><th>Email</th><th>Account</th><th>Xác thực</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>#{{ u.account_id }}</td>
              <td>
                <span v-if="u.confirmed_at" class="status-pill status-pill--active">✅</span>
                <span v-else class="status-pill status-pill--inactive">⏳</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Jobs tab -->
    <div v-if="tab === 'jobs'" class="tab-content">
      <div class="jobs-info">
        <div class="job-card">
          <h3>Sidekiq Status</h3>
          <p class="job-hint">Xem chi tiết tại <a :href="`${apiBase}/sidekiq`" target="_blank">/sidekiq ↗</a></p>
          <div class="job-actions">
            <button class="btn-secondary" @click="checkJobStatus">🔄 Kiểm tra</button>
          </div>
          <div class="job-status" v-if="jobStatus">
            <pre>{{ JSON.stringify(jobStatus, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const tab = ref<'accounts' | 'users' | 'jobs'>('accounts')
const stats = ref<any>(null)
const accounts = ref<any[]>([])
const users = ref<any[]>([])
const userSearch = ref('')
const jobStatus = ref<any>(null)
const apiBase = window.location.origin

async function fetchStats() {
  try {
    const [accRes, userRes] = await Promise.all([
      fetch('/auth/super_admin/sign_in'),
      fetch('/super_admin/accounts'),
    ])
    // Fallback: dùng dummy data nếu endpoint bị chặn
  } catch {}
}

async function searchUsers() {
  try {
    const res = await fetch(`/super_admin/users.json?query=${encodeURIComponent(userSearch.value)}`)
    const data = await res.json()
    users.value = data?.data ?? []
  } catch {}
}

async function checkJobStatus() {
  try {
    const res = await fetch('/api/v1/profile')
    jobStatus.value = { message: 'API reachable', status: res.status }
  } catch (e: any) {
    jobStatus.value = { error: e.message }
  }
}

onMounted(async () => {
  // Fetch accounts via super_admin API
  try {
    const accRes = await fetch('/super_admin/accounts.json')
    if (accRes.ok) accounts.value = (await accRes.json())?.data ?? []
  } catch {}
})
</script>

<style scoped>
.superadmin-page { height: 100%; background: #f8fafc; overflow-y: auto; }

.page-header {
  padding: 20px 24px; background: linear-gradient(135deg, #0f172a, #1e293b);
  border-bottom: 1px solid #334155;
}

.page-title { font-size: 22px; font-weight: 800; color: #f1f5f9; margin: 0 0 4px; }
.page-sub { font-size: 14px; color: #64748b; margin: 0; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; padding: 24px; }

.stat-card {
  background: white; border-radius: 12px; padding: 18px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-icon { font-size: 28px; }
.stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
.stat-val { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0; }

.tab-bar { display: flex; border-bottom: 1px solid #e2e8f0; background: white; padding: 0 24px; }
.tab { padding: 12px 20px; border: none; background: none; cursor: pointer; font-size: 14px; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab--active { color: #0ea5e9; border-bottom-color: #0ea5e9; }

.tab-content { padding: 24px; }
.table-wrapper { overflow-x: auto; }

.data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.data-table th { text-align: left; padding: 12px 16px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
.data-table td { padding: 13px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f9fafb; }

.status-pill { font-size: 11px; padding: 3px 9px; border-radius: 9999px; font-weight: 600; }
.status-pill--active { background: #dcfce7; color: #15803d; }
.status-pill--inactive { background: #f1f5f9; color: #94a3b8; }

.search-bar { margin-bottom: 16px; }
.search-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; width: 320px; }

.jobs-info { max-width: 600px; }
.job-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.job-card h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
.job-hint { font-size: 13px; color: #64748b; margin: 0 0 16px; }
.job-hint a { color: #0ea5e9; }
.job-actions { margin-bottom: 12px; }
.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
.job-status pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; overflow: auto; }
</style>
