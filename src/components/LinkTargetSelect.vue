<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  ChevronDown,
  Folder,
  FileText,
  Hash,
  BookOpen,
  File,
  LoaderCircle,
  Search,
} from '@lucide/vue'
import { categoryApi, pageApi, tagApi, noteApi, articleApi } from '@/api'
import type { Category, Page } from '@/types'
import { LINK_TYPE } from '@/constants/nav'

const props = defineProps<{
  linkType: string
  modelValue: string
  siteId?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const placeholder = computed(() => props.placeholder || '请选择')
const open = ref(false)
const loading = ref(false)

// ─── 树形数据（分类 + 页面） ───
const categories = ref<Category[]>([])
const pages = ref<Page[]>([])

interface FlatNode {
  id: string
  title: string
  indent: number
}

function flattenTree<T extends { id: string; title: string; children?: T[] }>(
  items: T[],
  level = 0,
  acc: FlatNode[] = [],
): FlatNode[] {
  for (const item of items) {
    acc.push({ id: item.id, title: item.title, indent: level })
    if (item.children?.length) flattenTree(item.children, level + 1, acc)
  }
  return acc
}

const flatCategories = computed(() => flattenTree(categories.value))
const flatPages = computed(() => flattenTree(pages.value))

// ─── 游标列表数据（标签 / 笔记 / 文章 共用） ───
interface CursorItem {
  id: string
  title: string
  articleCount?: number
}
const cursorItems = ref<CursorItem[]>([])
const cursorSearch = ref('')
const cursorLastId = ref<string | null>(null)
const cursorLastPublishAt = ref<string | null>(null)
const cursorHasMore = ref(true)
const cursorLoadingMore = ref(false)

async function loadCursorList(reset = true) {
  if (reset) {
    cursorItems.value = []
    cursorLastId.value = null
    cursorLastPublishAt.value = null
    cursorHasMore.value = true
  }
  if (!cursorHasMore.value && !reset) return
  loading.value = reset
  cursorLoadingMore.value = !reset
  try {
    const params = {
      title: cursorSearch.value || undefined,
      siteId: props.siteId,
      lastId: cursorLastId.value || undefined,
      lastPublishAt: cursorLastPublishAt.value || undefined,
      pageSize: 20,
    }
    let result:
      | {
          records: CursorItem[]
          nextId: string | null
          nextPublishAt: string | null
          hasMore: boolean
        }
      | null
      | undefined
    switch (props.linkType) {
      case LINK_TYPE.TAG: {
        const { data } = await tagApi.cursor(params)
        result = data.value
        break
      }
      case LINK_TYPE.NOTE: {
        const { data } = await noteApi.cursor(params)
        result = data.value
        break
      }
      case LINK_TYPE.ARTICLE: {
        const { data } = await articleApi.cursor(params)
        result = data.value
        break
      }
    }
    if (result) {
      if (reset) {
        cursorItems.value = result.records
      } else {
        // 去重追加
        const existing = new Set(cursorItems.value.map((i) => i.id))
        cursorItems.value = [
          ...cursorItems.value,
          ...result.records.filter((i) => !existing.has(i.id)),
        ]
      }
      cursorLastId.value = result.nextId
      cursorLastPublishAt.value = result.nextPublishAt
      cursorHasMore.value = result.hasMore
    }
  } catch {
    if (reset) cursorItems.value = []
  } finally {
    loading.value = false
    cursorLoadingMore.value = false
  }
}

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(cursorSearch, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadCursorList(true), 300)
})

// 滚动加载
function handleCursorScroll(e: Event) {
  const target = e.target as HTMLElement
  if (
    target.scrollTop + target.clientHeight >= target.scrollHeight - 50 &&
    !cursorLoadingMore.value &&
    !loading.value &&
    cursorHasMore.value
  ) {
    loadCursorList(false)
  }
}

// ─── 选中项展示文本 ───
const selectedLabel = computed(() => {
  if (!props.modelValue) return ''
  switch (props.linkType) {
    case LINK_TYPE.CATEGORY:
      return flatCategories.value.find((n) => n.id === props.modelValue)?.title || ''
    case LINK_TYPE.PAGE:
      return flatPages.value.find((n) => n.id === props.modelValue)?.title || ''
    case LINK_TYPE.TAG:
    case LINK_TYPE.NOTE:
    case LINK_TYPE.ARTICLE:
      return cursorItems.value.find((i) => i.id === props.modelValue)?.title || ''
    case LINK_TYPE.URL:
      return props.modelValue
    default:
      return ''
  }
})

// ─── 树形数据加载 ───
async function loadCategories() {
  loading.value = true
  try {
    const { data } = await categoryApi.tree(props.siteId)
    categories.value = data.value || []
  } catch {
    categories.value = []
  } finally {
    loading.value = false
  }
}

async function loadPages() {
  loading.value = true
  try {
    const { data } = await pageApi.tree(props.siteId)
    pages.value = data.value || []
  } catch {
    pages.value = []
  } finally {
    loading.value = false
  }
}

// ─── 打开/关闭时按类型加载数据 ───
function handleOpenChange(openVal: boolean) {
  open.value = openVal
  if (!openVal) return
  switch (props.linkType) {
    case LINK_TYPE.CATEGORY:
      if (!categories.value.length) loadCategories()
      break
    case LINK_TYPE.PAGE:
      if (!pages.value.length) loadPages()
      break
    case LINK_TYPE.TAG:
    case LINK_TYPE.NOTE:
    case LINK_TYPE.ARTICLE:
      cursorSearch.value = ''
      loadCursorList(true)
      break
  }
}

function selectItem(id: string) {
  emit('update:modelValue', id)
  open.value = false
}

// linkType 切换时关闭弹层并清空游标列表
watch(
  () => props.linkType,
  () => {
    open.value = false
    cursorItems.value = []
    cursorSearch.value = ''
    cursorLastId.value = null
    cursorLastPublishAt.value = null
    cursorHasMore.value = true
  },
)

// 游标列表图标
const cursorIcon = computed(() => {
  switch (props.linkType) {
    case LINK_TYPE.TAG:
      return Hash
    case LINK_TYPE.NOTE:
      return BookOpen
    default:
      return File
  }
})
</script>

<template>
  <!-- URL：输入框 -->
  <Input
    v-if="linkType === LINK_TYPE.URL"
    :model-value="modelValue"
    placeholder="请输入链接地址，如 https://example.com"
    @update:model-value="(val: string | number) => emit('update:modelValue', String(val))"
  />

  <!-- 分类 / 页面：树形下拉（客户端过滤） -->
  <Popover
    v-else-if="linkType === LINK_TYPE.CATEGORY || linkType === LINK_TYPE.PAGE"
    v-model:open="open"
    @update:open="handleOpenChange"
  >
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        class="w-full justify-between font-normal"
        :aria-expanded="open"
      >
        <span class="truncate" :class="{ 'text-muted-foreground': !selectedLabel }">
          {{ selectedLabel || placeholder }}
        </span>
        <ChevronDown class="w-4 h-4 opacity-50 shrink-0" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="p-0" align="start" :side-offset="4">
      <Command>
        <CommandInput placeholder="搜索..." />
        <CommandList>
          <CommandEmpty>无匹配项</CommandEmpty>
          <CommandGroup>
            <!-- 分类（树形 + 缩进） -->
            <template v-if="linkType === LINK_TYPE.CATEGORY">
              <CommandItem
                v-for="cat in flatCategories"
                :key="cat.id"
                :value="cat.id"
                @select="selectItem(cat.id)"
              >
                <div
                  class="flex items-center w-full min-w-0"
                  :style="{ paddingLeft: `${cat.indent * 16}px` }"
                >
                  <Folder class="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
                  <span class="truncate">{{ cat.title }}</span>
                </div>
              </CommandItem>
            </template>
            <!-- 页面（树形 + 缩进） -->
            <template v-else-if="linkType === LINK_TYPE.PAGE">
              <CommandItem
                v-for="pg in flatPages"
                :key="pg.id"
                :value="pg.id"
                @select="selectItem(pg.id)"
              >
                <div
                  class="flex items-center w-full min-w-0"
                  :style="{ paddingLeft: `${pg.indent * 16}px` }"
                >
                  <FileText class="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
                  <span class="truncate">{{ pg.title }}</span>
                </div>
              </CommandItem>
            </template>
          </CommandGroup>
        </CommandList>
      </Command>
      <div v-if="loading" class="flex items-center justify-center py-6">
        <LoaderCircle class="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    </PopoverContent>
  </Popover>

  <!-- 标签 / 笔记 / 文章：远程搜索 + 游标滚动 -->
  <Popover
    v-else-if="
      linkType === LINK_TYPE.TAG || linkType === LINK_TYPE.NOTE || linkType === LINK_TYPE.ARTICLE
    "
    v-model:open="open"
    @update:open="handleOpenChange"
  >
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        class="w-full justify-between font-normal"
        :aria-expanded="open"
      >
        <span class="truncate" :class="{ 'text-muted-foreground': !selectedLabel }">
          {{ selectedLabel || placeholder }}
        </span>
        <ChevronDown class="w-4 h-4 opacity-50 shrink-0" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="p-0" align="start" :side-offset="4">
      <!-- 搜索输入 -->
      <div class="p-2 border-b">
        <div class="relative">
          <Search
            class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
          />
          <Input v-model="cursorSearch" placeholder="搜索..." class="h-8 pl-8 text-xs" />
        </div>
      </div>
      <!-- 可滚动列表 -->
      <div class="max-h-72 overflow-y-auto p-1" @scroll="handleCursorScroll">
        <div
          v-if="loading && cursorItems.length === 0"
          class="flex items-center justify-center py-6"
        >
          <LoaderCircle class="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
        <div
          v-else-if="cursorItems.length === 0"
          class="py-6 text-center text-xs text-muted-foreground"
        >
          {{ cursorSearch ? '未找到匹配项' : '暂无数据' }}
        </div>
        <button
          v-for="item in cursorItems"
          v-else
          :key="item.id"
          type="button"
          class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left hover:bg-accent transition-colors"
          :class="{ 'bg-primary/10 text-primary': item.id === modelValue }"
          @click="selectItem(item.id)"
        >
          <component :is="cursorIcon" class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span class="truncate flex-1">{{ item.title }}</span>
          <span v-if="item.articleCount" class="ml-auto text-xs text-muted-foreground shrink-0">
            ({{ item.articleCount }})
          </span>
        </button>
        <div v-if="cursorLoadingMore" class="py-2 text-center text-xs text-muted-foreground">
          <LoaderCircle class="w-3 h-3 animate-spin inline mr-1" />加载中...
        </div>
      </div>
    </PopoverContent>
  </Popover>

  <!-- 未知类型：只读展示 -->
  <Input v-else :model-value="modelValue" disabled placeholder="—" />
</template>
