<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DictItemOption } from '@/types'
import { dictApi } from '@/api'

const props = withDefaults(
  defineProps<{
    dictItems?: DictItemOption[]
    dictType?: string
    modelValue?: string | number
    placeholder?: string
    disabled?: boolean
    all?: boolean
    allLabel?: string
    allValue?: string
  }>(),
  {
    placeholder: '请选择',
    disabled: false,
    all: false,
    allLabel: '全部',
    allValue: '__all__',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
}>()

const fetchedItems = ref<DictItemOption[]>([])
const loading = ref(false)

async function loadDict() {
  if (!props.dictType || loading.value) return
  loading.value = true
  try {
    const { data } = await dictApi.select(props.dictType)
    fetchedItems.value = data.value?.items || []
  } catch {
    fetchedItems.value = []
  } finally {
    loading.value = false
  }
}

const items = computed(() => props.dictItems || fetchedItems.value)

onMounted(() => {
  if (props.dictType) {
    loadDict()
  }
})

watch(
  () => props.dictType,
  () => {
    if (props.dictType) {
      loadDict()
    }
  },
)
</script>

<template>
  <Select
    :model-value="String(modelValue)"
    :disabled="disabled || loading"
    @update:model-value="
      (val) => {
        const num = Number(val)
        emit('update:modelValue', Number.isNaN(num) ? String(val) : num)
      }
    "
  >
    <SelectTrigger>
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-if="all" :value="allValue">{{ allLabel }}</SelectItem>
      <SelectItem v-for="item in items" :key="item.value" :value="item.value">
        {{ item.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
