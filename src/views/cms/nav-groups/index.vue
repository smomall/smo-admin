<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteStore } from '@/stores/site'
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  GripVertical,
  X,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
} from '@lucide/vue'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import { usePagedList } from '@/composables/usePagedList'
import { useDict } from '@/composables/useDict'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { navGroupApi, navApi } from '@/api'
import type { NavGroup, NavItem } from '@/types'
import {
  getLinkTypeLabel,
  getLinkTypeColor,
} from '@/constants/nav'

const route = useRoute()
const siteStore = useSiteStore()
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const {
  items: statusItems,
  fetchDict: fetchStatusDict,
  getLabel: getStatusLabel,
} = useDict('common_status')

const searchName = ref('')

const currentGroupId = ref<string>('')
const currentGroupName = ref('')

const showGroupDialog = ref(false)
const showItemDialog = ref(false)
const showEditItemDialog = ref(false)
const isEdit = ref(false)
const groupFormData = ref({
  id: '',
  siteId: '',
  name: '',
  code: '',
  status: '1',
})
const editItemFormData = ref({
  id: '',
  title: '',
  sort: 0,
})

const poolSearchTitle = ref('')
const poolSelectedIds = ref<string[]>([])

// 导航树（用于"添加导航项"弹窗中选择节点）
const navTreeItems = ref<NavItem[]>([])
const treeLoading = ref(false)
const treeExpandedIds = ref<Record<string, boolean>>({})

interface SelectedItem {
  id: string
  originalTitle: string
}
const selectedItems = ref<SelectedItem[]>([])

// 当前分组已关联的导航项 id 集合，用于在树上标记"已添加"并禁用重复选择
const existingItemIds = computed(() => new Set(groupItems.value.map((i) => String(i.id))))

// 扁平化导航树：根据展开状态过滤可见节点，并携带层级与子节点标记
const flatNavTree = computed(
  () => {
    const result: Array<NavItem & { level: number; hasChildren: boolean }> = []
    const walk = (items: NavItem[], level: number, parentExpanded: boolean) => {
      for (const item of items) {
        const hasChildren = !!(item.children && item.children.length)
        if (parentExpanded) {
          result.push({ ...item, level, hasChildren })
        }
        if (hasChildren) {
          walk(item.children!, level + 1, parentExpanded && !!treeExpandedIds.value[item.id])
        }
      }
    }
    walk(navTreeItems.value, 0, true)
    return result
  },
)

function findNavItem(items: NavItem[], id: string): NavItem | undefined {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findNavItem(item.children, id)
      if (found) return found
    }
  }
  return undefined
}

const isDragging = ref(false)
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const {
  list: groups,
  loading: loadingGroups,
  currentPage: groupPage,
  pageSize: groupPageSize,
  total: groupTotal,
  isEmpty: groupsIsEmpty,
  goto: groupGoto,
  search: groupSearch,
  reload: reloadGroups,
  reloadAfterRemove: reloadGroupsAfterRemove,
} = usePagedList({
  fetcher: (query) => navGroupApi.list(query),
  params: () => ({
    name: searchName.value,
    siteId: siteId.value,
  }),
})

const {
  list: groupItems,
  loading: loadingItems,
  currentPage: itemsPage,
  pageSize: itemsPageSize,
  total: itemsTotal,
  goto: itemsGoto,
  reload: reloadItems,
  reloadAfterRemove: reloadItemsAfterRemove,
} = usePagedList({
  fetcher: (query) => navApi.list(query),
  params: () => ({
    groupId: currentGroupId.value,
    siteId: siteId.value,
  }),
  immediate: false,
})

function handleSelectGroup(group: NavGroup) {
  // 再次点击已选中的分组时取消选中，回到初始状态
  if (currentGroupId.value === group.id) {
    currentGroupId.value = ''
    currentGroupName.value = ''
    groupItems.value = []
    return
  }
  currentGroupId.value = group.id
  currentGroupName.value = group.name || ''
  reloadItems()
}

// 加载导航树（用于"添加导航项"弹窗）。默认全量展开，便于选择。
async function fetchNavTree() {
  treeLoading.value = true
  try {
    const { data } = await navApi.tree({
      title: poolSearchTitle.value,
      siteId: siteId.value,
    })
    navTreeItems.value = data.value || []
    // 默认展开所有含子节点的节点
    const expand = (items: NavItem[]) => {
      items.forEach((item) => {
        if (item.children && item.children.length) {
          treeExpandedIds.value[item.id] = true
          expand(item.children)
        }
      })
    }
    treeExpandedIds.value = {}
    expand(navTreeItems.value)
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
    navTreeItems.value = []
  } finally {
    treeLoading.value = false
  }
}

function toggleTreeExpand(id: string) {
  treeExpandedIds.value[id] = !treeExpandedIds.value[id]
}

function handleGroupSearch() {
  groupSearch()
}

function handleAddGroup() {
  isEdit.value = false
  groupFormData.value = {
    id: '',
    siteId: siteId.value,
    name: '',
    code: '',
    status: '1',
  }
  showGroupDialog.value = true
}

function handleEditGroup(group: NavGroup) {
  isEdit.value = true
  groupFormData.value = {
    id: group.id,
    siteId: group.siteId || siteId.value,
    name: group.name || '',
    code: group.code || '',
    status: String(group.status),
  }
  showGroupDialog.value = true
}

async function handleSaveGroup() {
  if (!groupFormData.value.name) {
    showError('请输入分组名称')
    return
  }
  try {
    if (isEdit.value) {
      await navGroupApi.update(groupFormData.value.id, groupFormData.value)
      showSuccess('更新成功')
      showGroupDialog.value = false
      reloadGroups()
    } else {
      await navGroupApi.create(groupFormData.value)
      showSuccess('新增成功')
      showGroupDialog.value = false
      groupSearch()
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleDeleteGroup(id: string) {
  const confirmed = await confirm(
    '删除分组',
    '确定删除此导航分组？删除后该分组下的导航项将取消分组关联（导航项本身不会被删除）。',
  )
  if (!confirmed) return
  try {
    await navGroupApi.delete(id)
    showSuccess('删除成功')
    if (currentGroupId.value === id) {
      currentGroupId.value = ''
      currentGroupName.value = ''
      groupItems.value = []
    }
    reloadGroupsAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function openAddItemsDialog() {
  if (!currentGroupId.value) {
    showError('请先选择一个分组')
    return
  }
  poolSearchTitle.value = ''
  poolSelectedIds.value = []
  selectedItems.value = []
  await fetchNavTree()
  showItemDialog.value = true
}

function togglePoolItem(id: string) {
  // 已在当前分组中的节点不允许重复选择
  if (existingItemIds.value.has(id)) return
  const idx = poolSelectedIds.value.indexOf(id)
  if (idx > -1) {
    poolSelectedIds.value.splice(idx, 1)
    const selectedIdx = selectedItems.value.findIndex((s) => s.id === id)
    if (selectedIdx > -1) {
      selectedItems.value.splice(selectedIdx, 1)
    }
  } else {
    poolSelectedIds.value.push(id)
    const navItem = findNavItem(navTreeItems.value, id)
    if (navItem) {
      selectedItems.value.push({
        id: navItem.id,
        originalTitle: navItem.title,
      })
    }
  }
}

async function handleAddItems() {
  if (selectedItems.value.length === 0) {
    showError('请至少选择一个导航项')
    return
  }
  const existing = groupItems.value.map((i) => String(i.id))
  const validItems = selectedItems.value.filter((item) => !existing.includes(item.id))
  if (validItems.length === 0) {
    showError('所选导航项已全部在分组中')
    return
  }
  try {
    // 将选中导航项的 groupId 设为当前分组，建立直接关联
    for (const item of validItems) {
      await navApi.update(item.id, { groupId: currentGroupId.value })
    }
    showSuccess(`已添加 ${validItems.length} 个导航项`)
    showItemDialog.value = false
    poolSelectedIds.value = []
    selectedItems.value = []
    reloadItems()
  } catch {
    // useRequest 已统一处理错误提示；中途失败时刷新列表以反映实际关联状态
    reloadItems()
  }
}

function handleEditItem(item: NavItem) {
  editItemFormData.value = {
    id: item.id,
    title: item.title || '',
    sort: item.sort || 0,
  }
  showEditItemDialog.value = true
}

async function handleSaveEditItem() {
  try {
    await navApi.update(editItemFormData.value.id, {
      title: editItemFormData.value.title,
      sort: editItemFormData.value.sort,
    })
    showSuccess('保存成功')
    showEditItemDialog.value = false
    reloadItems()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleRemoveItem(item: NavItem) {
  const confirmed = await confirm(
    '移除导航项',
    '确定从当前分组中移除此导航项？移除后该导航项仍保留，仅取消分组关联。',
  )
  if (!confirmed) return
  try {
    // 清空 groupId，解除与当前分组的关联（导航项本身不删除）
    await navApi.update(item.id, { groupId: '' })
    showSuccess('移除成功')
    reloadItemsAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleDragStart(index: number) {
  dragIndex.value = index
  isDragging.value = true
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  dragOverIndex.value = index
  if (dragIndex.value === null || dragIndex.value === index) return
  const items = [...groupItems.value]
  const removed = items.splice(dragIndex.value, 1)
  if (removed.length > 0) {
    items.splice(index, 0, removed[0]!)
    groupItems.value = items
    dragIndex.value = index
  }
}

function handleDragLeave() {
  dragOverIndex.value = null
}

async function handleDragEnd() {
  isDragging.value = false
  dragIndex.value = null
  dragOverIndex.value = null
  // 分页下需加上页偏移，否则第 2 页的 sort 会与第 1 页冲突
  const pageOffset = (itemsPage.value - 1) * itemsPageSize.value
  try {
    for (let i = 0; i < groupItems.value.length; i++) {
      const item = groupItems.value[i]
      if (item?.id) {
        await navApi.update(item.id, { sort: pageOffset + i })
      }
    }
    showSuccess('排序已保存')
  } catch {
    // useRequest 已统一处理错误提示；中途失败时刷新列表以恢复后端真实排序
    reloadItems()
  }
}

onMounted(() => {
  fetchStatusDict()
})
</script>

<template>
  <div class="nav-groups-page">
    <ConfirmDialog />
    <div class="flex gap-4 h-[calc(100vh-200px)]">
      <div class="w-[25rem] flex-shrink-0 border rounded-lg p-4 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">导航分组</h2>
          <Button size="sm" @click="handleAddGroup">
            <Plus class="w-4 h-4 mr-1" />
            新建
          </Button>
        </div>
        <div class="mb-3">
          <Input
            v-model="searchName"
            placeholder="搜索分组名称"
            class="h-8 text-xs"
            @input="handleGroupSearch"
          />
        </div>
        <div class="text-xs text-muted-foreground mb-2 px-1">共 {{ groupTotal }} 个分组</div>
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div v-if="loadingGroups" class="flex items-center justify-center py-8">
            <Loader2 class="w-5 h-5 animate-spin text-primary" />
          </div>
          <div
            v-for="group in groups"
            :key="group.id"
            class="p-2.5 rounded-lg cursor-pointer border transition-all duration-200 flex items-center gap-2"
            :class="[
              currentGroupId === group.id
                ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20'
                : 'hover:bg-muted/50 border-border hover:border-muted-foreground/20 hover:shadow-sm',
              loadingGroups ? 'opacity-50 pointer-events-none' : '',
            ]"
            @click="handleSelectGroup(group)"
          >
            <span class="font-medium truncate text-sm min-w-0 flex-1">{{ group.name }}</span>
            <div
              class="text-xs text-muted-foreground truncate font-mono shrink-0 max-w-[100px]"
              :title="group.code"
            >
              {{ group.code }}
            </div>
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground shrink-0"
            >
              {{ getStatusLabel(group.status) }}
            </span>
            <div class="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                @click.stop="handleEditGroup(group)"
              >
                <Edit class="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                @click.stop="handleDeleteGroup(group.id)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div
            v-if="!loadingGroups && groupsIsEmpty"
            class="text-center text-muted-foreground py-8"
          >
            <p>暂无分组</p>
            <p class="text-xs mt-1">点击上方「新建」创建分组</p>
          </div>
        </div>
        <TablePagination
          :current-page="groupPage"
          :page-size="groupPageSize"
          :total="groupTotal"
          compact
          @change="groupGoto"
        />
      </div>

      <div class="flex-1 border rounded-lg p-4 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold">
              {{ currentGroupName || '请选择分组' }}
            </h2>
            <p class="text-sm text-muted-foreground">
              {{ currentGroupId ? `共 ${itemsTotal} 个导航项` : '左侧选择导航分组查看详情' }}
            </p>
          </div>
          <Button :disabled="!currentGroupId" @click="openAddItemsDialog">
            <Plus class="w-4 h-4 mr-1" />
            添加导航项
          </Button>
        </div>

        <div v-if="currentGroupId" class="flex-1 overflow-y-auto">
          <div v-if="loadingItems" class="flex items-center justify-center py-16">
            <Loader2 class="w-6 h-6 animate-spin text-primary" />
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12"></TableHead>
                <TableHead>标题</TableHead>
                <TableHead class="w-20">类型</TableHead>
                <TableHead class="w-48">链接/路径</TableHead>
                <TableHead class="w-24">打开方式</TableHead>
                <TableHead class="w-16 text-center">排序</TableHead>
                <TableHead class="w-16 text-center">可见</TableHead>
                <TableHead class="w-16">状态</TableHead>
                <TableHead class="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(item, index) in groupItems"
                :key="item.id"
                :class="[
                  isDragging && dragIndex === index ? 'opacity-50' : '',
                  dragOverIndex === index ? 'ring-2 ring-primary ring-offset-2' : '',
                  'transition-all duration-150 hover:bg-muted/50',
                ]"
              >
                <TableCell class="select-none w-12">
                  <div
                    draggable="true"
                    class="cursor-grab active:cursor-grabbing inline-flex"
                    @dragstart="handleDragStart(index)"
                    @dragover="handleDragOver($event, index)"
                    @dragleave="handleDragLeave"
                    @dragend="handleDragEnd"
                  >
                    <GripVertical class="w-4 h-4 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2 min-w-0">
                    <span v-if="item.icon" class="text-sm shrink-0">{{ item.icon }}</span>
                    <span class="font-medium truncate">{{ item.title || '-' }}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                    :class="getLinkTypeColor(item.linkType)"
                  >
                    {{ getLinkTypeLabel(item.linkType) }}
                  </span>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground truncate max-w-xs font-mono">
                  {{ item.linkUrl || item.linkId || '-' }}
                </TableCell>
                <TableCell>
                  <span
                    v-if="item.target"
                    class="inline-flex items-center gap-1 text-sm text-muted-foreground"
                  >
                    <ExternalLink class="w-3 h-3" />
                    {{ item.target === '_blank' ? '新窗口' : '当前窗口' }}
                  </span>
                  <span v-else class="text-sm text-muted-foreground">-</span>
                </TableCell>
                <TableCell class="text-center text-sm text-muted-foreground">{{
                  item.sort ?? index + 1
                }}</TableCell>
                <TableCell class="text-center">
                  <span
                    v-if="item.visible !== false"
                    class="inline-flex items-center gap-1 text-xs text-green-600"
                  >
                    <Eye class="w-3 h-3" />
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <EyeOff class="w-3 h-3" />
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
                  >
                    {{ getStatusLabel(item.status) }}
                  </span>
                </TableCell>
                <TableCell class="text-right">
                  <div class="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="h-8 w-8 hover:text-primary"
                      @click="handleEditItem(item)"
                    >
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="h-8 w-8 text-red-500 hover:text-red-600"
                      @click="handleRemoveItem(item)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="groupItems.length === 0">
                <TableCell colspan="9" class="text-center text-muted-foreground py-12">
                  <p class="text-lg font-medium mb-1">暂无导航项</p>
                  <p class="text-sm">点击右上角「添加导航项」从导航树选择</p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <TablePagination
            :current-page="itemsPage"
            :page-size="itemsPageSize"
            :total="itemsTotal"
            @change="itemsGoto"
          />
        </div>

        <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <ChevronRight class="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>从左侧选择一个导航分组</p>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:open="showGroupDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑分组' : '新建分组' }}</DialogTitle>
          <DialogDescription>{{
            isEdit ? '修改导航分组信息' : '创建新的导航分组'
          }}</DialogDescription>
        </DialogHeader>
        <div class="flex flex-wrap gap-4 py-4">
          <div class="space-y-2 flex-1 min-w-[160px]">
            <Label for="groupName">分组名称</Label>
            <Input id="groupName" v-model="groupFormData.name" placeholder="请输入分组名称" />
          </div>
          <div class="space-y-2 flex-1 min-w-[160px]">
            <Label for="groupCode">分组标识</Label>
            <Input id="groupCode" v-model="groupFormData.code" placeholder="如：main-nav" />
          </div>
          <div class="space-y-2 w-32 shrink-0">
            <Label for="status">状态</Label>
            <DictSelect v-model="groupFormData.status" :dict-items="statusItems" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="showGroupDialog = false">取消</Button>
          <Button @click="handleSaveGroup">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showEditItemDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑导航项</DialogTitle>
          <DialogDescription>修改导航项标题与排序</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="editTitle">标题</Label>
            <Input
              id="editTitle"
              v-model="editItemFormData.title"
              placeholder="请输入导航项标题"
            />
          </div>
          <div class="space-y-2">
            <Label for="editSort">排序</Label>
            <Input id="editSort" v-model.number="editItemFormData.sort" type="number" :min="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="showEditItemDialog = false">取消</Button>
          <Button @click="handleSaveEditItem">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showItemDialog">
      <DialogContent class="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>从导航树选择节点</DialogTitle>
          <DialogDescription>选择要添加到当前分组的导航项节点</DialogDescription>
        </DialogHeader>
        <div class="py-2">
          <div class="flex gap-2 mb-3">
            <Input
              v-model="poolSearchTitle"
              placeholder="搜索导航项标题..."
              class="flex-1"
              @keyup.enter="fetchNavTree"
            />
            <Button variant="outline" @click="fetchNavTree">搜索</Button>
          </div>
          <div class="border rounded-md">
            <div
              class="flex items-center gap-2 px-3 h-9 border-b text-xs font-medium text-muted-foreground bg-muted/30"
            >
              <span class="w-4 shrink-0"></span>
              <span class="w-6 shrink-0"></span>
              <span class="w-8 shrink-0 text-center">图标</span>
              <span class="w-56 shrink-0 min-w-0">标题</span>
              <span class="w-12 shrink-0 text-center">类型</span>
              <span class="w-40 shrink-0 hidden md:block">链接/路径</span>
              <span class="w-16 shrink-0 text-center hidden md:block">打开方式</span>
              <span class="w-12 shrink-0 text-center hidden md:block">排序</span>
              <span class="w-12 shrink-0 text-center hidden md:block">可见</span>
              <span class="w-14 shrink-0 text-center">状态</span>
            </div>
            <div class="max-h-[55vh] overflow-y-auto">
              <div v-if="treeLoading" class="flex items-center justify-center py-16">
                <Loader2 class="w-5 h-5 animate-spin text-primary" />
              </div>
              <div
                v-for="item in flatNavTree"
                v-else
                :key="item.id"
                class="flex items-center gap-2 px-3 h-10 border-b last:border-b-0 transition-colors"
                :class="[
                  existingItemIds.has(item.id)
                    ? 'opacity-50 cursor-not-allowed'
                    : poolSelectedIds.includes(item.id)
                      ? 'bg-primary/10 cursor-pointer hover:bg-primary/15'
                      : 'cursor-pointer hover:bg-muted/50',
                ]"
                @click="togglePoolItem(item.id)"
              >
                <input
                  type="checkbox"
                  :checked="poolSelectedIds.includes(item.id)"
                  :disabled="existingItemIds.has(item.id)"
                  class="pointer-events-none shrink-0 w-4"
                />
                <button
                  v-if="item.hasChildren"
                  type="button"
                  class="w-6 h-6 flex items-center justify-center hover:bg-muted rounded transition-colors shrink-0"
                  @click.stop="toggleTreeExpand(item.id)"
                >
                  <ChevronRight
                    class="w-4 h-4 text-muted-foreground transition-transform"
                    :class="{ 'rotate-90': treeExpandedIds[item.id] }"
                  />
                </button>
                <span v-else class="w-6 shrink-0"></span>
                <span class="w-8 shrink-0 flex items-center justify-center text-sm">
                  <span v-if="item.icon">{{ item.icon }}</span>
                </span>
                <span class="w-56 shrink-0 min-w-0 flex items-center gap-1.5">
                  <TreeGuides v-if="item.level > 0" :level="item.level" />
                  <span class="flex-1 min-w-0 truncate font-medium">{{ item.title }}</span>
                  <span
                    v-if="existingItemIds.has(item.id)"
                    class="text-xs text-muted-foreground shrink-0"
                    >已添加</span
                  >
                  <span
                    v-else-if="item.hasChildren"
                    class="text-xs text-muted-foreground shrink-0"
                    >({{ item.children?.length || 0 }})</span
                  >
                </span>
                <span class="w-12 shrink-0 text-xs text-muted-foreground text-center">
                  {{ getLinkTypeLabel(item.linkType) }}
                </span>
                <span
                  class="w-40 shrink-0 text-xs text-muted-foreground truncate font-mono hidden md:block"
                  >{{ item.linkUrl || item.linkId || '-' }}</span
                >
                <span class="w-16 shrink-0 text-xs text-muted-foreground text-center hidden md:block">
                  {{ item.target === '_blank' ? '新窗口' : '当前' }}
                </span>
                <span class="w-12 shrink-0 text-xs text-muted-foreground text-center hidden md:block">
                  {{ item.sort ?? 0 }}
                </span>
                <span class="w-12 shrink-0 text-center hidden md:block">
                  <component
                    :is="item.visible !== false ? Eye : EyeOff"
                    class="w-3.5 h-3.5 inline-block"
                    :class="item.visible !== false ? 'text-green-500' : 'text-muted-foreground'"
                  />
                </span>
                <span class="w-14 shrink-0 text-center">
                  <span
                    class="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                    >{{ getStatusLabel(item.status) }}</span>
                </span>
              </div>
              <div
                v-if="!treeLoading && flatNavTree.length === 0"
                class="text-center text-muted-foreground py-8"
              >
                暂无导航项
              </div>
            </div>
          </div>

          <div v-if="selectedItems.length > 0" class="mt-4">
            <h4 class="font-medium mb-2">已选择 ({{ selectedItems.length }})</h4>
            <div class="border rounded-md p-3 space-y-2">
              <div
                v-for="(item, index) in selectedItems"
                :key="item.id"
                class="flex items-center gap-3"
              >
                <span class="text-xs text-muted-foreground w-6">{{ index + 1 }}</span>
                <span class="flex-1 px-2 py-1 text-sm">{{ item.originalTitle }}</span>
                <button
                  class="text-muted-foreground hover:text-red-500"
                  @click="togglePoolItem(item.id)"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="showItemDialog = false">取消</Button>
          <Button @click="handleAddItems">添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
