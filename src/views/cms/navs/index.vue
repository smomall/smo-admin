<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteStore } from '@/stores/site'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Edit,
  Trash2,
  Link,
  Loader2,
  ListTree,
  List,
  Eye,
  EyeOff,
  ExternalLink,
} from '@lucide/vue'
import type { NavItem } from '@/types'
import { navApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'
import NavTreeNode from '@/components/NavTreeNode.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import TablePagination from '@/components/TablePagination.vue'
import LinkTargetSelect from '@/components/LinkTargetSelect.vue'
import { usePagedList } from '@/composables/usePagedList'
import { LINK_TYPE, LINK_TYPE_OPTIONS, getLinkTypeLabel, getLinkTypeColor } from '@/constants/nav'

const {
  items: statusItems,
  fetchDict: fetchStatusDict,
  getLabel: getStatusLabel,
} = useDict('common_status')
const { fetchDict: fetchNavTarget, getLabel: getTargetText } = useDict('open_target')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const route = useRoute()
const siteStore = useSiteStore()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const allNavItems = ref<NavItem[]>([])
const treeNavItems = ref<NavItem[]>([])
const searchTitle = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const expandedIds = ref<Record<string, boolean>>({})

// 显示模式：tree=树形, list=分页列表
const viewMode = ref<'tree' | 'list'>('tree')

const formData = ref({
  id: '',
  parentId: '0',
  title: '',
  linkType: LINK_TYPE.URL as string,
  linkUrl: '',
  linkId: '',
  icon: '',
  target: '_self',
  visible: true,
  sort: 0,
  status: '1',
  remark: '',
})

// 链接目标：URL 类型绑定 linkUrl，其他类型绑定 linkId
const linkTargetValue = computed({
  get: () =>
    formData.value.linkType === LINK_TYPE.URL ? formData.value.linkUrl : formData.value.linkId,
  set: (val: string) => {
    if (formData.value.linkType === LINK_TYPE.URL) {
      formData.value.linkUrl = val
    } else {
      formData.value.linkId = val
    }
  },
})

const {
  list: navItems,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadNavs,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => navApi.list(query),
  params: () => ({
    title: searchTitle.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    siteId: siteId.value,
  }),
  immediate: false,
})

async function fetchTreeNavItems(opts?: { expandAll?: boolean }) {
  loading.value = true
  try {
    const { data } = await navApi.tree({
      title: searchTitle.value,
      status: searchStatus.value === '__all__' ? '' : searchStatus.value,
      siteId: siteId.value,
    })
    if (data.value) {
      treeNavItems.value = data.value || []
      // 仅在明确请求时全量展开；保存/删除后刷新保留用户折叠状态
      if (opts?.expandAll) {
        expandAllDefault(treeNavItems.value)
      }
    } else {
      treeNavItems.value = []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
    treeNavItems.value = []
  } finally {
    loading.value = false
  }
}

// 获取导航项树（用于父级选择，需保留层级结构）
async function fetchAllNavItems() {
  try {
    const { data } = await navApi.tree({ siteId: siteId.value })
    if (data.value) {
      allNavItems.value = data.value || []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function expandAllDefault(items: NavItem[]) {
  items.forEach((item) => {
    if (item.children && item.children.length > 0) {
      expandedIds.value[item.id] = true
      expandAllDefault(item.children)
    }
  })
}

function toggleExpand(id: string) {
  expandedIds.value[id] = !expandedIds.value[id]
}

function expandAll() {
  const expand = (items: NavItem[]) => {
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        expandedIds.value[item.id] = true
        expand(item.children)
      }
    })
  }
  expand(treeNavItems.value)
}

function collapseAll() {
  expandedIds.value = {}
}

function switchMode(mode: 'tree' | 'list') {
  viewMode.value = mode
  if (mode === 'tree') {
    fetchTreeNavItems({ expandAll: true })
  } else {
    handleSearch()
  }
}

function getParentName(parentId?: string): string {
  if (!parentId || parentId === '0') return '-'
  const find = (items: NavItem[]): NavItem | undefined => {
    for (const item of items) {
      if (item.id === parentId) return item
      if (item.children) {
        const found = find(item.children)
        if (found) return found
      }
    }
  }
  const parent = find(allNavItems.value)
  return parent?.title || '-'
}

function renderNavItems(items: NavItem[], level = 0): NavItem[] {
  const result: NavItem[] = []
  for (const item of items) {
    // 排除当前编辑的节点及其子树，避免选成自己的父级导致成环
    if (item.id && item.id !== formData.value.id) {
      result.push({ ...item, indent: level })
      if (item.children?.length) {
        result.push(...renderNavItems(item.children, level + 1))
      }
    }
  }
  return result
}
const flatNavItems = computed(() => renderNavItems(allNavItems.value))

function handleReset() {
  searchTitle.value = ''
  searchStatus.value = '__all__'
  if (viewMode.value === 'tree') {
    fetchTreeNavItems({ expandAll: true })
  } else {
    handleSearch()
  }
}

// 搜索：树形模式刷新树（并展开匹配项），列表模式走分页搜索
function performSearch() {
  if (viewMode.value === 'tree') {
    fetchTreeNavItems({ expandAll: true })
  } else {
    handleSearch()
  }
}

function handleAdd(parentId = '0') {
  isEdit.value = false
  formData.value = {
    id: '',
    parentId: parentId || '0',
    title: '',
    linkType: LINK_TYPE.URL,
    linkUrl: '',
    linkId: '',
    icon: '',
    target: '_self',
    visible: true,
    sort: 0,
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(item: NavItem) {
  isEdit.value = true
  formData.value = {
    id: item.id,
    parentId: item.parentId || '0',
    title: item.title,
    linkType: item.linkType || LINK_TYPE.URL,
    linkUrl: item.linkUrl || '',
    linkId: item.linkId ? String(item.linkId) : '',
    icon: item.icon || '',
    target: item.target || '_self',
    visible: item.visible !== false,
    sort: item.sort || 0,
    status: String(item.status),
    remark: item.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除导航项', '确定要删除该导航项吗？其所有子导航项将一并删除。')
  if (!confirmed) return
  try {
    await navApi.remove(id)
    showSuccess('删除成功')
    if (viewMode.value === 'list') {
      reloadAfterRemove()
    } else {
      fetchTreeNavItems()
    }
    fetchAllNavItems()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写导航项标题')
    return
  }
  saving.value = true
  try {
    const submitData: Partial<NavItem> = {
      title: formData.value.title,
      linkType: formData.value.linkType,
      linkUrl: formData.value.linkUrl,
      icon: formData.value.icon,
      target: formData.value.target,
      visible: formData.value.visible,
      sort: formData.value.sort,
      status: formData.value.status,
      remark: formData.value.remark,
      parentId: formData.value.parentId,
    }
    if (formData.value.linkId) {
      submitData.linkId = formData.value.linkId
    }
    if (!isEdit.value) {
      submitData.siteId = siteId.value
    }
    if (isEdit.value) {
      await navApi.update(formData.value.id, submitData)
    } else {
      await navApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (viewMode.value === 'list') {
      if (isEdit.value) reloadNavs()
      else handleSearch()
    } else {
      fetchTreeNavItems()
    }
    fetchAllNavItems()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  Promise.all([fetchStatusDict(), fetchNavTarget(), fetchAllNavItems()])
  fetchTreeNavItems({ expandAll: true })
})
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2">
        <div class="flex items-center rounded-md border p-0.5">
          <Button
            :variant="viewMode === 'tree' ? 'default' : 'ghost'"
            size="sm"
            class="gap-1.5"
            @click="switchMode('tree')"
          >
            <ListTree class="w-4 h-4" />
            树形
          </Button>
          <Button
            :variant="viewMode === 'list' ? 'default' : 'ghost'"
            size="sm"
            class="gap-1.5"
            @click="switchMode('list')"
          >
            <List class="w-4 h-4" />
            列表
          </Button>
        </div>
        <Button @click="handleAdd()">
          <Plus class="w-4 h-4 mr-2" />
          新增导航项
        </Button>
      </div>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchTitle"
          placeholder="导航项标题"
          class="w-48"
          @keyup.enter="performSearch"
        />
        <DictSelect
          v-model="searchStatus"
          :dict-items="statusItems"
          all
          all-label="全部状态"
          placeholder="全部状态"
          class="w-32"
        />
        <Button variant="outline" @click="performSearch">搜索</Button>
        <Button variant="ghost" @click="handleReset">重置</Button>
        <div class="flex-1"></div>
        <template v-if="viewMode === 'tree'">
          <Button variant="outline" size="sm" @click="expandAll">全部展开</Button>
          <Button variant="outline" size="sm" @click="collapseAll">全部折叠</Button>
        </template>
      </div>
    </div>

    <div class="bg-card rounded-xl border shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <Loader2 class="w-6 h-6 animate-spin text-primary" />
      </div>

      <!-- 表头 -->
      <div
        v-else
        class="flex items-center gap-2 px-2 py-2 border-b text-xs font-medium text-muted-foreground"
      >
        <span v-if="viewMode === 'tree'" class="w-6"></span>
        <span class="w-8"></span>
        <span class="w-32 hidden xl:block">ID</span>
        <span class="flex-1 min-w-0">标题</span>
        <span v-if="viewMode === 'list'" class="w-32 hidden lg:block">父级导航</span>
        <span class="w-20 hidden md:block">链接类型</span>
        <span class="w-40 hidden lg:block">链接地址</span>
        <span class="w-20 hidden lg:block">打开目标</span>
        <span class="w-16 text-center hidden md:block">排序</span>
        <span class="w-16 text-center hidden md:block">可见</span>
        <span class="w-16 text-center hidden lg:block">状态</span>
        <span class="w-32 hidden xl:block">备注</span>
        <span class="w-20 text-right">操作</span>
      </div>

      <div v-if="!loading" class="space-y-0.5 pt-1">
        <!-- 树形模式 -->
        <template v-if="viewMode === 'tree'">
          <NavTreeNode
            v-for="item in treeNavItems"
            :key="item.id"
            :item="item"
            :level="0"
            :expanded-ids="expandedIds"
            :get-status-label="getStatusLabel"
            :get-link-type-text="getLinkTypeLabel"
            :get-target-text="getTargetText"
            @toggle-expand="toggleExpand"
            @add="handleAdd"
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </template>

        <!-- 列表模式 -->
        <template v-else>
          <div
            v-for="item in navItems"
            :key="item.id"
            class="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
          >
            <span class="w-8 shrink-0 flex items-center justify-center">
              <span v-if="item.icon" class="text-sm">{{ item.icon }}</span>
            </span>
            <span
              class="w-32 shrink-0 hidden xl:block text-xs text-muted-foreground font-mono min-w-0 truncate"
              :title="item.id"
              >{{ item.id }}</span
            >
            <span class="flex-1 min-w-0 font-medium truncate">{{ item.title }}</span>
            <span class="w-32 hidden lg:block text-xs text-muted-foreground truncate">{{
              getParentName(item.parentId)
            }}</span>
            <span class="w-20 hidden md:block">
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                :class="getLinkTypeColor(item.linkType)"
              >
                {{ getLinkTypeLabel(item.linkType) }}
              </span>
            </span>
            <span class="w-40 hidden lg:block text-xs text-muted-foreground truncate font-mono">{{
              item.linkUrl || item.linkId || '-'
            }}</span>
            <span class="w-20 hidden lg:block">
              <span
                v-if="item.target"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <ExternalLink class="w-3 h-3" />
                {{ getTargetText(item.target) }}
              </span>
              <span v-else class="text-xs text-muted-foreground">-</span>
            </span>
            <span class="w-16 text-center hidden md:block text-sm text-muted-foreground">{{
              item.sort ?? 0
            }}</span>
            <span class="w-16 text-center hidden md:block">
              <span
                v-if="item.visible !== false"
                class="inline-flex items-center gap-1 text-xs text-green-600"
              >
                <Eye class="w-3 h-3" />
              </span>
              <span v-else class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <EyeOff class="w-3 h-3" />
              </span>
            </span>
            <span class="w-16 text-center hidden lg:block">
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(item.status) }}
              </span>
            </span>
            <span class="w-32 hidden xl:block text-xs text-muted-foreground truncate">{{
              item.remark || '-'
            }}</span>
            <span class="w-20 flex items-center justify-end gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 hover:text-primary"
                @click="handleAdd(item.id)"
              >
                <Plus class="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 hover:text-primary"
                @click="handleEdit(item)"
              >
                <Edit class="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 text-red-500 hover:text-red-600"
                @click="handleDelete(item.id)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </Button>
            </span>
          </div>
        </template>

        <div
          v-if="
            !loading && (viewMode === 'tree' ? treeNavItems.length === 0 : navItems.length === 0)
          "
          class="text-center text-muted-foreground py-12"
        >
          <p class="text-lg font-medium mb-1">暂无导航项</p>
          <p class="text-sm">点击右上角「新增导航项」创建</p>
        </div>
      </div>
    </div>

    <!-- 分页（仅列表模式） -->
    <TablePagination
      v-if="viewMode === 'list'"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @change="goto"
    />

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑导航项' : '新增导航项' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改导航项信息' : '创建新的导航项' }}</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2 col-span-2">
            <Label for="parentId">父级导航</Label>
            <Select v-model="formData.parentId">
              <SelectTrigger>
                <SelectValue placeholder="无（顶级导航）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  <span class="truncate">无（顶级导航）</span>
                </SelectItem>
                <SelectItem v-for="item in flatNavItems" :key="item.id" :value="item.id">
                  <div class="flex items-center min-w-0">
                    <TreeGuides :level="(item as any).indent || 0" />
                    <Link class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5" />
                    <span class="ml-1.5 truncate">{{ item.title }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">选择父级后，该导航项将作为其子项显示</p>
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="title">标题 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入导航项标题" />
          </div>
          <div class="space-y-2">
            <Label for="linkType">链接类型</Label>
            <Select v-model="formData.linkType">
              <SelectTrigger>
                <SelectValue placeholder="请选择链接类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in LINK_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>链接目标</Label>
            <LinkTargetSelect
              :link-type="formData.linkType"
              :model-value="linkTargetValue"
              :site-id="siteId"
              @update:model-value="linkTargetValue = $event"
            />
          </div>
          <div class="space-y-2">
            <Label for="icon">图标</Label>
            <Input id="icon" v-model="formData.icon" placeholder="图标名称" />
          </div>
          <div class="space-y-2">
            <Label for="target">打开目标</Label>
            <DictSelect id="target" v-model="formData.target" dict-type="open_target" />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序</Label>
            <Input id="sort" v-model.number="formData.sort" type="number" placeholder="排序号" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="statusItems" />
          </div>
          <div class="space-y-2">
            <Label for="visible">可见</Label>
            <Switch v-model="formData.visible" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="remark">备注</Label>
            <Input id="remark" v-model="formData.remark" placeholder="请输入备注" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit" :disabled="saving">{{
            saving ? '保存中...' : isEdit ? '保存' : '创建'
          }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
