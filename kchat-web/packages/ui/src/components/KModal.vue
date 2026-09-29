<!-- kchat-web/packages/ui/src/components/KModal.vue -->
<!-- P2-03: KModal — teleport to body, backdrop, ESC close -->
<template>
  <Teleport to="body">
    <Transition name="k-modal">
      <div v-if="modelValue" class="k-modal-backdrop" @click.self="closeOnBackdrop && close()">
        <div :class="['k-modal', `k-modal--${size}`]" role="dialog" :aria-label="title">
          <!-- Header -->
          <div v-if="title || $slots.header" class="k-modal-header">
            <slot name="header">
              <h3 class="k-modal-title">{{ title }}</h3>
            </slot>
            <button class="k-modal-close" @click="close" aria-label="Đóng">✕</button>
          </div>

          <!-- Body -->
          <div class="k-modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="k-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}>(), { size: 'md', closeOnBackdrop: true })

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() { emit('update:modelValue', false) }

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.k-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.k-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 32px);
  overflow: hidden;
  width: 100%;
}

.k-modal--sm { max-width: 360px; }
.k-modal--md { max-width: 520px; }
.k-modal--lg { max-width: 720px; }
.k-modal--xl { max-width: 960px; }

.k-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.k-modal-title { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0; }

.k-modal-close {
  width: 28px; height: 28px;
  border: none; background: #f1f5f9;
  border-radius: 6px; cursor: pointer;
  color: #64748b; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}

.k-modal-close:hover { background: #e2e8f0; color: #0f172a; }

.k-modal-body { padding: 24px; overflow-y: auto; flex: 1; }

.k-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Transition */
.k-modal-enter-active, .k-modal-leave-active { transition: opacity 0.2s ease; }
.k-modal-enter-active .k-modal, .k-modal-leave-active .k-modal { transition: transform 0.2s ease, opacity 0.2s ease; }
.k-modal-enter-from, .k-modal-leave-to { opacity: 0; }
.k-modal-enter-from .k-modal, .k-modal-leave-to .k-modal { transform: scale(0.95) translateY(8px); opacity: 0; }
</style>
