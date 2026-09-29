<!-- kchat-web/apps/cms/src/views/auth/ForgotPasswordView.vue -->
<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <span class="logo-text">KChat</span>
        <p class="logo-sub">Đặt lại mật khẩu</p>
      </div>

      <form v-if="!sent" class="login-form" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="email">Email tài khoản</label>
          <input id="email" v-model="email" type="email" placeholder="agent@ktech.vn" required />
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu' }}
        </button>

        <RouterLink to="/login" class="forgot-link">← Quay lại đăng nhập</RouterLink>
      </form>

      <div v-else class="success-state">
        <p class="success-icon">✉️</p>
        <p>Đã gửi email hướng dẫn đặt lại mật khẩu tới <strong>{{ email }}</strong></p>
        <RouterLink to="/login" class="forgot-link">← Quay lại đăng nhập</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@kchat/api-client'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function handleSubmit() {
  loading.value = true
  error.value = ''
  try {
    await fetch('/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, redirect_url: window.location.origin + '/login' })
    })
    sent.value = true
  } catch (e: unknown) {
    error.value = 'Không thể gửi email. Vui lòng thử lại.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); }
.login-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 48px 40px; width: 400px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
.login-logo { text-align: center; margin-bottom: 36px; }
.logo-text { font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.logo-sub { color: #64748b; font-size: 13px; margin-top: 4px; }
.login-form { display: flex; flex-direction: column; gap: 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 500; color: #94a3b8; }
.field input { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 16px; color: #f1f5f9; font-size: 15px; outline: none; }
.field input:focus { border-color: #38bdf8; }
.error-msg { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 10px 14px; color: #fca5a5; font-size: 13px; }
.btn-login { background: linear-gradient(135deg, #38bdf8, #818cf8); border: none; border-radius: 10px; padding: 14px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-login:disabled { opacity: 0.5; }
.forgot-link { text-align: center; color: #64748b; font-size: 13px; text-decoration: none; }
.success-state { text-align: center; color: #94a3b8; }
.success-icon { font-size: 48px; margin-bottom: 16px; }
</style>
