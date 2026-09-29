<!-- kchat-web/packages/ui/src/components/KAvatar.vue -->
<template>
  <div :class="['k-avatar', `k-avatar--${size}`]" :style="bgStyle" :title="name">
    <img v-if="src" :src="src" :alt="name" class="k-avatar__img" @error="imgError = true" />
    <span v-else class="k-avatar__initials">{{ initials }}</span>
    <span v-if="status" :class="['k-avatar__status', `k-avatar__status--${status}`]" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const GRADIENTS = [
  ['#38bdf8','#818cf8'], ['#34d399','#06b6d4'], ['#f472b6','#a78bfa'],
  ['#fb923c','#f43f5e'], ['#a3e635','#06b6d4'], ['#fbbf24','#f97316'],
]

const props = withDefaults(defineProps<{
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy'
}>(), { size: 'md' })

const imgError = ref(false)

const initials = computed(() => {
  if (!props.name) return '?'
  return props.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
})

const bgStyle = computed(() => {
  const idx = (props.name?.charCodeAt(0) ?? 0) % GRADIENTS.length
  const [from, to] = GRADIENTS[idx]
  return { background: `linear-gradient(135deg, ${from}, ${to})` }
})
</script>

<style scoped>
.k-avatar {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}

.k-avatar--xs  { width: 24px;  height: 24px;  font-size: 10px; }
.k-avatar--sm  { width: 32px;  height: 32px;  font-size: 12px; }
.k-avatar--md  { width: 40px;  height: 40px;  font-size: 14px; }
.k-avatar--lg  { width: 48px;  height: 48px;  font-size: 16px; }
.k-avatar--xl  { width: 64px;  height: 64px;  font-size: 20px; }

.k-avatar__img { width: 100%; height: 100%; object-fit: cover; }

.k-avatar__status {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.k-avatar__status--online  { background: #22c55e; }
.k-avatar__status--offline { background: #94a3b8; }
.k-avatar__status--busy    { background: #f59e0b; }
</style>
