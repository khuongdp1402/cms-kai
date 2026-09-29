<!-- kchat-web/apps/cms/src/views/profile/ProfileView.vue -->
<!-- P4-07: Profile + Account settings -->
<template>
  <div class="profile-page">
    <div class="page-header">
      <h1 class="page-title">Tài khoản của tôi</h1>
    </div>

    <div class="profile-content" v-if="profile">
      <!-- Avatar section -->
      <div class="profile-card">
        <div class="profile-avatar" :style="avatarBg">
          <img v-if="profile.avatar_url" :src="profile.avatar_url" alt="Avatar" />
          <span v-else>{{ profile.name?.charAt(0)?.toUpperCase() }}</span>
        </div>
        <div class="profile-basic">
          <h2 class="profile-name">{{ profile.name }}</h2>
          <p class="profile-email">{{ profile.email }}</p>
          <span :class="['role-badge', `role-badge--${profile.role}`]">
            {{ profile.role === 'administrator' ? 'Administrator' : 'Agent' }}
          </span>
        </div>
      </div>

      <!-- Edit Profile Form -->
      <div class="form-section">
        <h3 class="section-title">Thông tin cá nhân</h3>
        <form @submit.prevent="saveProfile">
          <div class="form-row">
            <div class="form-field">
              <label>Tên hiển thị</label>
              <input v-model="form.name" class="form-input" required />
            </div>
            <div class="form-field">
              <label>Email</label>
              <input v-model="form.email" type="email" class="form-input" required />
            </div>
          </div>
          <div class="form-field">
            <label>Hiển thị tên trên widget (Display Name)</label>
            <input v-model="form.display_name" class="form-input" placeholder="Tên hiển thị với khách hàng..." />
          </div>

          <div v-if="saveError" class="form-error">{{ saveError }}</div>
          <div v-if="saveSuccess" class="form-success">✅ Đã lưu thành công!</div>

          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
        </form>
      </div>

      <!-- Change password -->
      <div class="form-section">
        <h3 class="section-title">Đổi mật khẩu</h3>
        <form @submit.prevent="changePassword">
          <div class="form-field">
            <label>Mật khẩu hiện tại</label>
            <input v-model="pwForm.current" type="password" class="form-input" required />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Mật khẩu mới</label>
              <input v-model="pwForm.password" type="password" class="form-input" required minlength="6" />
            </div>
            <div class="form-field">
              <label>Xác nhận mật khẩu mới</label>
              <input v-model="pwForm.confirm" type="password" class="form-input" required />
            </div>
          </div>
          <div v-if="pwForm.password && pwForm.confirm && pwForm.password !== pwForm.confirm" class="form-error">Mật khẩu xác nhận không khớp</div>
          <div v-if="pwError" class="form-error">{{ pwError }}</div>
          <button type="submit" class="btn-secondary" :disabled="pwForm.password !== pwForm.confirm">Đổi mật khẩu</button>
        </form>
      </div>

      <!-- Availability -->
      <div class="form-section">
        <h3 class="section-title">Trạng thái</h3>
        <div class="availability-options">
          <label v-for="opt in availOptions" :key="opt.value" :class="['avail-option', { 'avail-option--selected': profile.availability_status === opt.value }]">
            <input type="radio" :value="opt.value" v-model="profile.availability_status" @change="updateAvailability(opt.value as any)" hidden />
            <span class="avail-dot" :class="`avail-dot--${opt.value}`" />
            {{ opt.label }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@kchat/api-client'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { profile } = storeToRefs(authStore)
const { updateAvailability, fetchProfile } = authStore

const form = ref({ name: '', email: '', display_name: '' })
const pwForm = ref({ current: '', password: '', confirm: '' })
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)
const pwError = ref('')

const availOptions = [
  { value: 'online', label: '🟢 Online' },
  { value: 'busy',   label: '🟡 Bận' },
  { value: 'offline', label: '⚫ Offline' },
]

const COLORS = ['#38bdf8','#818cf8','#34d399','#f472b6','#fb923c']
const avatarBg = computed(() => {
  const bg = COLORS[(profile.value?.name?.charCodeAt(0) ?? 0) % COLORS.length]
  return { background: `linear-gradient(135deg, ${bg}, ${COLORS[(COLORS.indexOf(bg) + 1) % COLORS.length]})` }
})

async function saveProfile() {
  saving.value = true; saveError.value = ''; saveSuccess.value = false
  try {
    await api.profile.update({ name: form.value.name, email: form.value.email, display_name: form.value.display_name })
    await fetchProfile()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e: any) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (pwForm.value.password !== pwForm.value.confirm) return
  pwError.value = ''
  try {
    const res = await fetch('/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: pwForm.value.current, password: pwForm.value.password, password_confirmation: pwForm.value.confirm })
    })
    if (!res.ok) throw new Error('Đổi mật khẩu thất bại')
    pwForm.value = { current: '', password: '', confirm: '' }
  } catch (e: any) {
    pwError.value = e.message
  }
}

onMounted(async () => {
  await fetchProfile()
  if (profile.value) {
    form.value.name = profile.value.name
    form.value.email = profile.value.email
  }
})
</script>

<style scoped>
.profile-page { height: 100%; background: #f8fafc; overflow-y: auto; }
.page-header { padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }

.profile-content { max-width: 700px; margin: 24px auto; padding: 0 24px; display: flex; flex-direction: column; gap: 20px; }

.profile-card {
  background: white; border-radius: 16px; padding: 24px;
  display: flex; align-items: center; gap: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.profile-avatar {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 26px; flex-shrink: 0; overflow: hidden;
}

.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-name { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.profile-email { font-size: 14px; color: #64748b; margin: 0 0 8px; }

.role-badge { font-size: 11px; padding: 3px 9px; border-radius: 9999px; font-weight: 600; }
.role-badge--administrator { background: #ede9fe; color: #6d28d9; }
.role-badge--agent { background: #f1f5f9; color: #475569; }

.form-section { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 20px; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-field label { font-size: 13px; font-weight: 500; color: #475569; }
.form-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: none; }
.form-input:focus { border-color: #0ea5e9; }
.form-error { background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
.form-success { background: #f0fdf4; color: #166534; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }

.btn-primary { background: #0ea5e9; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; }
.btn-secondary { background: #f1f5f9; color: #374151; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }

.availability-options { display: flex; gap: 12px; flex-wrap: wrap; }
.avail-option { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; border: 2px solid #e2e8f0; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.15s; }
.avail-option--selected { border-color: #0ea5e9; background: #f0f9ff; color: #0369a1; }
.avail-dot { width: 10px; height: 10px; border-radius: 50%; }
.avail-dot--online { background: #22c55e; }
.avail-dot--busy { background: #f59e0b; }
.avail-dot--offline { background: #94a3b8; }
</style>
