import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { siteApi, userApi } from '@/api'
import { isTokenEnabled } from '@/composables/useAuth'
import { preloadAllDict } from '@/composables/useDict'
import { LOGIN_PATH, HOME_PATH } from '@/constants/app'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/index.vue'),
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('../views/403/index.vue'),
    },
    {
      path: '/500',
      name: 'server-error',
      component: () => import('../views/500/index.vue'),
    },
  ],
})

/**
 * 判断当前是否已登录。
 * - token 模式：token 非空即已登录
 * - 非 token 模式（cookie 会话）：userStore.user 非空即已登录；
 *   页面刷新时 user 为空，由路由守卫调 /user/info 验证会话
 */
function isAuthenticated(): boolean {
  const userStore = useUserStore()
  return isTokenEnabled() ? !!userStore.getToken() : !!userStore.user
}

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const tokenMode = isTokenEnabled()

  if (to.path === LOGIN_PATH) {
    if (isAuthenticated()) {
      const { data } = await siteApi.getAll()
      const sites = data.value as unknown as { id: string }[]
      const firstSiteId = sites.find((s) => s.id)?.id
      return { path: HOME_PATH, query: firstSiteId ? { siteId: firstSiteId } : {} }
    }
    return true
  }

  // 统一的登录态校验 + 用户信息恢复
  // - token 模式：token 为空直接跳登录；有 token 但 user 为空则调接口恢复
  // - cookie 模式：user 为空时调 /user/info 验证会话
  // 两种模式最终都通过 ensureUserInfo() 合并为一次 /user/info 调用
  async function ensureUserInfo(): Promise<boolean> {
    if (userStore.user) return true
    try {
      const { data } = await userApi.getInfo()
      if (data.value) {
        userStore.setUser(data.value)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  if (tokenMode) {
    if (!userStore.getToken()) return LOGIN_PATH
  }

  const hasUser = await ensureUserInfo()
  if (!hasUser) {
    if (tokenMode) userStore.logout()
    return LOGIN_PATH
  }

  if (!permissionStore.routesLoaded) {
    const success = await permissionStore.loadMenusAndBootstrap()
    if (success) {
      // 登录后后台静默预加载全部字典（不阻塞路由）
      preloadAllDict().catch(() => {
        /* 预加载失败不影响使用，useDict 会按需单条加载 */
      })
      return { ...to, replace: true }
    }
    return LOGIN_PATH
  }

  return true
})

export default router
