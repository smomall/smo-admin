<script setup lang="ts">
import { Building2 } from '@lucide/vue'
import type { Organization } from '@/types'
import TreeGuides from './TreeGuides.vue'

withDefaults(defineProps<{
  org: Organization
  modelValue?: string
  level?: number
}>(), {
  level: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

function handleSelect(id: string) {
  emit('update:modelValue', id)
}
</script>

<template>
  <div>
    <button
      type="button"
      class="w-full flex h-8 px-2 rounded text-sm transition-colors"
      :class="modelValue === org.id ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'"
      @click="handleSelect(org.id)"
    >
      <TreeGuides :level="level" />
      <Building2 class="w-3.5 h-3.5 self-center ml-1.5 shrink-0" />
      <span class="self-center ml-1.5 truncate">{{ org.name }}</span>
    </button>
    <template v-if="org.children && org.children.length > 0">
      <OrganizationTreeNode
        v-for="child in org.children"
        :key="child.id"
        :org="child"
        :model-value="modelValue"
        :level="level + 1"
        @update:model-value="(v) => emit('update:modelValue', v)"
      />
    </template>
  </div>
</template>
