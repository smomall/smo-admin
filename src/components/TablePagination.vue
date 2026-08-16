<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    currentPage: number
    pageSize: number
    total: number
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const emit = defineEmits<{ change: [page: number] }>()

const totalPages = computed(() => (props.total ? Math.ceil(props.total / props.pageSize) : 0))
const rangeStart = computed(() =>
  props.total === 0 ? 0 : (props.currentPage - 1) * props.pageSize + 1,
)
const rangeEnd = computed(() => Math.min(props.currentPage * props.pageSize, props.total))
</script>

<template>
  <!-- 紧凑模式：仅图标式上下页 + 页码，用于窄面板 -->
  <div v-if="compact" class="flex items-center justify-center gap-2 py-3">
    <Button
      variant="outline"
      size="icon-sm"
      class="h-7 w-7"
      :disabled="currentPage <= 1"
      @click="emit('change', currentPage - 1)"
    >
      <ChevronLeft class="w-4 h-4" />
    </Button>
    <span class="text-xs text-muted-foreground whitespace-nowrap">
      {{ currentPage }} / {{ Math.max(totalPages, 1) }} 页
    </span>
    <Button
      variant="outline"
      size="icon-sm"
      class="h-7 w-7"
      :disabled="currentPage >= totalPages"
      @click="emit('change', currentPage + 1)"
    >
      <ChevronRight class="w-4 h-4" />
    </Button>
  </div>
  <div v-else class="flex items-center justify-between py-4">
    <span class="text-sm text-muted-foreground">
      显示 {{ rangeStart }} - {{ rangeEnd }} 条，共 {{ total }} 条
    </span>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage <= 1"
        @click="emit('change', currentPage - 1)"
      >
        上一页
      </Button>
      <span class="px-4 text-sm">第 {{ currentPage }} / {{ Math.max(totalPages, 1) }} 页</span>
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage >= totalPages"
        @click="emit('change', currentPage + 1)"
      >
        下一页
      </Button>
    </div>
  </div>
</template>
