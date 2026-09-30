import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// KChat CMS — Vite config
// - Proxy /api/* và /auth/* sang Rails API server (CW_API_ONLY_SERVER)
// - WebSocket proxy cho ActionCable (/cable)

const API_TARGET = process.env.VITE_API_URL ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [vue()],

  // Override root postcss.config.js (Chatwoot/Rails) — chỉ dùng autoprefixer
  css: {
    postcss: {
      plugins: [],
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@kchat/ui': fileURLToPath(new URL('../../packages/ui/src', import.meta.url)),
      '@kchat/api-client': fileURLToPath(new URL('../../packages/api-client/src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: API_TARGET, changeOrigin: true },
      '/api': { target: API_TARGET, changeOrigin: true },
      '/cable': {
        target: API_TARGET.replace('http', 'ws'),
        ws: true,
        changeOrigin: true,
      },
      '/rails': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-tanstack': ['@tanstack/vue-query', '@tanstack/vue-table'],
          'vendor-tiptap': ['@tiptap/core', '@tiptap/vue-3'],
          'vendor-echarts': ['echarts'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
