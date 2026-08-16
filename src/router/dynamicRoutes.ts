import type { Menu } from '../types'
import type { RouteRecordRaw } from 'vue-router'
import router from './index'

const views = import.meta.glob('../views/**/*.vue')

/**
 * 基于菜单树动态生成路由。
 *
 * 目录型菜单 (type='d') 不产生路由，只做视觉分组；
 * 菜单型菜单 (type='m') 生成独立路由，通过 component 字段匹配 views 下的 .vue 文件。
 * 硬编码的额外路由（编辑器、个人设置、404）也统一在此处挂载。
 *
 * 注：本函数原先内联在 permission store 的 `setMenus` 内部（与 tab store 强耦合），
 * 现独立抽出，避免"修改菜单状态还会顺便改路由和 tab 初始化"这种隐式副作用。
 */
export function generateRoutes(menuList: Menu[]): void {
  if (router.hasRoute('layout')) {
    router.removeRoute('layout')
  }

  const routes: RouteRecordRaw[] = []

  function processMenu(menu: Menu) {
    if (menu.type === 'm' && menu.component && menu.path) {
      const componentPath = `../views/${menu.component}.vue`
      const component = views[componentPath]
      if (component) {
        routes.push({
          path: menu.path,
          name: `menu-${menu.id}`,
          component,
          meta: {
            title: menu.name,
            icon: menu.icon,
            permission: menu.permission,
            menuId: menu.id,
            affix: menu.affix,
          },
        })
      }
    }

    if (menu.children) {
      menu.children.forEach((child) => processMenu(child))
    }
  }

  menuList.forEach((menu) => processMenu(menu))

  router.addRoute({
    path: '/',
    name: 'layout',
    component: () => import('../components/Layout.vue'),
    redirect: '/dashboard',
    children: [
      ...routes,
      {
        path: '/articles/editor',
        name: 'article-editor',
        component: () => import('../views/cms/articles/editor.vue'),
        meta: { title: '文章编辑' },
      },
      {
        path: '/pages/content',
        name: 'page-content',
        component: () => import('../views/cms/pages/content.vue'),
        meta: { title: '页面内容编辑' },
      },
      {
        path: '/profile',
        name: 'profile',
        component: () => import('../views/profile/index.vue'),
        meta: { title: '个人设置' },
      },
    ],
  })

  router.addRoute({
    path: '/:pathMatch(.*)*',
    name: '404',
    component: () => import('../views/404/index.vue'),
  })
}
