<!-- kchat-web/apps/cms/src/components/layout/AppLayout.vue -->
<!-- KChat App Shell — P2-05 -->
<!-- Sidebar + CommandPalette + RouterView -->
<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-text">KChat</span>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <RouterLink to="/conversations" class="nav-item" active-class="nav-item--active">
          <span class="nav-icon">💬</span>
          <span class="nav-label">Hội thoại</span>
          <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
        </RouterLink>

        <RouterLink to="/contacts" class="nav-item" active-class="nav-item--active">
          <span class="nav-icon">👥</span>
          <span class="nav-label">Contacts</span>
        </RouterLink>

        <RouterLink v-if="isAdmin" to="/reports" class="nav-item" active-class="nav-item--active">
          <span class="nav-icon">📊</span>
          <span class="nav-label">Báo cáo</span>
        </RouterLink>

        <RouterLink v-if="isAdmin" to="/settings/inboxes" class="nav-item" active-class="nav-item--active">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Cài đặt</span>
        </RouterLink>
      </nav>

      <!-- User info + availability -->
      <div class="sidebar-user">
        <div class="user-avatar">
          {{ profile?.name?.charAt(0)?.toUpperCase() ?? '?' }}
        </div>
        <div class="user-info">
          <span class="user-name">{{ profile?.name }}</span>
          <select
            :value="profile?.availability_status"
            class="availability-select"
            @change="updateAvailability(($event.target as HTMLSelectElement).value as any)"
          >
            <option value="online">🟢 Online</option>
            <option value="busy">🟡 Bận</option>
            <option value="offline">⚫ Offline</option>
          </select>
        </div>
        <button class="logout-btn" title="Đăng xuất" @click="logout">↪</button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <!-- Global keyboard shortcut hint -->
      <div class="keyboard-hint" v-if="showCommandPalette">
        <span>⌘K — Command Palette</span>
      </div>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { profile, isAdmin } = storeToRefs(authStore)
const { logout, updateAvailability } = authStore

const unreadCount = ref(0) // TODO: kết nối với store hội thoại
const showCommandPalette = ref(false)

// ⌘K / Ctrl+K để mở Command Palette
function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  authStore.fetchProfile()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
  font-family: 'Inter', system-ui, sans-serif;
}

.sidebar {
  width: 240px;
  min-width: 240px;
  background: #1e293b;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.sidebar-logo {
  padding: 8px 20px 24px;
  border-bottom: 1px solid #334155;
  margin-bottom: 16px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
  position: relative;
}

.nav-item:hover { background: #334155; color: #f8fafc; }
.nav-item--active { background: #0f172a; color: #38bdf8; }

.badge {
  margin-left: auto;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.sidebar-user {
  padding: 12px 16px;
  border-top: 1px solid #334155;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }

.user-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.availability-select {
  font-size: 11px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
}

.logout-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}
.logout-btn:hover { color: #ef4444; }

.main-content {
  flex: 1;
  overflow: auto;
  position: relative;
}
</style>
