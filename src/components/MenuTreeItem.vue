<script setup lang="ts">
import { ChevronRight, Eye, EyeOff, Plus, Edit, Trash2, GripVertical, LayoutDashboard, Settings, Users, Shield, Key, Menu as MenuIcon } from '@lucide/vue'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import type { Menu } from '@/types'
import Sortable from 'sortablejs'
import { useDict } from '@/composables/useDict'
import TreeGuides from './TreeGuides.vue'

const { getLabel: getTypeLabel } = useDict('menu_type')

const iconMap: Record<string, unknown> = {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Key,
  Menu: MenuIcon,
}

function getIcon(iconName: string) {
  return iconMap[iconName] || MenuIcon
}

const props = defineProps<{
  menu: Menu
  level: number
  showActions?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', parentId: string): void
  (e: 'edit', menu: Menu): void
  (e: 'delete', id: string): void
  (e: 'sort', menus: Menu[]): void
}>()

const isExpanded = ref(props.level === 0)
const childrenContainerRef = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}



onMounted(() => {
  nextTick(() => {
    if (childrenContainerRef.value && props.menu.children && props.menu.children.length > 0) {
      sortable = new Sortable(childrenContainerRef.value, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'opacity-50',
        dragClass: 'bg-muted',
        onEnd(evt) {
          const { oldIndex, newIndex } = evt
          if (oldIndex == null || newIndex == null) return
          if (oldIndex === newIndex || !props.menu.children) return

          const children = [...props.menu.children]
          const [moved] = children.splice(oldIndex, 1)
          if (!moved) return
          children.splice(newIndex, 0, moved)

          children.forEach((child, index) => {
            child.sort = index * 10
          })

          emit('sort', children)
        },
      })
    }
  })
})

onUnmounted(() => {
  if (sortable) {
    sortable.destroy()
    sortable = null
  }
})
</script>

<template>
  <div>
    <div class="flex items-center gap-2 px-2 h-10 hover:bg-muted/50 transition-colors group">
      <button
        v-if="menu.children && menu.children.length > 0"
        @click="toggleExpand"
        class="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors shrink-0"
      >
        <ChevronRight
          class="w-4 h-4 text-muted-foreground transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <span v-else class="w-6 shrink-0"></span>

      <span class="w-8 shrink-0 flex items-center justify-center relative">
        <component
          :is="getIcon(menu.icon || 'Menu')"
          class="w-4 h-4 text-primary group-hover:opacity-0 transition-opacity"
        />
        <span
          class="drag-handle cursor-grab active:cursor-grabbing absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical class="w-4 h-4 text-muted-foreground" />
        </span>
      </span>

      <span class="flex-1 min-w-0 flex items-center gap-1.5">
        <TreeGuides v-if="level > 0" :level="level" />
        <span class="flex-1 min-w-0 truncate font-medium">{{ menu.name }}</span>
        <span v-if="menu.children?.length" class="text-xs text-muted-foreground shrink-0"
          >({{ menu.children.length }})</span
        >
      </span>

      <span class="w-40 hidden md:block text-xs text-muted-foreground truncate font-mono">{{
        menu.path
      }}</span>

      <span class="w-20 hidden lg:block">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          :class="'bg-secondary text-secondary-foreground'"
        >
          {{ getTypeLabel(menu.type) }}
        </span>
      </span>

      <span class="w-40 hidden lg:block text-xs text-muted-foreground truncate font-mono">{{
        menu.permission || '-'
      }}</span>

      <span class="w-32 hidden xl:block text-xs text-muted-foreground truncate font-mono">{{
        menu.component || '-'
      }}</span>

      <span class="w-16 text-center hidden md:block text-sm text-muted-foreground">{{
        menu.sort
      }}</span>

      <span class="w-20 text-center hidden lg:block">
        <span v-if="menu.visible" class="inline-flex items-center gap-1 text-xs text-green-600">
          <Eye class="w-3 h-3" />
        </span>
        <span v-else class="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <EyeOff class="w-3 h-3" />
        </span>
      </span>

      <span v-if="showActions" class="w-24 flex items-center justify-end gap-0.5 shrink-0">
        <Button
          v-if="menu.type === 'd'"
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 hover:text-primary"
          @click="emit('add', menu.id)"
        >
          <Plus class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 hover:text-primary"
          @click="emit('edit', menu)"
        >
          <Edit class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 text-red-500 hover:text-red-600"
          @click="emit('delete', menu.id)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </Button>
      </span>
    </div>

    <div
      v-if="menu.children && menu.children.length > 0"
      v-show="isExpanded"
      ref="childrenContainerRef"
    >
      <MenuTreeItem
        v-for="child in menu.children"
        :key="child.id"
        :menu="child"
        :level="level + 1"
        :show-actions="showActions"
        @add="emit('add', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @sort="emit('sort', $event)"
      />
    </div>
  </div>
</template>
