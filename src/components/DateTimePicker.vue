<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { useDark } from '@vueuse/core'
import { zhCN } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps<{
  /** 后端格式字符串：yyyy-MM-dd HH:mm:ss，空字符串/undefined 表示未选择 */
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
  /** 是否只选择日期（默认选择日期+时间） */
  dateOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isDark = useDark()

const value = computed({
  get: () => props.modelValue || null,
  set: (v) => emit('update:modelValue', v ?? ''),
})

const displayFormat = computed(() => (props.dateOnly ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss'))
</script>

<template>
  <VueDatePicker
    v-model="value"
    :locale="zhCN"
    :format="displayFormat"
    model-type="yyyy-MM-dd HH:mm:ss"
    :enable-time-picker="!dateOnly"
    :dark="isDark"
    auto-apply
    clearable
    :disabled="disabled"
    :placeholder="placeholder"
  />
</template>
