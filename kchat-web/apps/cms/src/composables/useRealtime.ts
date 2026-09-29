// kchat-web/apps/cms/src/composables/useRealtime.ts
// KChat Realtime — P2-06
// ActionCable subscriber cho RoomChannel
// Xử lý toàn bộ events từ action_cable_listener.rb

import { onMounted, onUnmounted, ref } from 'vue'
import { createConsumer, type Consumer, type Subscription } from '@rails/actioncable'
import { useAuthStore } from '../stores/auth'

type EventHandler = (data: unknown) => void

// Singleton consumer cho toàn app (tránh mở nhiều WebSocket connections)
let consumer: Consumer | null = null

function getConsumer(): Consumer {
  if (!consumer) {
    const wsUrl = import.meta.env.VITE_WS_URL ?? '/cable'
    consumer = createConsumer(wsUrl)
  }
  return consumer
}

// Tất cả event types từ action_cable_listener.rb của Chatwoot
export type CableEventType =
  | 'conversation.created'
  | 'conversation.status_changed'
  | 'conversation.assignee_changed'
  | 'conversation.contact_changed'
  | 'conversation.updated'
  | 'conversation.read'
  | 'message.created'
  | 'message.updated'
  | 'message.deleted'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'presence.update'
  | 'user.created'
  | 'user.updated'
  | 'conversation_participant.created'
  | 'conversation_participant.deleted'
  | 'account_authorization'
  | 'notification.created'
  | 'notification.updated'

export function useRealtime(accountId: number, handlers: Partial<Record<CableEventType, EventHandler>>) {
  const subscription = ref<Subscription | null>(null)
  const isConnected = ref(false)
  const retryCount = ref(0)
  const MAX_RETRIES = 5

  function connect() {
    subscription.value = getConsumer().subscriptions.create(
      { channel: 'RoomChannel', account_id: accountId },
      {
        connected() {
          isConnected.value = true
          retryCount.value = 0
          console.info(`[KChat Realtime] Connected to account #${accountId}`)
        },

        disconnected() {
          isConnected.value = false
          console.warn('[KChat Realtime] Disconnected')
          // Auto-reconnect với exponential backoff
          if (retryCount.value < MAX_RETRIES) {
            const delay = Math.min(1000 * 2 ** retryCount.value, 30_000)
            retryCount.value++
            setTimeout(connect, delay)
          }
        },

        rejected() {
          isConnected.value = false
          console.error('[KChat Realtime] Subscription rejected')
        },

        received(data: { event?: string; [key: string]: unknown }) {
          const event = data?.event as CableEventType | undefined
          if (event && handlers[event]) {
            handlers[event]!(data)
          }
        },
      }
    )
  }

  onMounted(connect)

  onUnmounted(() => {
    subscription.value?.unsubscribe()
    subscription.value = null
  })

  return { isConnected, retryCount }
}

// Cleanup consumer khi app unmount (HMR)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    consumer?.disconnect()
    consumer = null
  })
}
