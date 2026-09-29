<!-- kchat-web/apps/cms/src/views/settings/IntegrationsView.vue -->
<!-- P4-06: Integrations hub -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">Tích hợp</h1>
      <p class="page-sub">Kết nối KChat với các dịch vụ bên ngoài</p>
    </div>

    <div class="integrations-grid">
      <div v-for="int in integrations" :key="int.id" class="integration-card">
        <div class="int-icon">{{ int.icon }}</div>
        <div class="int-info">
          <h3 class="int-name">{{ int.name }}</h3>
          <p class="int-desc">{{ int.description }}</p>
        </div>
        <div class="int-status">
          <span v-if="int.enabled" class="status-active">✅ Đã kết nối</span>
          <span v-else class="status-inactive">— Chưa cấu hình</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const integrations = [
  { id: 'zalo-personal', icon: '💙', name: 'Zalo Cá Nhân', description: 'Kết nối tài khoản Zalo cá nhân qua bridge để nhận/gửi tin nhắn', enabled: true },
  { id: 'slack', icon: '💬', name: 'Slack', description: 'Nhận thông báo hội thoại mới vào Slack channel', enabled: false },
  { id: 'email', icon: '✉️', name: 'Email (SMTP)', description: 'Cấu hình SMTP để gửi email từ KChat', enabled: false },
  { id: 'google-analytics', icon: '📊', name: 'Google Analytics', description: 'Theo dõi hành vi khách hàng trên widget', enabled: false },
  { id: 'dyte', icon: '🎥', name: 'Video Call', description: 'Gọi video/audio trực tiếp trong hội thoại', enabled: false },
  { id: 'openai', icon: '🤖', name: 'OpenAI / AI Assist', description: 'Gợi ý trả lời tự động bằng AI', enabled: false },
  { id: 'stripe', icon: '💳', name: 'Stripe', description: 'Xử lý thanh toán trong hội thoại', enabled: false },
  { id: 'shopify', icon: '🛒', name: 'Shopify', description: 'Xem thông tin đơn hàng của khách hàng', enabled: false },
]
</script>

<style scoped>
.settings-page { height: 100%; background: #f8fafc; }
.page-header { padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
.page-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.page-sub { font-size: 14px; color: #64748b; margin: 0; }

.integrations-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 24px; }

.integration-card {
  background: white; border-radius: 14px; padding: 20px;
  display: flex; align-items: flex-start; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #f1f5f9;
  transition: box-shadow 0.2s;
}

.integration-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.int-icon { font-size: 28px; flex-shrink: 0; }
.int-info { flex: 1; }
.int-name { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.int-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.4; }
.int-status { flex-shrink: 0; }
.status-active { font-size: 12px; color: #15803d; font-weight: 500; }
.status-inactive { font-size: 12px; color: #94a3b8; }
</style>
