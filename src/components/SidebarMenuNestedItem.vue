<script setup lang="ts">
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from '@lucide/vue'
import {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Key,
  Menu as MenuIcon,
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
  Layers,
} from '@lucide/vue'
import type { Menu } from '@/types'

defineProps<{
  menu: Menu
}>()

const emit = defineEmits<{
  (e: 'click', menu: Menu): void
}>()

function getIcon(iconName: string | undefined): unknown {
  const iconMap: Record<string, unknown> = {
    LayoutDashboard,
    Settings,
    Users,
    Shield,
    Key,
    Menu: MenuIcon,
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
    Layers,
  }
  return iconMap[iconName || 'Menu'] || MenuIcon
}
</script>

<template>
  <template v-if="menu.type === 'm' && !menu.children?.length">
    <SidebarMenuItem>
      <SidebarMenuButton
        :is-active="menu.path === $route.path"
        @click="emit('click', menu)"
      >
        <component :is="getIcon(menu.icon)" class="w-4 h-4" />
        <span>{{ menu.name }}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </template>
  <template v-else-if="menu.type === 'd' || (menu.type === 'm' && menu.children?.length)">
    <Collapsible :default-open="true">
      <SidebarMenuItem>
        <CollapsibleTrigger as-child>
          <SidebarMenuButton class="w-full">
            <component :is="getIcon(menu.icon)" class="w-4 h-4" />
            <span class="flex-1">{{ menu.name }}</span>
            <ChevronDown class="h-4 w-4 transition-transform" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent>
        <div class="pl-4 space-y-1">
          <SidebarMenuNestedItem
            v-for="child in menu.children || []"
            :key="child.id"
            :menu="child"
            @click="emit('click', $event)"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  </template>
</template>
