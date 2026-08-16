<script setup lang="ts">
import type { Organization } from '@/types'
import { SelectItem } from '@/components/ui/select'
import TreeGuides from './TreeGuides.vue'

interface Props {
  organization: Organization
  level?: number
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
})
</script>

<template>
  <SelectItem :value="organization.id">
    <div class="flex items-center min-w-0">
      <TreeGuides :level="props.level" />
      <span class="ml-1.5 truncate">{{ organization.name }}</span>
    </div>
  </SelectItem>
  <template v-if="organization.children && organization.children.length > 0">
    <OrganizationSelectItem
      v-for="child in organization.children"
      :key="child.id"
      :organization="child"
      :level="props.level + 1"
    />
  </template>
</template>
