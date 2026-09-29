<!-- kchat-web/apps/cms/src/views/auth/LoginView.vue -->
<!-- KChat Login Page — P2-04 -->
<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <span class="logo-text">KChat</span>
        <p class="logo-sub">Customer Messaging Platform</p>
      </div>

      <!-- Form -->
      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="agent@ktech.vn"
            autocomplete="email"
            required
          />
        </div>

        <div class="field">
          <label for="password">Mật khẩu</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <!-- Error -->
        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading">Đang đăng nhập...</span>
          <span v-else>Đăng nhập</span>
        </button>

        <RouterLink to="/forgot-password" class="forgot-link">Quên mật khẩu?</RouterLink>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { loading, error } = storeToRefs(authStore)

const form = reactive({ email: '', password: '' })

async function handleSubmit() {
  await authStore.login(form.email, form.password)
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
}

.login-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 48px 40px;
  width: 400px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
}

.login-logo { text-align: center; margin-bottom: 36px; }

.logo-text {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-sub {
  color: #64748b;
  font-size: 13px;
  margin-top: 4px;
}

.login-form { display: flex; flex-direction: column; gap: 20px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.field input {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 16px;
  color: #f1f5f9;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.field input::placeholder { color: #475569; }
.field input:focus { border-color: #38bdf8; }

.error-msg {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fca5a5;
  font-size: 13px;
}

.btn-login {
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  border: none;
  border-radius: 10px;
  padding: 14px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.btn-login:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }

.forgot-link {
  text-align: center;
  color: #64748b;
  font-size: 13px;
  text-decoration: none;
}
.forgot-link:hover { color: #38bdf8; }
</style>
