<!-- kchat-web/packages/ui/src/components/KBadge.vue -->
<template>
  <span :class="['k-badge', `k-badge--${variant}`, `k-badge--${size}`]">
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple'
  size?: 'sm' | 'md'
}>(), { variant: 'default', size: 'md' })
</script>

<style scoped>
.k-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: 600;
  white-space: nowrap;
}

.k-badge--sm { font-size: 10px; padding: 2px 7px; }
.k-badge--md { font-size: 11px; padding: 3px 9px; }

.k-badge--default { background: #f1f5f9; color: #475569; }
.k-badge--primary { background: #e0f2fe; color: #0369a1; }
.k-badge--success { background: #dcfce7; color: #15803d; }
.k-badge--warning { background: #fef9c3; color: #a16207; }
.k-badge--danger  { background: #fee2e2; color: #b91c1c; }
.k-badge--purple  { background: #ede9fe; color: #6d28d9; }
</style>
