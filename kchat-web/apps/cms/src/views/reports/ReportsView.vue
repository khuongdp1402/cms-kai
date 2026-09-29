<!-- kchat-web/apps/cms/src/views/reports/ReportsView.vue -->
<!-- KChat Reports — P5-01 -->
<template>
  <div class="reports-page">
    <div class="page-header">
      <h1 class="page-title">Báo cáo</h1>
      <div class="date-range-picker">
        <select v-model="period" @change="fetchData">
          <option value="7">7 ngày qua</option>
          <option value="30">30 ngày qua</option>
          <option value="90">90 ngày qua</option>
        </select>
      </div>
    </div>

    <!-- Overview cards -->
    <div class="overview-grid" v-if="overview">
      <div class="stat-card">
        <span class="stat-icon">💬</span>
        <div>
          <p class="stat-label">Hội thoại mới</p>
          <p class="stat-value">{{ overview.open ?? 0 }}</p>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div>
          <p class="stat-label">Đã giải quyết</p>
          <p class="stat-value">{{ overview.resolved ?? 0 }}</p>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⏱️</span>
        <div>
          <p class="stat-label">Thời gian phản hồi TB</p>
          <p class="stat-value">{{ formatMinutes(overview.avg_first_response_time) }}</p>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div>
          <p class="stat-label">Agents online</p>
          <p class="stat-value">{{ overview.agents_online ?? 0 }}</p>
        </div>
      </div>
    </div>

    <div v-else class="loading-state">Đang tải báo cáo...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const overview = ref<any>(null)
const period = ref('30')

function formatMinutes(seconds: number) {
  if (!seconds) return '—'
  const min = Math.round(seconds / 60)
  return min < 60 ? `${min} phút` : `${Math.round(min / 60)} giờ`
}

async function fetchData() {
  if (!currentAccountId.value) return
  try {
    const res = await api.reports.overview(currentAccountId.value) as any
    overview.value = res?.data ?? res
  } catch (e) {
    console.error('Reports fetch error:', e)
  }
}

onMounted(fetchData)
</script>

<style scoped>
.reports-page { height: 100%; background: #f8fafc; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }

.date-range-picker select {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #f1f5f9;
  transition: box-shadow 0.2s;
}

.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.stat-icon { font-size: 32px; }

.stat-label { font-size: 12px; color: #94a3b8; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0; }

.loading-state { padding: 48px 24px; text-align: center; color: #94a3b8; }
</style>
