import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // Redirect root URL directly to the chat interface
  { path: '/', redirect: '/chat' },

  // Explicitly register the /login path to prevent navigation loops
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true } // Used by guard to identify guest-only pages
  },

  // Authentication Magic Link verification handler
  {
    path: '/auth/verify',
    name: 'Verify',
    component: () => import('@/pages/VerifyPage.vue'),
  },

  // Google OAuth callback landing portal
  {
    path: '/oauth/callback',
    name: 'OAuthCallback',
    component: () => import('@/pages/OAuthCallbackPage.vue'),
  },

  // Main Chat page (accessible to both anonymous guests and logged-in users)
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/pages/ChatPage.vue'),
  },

  // Dynamic route for fetching historical chat sessions by unique ID
  {
    path: '/chat/:id',
    name: 'ChatDetail',
    component: () => import('@/pages/ChatPage.vue'),
  },

  // Wildcard catch-all route: redirects any unrecognized paths safely back to /login
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global Navigation Guard to manage session restrictions
router.beforeEach((to) => {
  const auth = useAuthStore()
  
  // If a user is already authenticated, restrict them from backtracking into guest-only pages (like /login)
  if (to.meta.guest && auth.isLoggedIn) {
    return '/chat'
  }
})

export default router