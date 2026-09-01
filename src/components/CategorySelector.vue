<script setup lang="ts">
import { ref, computed, watch, h, type VNode } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, X, Folder, FolderOpen, ChevronRight } from '@lucide/vue'
import { categoryApi } from '@/api'
import type { Category } from '@/types'
import TreeGuides from './TreeGuides.vue'

const props = defineProps<{
  modelValue: string[]
  siteId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const popoverOpen = ref(false)
const categories = ref<Category[]>([])
const expandedIds = ref<Set<string>>(new Set())
const loading = ref(false)

const MAX_CATEGORIES = 3

const selectedIds = computed(() => props.modelValue)
const canAddMore = computed(() => selectedIds.value.length < MAX_CATEGORIES)

const categoryTitleMap = computed(() => {
  const map = new Map<string, string>()
  function walk(list: Category[]) {
    for (const cat of list) {
      map.set(cat.id, cat.title)
      if (cat.children?.length) walk(cat.children)
    }
  }
  walk(categories.value)
  return map
})

async function fetchCategories() {
  loading.value = true
  try {
    const { data } = await categoryApi.tree(props.siteId)
    if (data.value) {
      categories.value = data.value
    }
  } finally {
    loading.value = false
  }
}

function handleOpenChange(open: boolean) {
  popoverOpen.value = open
  if (open) {
    fetchCategories()
  }
}

function toggleExpand(id: string) {
  const newSet = new Set(expandedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedIds.value = newSet
}

function toggleCategory(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    if (next.size >= MAX_CATEGORIES) return
    next.add(id)
  }
  emit('update:modelValue', Array.from(next))
}

function removeCategory(id: string) {
  emit('update:modelValue', selectedIds.value.filter(i => i !== id))
}

const selectedTitles = computed(() => {
  return selectedIds.value.map(id => ({ id, title: categoryTitleMap.value.get(id) || id }))
})

watch(popoverOpen, () => {})

// 编辑回显：modelValue 有值但 categories 未加载时，自动加载分类树以解析标题
// 同时监听 siteId，站点切换后重新加载
watch(
  () => [props.modelValue, props.siteId] as const,
  ([ids]) => {
    if (ids && ids.length > 0 && categories.value.length === 0 && !loading.value) {
      fetchCategories()
    }
  },
  { immediate: true },
)

function renderNode(cat: Category, level: number, selected: string[], expanded: Set<string>): VNode {
  const hasChildren = !!(cat.children && cat.children.length > 0)
  const isExpanded = expanded.has(cat.id)
  const checked = selected.includes(cat.id)

  return h('div', null, [
    h('div', { class: 'flex h-8 items-stretch gap-0.5 px-1' }, [
      hasChildren
        ? h(
            'button',
            {
              type: 'button',
              class:
                'w-5 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground shrink-0',
              onClick: (e: Event) => {
                e.stopPropagation()
                toggleExpand(cat.id)
              },
            },
            [
              h(ChevronRight, {
                class: `w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`,
              }),
            ],
          )
        : h('span', { class: 'w-5 shrink-0' }),
      h(TreeGuides, { level }),
      h(
        'button',
        {
          type: 'button',
          class: `flex-1 min-w-0 flex items-center gap-2 px-1.5 rounded text-sm transition-colors text-left ${
            checked ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
          }`,
          onClick: () => toggleCategory(cat.id),
        },
        [
          h(isExpanded ? FolderOpen : Folder, { class: 'w-3.5 h-3.5 shrink-0' }),
          h('span', { class: 'flex-1 truncate text-left' }, cat.title),
          cat.articleCount
            ? h('span', { class: 'text-xs text-muted-foreground shrink-0' }, String(cat.articleCount))
            : null,
        ],
      ),
    ]),
    hasChildren && isExpanded
      ? h(
          'div',
          null,
          cat.children!.map((child: Category) =>
            renderNode(child, level + 1, selected, expanded),
          ),
        )
      : null,
  ])
}
</script>

<template>
  <div class="space-y-2">
    <Label>分类</Label>
    <div class="flex items-start gap-3 mt-1">
      <!-- 已选分类 -->
      <div class="flex flex-wrap gap-2 flex-1 min-h-[32px]">
        <div
          v-for="item in selectedTitles"
          :key="item.id"
          class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
        >
          <span>{{ item.title }}</span>
          <button
            class="ml-0.5 hover:text-destructive"
            @click="removeCategory(item.id)"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
        <span v-if="selectedIds.length === 0" class="text-sm text-muted-foreground self-center">
          暂无分类
        </span>
      </div>

      <!-- 添加分类按钮 -->
      <Popover v-if="canAddMore" v-model:open="popoverOpen" @update:open="handleOpenChange">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm" class="shrink-0">
            <Plus class="w-4 h-4 mr-1" />
            添加分类
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-72 p-0" align="start" :side-offset="8">
          <div class="p-3 border-b">
            <p class="text-sm font-medium">选择分类</p>
            <p class="text-xs text-muted-foreground mt-0.5">最多选择 {{ MAX_CATEGORIES }} 个分类</p>
          </div>
          <div class="p-2 max-h-80 overflow-y-auto">
            <div v-if="loading" class="text-center py-8 text-sm text-muted-foreground">加载中...</div>
            <div v-else-if="categories.length === 0" class="text-center py-8 text-sm text-muted-foreground">暂无分类</div>
            <div v-else>
              <component
                v-for="cat in categories"
                :key="cat.id"
                :is="() => renderNode(cat, 0, selectedIds, expandedIds)"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <span v-else class="text-xs text-muted-foreground shrink-0 self-center">
        最多 {{ MAX_CATEGORIES }} 个分类
      </span>
    </div>
  </div>
</template>
