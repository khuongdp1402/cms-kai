<!-- kchat-web/apps/cms/src/views/errors/ForbiddenView.vue -->
<template>
  <div class="error-page">
    <div class="error-content">
      <span class="error-code">403</span>
      <h1 class="error-title">Không có quyền truy cập</h1>
      <p class="error-desc">Bạn không có quyền xem trang này. Hãy liên hệ Admin.</p>
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
.error-code { font-size: 120px; font-weight: 900; color: #fee2e2; display: block; line-height: 1; }
.error-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 8px 0; }
.error-desc { color: #64748b; margin-bottom: 24px; }
.btn-home { display: inline-block; background: #0ea5e9; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; }
</style>
