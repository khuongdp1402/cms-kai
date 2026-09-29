<!-- kchat-web/packages/ui/src/components/KToast.vue -->
<!-- P2-03: Toast notification system -->
<template>
  <Teleport to="body">
    <div class="k-toast-container">
      <TransitionGroup name="k-toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['k-toast', `k-toast--${toast.type}`]"
          @click="remove(toast.id)"
        >
          <span class="k-toast__icon">{{ icons[toast.type] }}</span>
          <div class="k-toast__content">
            <p v-if="toast.title" class="k-toast__title">{{ toast.title }}</p>
            <p class="k-toast__msg">{{ toast.message }}</p>
          </div>
          <button class="k-toast__close">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration: number
}

const toasts = ref<Toast[]>([])

const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }

export function useToast() {
  function show(message: string, type: Toast['type'] = 'info', title?: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, type, message, title, duration })
    setTimeout(() => remove(id), duration)
  }

  return {
    success: (msg: string, title?: string) => show(msg, 'success', title),
    error:   (msg: string, title?: string) => show(msg, 'error',   title),
    warning: (msg: string, title?: string) => show(msg, 'warning', title),
    info:    (msg: string, title?: string) => show(msg, 'info',    title),
  }
}

function remove(id: string) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx > -1) toasts.value.splice(idx, 1)
}
</script>

<style scoped>
.k-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
}

.k-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
  cursor: pointer;
  backdrop-filter: blur(8px);
  border: 1px solid;
}

.k-toast--success { background: #f0fdf4; border-color: #86efac; }
.k-toast--error   { background: #fff1f2; border-color: #fca5a5; }
.k-toast--warning { background: #fffbeb; border-color: #fde68a; }
.k-toast--info    { background: #eff6ff; border-color: #93c5fd; }

.k-toast__icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }

.k-toast__content { flex: 1; }
.k-toast__title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
.k-toast__msg   { font-size: 13px; color: #475569; margin: 0; line-height: 1.4; }

.k-toast__close {
  background: none; border: none; cursor: pointer;
  color: #94a3b8; font-size: 12px; padding: 2px; flex-shrink: 0;
}

/* Transitions */
.k-toast-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.k-toast-leave-active { transition: all 0.2s ease; }
.k-toast-enter-from  { opacity: 0; transform: translateX(60px) scale(0.9); }
.k-toast-leave-to    { opacity: 0; transform: translateX(60px); }
</style>
