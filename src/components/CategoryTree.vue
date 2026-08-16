<script setup lang="ts">
import { ref, onMounted, h, type VNode } from 'vue'
import { Folder, FolderOpen, ChevronRight } from '@lucide/vue'
import type { Category } from '@/types'
import { categoryApi } from '@/api'
import TreeGuides from './TreeGuides.vue'

const props = withDefaults(
  defineProps<{
    siteId?: string
    modelValue?: string
  }>(),
  {},
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const categories = ref<Category[]>([])
const expandedIds = ref<Set<string>>(new Set())

async function fetchCategories() {
  const { data } = await categoryApi.tree(props.siteId)
  if (data.value) {
    categories.value = data.value
  }
}

onMounted(() => {
  fetchCategories()
})

// 暴露刷新方法，供父组件在增删改后调用（保留展开状态）
defineExpose({
  fetchCategories,
})

function handleClear() {
  emit('update:modelValue', undefined)
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

// 单节点 render 函数（用 setup 作用域可引用 TreeGuides）
function renderNode(
  cat: Category,
  level: number,
  modelValue: string | undefined,
  expanded: Set<string>,
): VNode {
  const hasChildren = !!(cat.children && cat.children.length > 0)
  const isExpanded = expanded.has(cat.id)
  const selected = modelValue === cat.id

  function handleSelect() {
    if (selected) {
      emit('update:modelValue', undefined)
    } else {
      emit('update:modelValue', cat.id)
    }
  }

  function handleToggle(e: Event) {
    e.stopPropagation()
    toggleExpand(cat.id)
  }

  return h('div', null, [
    h('div', { class: 'flex h-8 items-stretch gap-1 px-1.5' }, [
      hasChildren
        ? h(
            'button',
            {
              type: 'button',
              class:
                'w-5 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground shrink-0',
              onClick: handleToggle,
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
          class: `flex-1 min-w-0 flex items-center gap-2 px-1.5 rounded text-sm transition-colors ${
            selected ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'
          }`,
          onClick: handleSelect,
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
            renderNode(child, level + 1, modelValue, expanded),
          ),
        )
      : null,
  ])
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between px-2">
      <span class="text-sm font-medium text-muted-foreground">分类</span>
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
          <Folder class="w-3.5 h-3.5 flex-shrink-0" />
          <span>全部分类</span>
        </button>
        <component
          v-for="cat in categories"
          :key="cat.id"
          :is="() => renderNode(cat, 0, modelValue, expandedIds)"
        />
      </div>
    </div>
  </div>
</template>
