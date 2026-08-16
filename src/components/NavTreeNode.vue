<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Edit, Trash2, ChevronRight, Eye, EyeOff, ExternalLink } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { NavItem } from '@/types'
import TreeGuides from './TreeGuides.vue'
import { getLinkTypeColor } from '@/constants/nav'

const props = defineProps<{
  item: NavItem
  level: number
  expandedIds: Record<string, boolean>
  getStatusLabel: (value: string | number | undefined) => string
  getLinkTypeText: (value: string | number | undefined) => string
  getTargetText: (value: string | undefined) => string
}>()

const emit = defineEmits<{
  (e: 'toggle-expand', id: string): void
  (e: 'add', parentId: string): void
  (e: 'edit', item: NavItem): void
  (e: 'delete', id: string): void
}>()

const hasChildren = computed(() => props.item.children && props.item.children!.length > 0)
const isExpanded = computed(() => !!props.expandedIds[props.item.id])
</script>

<template>
  <div>
    <!-- 当前项 -->
    <div class="flex items-center gap-2 px-2 h-10 hover:bg-muted/50 transition-colors group">
      <button
        v-if="hasChildren"
        @click="emit('toggle-expand', item.id)"
        class="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors shrink-0"
      >
        <ChevronRight
          class="w-4 h-4 text-muted-foreground transition-transform"
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <span v-else class="w-6 shrink-0"></span>
      <span class="w-8 shrink-0 flex items-center justify-center">
        <span v-if="item.icon" class="text-sm">{{ item.icon }}</span>
      </span>
      <span
        class="w-32 shrink-0 hidden xl:block text-xs text-muted-foreground font-mono min-w-0 truncate"
        :title="item.id"
        >{{ item.id }}</span
      >
      <span class="flex-1 min-w-0 flex items-center gap-1.5">
        <TreeGuides v-if="level > 0" :level="level" />
        <span class="flex-1 min-w-0 truncate">{{ item.title }}</span>
        <span v-if="hasChildren" class="text-xs text-muted-foreground shrink-0"
          >({{ item.children!.length }})</span
        >
      </span>
      <span class="w-20 hidden md:block">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          :class="getLinkTypeColor(item.linkType)"
        >
          {{ getLinkTypeText(item.linkType) }}
        </span>
      </span>
      <span class="w-40 hidden lg:block text-xs text-muted-foreground truncate font-mono">{{
        item.linkUrl || item.linkId || '-'
      }}</span>
      <span class="w-20 hidden lg:block">
        <span
          v-if="item.target"
          class="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ExternalLink class="w-3 h-3" />
          {{ getTargetText(item.target) }}
        </span>
        <span v-else class="text-xs text-muted-foreground">-</span>
      </span>
      <span class="w-16 text-center hidden md:block text-sm text-muted-foreground">{{
        item.sort ?? 0
      }}</span>
      <span class="w-16 text-center hidden lg:block">
        <span
          v-if="item.visible !== false"
          class="inline-flex items-center gap-1 text-xs text-green-600"
        >
          <Eye class="w-3 h-3" />
        </span>
        <span v-else class="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <EyeOff class="w-3 h-3" />
        </span>
      </span>
      <span class="w-16 text-center hidden lg:block">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          :class="'bg-secondary text-secondary-foreground'"
        >
          {{ getStatusLabel(item.status) }}
        </span>
      </span>
      <span class="w-32 hidden xl:block text-xs text-muted-foreground truncate">{{
        item.remark || '-'
      }}</span>
      <span class="w-20 flex items-center justify-end gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 hover:text-primary"
          @click="emit('add', item.id)"
        >
          <Plus class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 hover:text-primary"
          @click="emit('edit', item)"
        >
          <Edit class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 text-red-500 hover:text-red-600"
          @click="emit('delete', item.id)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </Button>
      </span>
    </div>

    <!-- 递归渲染子项 -->
    <template v-if="hasChildren && isExpanded">
      <NavTreeNode
        v-for="child in item.children!"
        :key="child.id"
        :item="child"
        :level="level + 1"
        :expanded-ids="expandedIds"
        :get-status-label="getStatusLabel"
        :get-link-type-text="getLinkTypeText"
        :get-target-text="getTargetText"
        @toggle-expand="emit('toggle-expand', $event)"
        @add="emit('add', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </template>
  </div>
</template>
