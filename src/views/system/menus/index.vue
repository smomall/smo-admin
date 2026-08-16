<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Key,
  Menu,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ListTree,
  List,
} from '@lucide/vue'
import MenuTreeItem from '@/components/MenuTreeItem.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import DictSelect from '@/components/DictSelect.vue'
import { menuApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { Menu as MenuType } from '@/types'

const menus = ref<MenuType[]>([])
const allMenus = ref<MenuType[]>([])
const menuTreeData = ref<MenuType[]>([])
const searchName = ref('')
const searchStatus = ref('__all__')
const searchType = ref('__all__')
const showDialog = ref(false)
const isEdit = ref(false)
const expandedMenus = ref<Record<string, boolean>>({})
const loading = ref(false)
const viewMode = ref<'tree' | 'list'>('tree')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const iconMap: Record<string, unknown> = {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Key,
  Menu,
}

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const formData = ref({
  id: '',
  parentId: '0',
  name: '',
  path: '',
  icon: '',
  component: '',
  sort: 0,
  type: 'm' as 'd' | 'm' | 'b',
  visible: true,
  permission: '',
  external: false,
})

const filteredMenus = computed(() => {
  if (viewMode.value === 'tree') {
    return menus.value
  }
  let result = [...allMenus.value]
  if (searchName.value) {
    result = result.filter((m) =>
      m.name.toLowerCase().includes(searchName.value.toLowerCase())
    )
  }
  if (searchStatus.value && searchStatus.value !== '__all__') {
    const isVisible = searchStatus.value === '1'
    result = result.filter((m) => m.visible === isVisible)
  }
  if (searchType.value && searchType.value !== '__all__') {
    result = result.filter((m) => m.type === searchType.value)
  }
  return result
})

const pagedMenus = computed(() => {
  if (viewMode.value === 'tree') return []
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredMenus.value.slice(start, end)
})

// 扁平化树形菜单，支持任意层级（给父菜单 Select 用）
const flatMenuOptions = computed<(MenuType & { indent: number })[]>(() => {
  const result: (MenuType & { indent: number })[] = []
  function walk(list: MenuType[], level: number, exceptEditId?: string) {
    for (const m of list) {
      if (exceptEditId && (m.id === exceptEditId)) continue
      result.push({ ...m, indent: level })
      if (m.children && m.children.length > 0) {
        // 编辑时不能把自己选作父级（避免循环），子树也跳过
        if (exceptEditId && m.id === exceptEditId) continue
        walk(m.children, level + 1, exceptEditId)
      }
    }
  }
  walk(menuTreeData.value, 0, isEdit.value ? formData.value.id : undefined)
  return result
})

function getMenuIcon(iconName?: string) {
  return (iconName && (iconMap[iconName] as unknown)) || Menu
}

const totalPages = computed(() => Math.ceil(filteredMenus.value.length / pageSize.value))

async function fetchMenus() {
  loading.value = true
  try {
    if (viewMode.value === 'tree') {
      const { data } = await menuApi.tree()
      if (data.value) {
        const sorted = (data.value || []).sort((a: MenuType, b: MenuType) => (a.sort || 0) - (b.sort || 0))
        menus.value = sorted
        // 复用树数据，供父菜单下拉使用
        menuTreeData.value = sorted
        menus.value.forEach((menu) => {
          if (menu.children && menu.children.length > 0) {
            menu.children.sort((a, b) => (a.sort || 0) - (b.sort || 0))
            expandedMenus.value[menu.id] = true
          }
        })
      } else {
        menus.value = []
        menuTreeData.value = []
      }
    } else {
      // 列表模式并行获取列表和树数据，确保父菜单下拉选项完整
      const [listRes, treeRes] = await Promise.all([
        menuApi.list(),
        menuApi.tree(),
      ])
      if (listRes.data.value) {
        allMenus.value = listRes.data.value as MenuType[]
        total.value = allMenus.value.length
      } else {
        allMenus.value = []
        total.value = 0
      }
      if (treeRes.data.value) {
        menuTreeData.value = (treeRes.data.value || []).sort((a: MenuType, b: MenuType) => (a.sort || 0) - (b.sort || 0))
      } else {
        menuTreeData.value = []
      }
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
    if (viewMode.value === 'tree') {
      menus.value = []
    } else {
      allMenus.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
  }
}

function switchViewMode(mode: 'tree' | 'list') {
  if (viewMode.value === mode) return
  viewMode.value = mode
  page.value = 1
  fetchMenus()
}

function getParentName(parentId: string) {
  if (!parentId || parentId === '0') return '顶级菜单'
  const parent = allMenus.value.find((m) => m.id === parentId)
  return parent?.name || '-'
}

onMounted(async () => {
  await fetchMenus()
})

function getIcon(iconName: string) {
  return iconMap[iconName] || Menu
}

function expandAll() {
  menus.value.forEach((menu) => {
    if (menu.children && menu.children.length > 0) {
      expandedMenus.value[menu.id] = true
    }
  })
}

function collapseAll() {
  expandedMenus.value = {}
}

function handleSearch() {
  page.value = 1
  total.value = filteredMenus.value.length
}

function handleReset() {
  searchName.value = ''
  searchStatus.value = '__all__'
  searchType.value = '__all__'
  page.value = 1
  total.value = allMenus.value.length
}

function handlePageChange(p: number) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
}

function handleAdd(parentId = '0') {
  isEdit.value = false
  formData.value = {
    id: '',
    parentId,
    name: '',
    path: '',
    icon: '',
    component: '',
    sort: 0,
    type: 'm',
    visible: true,
    permission: '',
    external: false,
  }
  showDialog.value = true
}

function handleEdit(menu: MenuType) {
  isEdit.value = true
  formData.value = {
    id: menu.id,
    parentId: menu.parentId || '0',
    name: menu.name,
    path: menu.path,
    icon: menu.icon || '',
    component: menu.component || '',
    sort: menu.sort,
    type: menu.type,
    visible: menu.visible,
    permission: menu.permission || '',
    external: menu.external || false,
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除菜单', '确定要删除该菜单吗？')
  if (!confirmed) return
  try {
    await menuApi.delete(id)
    showSuccess('删除成功')
    fetchMenus()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.name) {
    showError('请填写菜单名称')
    return
  }
  try {
    const submitData = {
      ...formData.value,
      parentId: formData.value.parentId,
    }
    if (isEdit.value) {
      await menuApi.update(formData.value.id, submitData)
    } else {
      await menuApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    fetchMenus()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSort(menus: MenuType[]) {
  try {
    const updateData = menus.map((m) => ({
      id: m.id,
      sort: m.sort,
    }))
    await menuApi.sort(updateData as MenuType[])
    showSuccess('排序更新成功')
    await fetchMenus()
  } catch {
    // useRequest 已统一处理错误提示
    await fetchMenus()
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2">
        <div class="flex items-center border rounded-lg p-0.5 bg-muted/50">
          <Button
            variant="ghost"
            size="sm"
            :class="viewMode === 'tree' ? 'bg-background shadow-sm' : ''"
            @click="switchViewMode('tree')"
          >
            <ListTree class="w-4 h-4 mr-1.5" />
            树形
          </Button>
          <Button
            variant="ghost"
            size="sm"
            :class="viewMode === 'list' ? 'bg-background shadow-sm' : ''"
            @click="switchViewMode('list')"
          >
            <List class="w-4 h-4 mr-1.5" />
            列表
          </Button>
        </div>
        <Button @click="handleAdd">
          <Plus class="w-4 h-4 mr-2" />
          新增菜单
        </Button>
      </div>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4 space-y-4">
      <!-- 搜索栏 -->
      <div class="flex flex-wrap items-center gap-2">
        <Input
          v-model="searchName"
          placeholder="搜索菜单名称"
          class="w-48 h-8 text-xs"
          @input="handleSearch"
        />
        <DictSelect v-model="searchStatus" dict-type="common_status" placeholder="全部状态" class="w-28" @update:model-value="handleSearch" />
        <DictSelect v-model="searchType" dict-type="menu_type" placeholder="全部类型" class="w-28" @update:model-value="handleSearch" />
        <Button variant="outline" size="sm" @click="handleReset">
          重置
        </Button>
        <template v-if="viewMode === 'tree'">
          <div class="flex-1"></div>
          <Button variant="outline" size="sm" @click="expandAll">
            全部展开
          </Button>
          <Button variant="outline" size="sm" @click="collapseAll">
            全部折叠
          </Button>
        </template>
        <template v-else>
          <div class="flex-1"></div>
          <span class="text-sm text-muted-foreground">共 {{ total }} 条</span>
        </template>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <Loader2 class="w-6 h-6 animate-spin text-primary" />
      </div>

      <!-- 表头 -->
      <div v-else class="flex items-center gap-2 px-2 py-2 border-b text-xs font-medium text-muted-foreground">
        <span v-if="viewMode === 'tree'" class="w-6"></span>
        <span class="w-8"></span>
        <span class="flex-1 min-w-0">菜单名称</span>
        <span v-if="viewMode === 'list'" class="w-28 hidden lg:block">父级菜单</span>
        <span class="w-40 hidden md:block">路径</span>
        <span class="w-20 hidden lg:block">类型</span>
        <span class="w-40 hidden lg:block">权限标识</span>
        <span class="w-32 hidden xl:block">组件路径</span>
        <span class="w-16 text-center hidden md:block">排序</span>
        <span class="w-20 text-center hidden lg:block">状态</span>
        <span class="w-24 text-right">操作</span>
      </div>

      <div v-if="!loading" class="space-y-1 pt-1">
        <!-- 树形模式 -->
        <template v-if="viewMode === 'tree'">
          <div class="space-y-1">
            <MenuTreeItem
              v-for="menu in menus"
              :key="menu.id"
              :menu="menu"
              :level="0"
              :show-actions="true"
              @add="handleAdd"
              @edit="handleEdit"
              @delete="handleDelete"
              @sort="handleSort"
            />
          </div>
        </template>

        <!-- 列表模式 -->
        <template v-else>
          <div
            v-for="menu in pagedMenus"
            :key="menu.id"
            class="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
          >
            <span class="w-8 shrink-0 flex items-center justify-center">
              <component :is="getIcon(menu.icon || 'Menu')" class="w-4 h-4 text-primary" />
            </span>
            <span class="flex-1 min-w-0 font-medium truncate">{{ menu.name }}</span>
            <span class="w-28 hidden lg:block text-xs text-muted-foreground truncate">{{ getParentName(menu.parentId || '') }}</span>
            <span class="w-40 hidden md:block text-xs text-muted-foreground truncate font-mono">{{ menu.path }}</span>
            <span class="w-20 hidden lg:block">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                :class="{
                  'bg-blue-50 text-blue-600': String(menu.type) === 'd',
                  'bg-green-50 text-green-600': String(menu.type) === 'm',
                  'bg-amber-50 text-amber-600': String(menu.type) === 'b',
                }">
                {{ String(menu.type) === 'd' ? '目录' : String(menu.type) === 'm' ? '菜单' : '按钮' }}
              </span>
            </span>
            <span class="w-40 hidden lg:block text-xs text-muted-foreground truncate font-mono">{{ menu.permission || '-' }}</span>
            <span class="w-32 hidden xl:block text-xs text-muted-foreground truncate font-mono">{{ menu.component || '-' }}</span>
            <span class="w-16 text-center hidden md:block text-sm text-muted-foreground">{{ menu.sort }}</span>
            <span class="w-20 text-center hidden lg:block">
              <span v-if="menu.visible" class="inline-flex items-center gap-1 text-xs text-green-600">
                <Eye class="w-3 h-3" />
              </span>
              <span v-else class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <EyeOff class="w-3 h-3" />
              </span>
            </span>
            <span class="w-24 flex items-center justify-end gap-0.5 shrink-0">
              <Button variant="ghost" size="icon-sm" class="h-7 w-7 hover:text-primary" @click="handleAdd(menu.id)">
                <Plus class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" class="h-7 w-7 hover:text-primary" @click="handleEdit(menu)">
                <Edit class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" class="h-7 w-7 text-red-500 hover:text-red-600" @click="handleDelete(menu.id)">
                <Trash2 class="w-3.5 h-3.5" />
              </Button>
            </span>
          </div>
        </template>

        <div v-if="!loading && ((viewMode === 'tree' && menus.length === 0) || (viewMode === 'list' && total === 0))" class="text-center text-muted-foreground py-12">
          <p class="text-lg font-medium mb-1">暂无菜单</p>
          <p class="text-sm">点击右上角「新增菜单」创建</p>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="viewMode === 'list' && total > 0" class="flex items-center justify-between pt-4 border-t">
        <span class="text-sm text-muted-foreground">
          第 {{ page }} / {{ totalPages }} 页，共 {{ total }} 条
        </span>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="handlePageChange(page - 1)"
          >
            上一页
          </Button>
          <span class="text-sm font-medium w-20 text-center">{{ page }} / {{ totalPages }}</span>
          <Button
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            @click="handlePageChange(page + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑菜单' : '新增菜单' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改菜单信息' : '添加新菜单' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="parentId">父菜单</Label>
            <Select v-model="formData.parentId">
              <SelectTrigger>
                <SelectValue placeholder="选择父菜单" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  <div class="flex items-center min-w-0">
                    <component :is="Menu" class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span class="ml-1.5 truncate">无（顶级菜单）</span>
                  </div>
                </SelectItem>
                <SelectItem
                  v-for="m in flatMenuOptions"
                  :key="m.id"
                  :value="m.id"
                >
                  <div class="flex items-center min-w-0">
                    <TreeGuides :level="m.indent" />
                    <component
                      :is="getMenuIcon(m.icon)"
                      class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5"
                    />
                    <span class="ml-1.5 truncate">{{ m.name }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="type">菜单类型</Label>
            <DictSelect id="type" v-model="formData.type" dict-type="menu_type" />
          </div>
          <div class="space-y-2">
            <Label for="name">菜单名称</Label>
            <Input id="name" v-model="formData.name" placeholder="请输入菜单名称" />
          </div>
          <div class="space-y-2">
            <Label for="path">菜单路径</Label>
            <Input id="path" v-model="formData.path" placeholder="请输入菜单路径" />
          </div>
          <div class="space-y-2">
            <Label for="icon">图标</Label>
            <Input id="icon" v-model="formData.icon" placeholder="如: LayoutDashboard" />
          </div>
          <div class="space-y-2">
            <Label for="component">组件路径</Label>
            <Input id="component" v-model="formData.component" placeholder="如: dashboard/index" />
          </div>
          <div class="space-y-2">
            <Label for="permission">权限标识</Label>
            <Input id="permission" v-model="formData.permission" placeholder="如: system:user:list" />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序</Label>
            <Input id="sort" v-model="formData.sort" type="number" placeholder="请输入排序号" />
          </div>
          <div class="space-y-2">
            <Label>显示状态</Label>
            <div class="flex items-center gap-2 h-9">
              <Switch id="visible" v-model="formData.visible" />
              <Label for="visible">{{ formData.visible ? '显示' : '隐藏' }}</Label>
            </div>
          </div>
          <div class="space-y-2">
            <Label>外部链接</Label>
            <div class="flex items-center gap-2 h-9">
              <Switch id="external" v-model="formData.external" />
              <Label for="external">外部链接</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
