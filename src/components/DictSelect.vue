<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDict } from '@/composables/useDict'
import { ALL_VALUE } from '@/constants/app'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

interface DictItem {
  label: string
  value: string | number
  color?: string
  cssClass?: string
}

const props = defineProps<{
  modelValue?: string | number
  dictType?: string
  dictItems?: DictItem[]
  placeholder?: string
  disabled?: boolean
  /** 是否显示"全部"选项，用于筛选场景 */
  showAll?: boolean
  /** "全部"选项的值，默认 '__all__' */
  allValue?: string | number
  /** 关联 label，传入后渲染 Label + Select 组合 */
  label?: string
  /** label 对应的 id，用于 Label 的 htmlFor */
  id?: string
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

/**
 * 优先使用 props.dictItems（外部直接传入数据），
 * 其次通过 useDict 按 dictType 从全局字典缓存拉取。
 */
const { items: dictItemsFromCache, loading: dictLoading } = useDict(
  () => props.dictType || '',
)

const items = computed<DictItem[]>(() => {
  const source = props.dictItems?.length ? props.dictItems : dictItemsFromCache.value
  if (!props.showAll) return source
  return [
    { label: '全部', value: (props.allValue ?? ALL_VALUE) as string | number },
    ...source,
  ]
})

const loading = computed(() => !props.dictItems?.length && dictLoading.value)

const internalValue = computed({
  get: () => props.modelValue ?? '',
  set: (val) => emit('update:modelValue', val),
})

const displayLabel = ref(props.placeholder || '请选择')

watch(
  () => props.modelValue,
  () => {
    const item = items.value.find((i) => String(i.value) === String(props.modelValue))
    displayLabel.value = item?.label || props.placeholder || '请选择'
  },
  { immediate: true },
)

watch(
  items,
  () => {
    const item = items.value.find((i) => String(i.value) === String(props.modelValue))
    if (item) displayLabel.value = item.label
  },
)
</script>

<template>
  <div :class="[props.class, label ? 'flex items-center gap-2' : '']">
    <Label v-if="label" :for="id">{{ label }}</Label>
    <Select
      :model-value="String(internalValue)"
      :class="label ? 'flex-1' : ''"
      :disabled="disabled"
      @update:model-value="(v) => (internalValue = v as string)"
    >
      <SelectTrigger>
        <template v-if="loading">
          <Skeleton class="h-4 w-20 rounded" />
        </template>
        <template v-else>
          <SelectValue :placeholder="displayLabel" />
        </template>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="item in items"
          :key="item.value"
          :value="String(item.value)"
        >
          {{ item.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
