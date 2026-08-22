import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Menu, Permission } from '../types'
import { useRequest } from '@/composables/useRequest'
import { generateRoutes } from '../router/dynamicRoutes'
import router from '../router'
import { useTabStore } from './tab'

export const usePermissionStore = defineStore('permission', () => {
  const menus = ref<Menu[]>([])
  const permissions = ref<Permission[]>([])
  const routesLoaded = ref(false)

  /**
   * 纯设置：只改菜单状态 + 生成动态路由。
   * 注意：不再在 setter 内部调用 tabStore.initFixedTabs —— tab 初始化属于应用启动编排，
   * 应由调用方在 loadMenusAndBootstrap 这类编排函数中显式两步调用，避免隐式副作用。
   */
  function setMenus(menuList: Menu[]) {
    const sortedMenus = menuList.sort((a, b) => (a.sort || 0) - (b.sort || 0))
    sortedMenus.forEach((menu) => {
      if (menu.children && menu.children.length > 0) {
        menu.children.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      }
    })
    menus.value = sortedMenus
    generateRoutes(sortedMenus)
    routesLoaded.value = true
    return sortedMenus
  }

  function setPermissions(permissionList: Permission[]) {
    permissions.value = permissionList
  }

  const flatMenus = computed(() => {
    const result: Menu[] = []
    function flatten(menuList: Menu[]) {
      menuList.forEach((menu) => {
        result.push(menu)
        if (menu.children) {
          flatten(menu.children)
        }
      })
    }
    flatten(menus.value)
    return result
  })

  /**
   * 加载菜单 + 应用启动编排（tab 固定项初始化）。
   * 作为对外唯一的启动入口，集中在 router beforeEach 中调用一次。
   */
  async function loadMenusAndBootstrap(): Promise<boolean> {
    if (routesLoaded.value) return true

    try {
      const { data } = await useRequest<Menu[]>('/user/menus').json()
      if (data && data.value) {
        const sorted = setMenus(data.value)
        // 两步显式编排：菜单就绪后才初始化固定 tab
        const tabStore = useTabStore()
        tabStore.initFixedTabs(sorted)
        return true
      }
      return false
    } catch (error) {
      console.error('加载菜单失败:', error)
      return false
    }
  }

  function hasPermission(permissionCode: string): boolean {
    if (!permissions.value.length) return true

    function checkPermission(list: Permission[]): boolean {
      for (const p of list) {
        if (p.code === permissionCode) return true
        if (p.children && checkPermission(p.children)) return true
      }
      return false
    }

    return checkPermission(permissions.value)
  }

  function getMenuByPath(path: string): Menu | undefined {
    return flatMenus.value.find((menu) => menu.path === path)
  }

  function reset() {
    menus.value = []
    permissions.value = []
    routesLoaded.value = false
    if (router.hasRoute('layout')) {
      router.removeRoute('layout')
    }
  }

  return {
    menus,
    permissions,
    routesLoaded,
    setMenus,
    setPermissions,
    flatMenus,
    loadMenusAndBootstrap,
    hasPermission,
    getMenuByPath,
    generateRoutes,
    reset,
  }
})
