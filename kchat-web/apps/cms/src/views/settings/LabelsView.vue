<!-- kchat-web/apps/cms/src/views/settings/LabelsView.vue -->
<!-- P4-04: Labels management -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Labels</h1>
        <p class="page-subtitle">Gắn nhãn để phân loại hội thoại nhanh hơn</p>
      </div>
      <button class="btn-primary" @click="showCreate = true">+ Tạo Label</button>
    </div>

    <div class="labels-grid" v-if="labels.length">
      <div v-for="label in labels" :key="label.id" class="label-card">
        <div class="label-color" :style="{ background: label.color ?? '#94a3b8' }" />
        <div class="label-info">
          <p class="label-title">{{ label.title }}</p>
          <p class="label-desc">{{ label.description ?? 'Không có mô tả' }}</p>
        </div>
        <div class="label-actions">
          <span class="conv-count">{{ label.conversations_count ?? 0 }} hội thoại</span>
          <button class="btn-delete" @click="deleteLabel(label.id)" title="Xóa">🗑</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">Chưa có label nào</div>

    <!-- Create Modal -->
    <KModal v-model="showCreate" title="Tạo Label mới" size="sm">
      <form @submit.prevent="createLabel">
        <div class="form-field">
          <label>Tên label</label>
          <input v-model="form.title" class="form-input" placeholder="vd: vip-customer" required />
        </div>
        <div class="form-field">
          <label>Màu sắc</label>
          <div class="color-picker">
            <div
              v-for="color in COLORS"
              :key="color"
              :class="['color-swatch', { 'color-swatch--selected': form.color === color }]"
              :style="{ background: color }"
              @click="form.color = color"
            />
          </div>
        </div>
        <div class="form-field">
          <label>Mô tả (tuỳ chọn)</label>
          <input v-model="form.description" class="form-input" placeholder="Mô tả label này..." />
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
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'
import KModal from '../../../../../packages/ui/src/components/KModal.vue'

const authStore = useAuthStore()
const { currentAccountId } = storeToRefs(authStore)

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#0ea5e9','#a855f7','#ec4899','#64748b']

const labels = ref<any[]>([])
const showCreate = ref(false)
const form = ref({ title: '', color: '#0ea5e9', description: '' })

async function fetchLabels() {
  if (!currentAccountId.value) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/labels`)
  const data = await res.json()
  labels.value = data?.payload ?? []
}

async function createLabel() {
  if (!currentAccountId.value) return
  const res = await fetch(`/api/v1/accounts/${currentAccountId.value}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value)
  })
  const data = await res.json()
  labels.value.unshift(data)
  showCreate.value = false
  form.value = { title: '', color: '#0ea5e9', description: '' }
}

async function deleteLabel(id: number) {
  if (!currentAccountId.value || !confirm('Xóa label này?')) return
  await fetch(`/api/v1/accounts/${currentAccountId.value}/labels/${id}`, { method: 'DELETE' })
  labels.value = labels.value.filter(l => l.id !== id)
}

onMounted(fetchLabels)
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
.btn-primary { background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }

.labels-grid { display: flex; flex-direction: column; gap: 10px; padding: 24px; }

.label-card {
  background: white; border-radius: 12px; padding: 16px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f1f5f9;
}

.label-color { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
.label-info { flex: 1; }
.label-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 2px; }
.label-desc { font-size: 12px; color: #94a3b8; margin: 0; }
.label-actions { display: flex; align-items: center; gap: 12px; }
.conv-count { font-size: 12px; color: #64748b; }
.btn-delete { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; }
.btn-delete:hover { background: #fee2e2; border-radius: 4px; }

.empty-state { background: white; border-radius: 12px; padding: 48px; text-align: center; color: #94a3b8; margin: 24px; }

.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-field label { font-size: 13px; font-weight: 500; color: #475569; }
.form-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
.form-input:focus { border-color: #0ea5e9; }

.color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.color-swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; transition: transform 0.15s; border: 3px solid transparent; }
.color-swatch:hover { transform: scale(1.15); }
.color-swatch--selected { border-color: #0f172a; transform: scale(1.1); }

.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
</style>
