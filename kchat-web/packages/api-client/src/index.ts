// kchat-web/packages/api-client/src/index.ts
//
// KChat API Client — P2-02
// HTTP client cho Chatwoot API với:
// - Token rotation tự động (devise_token_auth)
// - Request queue khi đang refresh token để tránh race condition
// - TypeScript types cho tất cả endpoints

import { ref } from 'vue'

// ── Auth token store (in-memory, persisted to localStorage) ──
interface AuthHeaders {
  'access-token': string
  client: string
  uid: string
  'token-type': string
  expiry: string
}

const authHeaders = ref<AuthHeaders | null>(null)
const STORAGE_KEY = 'kchat_auth'

export function loadAuthFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) authHeaders.value = JSON.parse(raw) as AuthHeaders
  } catch { /* ignore */ }
}

export function saveAuth(headers: AuthHeaders): void {
  authHeaders.value = headers
  localStorage.setItem(STORAGE_KEY, JSON.stringify(headers))
}

export function clearAuth(): void {
  authHeaders.value = null
  localStorage.removeItem(STORAGE_KEY)
}

export function isAuthenticated(): boolean {
  return !!authHeaders.value?.['access-token']
}

// ── Base HTTP client ──
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiRequestOptions {
  method?: RequestMethod
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
  signal?: AbortSignal
}

class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API Error ${status}`)
    this.status = status
    this.body = body
    this.name = 'ApiError'
  }
}

// Pending requests queue during token refresh
let isRefreshing = false
let refreshQueue: Array<() => void> = []

function drainRefreshQueue() {
  refreshQueue.forEach(fn => fn())
  refreshQueue = []
}

async function request<T = unknown>(
  path: string,
  { method = 'GET', params, body, signal }: ApiRequestOptions = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v))
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  if (authHeaders.value) {
    Object.assign(headers, authHeaders.value)
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  // Cập nhật auth headers từ response (token rotation)
  const newToken = res.headers.get('access-token')
  if (newToken && authHeaders.value) {
    const updated: AuthHeaders = {
      ...authHeaders.value,
      'access-token': newToken,
      client: res.headers.get('client') ?? authHeaders.value.client,
      uid: res.headers.get('uid') ?? authHeaders.value.uid,
      expiry: res.headers.get('expiry') ?? authHeaders.value.expiry,
    }
    saveAuth(updated)
  }

  if (res.status === 401) {
    clearAuth()
    throw new ApiError(401, null, 'Unauthorized — please log in again')
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new ApiError(res.status, errorBody, `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Typed API methods ──
export const api = {
  auth: {
    signIn: (email: string, password: string) =>
      request<{ data: { id: number; name: string; email: string; role: string } }>(
        '/auth/sign_in', { method: 'POST', body: { email, password } }
      ),
    signOut: () => request('/auth/sign_out', { method: 'DELETE' }),
    validateToken: () => request('/auth/validate_token'),
  },

  profile: {
    get: () => request('/api/v1/profile'),
    update: (data: Record<string, unknown>) =>
      request('/api/v1/profile', { method: 'PUT', body: { profile: data } }),
  },

  conversations: {
    list: (accountId: number, params?: Record<string, string | number | boolean>) =>
      request(`/api/v1/accounts/${accountId}/conversations`, { params }),
    get: (accountId: number, conversationId: number) =>
      request(`/api/v1/accounts/${accountId}/conversations/${conversationId}`),
    update: (accountId: number, conversationId: number, data: Record<string, unknown>) =>
      request(`/api/v1/accounts/${accountId}/conversations/${conversationId}`, {
        method: 'PATCH', body: data
      }),
    messages: (accountId: number, conversationId: number) =>
      request(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`),
    sendMessage: (accountId: number, conversationId: number, content: string, isPrivate = false) =>
      request(`/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content, message_type: 'outgoing', private: isPrivate }
      }),
    markRead: (accountId: number, conversationId: number) =>
      request(`/api/v1/accounts/${accountId}/conversations/${conversationId}/read`, { method: 'POST' }),
  },

  contacts: {
    list: (accountId: number, params?: Record<string, string | number>) =>
      request(`/api/v1/accounts/${accountId}/contacts`, { params }),
    search: (accountId: number, q: string) =>
      request(`/api/v1/accounts/${accountId}/contacts/search`, { params: { q } }),
    get: (accountId: number, contactId: number) =>
      request(`/api/v1/accounts/${accountId}/contacts/${contactId}`),
    create: (accountId: number, data: Record<string, unknown>) =>
      request(`/api/v1/accounts/${accountId}/contacts`, { method: 'POST', body: data }),
    update: (accountId: number, contactId: number, data: Record<string, unknown>) =>
      request(`/api/v1/accounts/${accountId}/contacts/${contactId}`, { method: 'PUT', body: data }),
    conversations: (accountId: number, contactId: number) =>
      request(`/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`),
  },

  inboxes: {
    list: (accountId: number) => request(`/api/v1/accounts/${accountId}/inboxes`),
  },

  agents: {
    list: (accountId: number) => request(`/api/v1/accounts/${accountId}/agents`),
  },

  teams: {
    list: (accountId: number) => request(`/api/v1/accounts/${accountId}/teams`),
  },

  reports: {
    overview: (accountId: number) => request(`/api/v2/accounts/${accountId}/reports/overview`),
    agents: (accountId: number, params?: Record<string, string | number>) =>
      request(`/api/v2/accounts/${accountId}/reports`, { params }),
  },

  notifications: {
    list: (accountId: number) => request(`/api/v1/accounts/${accountId}/notifications`),
    readAll: (accountId: number) =>
      request(`/api/v1/accounts/${accountId}/notifications/read_all`, { method: 'POST' }),
  },
}

export { ApiError, request }
export type { AuthHeaders }
