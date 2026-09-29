// kchat-web/apps/cms/src/composables/useI18n.ts
// KChat i18n — P2-07
// Vi/En locale, formatDate, formatNumber

export type Locale = 'vi' | 'en'

const vi = {
  common: {
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    edit: 'Sửa',
    create: 'Tạo mới',
    search: 'Tìm kiếm',
    filter: 'Lọc',
    loading: 'Đang tải...',
    empty: 'Không có dữ liệu',
    confirm: 'Xác nhận',
    back: 'Quay lại',
    close: 'Đóng',
    submit: 'Gửi',
    yes: 'Có',
    no: 'Không',
    all: 'Tất cả',
  },
  auth: {
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    email: 'Email',
    password: 'Mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    loginFailed: 'Đăng nhập thất bại. Vui lòng kiểm tra lại.',
    sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  },
  conversations: {
    title: 'Hội thoại',
    mine: 'Của tôi',
    unassigned: 'Chưa gán',
    all: 'Tất cả',
    open: 'Đang mở',
    resolved: 'Đã giải quyết',
    pending: 'Chờ xử lý',
    snoozed: 'Tạm hoãn',
    resolve: 'Giải quyết',
    reopen: 'Mở lại',
    reply: 'Trả lời',
    note: 'Ghi chú',
    send: 'Gửi',
    privateNote: 'Ghi chú nội bộ (chỉ agent thấy)',
    assign: 'Gán agent',
    unassigned_label: 'Chưa gán',
    noConversations: 'Không có hội thoại nào',
  },
  contacts: {
    title: 'Contacts',
    name: 'Tên',
    email: 'Email',
    phone: 'Điện thoại',
    conversations: 'Hội thoại',
    create: 'Tạo contact',
    noContacts: 'Không có contact nào',
  },
  reports: {
    title: 'Báo cáo',
    newConversations: 'Hội thoại mới',
    resolved: 'Đã giải quyết',
    avgFirstResponse: 'Thời gian phản hồi TB',
    agentsOnline: 'Agents online',
  },
  settings: {
    title: 'Cài đặt',
    inboxes: 'Inboxes',
    agents: 'Agents',
    teams: 'Teams',
    labels: 'Labels',
    automations: 'Tự động hóa',
    webhooks: 'Webhooks',
    integrations: 'Tích hợp',
  },
  notifications: {
    title: 'Thông báo',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    noNotifications: 'Không có thông báo',
  },
}

const en: typeof vi = {
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    create: 'Create', search: 'Search', filter: 'Filter', loading: 'Loading...',
    empty: 'No data', confirm: 'Confirm', back: 'Back', close: 'Close',
    submit: 'Submit', yes: 'Yes', no: 'No', all: 'All',
  },
  auth: {
    login: 'Sign In', logout: 'Sign Out', email: 'Email', password: 'Password',
    forgotPassword: 'Forgot password?', loginFailed: 'Login failed. Please check your credentials.',
    sessionExpired: 'Session expired. Please sign in again.',
  },
  conversations: {
    title: 'Conversations', mine: 'Mine', unassigned: 'Unassigned', all: 'All',
    open: 'Open', resolved: 'Resolved', pending: 'Pending', snoozed: 'Snoozed',
    resolve: 'Resolve', reopen: 'Reopen', reply: 'Reply', note: 'Note', send: 'Send',
    privateNote: 'Private note (agents only)', assign: 'Assign agent',
    unassigned_label: 'Unassigned', noConversations: 'No conversations',
  },
  contacts: {
    title: 'Contacts', name: 'Name', email: 'Email', phone: 'Phone',
    conversations: 'Conversations', create: 'Create contact', noContacts: 'No contacts',
  },
  reports: {
    title: 'Reports', newConversations: 'New conversations', resolved: 'Resolved',
    avgFirstResponse: 'Avg First Response', agentsOnline: 'Agents online',
  },
  settings: {
    title: 'Settings', inboxes: 'Inboxes', agents: 'Agents', teams: 'Teams',
    labels: 'Labels', automations: 'Automations', webhooks: 'Webhooks', integrations: 'Integrations',
  },
  notifications: {
    title: 'Notifications', markAllRead: 'Mark all as read', noNotifications: 'No notifications',
  },
}

const MESSAGES = { vi, en } as const

import { ref, computed } from 'vue'

const currentLocale = ref<Locale>((localStorage.getItem('kchat_locale') as Locale) ?? 'vi')

export function useKI18n() {
  const locale = currentLocale

  const t = computed(() => {
    const msgs = MESSAGES[locale.value]
    return msgs
  })

  function setLocale(l: Locale) {
    currentLocale.value = l
    localStorage.setItem('kchat_locale', l)
    document.documentElement.lang = l
  }

  function formatDate(ts: string | number, style: 'short' | 'long' | 'relative' = 'relative'): string {
    const date = new Date(ts)
    const dtf = new Intl.DateTimeFormat(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: style === 'long' ? 'long' : 'short',
      timeStyle: style === 'short' ? 'short' : undefined,
    })

    if (style === 'relative') {
      const diff = Date.now() - date.getTime()
      const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
      if (diff < 60_000)  return locale.value === 'vi' ? 'vừa xong' : 'just now'
      if (diff < 3_600_000) return rtf.format(-Math.round(diff / 60_000), 'minute')
      if (diff < 86_400_000) return rtf.format(-Math.round(diff / 3_600_000), 'hour')
      return rtf.format(-Math.round(diff / 86_400_000), 'day')
    }

    return dtf.format(date)
  }

  function formatNumber(n: number): string {
    return new Intl.NumberFormat(locale.value === 'vi' ? 'vi-VN' : 'en-US').format(n)
  }

  return { locale, t, setLocale, formatDate, formatNumber }
}
