<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SiteSelector from './SiteSelector.vue'
import SidebarMenuNestedItem from './SidebarMenuNestedItem.vue'
import NotificationBell from './NotificationBell.vue'
import { APP_TITLE } from '@/constants/app'
import {
  Shield,
  X,
  MoreHorizontal,
  XCircle,
  Layers,
  XSquare,
  ChevronLeft,
  ChevronRightIcon,
  RefreshCw,
  Moon,
  Sun,
  LayoutDashboard,
  Settings,
  Users,
  Key,
  Menu,
  FileText,
  LogIn,
  LogOut,
  User,
  Activity,
  Building2,
  Briefcase,
  BookOpen,
  SlidersHorizontal,
  Bell,
  Globe,
  FileEdit,
  Folder,
  Tags,
  MessageSquare,
  Images,
  Navigation,
  Box,
  Clock,
  Mail,
  Cloud,
  Settings2,
  HardDrive,
  FolderOpen,
} from '@lucide/vue'
import { usePermissionStore } from '@/stores/permission'
import { useTabStore } from '@/stores/tab'
import { useUserStore } from '@/stores/user'
import type { Menu as MenuType } from '@/types'

const router = useRouter()
const route = useRoute()
const permissionStore = usePermissionStore()
const tabStore = useTabStore()
const userStore = useUserStore()

const expandedMenus = ref<Set<string>>(new Set())
const refreshKey = ref(0)
const isRefreshing = ref(false)

document.documentElement.classList.toggle(
  'dark',
  localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
)

const isDark = ref(
  localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
)

function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    localStorage.theme = 'dark'
    document.documentElement.classList.add('dark')
  } else {
    localStorage.theme = 'light'
    document.documentElement.classList.remove('dark')
  }
}

const iconMap: Record<string, unknown> = {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Key,
  Menu,
  FileText,
  LogIn,
  Activity,
  Building2,
  Briefcase,
  BookOpen,
  SlidersHorizontal,
  Bell,
  Globe,
  FileEdit,
  Folder,
  Tags,
  MessageSquare,
  Images,
  Navigation,
  Box,
  Clock,
  Mail,
  Cloud,
  Settings2,
  HardDrive,
  FolderOpen,
}

function getIcon(iconName: string) {
  return iconMap[iconName] || Settings
}

function handleMenuClick(menu: MenuType) {
  if (menu.type === 'm' && menu.path) {
    if (menu.external) {
      window.open(menu.path, '_blank')
    } else {
      const siteId = route.query.siteId as string
      const query = siteId ? { siteId } : {}
      router.push({ path: menu.path, query })
      const queryString = siteId ? `?siteId=${siteId}` : ''
      tabStore.addTab({
        label: menu.name,
        path: menu.path + queryString,
        icon: menu.icon,
        closable: !menu.affix,
      })
    }
  }
}

function handleTabClick(tab: { path: string; external?: boolean }) {
  if (tab.external) {
    window.open(tab.path, '_blank')
  } else {
    router.push(tab.path)
    const foundTab = tabStore.tabs.find((t) => t.path === tab.path)
    if (foundTab) {
      tabStore.setActiveTab(foundTab.id)
    }
  }
}

function handleCloseTab(id: string) {
  tabStore.removeTab(id)
}

function handleCloseCurrent() {
  if (tabStore.activeTabId) {
    const tab = tabStore.tabs.find((t) => t.id === tabStore.activeTabId)
    if (tab?.closable) {
      tabStore.removeTab(tabStore.activeTabId)
    }
  }
}

function handleCloseOther() {
  if (tabStore.activeTabId) {
    tabStore.closeOtherTabs(tabStore.activeTabId)
  }
}

function handleCloseAll() {
  tabStore.closeAllTabs()
}

function handleCloseLeft() {
  if (tabStore.activeTabId) {
    tabStore.closeLeftTabs(tabStore.activeTabId)
  }
}

function handleCloseRight() {
  if (tabStore.activeTabId) {
    tabStore.closeRightTabs(tabStore.activeTabId)
  }
}

async function handleRefresh() {
  isRefreshing.value = true
  refreshKey.value++
  await new Promise((resolve) => setTimeout(resolve, 500))
  isRefreshing.value = false
}

function handleProfileSettings() {
  router.push('/profile')
}

function handleLogout() {
  userStore.logout()
  tabStore.tabs = []
  tabStore.activeTabId = ''
  router.push('/login')
}

watch(
  () => route.path,
  (newPath) => {
    const foundTab = tabStore.tabs.find((t) => t.path === newPath)
    if (foundTab) {
      tabStore.setActiveTab(foundTab.id)
    }
  },
)

watch(
  () => tabStore.activeTabId,
  (newId) => {
    if (newId) {
      const tab = tabStore.tabs.find((t) => t.id === newId)
      if (tab && tab.path !== route.path) {
        router.push(tab.path)
      }
    }
  },
)

onMounted(async () => {
  const currentMenu = permissionStore.getMenuByPath(route.path)
  if (currentMenu) {
    tabStore.addTab({
      label: currentMenu.name,
      path: currentMenu.path,
      icon: currentMenu.icon,
      closable: !currentMenu.affix,
    })
  }
})
</script>

<template>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarHeader
        class="flex flex-row items-center justify-center border-b border-sidebar-border h-14 shrink-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm"
          >
            <Shield class="w-3.5 h-3.5 text-white" />
          </div>
          <span
            class="font-bold text-lg sidebar-title bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400"
            >{{ APP_TITLE }}</span
          >
        </div>
      </SidebarHeader>

      <SidebarContent class="flex-1 overflow-y-auto">
        <SidebarMenu>
          <template v-for="menu in permissionStore.menus || []" :key="menu.id">
            <SidebarMenuNestedItem :menu="menu" @click="handleMenuClick" />
          </template>
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />
    </Sidebar>

    <SidebarInset class="relative" style="height: 100vh">
      <header
        class="flex h-14 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 absolute top-0 left-0 right-0 z-10"
      >
        <SidebarTrigger />

        <SiteSelector />

        <button
          class="p-2 rounded-md hover:bg-secondary hover:text-primary transition-all duration-200"
          :class="{ 'animate-spin text-primary': isRefreshing }"
          @click="handleRefresh"
        >
          <RefreshCw class="w-4 h-4" />
        </button>

        <div class="flex-1"></div>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="flex items-center gap-2.5 p-1 rounded-lg hover:bg-secondary transition-all duration-200 cursor-pointer"
            >
              <div
                class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0"
              >
                {{ userStore.user?.nickname?.charAt(0) || 'U' }}
              </div>
              <span class="text-sm font-medium sidebar-user-name">
                {{ userStore.user?.nickname || '用户' }}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <div class="flex items-center gap-3 p-2 mb-1 border-b border-border">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-base font-semibold shadow-sm"
              >
                {{ userStore.user?.nickname?.charAt(0) || 'U' }}
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium">{{ userStore.user?.nickname || '用户' }}</span>
                <span class="text-xs text-muted-foreground">{{
                  userStore.user?.username || ''
                }}</span>
              </div>
            </div>
            <DropdownMenuItem @select="handleProfileSettings">
              <User class="w-4 h-4 mr-2" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              @select="handleLogout"
              class="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut class="w-4 h-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          class="p-2 rounded-md hover:bg-secondary hover:text-primary transition-all duration-200"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" class="w-4 h-4" />
          <Sun v-else class="w-4 h-4" />
        </button>
      </header>

      <div
        class="absolute top-14 left-0 right-0 h-10 flex items-center gap-2 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10"
      >
        <div
          class="flex items-center gap-1 bg-secondary/70 rounded-lg p-1 overflow-hidden overflow-x-auto tab-scrollbar flex-1"
          style="max-height: 40px"
        >
          <button
            v-for="tab in tabStore.tabs"
            :key="tab.id"
            class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0"
            :class="
              tab.id === tabStore.activeTabId
                ? 'bg-background shadow-sm text-primary font-medium'
                : 'hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
            "
            @click="handleTabClick(tab)"
          >
            <component v-if="tab.icon" :is="getIcon(tab.icon)" class="w-4 h-4" />
            {{ tab.label }}
            <button
              v-if="tab.closable"
              class="p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
              @click.stop="handleCloseTab(tab.id)"
            >
              <X class="w-3 h-3" />
            </button>
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="p-2 rounded-md hover:bg-secondary hover:text-primary transition-all duration-200 flex-shrink-0"
            >
              <MoreHorizontal class="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem @select="handleCloseCurrent">
              <XCircle class="w-4 h-4 mr-2" />
              关闭当前
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="handleCloseOther">
              <Layers class="w-4 h-4 mr-2" />
              关闭其他
            </DropdownMenuItem>
            <DropdownMenuItem @select="handleCloseAll">
              <XSquare class="w-4 h-4 mr-2" />
              关闭全部
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="handleCloseLeft">
              <ChevronLeft class="w-4 h-4 mr-2" />
              关闭左侧所有
            </DropdownMenuItem>
            <DropdownMenuItem @select="handleCloseRight">
              <ChevronRightIcon class="w-4 h-4 mr-2" />
              关闭右侧所有
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        class="absolute top-24 left-0 right-0 bottom-0 overflow-auto bg-muted/30 dark:bg-muted/10"
      >
        <router-view :key="refreshKey" v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<style>
body {
  overflow: hidden;
}

.group[data-state='collapsed'] .sidebar-title,
.group[data-state='collapsed'] .sidebar-user-name {
  display: none !important;
}

/* 页面切换过渡动画 */
.page-enter-active {
  animation: page-enter 0.3s ease-out;
}
.page-leave-active {
  animation: page-leave 0.2s ease-in;
}
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes page-leave {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.tab-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted)) transparent;
}

.tab-scrollbar::-webkit-scrollbar {
  height: 4px;
}

.tab-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.tab-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted));
  border-radius: 2px;
}

.tab-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
</style>
