<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, ChevronDown, Building2, Plus, Edit, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { TableRow, TableCell } from '@/components/ui/table'
import TreeGuides from './TreeGuides.vue'
import type { Organization } from '@/types'

const props = defineProps<{
  org: Organization
  level: number
  expandedIds: Set<string>
  getLabel: (value: string | number | undefined) => string
}>()

const emit = defineEmits<{
  (e: 'toggle-expand', id: string): void
  (e: 'add', parentId: string): void
  (e: 'edit', org: Organization): void
  (e: 'delete', id: string): void
}>()

const hasChildren = computed(() => props.org.children && props.org.children!.length > 0)
const isExpanded = computed(() => props.expandedIds.has(props.org.id))
</script>

<template>
  <TableRow>
    <TableCell>
      <button
        v-if="hasChildren"
        class="p-1 rounded hover:bg-secondary"
        @click="emit('toggle-expand', org.id)"
      >
        <ChevronDown v-if="isExpanded" class="w-4 h-4" />
        <ChevronRight v-else class="w-4 h-4" />
      </button>
    </TableCell>
    <TableCell>
      <div class="flex items-center min-w-0">
        <TreeGuides :level="level" />
        <Building2 class="w-4 h-4 text-muted-foreground ml-1.5 shrink-0" />
        <span class="ml-1.5 truncate">{{ org.name }}</span>
      </div>
    </TableCell>
    <TableCell>{{ org.code }}</TableCell>
    <TableCell>{{ org.leader || '-' }}</TableCell>
    <TableCell>{{ org.phone || '-' }}</TableCell>
    <TableCell>{{ org.email || '-' }}</TableCell>
    <TableCell>{{ org.sort || 0 }}</TableCell>
    <TableCell>
      <span
        class="px-2 py-1 rounded-full text-xs font-medium"
        :class="'bg-secondary text-secondary-foreground'"
      >
        {{ getLabel(org.status) }}
      </span>
    </TableCell>
    <TableCell>
      <div class="flex items-center gap-2">
        <Button v-if="hasChildren" variant="ghost" size="sm" @click="emit('add', org.id)">
          <Plus class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" @click="emit('edit', org)">
          <Edit class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" @click="emit('delete', org.id)">
          <Trash2 class="w-4 h-4" />
        </Button>
      </div>
    </TableCell>
  </TableRow>
  <template v-if="hasChildren && isExpanded">
    <OrgTreeRow
      v-for="child in org.children"
      :key="child.id"
      :org="child"
      :level="level + 1"
      :expanded-ids="expandedIds"
      :get-label="getLabel"
      @toggle-expand="emit('toggle-expand', $event)"
      @add="emit('add', $event)"
      @edit="emit('edit', $event)"
      @delete="emit('delete', $event)"
    />
  </template>
</template>
