<!-- kchat-web/apps/cms/src/views/errors/NotFoundView.vue -->
<template>
  <div class="error-page">
    <div class="error-content">
      <span class="error-code">404</span>
      <h1 class="error-title">Trang không tìm thấy</h1>
      <p class="error-desc">Trang bạn đang tìm kiếm không tồn tại.</p>
      <RouterLink to="/" class="btn-home">← Về trang chủ</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.error-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
.error-content { text-align: center; }
.error-code { font-size: 120px; font-weight: 900; color: #e2e8f0; display: block; line-height: 1; }
.error-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 8px 0; }
.error-desc { color: #64748b; margin-bottom: 24px; }
.btn-home { display: inline-block; background: #0ea5e9; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; }
</style>
