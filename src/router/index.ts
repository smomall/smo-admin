import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { siteApi, userApi } from '@/api'

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

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const token = userStore.getToken()

  if (to.path === '/login') {
    if (token) {
      const { data } = await siteApi.getAll()
      const sites = data.value as unknown as { id: string }[]
      const firstSiteId = sites.find((s) => s.id)?.id
      return { path: '/dashboard', query: firstSiteId ? { siteId: firstSiteId } : {} }
    }
    return true
  }

  if (!token) {
    return '/login'
  }

  // 页面刷新时从 token 恢复用户信息
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
    const success = await permissionStore.loadMenus()
    if (success) {
      return { ...to, replace: true }
    }
    return '/login'
  }

  return true
})

export default router
