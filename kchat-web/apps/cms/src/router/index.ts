// kchat-web/apps/cms/src/router/index.ts
// KChat CMS Router — P2-05
// Route guard theo quyền: administrator/agent
// Lazy loading cho tất cả pages

import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '@kchat/api-client'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Public routes ──
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/auth/ForgotPasswordView.vue'),
      meta: { public: true },
    },

    // ── Authenticated routes ──
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/conversations',
        },

        // ── Conversations ──
        {
          path: 'conversations',
          name: 'conversations',
          component: () => import('../views/conversations/ConversationsView.vue'),
        },
        {
          path: 'conversations/:conversationId',
          name: 'conversation-detail',
          component: () => import('../views/conversations/ConversationDetailView.vue'),
          props: true,
        },

        // ── Contacts ──
        {
          path: 'contacts',
          name: 'contacts',
          component: () => import('../views/contacts/ContactsView.vue'),
        },
        {
          path: 'contacts/:contactId',
          name: 'contact-detail',
          component: () => import('../views/contacts/ContactDetailView.vue'),
          props: true,
        },

        // ── Reports ──
        {
          path: 'reports',
          name: 'reports',
          component: () => import('../views/reports/ReportsView.vue'),
          meta: { requiresRole: 'administrator' },
        },

        // ── Settings (admin only) ──
        {
          path: 'settings',
          meta: { requiresRole: 'administrator' },
          children: [
            {
              path: 'inboxes',
              name: 'settings-inboxes',
              component: () => import('../views/settings/InboxesView.vue'),
            },
            {
              path: 'agents',
              name: 'settings-agents',
              component: () => import('../views/settings/AgentsView.vue'),
            },
            {
              path: 'teams',
              name: 'settings-teams',
              component: () => import('../views/settings/TeamsView.vue'),
            },
            {
              path: 'labels',
              name: 'settings-labels',
              component: () => import('../views/settings/LabelsView.vue'),
            },
            {
              path: 'automations',
              name: 'settings-automations',
              component: () => import('../views/settings/AutomationsView.vue'),
            },
            {
              path: 'webhooks',
              name: 'settings-webhooks',
              component: () => import('../views/settings/WebhooksView.vue'),
            },
            {
              path: 'integrations',
              name: 'settings-integrations',
              component: () => import('../views/settings/IntegrationsView.vue'),
            },
          ],
        },

        // ── Profile ──
        {
          path: 'profile',
          name: 'profile',
          component: () => import('../views/profile/ProfileView.vue'),
        },
      ],
    },

    // ── 403 / 404 ──
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('../views/errors/ForbiddenView.vue'),
      meta: { public: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/errors/NotFoundView.vue'),
      meta: { public: true },
    },
  ],
})

// ── Route guards ──
router.beforeEach((to) => {
  const isPublic = to.meta.public === true

  if (!isPublic && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (isPublic && isAuthenticated() && to.name === 'login') {
    return { path: '/conversations' }
  }

  return true
})
