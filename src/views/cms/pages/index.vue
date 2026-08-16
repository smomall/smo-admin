<script setup lang="ts">
import { ref, onMounted, computed, h, type VNode } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDateTime } from '@/lib/utils'
import { useMessageDialog } from '@/composables/useMessageDialog'
import PageEditorDialog from './editor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from '@lucide/vue'
import type { Page, PageModel } from '@/types'
import { pageApi, pageModelApi } from '@/api'
import { useDict } from '@/composables/useDict'
import DictSelect from '@/components/DictSelect.vue'
import { useTabStore } from '@/stores/tab'
import { useSiteStore } from '@/stores/site'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: pageStatusItems, getLabel: getStatusLabel } = useDict('publish_status')

function getModelLabel(modelId: string | undefined): string {
  if (!modelId) return '-'
  const model = pageModels.value.find((m) => m.id === modelId)
  return model?.modelName || model?.modelCode || '-'
}

const router = useRouter()
const route = useRoute()
const tabStore = useTabStore()
const siteStore = useSiteStore()

const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const { showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const pageModels = ref<PageModel[]>([])

const searchTitle = ref('')
const searchSlug = ref('')
const searchModelId = ref('__all__')
const searchStatus = ref<string>('__all__')
const searchPageType = ref<string>('__all__')

// ===== 左侧页面树 =====
const pageTree = ref<Page[]>([])
const selectedParentId = ref<string | undefined>(undefined)
const expandedIds = ref<Set<string>>(new Set())

let treeInitialLoaded = false
async function fetchPageTree() {
  try {
    const { data } = await pageApi.tree(siteId.value)
    if (data.value) {
      pageTree.value = data.value
      // 仅首次加载时默认展开顶层；删除后刷新保留用户的展开状态
      if (!treeInitialLoaded) {
        expandedIds.value = new Set(data.value.map((p) => p.id))
        treeInitialLoaded = true
      }
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleTreeSelect() {
  handleSearch()
}

function handleClearTree() {
  selectedParentId.value = undefined
  handleSearch()
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

function collectAllIds(nodes: Page[]): string[] {
  const ids: string[] = []
  for (const n of nodes) {
    ids.push(n.id)
    if (n.children?.length) ids.push(...collectAllIds(n.children))
  }
  return ids
}

function expandAll() {
  expandedIds.value = new Set(collectAllIds(pageTree.value))
}

function collapseAll() {
  expandedIds.value = new Set()
}

const treeSearch = ref('')

// 搜索过滤：保留匹配项及其祖先链
const displayTree = computed<Page[]>(() => {
  const q = treeSearch.value.trim().toLowerCase()
  if (!q) return pageTree.value
  function filter(nodes: Page[]): Page[] {
    const result: Page[] = []
    for (const n of nodes) {
      const matched = n.title.toLowerCase().includes(q)
      const kids = n.children?.length ? filter(n.children) : []
      if (matched || kids.length) {
        result.push({ ...n, children: kids })
      }
    }
    return result
  }
  return filter(pageTree.value)
})

// 搜索时自动展开所有可见分支；非搜索态用用户展开集
const effectiveExpanded = computed<Set<string>>(() => {
  const q = treeSearch.value.trim().toLowerCase()
  if (!q) return expandedIds.value
  const ids = new Set<string>()
  function walk(nodes: Page[]) {
    for (const n of nodes) {
      if (n.children?.length) {
        ids.add(n.id)
        walk(n.children)
      }
    }
  }
  walk(displayTree.value)
  return ids
})

// ===== 编辑弹窗 =====
const showEditorDialog = ref(false)
const editorPageId = ref<string | undefined>(undefined)
const editorParentId = ref<string | undefined>(undefined)

function openEditor(pageId?: string, parentId?: string) {
  editorPageId.value = pageId
  editorParentId.value = parentId
  showEditorDialog.value = true
}

function handleEditorSaved() {
  // 刷新右侧分页列表与左侧页面树
  handleSearch()
  fetchPageTree()
}

function handleAddChild(parentId: string) {
  openEditor(undefined, parentId)
}

function renderTreeNode(node: Page, level: number): VNode {
  const hasChildren = !!(node.children && node.children.length > 0)
  const isExpanded = effectiveExpanded.value.has(node.id)
  const selected = selectedParentId.value === node.id

  function handleSelect() {
    if (selected) {
      selectedParentId.value = undefined
    } else {
      selectedParentId.value = node.id
    }
    handleTreeSelect()
  }

  function handleToggle(e: Event) {
    e.stopPropagation()
    toggleExpand(node.id)
  }

  return h('div', null, [
    h('div', { class: 'group flex h-8 items-stretch gap-1 px-1.5' }, [
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
          h(hasChildren ? (isExpanded ? FolderOpen : Folder) : FileText, {
            class: 'w-3.5 h-3.5 shrink-0',
          }),
          h('span', { class: 'flex-1 truncate text-left' }, node.title),
          hasChildren
            ? h(
                'span',
                { class: 'text-xs text-muted-foreground shrink-0' },
                String(node.children!.length),
              )
            : null,
        ],
      ),
      // 悬停新增子页面
      h(
        'button',
        {
          type: 'button',
          title: '新增子页面',
          class:
            'w-5 h-8 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleAddChild(node.id)
          },
        },
        [h(Plus, { class: 'w-3 h-3' })],
      ),
    ]),
    hasChildren && isExpanded
      ? h(
          'div',
          null,
          node.children!.map((child: Page) => renderTreeNode(child, level + 1)),
        )
      : null,
  ])
}

const {
  list: pages,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => pageApi.list(query),
  params: () => ({
    title: searchTitle.value,
    slug: searchSlug.value,
    modelId: searchModelId.value === '__all__' ? '' : searchModelId.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    pageType: searchPageType.value === '__all__' ? '' : searchPageType.value,
    siteId: siteId.value,
    parentId: selectedParentId.value || '',
  }),
})

async function fetchPageModels() {
  try {
    const { data } = await pageModelApi.list({
      pageNumber: 1,
      pageSize: 100,
      siteId: siteId.value,
      enabled: true,
    })
    if (data.value) {
      // 过滤掉 DELETED(5) 与 PENDING_DELETE(4)，其余状态（PENDING_ADD/ADDED/PENDING_MODIFY/MODIFIED）均可被页面引用
      const EXCLUDE = new Set([4, 5])
      pageModels.value = (data.value.records || []).filter(
        (m) => !EXCLUDE.has(Number(m.status)),
      )
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

onMounted(() => {
  fetchPageModels()
  fetchPageTree()
})

function handleReset() {
  searchTitle.value = ''
  searchSlug.value = ''
  searchModelId.value = '__all__'
  searchStatus.value = '__all__'
  searchPageType.value = '__all__'
  selectedParentId.value = undefined
  handleSearch()
}

function handleAdd() {
  openEditor(undefined, selectedParentId.value)
}

function handleEdit(page: Page) {
  openEditor(page.id)
}

function handleEditContent(page: Page) {
  router.push({ path: '/pages/content', query: { siteId: siteId.value, id: page.id } })
  tabStore.addTab({
    label: `内容: ${page.title}`,
    path: `/pages/content?siteId=${siteId.value}&id=${page.id}`,
    closable: true,
  })
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除页面', '确定要删除该页面吗？')
  if (!confirmed) return
  try {
    await pageApi.delete(id)
    showSuccess('删除成功')
    // 删除的是当前选中的树节点时清空筛选，避免列表仍按已删除的 parentId 过滤而空白
    if (selectedParentId.value === id) {
      selectedParentId.value = undefined
    }
    reloadAfterRemove()
    fetchPageTree()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <ConfirmDialog />
    <div class="flex gap-4">
      <!-- 左侧页面树 -->
      <div class="w-56 flex-shrink-0 space-y-2">
        <div class="flex items-center justify-between px-2">
          <span class="text-sm font-medium text-muted-foreground">页面目录</span>
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              title="展开全部"
              class="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              @click="expandAll"
            >
              <ChevronDown class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="收起全部"
              class="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              @click="collapseAll"
            >
              <ChevronUp class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <Input v-model="treeSearch" placeholder="搜索页面" class="w-full h-8 text-xs" />
        <div class="border rounded-lg bg-card p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <button
              type="button"
              class="w-full flex h-8 items-center gap-2 px-2 rounded text-sm transition-colors"
              :class="
                !selectedParentId ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'
              "
              @click="handleClearTree"
            >
              <Folder class="w-3.5 h-3.5 flex-shrink-0" />
              <span>全部页面</span>
            </button>
            <component
              v-for="node in displayTree"
              :key="node.id"
              :is="() => renderTreeNode(node, 0)"
            />
            <div
              v-if="displayTree.length === 0"
              class="py-8 text-center text-muted-foreground text-sm"
            >
              {{ treeSearch ? '无匹配结果' : '暂无页面' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧页面列表 -->
      <div class="flex-1 space-y-4">
        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchTitle"
              placeholder="页面标题"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchSlug"
              placeholder="别名"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Select v-model="searchModelId" class="w-40">
              <SelectTrigger>
                <SelectValue placeholder="全部模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部模型</SelectItem>
                <SelectItem v-for="model in pageModels" :key="model.id" :value="model.id">
                  {{ model.modelName || model.modelCode }}
                </SelectItem>
              </SelectContent>
            </Select>
            <DictSelect
              v-model="searchPageType"
              dict-type="page_type"
              all
              all-label="全部类型"
              placeholder="全部类型"
              class="w-32"
            />
            <DictSelect
              v-model="searchStatus"
              :dict-items="pageStatusItems"
              all
              all-label="全部状态"
              placeholder="全部状态"
              class="w-32"
            />
            <Button variant="outline" @click="handleSearch">搜索</Button>
            <Button variant="ghost" @click="handleReset">重置</Button>
            <div class="flex-1" />
            <Button @click="handleAdd">
              <Plus class="w-4 h-4 mr-2" />
              新增页面
            </Button>
          </div>
        </div>

        <div class="bg-card rounded-xl border shadow-sm">
          <div
            v-if="loading"
            class="p-12 flex items-center justify-center text-muted-foreground text-sm"
          >
            <div
              class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
            ></div>
            加载中...
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>页面模型</TableHead>
                <TableHead>页面类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="page in pages" :key="page.id">
                <TableCell>{{ page.id }}</TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <FileText class="w-4 h-4 text-primary" />
                    <div class="font-medium">{{ page.title }}</div>
                  </div>
                </TableCell>
                <TableCell class="font-mono text-xs text-muted-foreground">
                  {{ page.slug || '-' }}
                </TableCell>
                <TableCell>{{ getModelLabel(page.modelId) }}</TableCell>
                <TableCell>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600"
                  >
                    {{
                      page.pageType === 'page'
                        ? '单页'
                        : page.pageType === 'list'
                          ? '列表'
                          : page.pageType === 'link'
                            ? '链接'
                            : page.pageType || '-'
                    }}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="'bg-secondary text-secondary-foreground'"
                  >
                    {{ getStatusLabel(page.status) }}
                  </span>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ page.publishAt ? formatDateTime(page.publishAt) : '-' }}
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="编辑内容"
                      @click="handleEditContent(page)"
                    >
                      <FileText class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="编辑元数据" @click="handleEdit(page)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDelete(page.id)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="pages.length === 0">
                <TableCell colspan="8" class="text-center text-muted-foreground py-8">
                  暂无数据
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          @change="goto"
        />
      </div>
    </div>

    <!-- 编辑页面弹窗 -->
    <PageEditorDialog
      v-model:open="showEditorDialog"
      :page-id="editorPageId"
      :site-id="siteId"
      :parent-id="editorParentId"
      @saved="handleEditorSaved"
    />
  </div>
</template>
