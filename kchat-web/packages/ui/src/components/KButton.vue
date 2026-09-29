<!-- kchat-web/packages/ui/src/components/KButton.vue -->
<!-- KChat Button Component — P2-03 -->
<template>
  <button
    :class="['k-btn', `k-btn--${variant}`, `k-btn--${size}`, { 'k-btn--loading': loading, 'k-btn--icon-only': iconOnly }]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="k-btn__spinner" aria-hidden="true" />
    <span v-if="$slots.icon && !loading" class="k-btn__icon"><slot name="icon" /></span>
    <span v-if="!iconOnly" class="k-btn__label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  iconOnly?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  iconOnly: false,
})
</script>

<style scoped>
.k-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  position: relative;
  outline: none;
}

.k-btn:focus-visible { box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3); }
.k-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Sizes */
.k-btn--sm { padding: 6px 12px; font-size: 12px; }
.k-btn--md { padding: 8px 16px; font-size: 14px; }
.k-btn--lg { padding: 12px 24px; font-size: 15px; }
.k-btn--icon-only.k-btn--sm { padding: 6px; }
.k-btn--icon-only.k-btn--md { padding: 8px; }
.k-btn--icon-only.k-btn--lg { padding: 12px; }

/* Variants */
.k-btn--primary { background: #0ea5e9; color: white; }
.k-btn--primary:hover:not(:disabled) { background: #0284c7; transform: translateY(-1px); }

.k-btn--secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
.k-btn--secondary:hover:not(:disabled) { background: #e2e8f0; }

.k-btn--ghost { background: transparent; color: #64748b; }
.k-btn--ghost:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }

.k-btn--danger { background: #ef4444; color: white; }
.k-btn--danger:hover:not(:disabled) { background: #dc2626; }

.k-btn--success { background: #22c55e; color: white; }
.k-btn--success:hover:not(:disabled) { background: #16a34a; }

/* Loading spinner */
.k-btn--loading { pointer-events: none; }
.k-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: k-spin 0.7s linear infinite;
}
@keyframes k-spin { to { transform: rotate(360deg); } }
</style>
