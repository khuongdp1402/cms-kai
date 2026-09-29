<!-- kchat-web/apps/cms/src/views/settings/AgentsView.vue -->
<!-- P4-03: Agents management -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Agents</h1>
        <p class="page-subtitle">Quản lý thành viên hỗ trợ khách hàng</p>
      </div>
      <button class="btn-primary" @click="showInviteModal = true">+ Mời Agent</button>
    </div>

    <!-- Agents table -->
    <div class="table-wrapper">
      <table class="data-table" v-if="agents.length">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in agents" :key="a.id">
            <td>
              <div class="agent-cell">
                <div class="mini-avatar" :style="avatarBg(a.name)">{{ a.name?.charAt(0) }}</div>
                <span>{{ a.name }}</span>
              </div>
            </td>
            <td>{{ a.email }}</td>
            <td>
              <span :class="['role-badge', `role-badge--${a.role}`]">{{ a.role === 'administrator' ? 'Admin' : 'Agent' }}</span>
            </td>
            <td>
              <span :class="['status-pill', `status-pill--${a.availability_status}`]">
                {{ statusLabel(a.availability_status) }}
              </span>
            </td>
            <td>
              <button class="btn-sm-danger" @click="deleteAgent(a.id)" title="Xóa agent">🗑</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <p>Chưa có agent nào</p>
      </div>
    </div>

    <!-- Invite Modal -->
    <KModal v-model="showInviteModal" title="Mời Agent mới" size="sm">
      <form @submit.prevent="inviteAgent">
        <div class="form-field">
          <label>Tên</label>
          <input v-model="inviteForm.name" type="text" placeholder="Nguyễn Văn A" required class="form-input" />
        </div>
        <div class="form-field">
          <label>Email</label>
          <input v-model="inviteForm.email" type="email" placeholder="agent@ktech.vn" required class="form-input" />
        </div>
        <div class="form-field">
          <label>Vai trò</label>
          <select v-model="inviteForm.role" class="form-input">
            <option value="agent">Agent</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>

        <div v-if="inviteError" class="form-error">{{ inviteError }}</div>

        <template #footer>
          <button type="button" class="btn-secondary" @click="showInviteModal = false">Hủy</button>
          <button type="submit" class="btn-primary" :disabled="inviting">
            {{ inviting ? 'Đang mời...' : 'Mời ngay' }}
          </button>
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

const agents = ref<any[]>([])
const showInviteModal = ref(false)
const inviting = ref(false)
const inviteError = ref('')
const inviteForm = ref({ name: '', email: '', role: 'agent' })

const COLORS = ['#38bdf8','#818cf8','#34d399','#f472b6','#fb923c','#a3e635']
function avatarBg(name: string) {
  const bg = COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]
  return { background: bg }
}

function statusLabel(status: string) {
  return { online: '🟢 Online', offline: '⚫ Offline', busy: '🟡 Bận' }[status] ?? status
}

async function deleteAgent(id: number) {
  if (!currentAccountId.value || !confirm('Xóa agent này?')) return
  await (api as any).agents?.delete?.(currentAccountId.value, id)
  agents.value = agents.value.filter(a => a.id !== id)
}

async function inviteAgent() {
  if (!currentAccountId.value) return
  inviting.value = true; inviteError.value = ''
  try {
    const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm.value)
    })
    if (!res.ok) throw new Error('Không thể tạo agent')
    const data = await res.json()
    agents.value.unshift(data)
    showInviteModal.value = false
    inviteForm.value = { name: '', email: '', role: 'agent' }
  } catch (e: any) {
    inviteError.value = e.message
  } finally {
    inviting.value = false
  }
}

onMounted(async () => {
  if (!currentAccountId.value) return
  const res = await api.agents.list(currentAccountId.value) as any
  agents.value = res?.payload ?? []
})
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0;
}

.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }

.btn-primary {
  background: #0ea5e9; color: white; border: none; border-radius: 8px;
  padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
}

.table-wrapper { padding: 24px; }

.data-table {
  width: 100%; border-collapse: collapse;
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.data-table th { text-align: left; padding: 12px 16px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; }
.data-table td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f9fafb; }
.data-table tr:hover td { background: #f8fafc; }

.agent-cell { display: flex; align-items: center; gap: 10px; }
.mini-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 12px; }

.role-badge { font-size: 11px; padding: 3px 9px; border-radius: 9999px; font-weight: 600; }
.role-badge--administrator { background: #ede9fe; color: #6d28d9; }
.role-badge--agent { background: #f1f5f9; color: #475569; }

.status-pill { font-size: 12px; }

.btn-sm-danger { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 16px; }
.btn-sm-danger:hover { background: #fee2e2; }

.empty-state { background: white; border-radius: 12px; padding: 48px; text-align: center; color: #94a3b8; }

.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-field label { font-size: 13px; font-weight: 500; color: #475569; }
.form-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
.form-input:focus { border-color: #0ea5e9; }
.form-error { background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
</style>
