<script setup lang="ts">
import { Building2 } from '@lucide/vue'
import type { Organization } from '@/types'
import OrganizationTreeNode from './OrganizationTreeNode.vue'

defineProps<{
  organizations: Organization[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

function handleClear() {
  emit('update:modelValue', undefined)
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between px-2">
      <span class="text-sm font-medium text-muted-foreground">部门</span>
      <button
        v-if="modelValue"
        type="button"
        class="text-xs text-muted-foreground hover:text-foreground"
        @click="handleClear"
      >
        清除
      </button>
    </div>
    <div class="border rounded-lg bg-card p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div>
        <button
          type="button"
          class="w-full flex h-8 items-center gap-2 px-2 rounded text-sm transition-colors"
          :class="!modelValue ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'"
          @click="handleClear"
        >
          <Building2 class="w-3.5 h-3.5 flex-shrink-0" />
          <span>全部部门</span>
        </button>
        <OrganizationTreeNode
          v-for="org in organizations"
          :key="org.id"
          :org="org"
          :model-value="modelValue"
          @update:model-value="(v) => emit('update:modelValue', v)"
        />
      </div>
    </div>
  </div>
</template>
