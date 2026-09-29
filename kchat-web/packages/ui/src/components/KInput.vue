<!-- kchat-web/packages/ui/src/components/KInput.vue -->
<!-- KChat Input Component — P2-03 -->
<template>
  <div :class="['k-input-wrapper', { 'k-input-wrapper--error': error, 'k-input-wrapper--disabled': disabled }]">
    <label v-if="label" :for="inputId" class="k-input-label">{{ label }}</label>
    <div class="k-input-field">
      <span v-if="$slots.prefix" class="k-input-prefix"><slot name="prefix" /></span>
      <input
        :id="inputId"
        v-bind="$attrs"
        :value="modelValue"
        :disabled="disabled"
        :placeholder="placeholder"
        :type="type"
        class="k-input"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
      />
      <span v-if="$slots.suffix" class="k-input-suffix"><slot name="suffix" /></span>
    </div>
    <p v-if="error" class="k-input-error">{{ error }}</p>
    <p v-else-if="hint" class="k-input-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  error?: string
  hint?: string
  disabled?: boolean
  id?: string
}>(), {
  type: 'text',
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: FocusEvent]
}>()

const inputId = computed(() => props.id ?? `k-input-${Math.random().toString(36).slice(2)}`)
</script>

<style scoped>
.k-input-wrapper { display: flex; flex-direction: column; gap: 6px; }

.k-input-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.k-input-field {
  display: flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.k-input-field:focus-within {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.k-input-wrapper--error .k-input-field {
  border-color: #ef4444;
}

.k-input-wrapper--error .k-input-field:focus-within {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.k-input-wrapper--disabled .k-input-field {
  background: #f8fafc;
  opacity: 0.7;
}

.k-input {
  flex: 1;
  padding: 9px 12px;
  border: none;
  outline: none;
  font-size: 14px;
  color: #0f172a;
  background: transparent;
  min-width: 0;
}

.k-input::placeholder { color: #94a3b8; }
.k-input:disabled { cursor: not-allowed; }

.k-input-prefix, .k-input-suffix {
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: #94a3b8;
  font-size: 14px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  height: 100%;
}

.k-input-suffix {
  border-right: none;
  border-left: 1px solid #e2e8f0;
}

.k-input-error { font-size: 12px; color: #ef4444; margin: 0; }
.k-input-hint  { font-size: 12px; color: #94a3b8; margin: 0; }
</style>
