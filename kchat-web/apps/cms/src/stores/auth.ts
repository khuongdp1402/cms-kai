// kchat-web/apps/cms/src/stores/auth.ts
// KChat Auth Store (Pinia) — P2-04
// Quản lý trạng thái đăng nhập, profile, và account hiện tại

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, saveAuth, clearAuth, isAuthenticated, type AuthHeaders } from '@kchat/api-client'
import { router } from '../router'

interface UserProfile {
  id: number
  name: string
  email: string
  role: 'agent' | 'administrator'
  account_id: number
  avatar_url: string | null
  availability_status: 'online' | 'offline' | 'busy'
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => isAuthenticated())
  const isAdmin = computed(() => profile.value?.role === 'administrator')
  const currentAccountId = computed(() => profile.value?.account_id ?? null)

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const res = await api.auth.signIn(email, password)

      // Lưu auth headers sau khi sign in thành công
      // NOTE: headers được lấy từ response thông qua api client interceptor
      // Profile cần được fetch riêng
      await fetchProfile()

      const redirect = router.currentRoute.value.query.redirect as string
      await router.push(redirect ?? '/conversations')
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Đăng nhập thất bại'
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      const data = await api.profile.get() as UserProfile
      profile.value = data
    } catch (e) {
      profile.value = null
    }
  }

  async function logout() {
    try {
      await api.auth.signOut()
    } finally {
      clearAuth()
      profile.value = null
      await router.push('/login')
    }
  }

  async function updateAvailability(status: 'online' | 'offline' | 'busy') {
    if (!profile.value) return
    await api.profile.update({ availability: status })
    profile.value.availability_status = status
  }

  return {
    profile,
    loading,
    error,
    isLoggedIn,
    isAdmin,
    currentAccountId,
    login,
    logout,
    fetchProfile,
    updateAvailability,
  }
})
