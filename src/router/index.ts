import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { siteApi, userApi } from '@/api'
import { isTokenEnabled } from '@/composables/useAuth'

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

  if (to.path === '/login') {
    if (isAuthenticated()) {
      const { data } = await siteApi.getAll()
      const sites = data.value as unknown as { id: string }[]
      const firstSiteId = sites.find((s) => s.id)?.id
      return { path: '/dashboard', query: firstSiteId ? { siteId: firstSiteId } : {} }
    }
    return true
  }

  // 未登录判定：
  // - token 模式：token 为空 → 跳登录
  // - 非 token 模式：user 为空时调 /user/info 验证 cookie 会话，
  //   接口成功则恢复 user，失败（会话过期）则跳登录
  if (tokenMode) {
    if (!userStore.getToken()) return '/login'
  } else if (!userStore.user) {
    try {
      const { data } = await userApi.getInfo()
      if (data.value) {
        userStore.setUser(data.value)
      } else {
        return '/login'
      }
    } catch {
      return '/login'
    }
  }

  // 页面刷新时从接口恢复用户信息（token 模式下 user 可能为空）
  if (!userStore.user) {
    try {
      const { data } = await userApi.getInfo()
      if (data.value) {
        userStore.setUser(data.value)
      } else {
        userStore.logout()
        return '/login'
      }
    } catch {
      userStore.logout()
      return '/login'
    }
  }

  if (!permissionStore.routesLoaded) {
    const success = await permissionStore.loadMenusAndBootstrap()
    if (success) {
      return { ...to, replace: true }
    }
    return '/login'
  }

  return true
})

export default router
