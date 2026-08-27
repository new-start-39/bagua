import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from '../composables/useSession.js'

const routes = [
  { path: '/', name: 'divination', component: () => import('../pages/DivinationPage.vue') },
  { path: '/result/:castId', name: 'result', component: () => import('../pages/ResultPage.vue'), props: true },
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
  { path: '/register', name: 'register', component: () => import('../pages/RegisterPage.vue') },
  { path: '/ai/:castId', name: 'ai-init', component: () => import('../pages/AiConversationPage.vue'), meta: { requiresAuth: true } },
  { path: '/ai/conversations/:conversationId', name: 'ai-conversation', component: () => import('../pages/AiConversationPage.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
]

export const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const session = useSession()
  try {
    await session.ensureSession()
  } catch {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (session.state.value === 'authenticated') return true
  return { name: 'login', query: { redirect: to.fullPath } }
})
