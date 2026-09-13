<script setup lang="ts">
import { computed } from 'vue'
import { useDict } from '@/composables/useDict'

const props = withDefaults(
  defineProps<{
    /** 字典编码（DICT.* 常量） */
    type: string
    /** 字典值 */
    value?: string | number | null
    /** 覆盖样式类；提供后将忽略字典项配色 */
    class?: string
  }>(),
  {},
)

const { items } = useDict(() => props.type || '')

const current = computed(() =>
  items.value.find((it) => String(it.value) === String(props.value)),
)

const classes = computed(() => {
  if (props.class) return props.class
  if (current.value?.className) return current.value.className
  return 'bg-secondary text-secondary-foreground'
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="classes"
  >
    {{ current?.label ?? (value ?? '') }}
  </span>
</template>