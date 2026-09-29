<!-- kchat-web/apps/cms/src/views/settings/TeamsView.vue -->
<!-- P4-03: Teams management -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Teams</h1>
        <p class="page-subtitle">Nhóm agents để phân luồng hội thoại</p>
      </div>
      <button class="btn-primary" @click="showCreate = true">+ Tạo Team</button>
    </div>

    <div class="list-wrapper">
      <div v-for="team in teams" :key="team.id" class="team-card">
        <div class="team-icon">👥</div>
        <div class="team-info">
          <h3 class="team-name">{{ team.name }}</h3>
          <p class="team-desc">{{ team.description ?? 'Không có mô tả' }}</p>
        </div>
        <div class="team-meta">
          <span class="team-members">{{ team.agents_count ?? 0 }} agents</span>
        </div>
      </div>
      <div v-if="!teams.length" class="empty-state">Chưa có team nào</div>
    </div>

    <KModal v-model="showCreate" title="Tạo Team mới" size="sm">
      <form @submit.prevent="createTeam">
        <div class="form-field">
          <label>Tên team</label>
          <input v-model="form.name" class="form-input" placeholder="vd: Support Team" required />
        </div>
        <div class="form-field">
          <label>Mô tả</label>
          <input v-model="form.description" class="form-input" placeholder="Mô tả team..." />
        </div>
        <template #footer>
          <button type="button" class="btn-secondary" @click="showCreate = false">Hủy</button>
          <button type="submit" class="btn-primary">Tạo</button>
        </template>
      </form>
    </KModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'
import KModal from '../../../../../packages/ui/src/components/KModal.vue'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const teams = ref<any[]>([])
const showCreate = ref(false)
const form = ref({ name: '', description: '' })

async function createTeam() {
  if (!currentAccountId.value) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/teams`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.value)
  })
  teams.value.unshift(await res.json())
  showCreate.value = false
  form.value = { name: '', description: '' }
}

onMounted(async () => {
  if (!currentAccountId.value) return
  const res = await api.teams.list(currentAccountId.value) as any
  teams.value = res?.payload ?? []
})
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.btn-primary { background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }

.list-wrapper { padding: 24px; display: flex; flex-direction: column; gap: 12px; }

.team-card { background: white; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; }
.team-icon { font-size: 24px; }
.team-info { flex: 1; }
.team-name { font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 2px; }
.team-desc { font-size: 13px; color: #94a3b8; margin: 0; }
.team-meta .team-members { font-size: 13px; color: #64748b; }
.empty-state { background: white; border-radius: 12px; padding: 48px; text-align: center; color: #94a3b8; }
.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-field label { font-size: 13px; font-weight: 500; color: #475569; }
.form-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
.form-input:focus { border-color: #0ea5e9; }
.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
</style>
