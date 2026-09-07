<script setup lang="ts">
import { Search, FileX, AlertCircle, Inbox } from '@lucide/vue'

type EmptyType = 'default' | 'search' | 'error' | 'data'

defineProps<{
  /** 空状态类型：默认 / 搜索无结果 / 加载错误 / 无数据 */
  type?: EmptyType
  title?: string
  description?: string
  className?: string
}>()

const iconMap: Record<EmptyType, typeof Search> = {
  default: Inbox,
  search: Search,
  error: AlertCircle,
  data: FileX,
}

const titleMap: Record<EmptyType, string> = {
  default: '暂无数据',
  search: '未找到匹配结果',
  error: '加载失败',
  data: '暂无内容',
}

const descMap: Record<EmptyType, string> = {
  default: '这里还没有任何内容',
  search: '试试其他关键词吧',
  error: '请稍后重试或刷新页面',
  data: '快来创建第一条数据吧',
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center" :class="className">
    <div class="mb-4 text-muted-foreground/60">
      <component :is="iconMap[type || 'default']" class="w-16 h-16" />
    </div>
    <h3 class="text-base font-medium text-foreground mb-1">
      {{ title || titleMap[type || 'default'] }}
    </h3>
    <p class="text-sm text-muted-foreground">
      {{ description || descMap[type || 'default'] }}
    </p>
  </div>
</template>
