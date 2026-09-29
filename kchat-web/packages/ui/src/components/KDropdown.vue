<!-- kchat-web/packages/ui/src/components/KDropdown.vue -->
<!-- P2-03: KDropdown — Menu dropdown với keyboard navigation -->
<template>
  <div class="k-dropdown" ref="wrapperRef" @keydown="handleKeydown">
    <!-- Trigger -->
    <div class="k-dropdown__trigger" @click="toggle" :aria-expanded="open" aria-haspopup="listbox">
      <slot name="trigger" :open="open">
        <button class="k-dropdown__default-trigger">
          {{ selectedLabel ?? placeholder }}
          <span class="k-dropdown__arrow" :class="{ 'k-dropdown__arrow--open': open }">▾</span>
        </button>
      </slot>
    </div>

    <!-- Menu -->
    <Transition name="k-dropdown">
      <div v-if="open" class="k-dropdown__menu" role="listbox">
        <div v-if="searchable" class="k-dropdown__search">
          <input v-model="searchQuery" class="k-dropdown__search-input" placeholder="Tìm kiếm..." @click.stop />
        </div>

        <template v-if="filteredOptions.length">
          <button
            v-for="(opt, idx) in filteredOptions"
            :key="opt.value"
            role="option"
            :class="['k-dropdown__item', { 'k-dropdown__item--selected': opt.value === modelValue, 'k-dropdown__item--focused': idx === focusedIdx }]"
            @click="select(opt)"
          >
            <slot name="option" :option="opt">{{ opt.label }}</slot>
            <span v-if="opt.value === modelValue" class="k-dropdown__check">✓</span>
          </button>
        </template>

        <div v-else class="k-dropdown__empty">Không có kết quả</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Option { value: string | number; label: string; [key: string]: unknown }

const props = withDefaults(defineProps<{
  modelValue?: string | number
  options: Option[]
  placeholder?: string
  searchable?: boolean
}>(), { placeholder: 'Chọn...', searchable: false })

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'change': [option: Option]
}>()

const open = ref(false)
const searchQuery = ref('')
const focusedIdx = ref(-1)
const wrapperRef = ref<HTMLElement | null>(null)

const filteredOptions = computed(() =>
  searchQuery.value
    ? props.options.filter(o => o.label.toLowerCase().includes(searchQuery.value.toLowerCase()))
    : props.options
)

const selectedLabel = computed(() =>
  props.options.find(o => o.value === props.modelValue)?.label
)

function toggle() { open.value = !open.value; if (!open.value) searchQuery.value = '' }

function select(opt: Option) {
  emit('update:modelValue', opt.value)
  emit('change', opt)
  open.value = false
  searchQuery.value = ''
  focusedIdx.value = -1
}

function handleKeydown(e: KeyboardEvent) {
  if (!open.value) { if (e.key === 'Enter' || e.key === ' ') toggle(); return }
  if (e.key === 'Escape') { open.value = false; return }
  if (e.key === 'ArrowDown') { e.preventDefault(); focusedIdx.value = Math.min(focusedIdx.value + 1, filteredOptions.value.length - 1) }
  if (e.key === 'ArrowUp')   { e.preventDefault(); focusedIdx.value = Math.max(focusedIdx.value - 1, 0) }
  if (e.key === 'Enter' && focusedIdx.value >= 0) select(filteredOptions.value[focusedIdx.value])
}

function handleOutsideClick(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
    searchQuery.value = ''
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>

<style scoped>
.k-dropdown { position: relative; display: inline-block; }

.k-dropdown__default-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border: 1px solid #e2e8f0;
  border-radius: 8px; background: white; cursor: pointer;
  font-size: 14px; color: #374151; min-width: 140px;
  justify-content: space-between;
  transition: border-color 0.15s;
}

.k-dropdown__default-trigger:hover { border-color: #0ea5e9; }

.k-dropdown__arrow { font-size: 12px; transition: transform 0.2s; }
.k-dropdown__arrow--open { transform: rotate(180deg); }

.k-dropdown__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  max-width: 300px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
  z-index: 100;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
}

.k-dropdown__search { padding: 8px; border-bottom: 1px solid #f1f5f9; }
.k-dropdown__search-input {
  width: 100%; border: 1px solid #e2e8f0;
  border-radius: 6px; padding: 6px 10px; font-size: 13px; outline: none;
}
.k-dropdown__search-input:focus { border-color: #0ea5e9; }

.k-dropdown__item {
  width: 100%; text-align: left; padding: 9px 14px;
  border: none; background: none; cursor: pointer;
  font-size: 14px; color: #374151;
  display: flex; align-items: center; justify-content: space-between;
  transition: background 0.1s;
}

.k-dropdown__item:hover, .k-dropdown__item--focused { background: #f8fafc; }
.k-dropdown__item--selected { color: #0ea5e9; font-weight: 600; }

.k-dropdown__check { color: #0ea5e9; font-size: 13px; }
.k-dropdown__empty { padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }

.k-dropdown-enter-active, .k-dropdown-leave-active { transition: all 0.15s ease; }
.k-dropdown-enter-from, .k-dropdown-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>
