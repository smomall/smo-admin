<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessageDialog } from '@/composables/useMessageDialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Key,
  Menu,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Users,
} from '@lucide/vue'
import type { Role, Permission, Menu as MenuType, Organization } from '@/types'
import { roleApi, permissionApi, menuApi, organizationApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: enableStatusItems, getLabel } = useDict('common_status')
const { getLabel: getRoleTypeLabel } = useDict('role_type')
const { getLabel: getModuleLabel } = useDict('permission_module')
const { getLabel: getFunctionLabel } = useDict('permission_function')
const { getLabel: getHttpMethodLabel } = useDict('http_method')

const DataScopeEnum = [
  { value: '0', label: '没有数据权限' },
  { value: '1', label: '全部数据权限' },
  { value: '2', label: '自定义部门数据权限' },
  { value: '3', label: '本部门及以下数据权限' },
  { value: '4', label: '本部门数据权限' },
  { value: '5', label: '仅本人数据权限' },
]

function getDataScopeLabel(value: string | number) {
  const strValue = String(value)
  return DataScopeEnum.find((item) => item.value === strValue)?.label || String(value)
}

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const iconMap: Record<string, unknown> = {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  Key,
  Menu,
}

function getMenuIcon(iconName?: string) {
  return (iconName && (iconMap[iconName] as unknown)) || Menu
}

const searchName = ref('')
const searchCode = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const showPermDialog = ref(false)
const isEdit = ref(false)
const currentRole = ref<Role | null>(null)
const activeTab = ref('permissions')

const allPermissions = ref<Permission[]>([])
const allMenus = ref<MenuType[]>([])
const selectedPermissionIds = ref<Set<string>>(new Set())
const selectedMenuIds = ref<Set<string>>(new Set())
const menuExpandedIds = ref<Set<string>>(new Set())

const allOrganizations = ref<Organization[]>([])
const selectedOrgIds = ref<Set<string>>(new Set())
const orgExpandedIds = ref<Set<string>>(new Set())

const permSearchName = ref('')
const permSearchCode = ref('')
const permCurrentPage = ref(1)
const permPageSize = ref(20)
const selectAll = computed(() => {
  if (displayPermissions.value.length === 0) return false
  return displayPermissions.value.every((p) => selectedPermissionIds.value.has(p.id))
})

const filteredPermissions = computed(() => {
  let result = allPermissions.value
  if (permSearchName.value) {
    result = result.filter((p) =>
      p.name?.toLowerCase().includes(permSearchName.value.toLowerCase()),
    )
  }
  if (permSearchCode.value) {
    result = result.filter((p) =>
      p.code?.toLowerCase().includes(permSearchCode.value.toLowerCase()),
    )
  }
  return result
})

const permTotal = computed(() => filteredPermissions.value.length)

const displayPermissions = computed(() => {
  const start = (permCurrentPage.value - 1) * permPageSize.value
  const end = start + permPageSize.value
  return filteredPermissions.value.slice(start, end)
})

const formData = ref({
  id: '',
  name: '',
  code: '',
  description: '',
  type: '1',
  dataScope: '1',
  status: '1',
})

const {
  list: roles,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadRoles,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => roleApi.list(query),
  params: () => ({
    name: searchName.value,
    code: searchCode.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

async function fetchAllPermissions() {
  try {
    const { data } = await permissionApi.list()
    if (data.value) {
      allPermissions.value = data.value
    } else {
      allPermissions.value = []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function fetchAllMenus() {
  try {
    const { data } = await menuApi.tree()
    if (data.value) {
      allMenus.value = data.value || []
      expandAllMenus(allMenus.value)
    } else {
      allMenus.value = []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function fetchAllOrganizations() {
  try {
    const { data } = await organizationApi.tree()
    if (data.value) {
      allOrganizations.value = data.value || []
      expandAllOrgs(allOrganizations.value)
    } else {
      allOrganizations.value = []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function expandAllOrgs(list: Organization[]) {
  const next = new Set(orgExpandedIds.value)
  function walk(items: Organization[]) {
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        next.add(item.id)
        walk(item.children)
      }
    }
  }
  walk(list)
  orgExpandedIds.value = next
}

const showOrgSelector = computed(() => formData.value.dataScope === '2')

const flatOrgItems = computed(() => {
  const result: { item: Organization; level: number; hasChildren: boolean }[] = []
  function walk(items: Organization[], level: number = 0) {
    for (const item of items) {
      result.push({ item, level, hasChildren: !!(item.children && item.children.length > 0) })
      if (item.children && item.children.length > 0 && orgExpandedIds.value.has(item.id)) {
        walk(item.children, level + 1)
      }
    }
  }
  walk(allOrganizations.value)
  return result
})

function toggleOrg(id: string) {
  const next = new Set(selectedOrgIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedOrgIds.value = next
}

function toggleOrgExpand(id: string) {
  const next = new Set(orgExpandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  orgExpandedIds.value = next
}

function isOrgExpanded(id: string) {
  return orgExpandedIds.value.has(id)
}

function expandAllMenus(list: MenuType[]) {
  const next = new Set(menuExpandedIds.value)
  function walk(items: MenuType[]) {
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        next.add(item.id)
        walk(item.children)
      }
    }
  }
  walk(list)
  menuExpandedIds.value = next
}

function handlePermSearch() {
  permCurrentPage.value = 1
}

function handlePermReset() {
  permSearchName.value = ''
  permSearchCode.value = ''
  permCurrentPage.value = 1
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    const ids = displayPermissions.value.map((p) => p.id)
    selectedPermissionIds.value = new Set([...selectedPermissionIds.value, ...ids])
  } else {
    const currentIds = new Set(selectedPermissionIds.value)
    displayPermissions.value.forEach((p) => {
      currentIds.delete(p.id)
    })
    selectedPermissionIds.value = currentIds
  }
}

function handleReset() {
  searchName.value = ''
  searchCode.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    name: '',
    code: '',
    description: '',
    type: '1',
    dataScope: '1',
    status: '1',
  }
  selectedOrgIds.value = new Set()
  fetchAllOrganizations()
  showDialog.value = true
}

async function handleEdit(role: Role) {
  isEdit.value = true
  formData.value = {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description || '',
    type: String(role.type ?? 1),
    dataScope: String(role.dataScope ?? 1),
    status: String(role.status),
  }
  selectedOrgIds.value = new Set()
  await fetchAllOrganizations()
  if (formData.value.dataScope === '2') {
    try {
      const { data } = await roleApi.getOrganizationIds(role.id)
      if (data.value) {
        selectedOrgIds.value = new Set(data.value)
      }
    } catch {
      // ignore
    }
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除角色', '确定要删除该角色吗？')
  if (!confirmed) return
  try {
    await roleApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.code) {
    showError('请填写必填项')
    return
  }
  try {
    const payload = {
      ...formData.value,
      type: Number(formData.value.type),
      dataScope: Number(formData.value.dataScope),
    }
    if (isEdit.value) {
      await roleApi.update(formData.value.id, payload)
    } else {
      const { data } = await roleApi.create(payload)
      if (data.value) {
        const result = data.value as { id?: string } | string
        formData.value.id = typeof result === 'string' ? result : (result.id ?? '')
      }
    }

    if (formData.value.dataScope === '2' && formData.value.id) {
      await roleApi.assignOrganizations(formData.value.id, Array.from(selectedOrgIds.value))
    }

    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadRoles()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleAuth(role: Role) {
  currentRole.value = role
  activeTab.value = 'permissions'

  try {
    const [permResult, menuResult] = await Promise.all([
      roleApi.getPermissionIds(role.id),
      roleApi.getMenuIds(role.id),
    ])

    selectedPermissionIds.value = new Set(permResult.data.value ?? [])
    selectedMenuIds.value = new Set(menuResult.data.value ?? [])

    await fetchAllPermissions()
    handlePermReset()
    await fetchAllMenus()

    showPermDialog.value = true
  } catch {
    // useRequest 已统一处理错误提示
  }
}

function toggleMenuExpand(id: string) {
  const next = new Set(menuExpandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  menuExpandedIds.value = next
}

function isMenuExpanded(id: string) {
  return menuExpandedIds.value.has(id)
}

function hasMenuChildren(item: MenuType) {
  return item.children && item.children.length > 0
}

const flatMenuItems = computed(() => {
  const result: { item: MenuType; level: number; hasChildren: boolean }[] = []

  function walk(items: MenuType[], level: number = 0) {
    for (const item of items) {
      result.push({ item, level, hasChildren: !!hasMenuChildren(item) })
      if (hasMenuChildren(item) && isMenuExpanded(item.id)) {
        walk(item.children!, level + 1)
      }
    }
  }

  walk(allMenus.value)
  return result
})

// 菜单 ID → 父菜单 ID 映射，用于勾选子菜单时自动勾选祖先
const menuParentMap = computed<Map<string, string>>(() => {
  const map = new Map<string, string>()
  function walk(items: MenuType[], parentId?: string) {
    for (const item of items) {
      if (parentId) {
        map.set(item.id, parentId)
      }
      if (item.children?.length) {
        walk(item.children, item.id)
      }
    }
  }
  walk(allMenus.value)
  return map
})

function togglePermission(id: string, item: Permission) {
  const next = new Set(selectedPermissionIds.value)
  if (next.has(id)) {
    next.delete(id)
    if (item.children) {
      const removeChildren = (children: Permission[]) => {
        for (const child of children) {
          next.delete(child.id)
          if (child.children) {
            removeChildren(child.children)
          }
        }
      }
      removeChildren(item.children)
    }
  } else {
    next.add(id)
    if (item.children) {
      const addChildren = (children: Permission[]) => {
        for (const child of children) {
          next.add(child.id)
          if (child.children) {
            addChildren(child.children)
          }
        }
      }
      addChildren(item.children)
    }
  }
  selectedPermissionIds.value = next
}

function toggleMenu(id: string, item: MenuType) {
  const next = new Set(selectedMenuIds.value)
  if (next.has(id)) {
    next.delete(id)
    if (item.children) {
      const removeChildren = (children: MenuType[]) => {
        for (const child of children) {
          next.delete(child.id)
          if (child.children) {
            removeChildren(child.children)
          }
        }
      }
      removeChildren(item.children)
    }
  } else {
    next.add(id)
    if (item.children) {
      const addChildren = (children: MenuType[]) => {
        for (const child of children) {
          next.add(child.id)
          if (child.children) {
            addChildren(child.children)
          }
        }
      }
      addChildren(item.children)
    }
    // 自动勾选所有祖先菜单（否则后端只收到子菜单 ID，父菜单权限缺失导致菜单入口不可见）
    let parentId = menuParentMap.value.get(id)
    while (parentId) {
      next.add(parentId)
      parentId = menuParentMap.value.get(parentId)
    }
  }
  selectedMenuIds.value = next
}

async function handleSavePermissions() {
  if (!currentRole.value) return
  try {
    const permIds = Array.from(selectedPermissionIds.value)
    const menuIds = Array.from(selectedMenuIds.value)

    await roleApi.assignPermissions(currentRole.value.id, permIds)
    await roleApi.assignMenus(currentRole.value.id, menuIds)

    showSuccess('授权成功')
    showPermDialog.value = false
    reloadRoles()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增角色
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchName"
          placeholder="角色名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchCode"
          placeholder="角色编码"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <DictSelect
          v-model="searchStatus"
          :dict-items="enableStatusItems"
          placeholder="全部状态"
          class="w-32"
        />
        <Button variant="outline" @click="handleSearch">搜索</Button>
        <Button variant="ghost" @click="handleReset">重置</Button>
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
            <TableHead>角色名称</TableHead>
            <TableHead>角色编码</TableHead>
            <TableHead>角色类型</TableHead>
            <TableHead>数据范围</TableHead>
            <TableHead>描述</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>内置</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="role in roles" :key="role.id">
            <TableCell>{{ role.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Shield class="w-4 h-4 text-primary" />
                {{ role.name }}
              </div>
            </TableCell>
            <TableCell>{{ role.code }}</TableCell>
            <TableCell>{{ getRoleTypeLabel(role.type) }}</TableCell>
            <TableCell>{{ getDataScopeLabel(role.dataScope ?? 0) }}</TableCell>
            <TableCell>{{ role.description || '-' }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getLabel(role.status) }}
              </span>
            </TableCell>
            <TableCell>
              <span
                v-if="role.builtin"
                class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                是
              </span>
              <span v-else>-</span>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleAuth(role)">
                  <Key class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="role.builtin"
                  @click="handleEdit(role)"
                >
                  <Edit class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="role.builtin"
                  @click="handleDelete(role.id)"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
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

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑角色' : '新增角色' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改角色信息' : '添加新角色' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="name">角色名称</Label>
            <Input id="name" v-model="formData.name" placeholder="请输入角色名称" />
          </div>
          <div class="space-y-2">
            <Label for="code">角色编码</Label>
            <Input
              id="code"
              v-model="formData.code"
              placeholder="请输入角色编码"
              :disabled="isEdit"
            />
          </div>
          <div class="space-y-2">
            <Label for="type">角色类型</Label>
            <DictSelect id="type" v-model="formData.type" dict-type="role_type" />
          </div>
          <div class="space-y-2">
            <Label for="dataScope">数据范围</Label>
            <Select
              :model-value="formData.dataScope"
              @update:model-value="
                (val) => {
                  formData.dataScope = String(val)
                  if (String(val) !== '2') {
                    selectedOrgIds = new Set()
                  }
                }
              "
            >
              <SelectTrigger id="dataScope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in DataScopeEnum" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Input id="description" v-model="formData.description" placeholder="请输入描述" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>

          <div v-if="showOrgSelector" class="space-y-2 col-span-2">
            <Label>绑定部门（自定义数据权限）</Label>
            <div class="border rounded-md p-2 max-h-60 overflow-y-auto space-y-1">
              <div
                v-for="org in flatOrgItems"
                :key="org.item.id"
                class="flex items-center gap-2 p-1.5 rounded hover:bg-muted"
              >
                <TreeGuides :level="org.level" />
                <button
                  v-if="org.hasChildren"
                  class="p-1 hover:bg-muted rounded shrink-0"
                  @click="toggleOrgExpand(org.item.id)"
                >
                  <ChevronDown
                    v-if="isOrgExpanded(org.item.id)"
                    class="w-4 h-4 text-muted-foreground"
                  />
                  <ChevronRight v-else class="w-4 h-4 text-muted-foreground" />
                </button>
                <span v-else class="w-6 shrink-0"></span>
                <Checkbox
                  :model-value="selectedOrgIds.has(org.item.id)"
                  @update:model-value="toggleOrg(org.item.id)"
                />
                <span :class="org.level === 0 ? 'font-medium' : ''">
                  {{ org.item.name }}
                </span>
              </div>
              <div v-if="flatOrgItems.length === 0" class="text-center text-muted-foreground py-4">
                暂无部门数据
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showPermDialog">
      <DialogContent class="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>角色授权 - {{ currentRole?.name }}</DialogTitle>
          <DialogDescription>为角色分配权限和菜单</DialogDescription>
        </DialogHeader>

        <Tabs v-model="activeTab" class="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="permissions">
              <Key class="w-4 h-4 mr-2" />
              权限分配
            </TabsTrigger>
            <TabsTrigger value="menus">
              <Menu class="w-4 h-4 mr-2" />
              菜单分配
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" class="flex-1 overflow-y-auto mt-4 flex flex-col">
            <div class="bg-card rounded-xl border shadow-sm p-4 mb-4">
              <div class="flex items-center gap-2 flex-wrap">
                <Input
                  v-model="permSearchName"
                  placeholder="权限名称"
                  class="w-32"
                  @keyup.enter="handlePermSearch"
                />
                <Input
                  v-model="permSearchCode"
                  placeholder="权限编码"
                  class="w-32"
                  @keyup.enter="handlePermSearch"
                />
                <Button variant="outline" size="sm" @click="handlePermSearch">搜索</Button>
                <Button variant="ghost" size="sm" @click="handlePermReset">重置</Button>
              </div>
            </div>

            <div class="bg-card rounded-xl border shadow-sm flex-1">
              <Table class="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-12">
                      <Checkbox
                        :model-value="selectAll"
                        @update:model-value="(val) => toggleSelectAll(val === true)"
                      />
                    </TableHead>
                    <TableHead>模块名称</TableHead>
                    <TableHead>功能名称</TableHead>
                    <TableHead>权限名称</TableHead>
                    <TableHead>权限编码</TableHead>
                    <TableHead class="w-24">HTTP方法</TableHead>
                    <TableHead class="w-20">状态</TableHead>
                    <TableHead>资源路径</TableHead>
                    <TableHead>描述</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="item in displayPermissions" :key="item.id">
                    <TableCell class="w-12">
                      <Checkbox
                        :model-value="selectedPermissionIds.has(item.id)"
                        @update:model-value="togglePermission(item.id, item)"
                      />
                    </TableCell>
                    <TableCell>{{ getModuleLabel(item.moduleId) || '-' }}</TableCell>
                    <TableCell>{{ getFunctionLabel(item.functionId) || '-' }}</TableCell>
                    <TableCell class="font-medium">{{ item.name }}</TableCell>
                    <TableCell class="text-sm text-muted-foreground">{{ item.code }}</TableCell>
                    <TableCell class="w-24">
                      <span class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{{
                        getHttpMethodLabel(item.httpMethod) || item.httpMethod || '-'
                      }}</span>
                    </TableCell>
                    <TableCell class="w-20">
                      <span
                        class="px-2 py-0.5 rounded text-xs"
                        :class="
                          item.status === '1'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        "
                      >
                        {{ item.status === '1' ? '启用' : '禁用' }}
                      </span>
                    </TableCell>
                    <TableCell class="text-sm text-muted-foreground">{{
                      item.resourcePath || '-'
                    }}</TableCell>
                    <TableCell class="text-sm text-muted-foreground">{{
                      item.description || '-'
                    }}</TableCell>
                  </TableRow>
                  <TableRow v-if="displayPermissions.length === 0">
                    <TableCell colspan="9" class="text-center text-muted-foreground py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div class="flex items-center justify-between py-4">
              <span class="text-sm text-muted-foreground">
                显示 {{ (permCurrentPage - 1) * permPageSize + 1 }} -
                {{ Math.min(permCurrentPage * permPageSize, permTotal) }} 条，共 {{ permTotal }} 条
              </span>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="permCurrentPage === 1"
                  @click="permCurrentPage--"
                >
                  上一页
                </Button>
                <span class="px-4 text-sm">第 {{ permCurrentPage }} 页</span>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="permCurrentPage >= Math.ceil(permTotal / permPageSize)"
                  @click="permCurrentPage++"
                >
                  下一页
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="menus" class="flex-1 overflow-y-auto mt-4 space-y-1">
            <div
              v-for="menu in flatMenuItems"
              :key="menu.item.id"
              class="flex items-center gap-2 p-2 rounded hover:bg-muted"
            >
              <TreeGuides :level="menu.level" />
              <button
                v-if="menu.hasChildren"
                class="p-1 hover:bg-muted rounded shrink-0"
                @click="toggleMenuExpand(menu.item.id)"
              >
                <ChevronDown
                  v-if="isMenuExpanded(menu.item.id)"
                  class="w-4 h-4 text-muted-foreground"
                />
                <ChevronRight v-else class="w-4 h-4 text-muted-foreground" />
              </button>
              <span v-else class="w-6 shrink-0"></span>
              <Checkbox
                :model-value="selectedMenuIds.has(menu.item.id)"
                @update:model-value="toggleMenu(menu.item.id, menu.item)"
              />
              <component
                :is="getMenuIcon(menu.item.icon)"
                class="w-4 h-4 shrink-0"
                :class="menu.level === 0 ? 'text-primary' : 'text-muted-foreground'"
              />
              <span :class="menu.level === 0 ? 'font-medium' : ''">{{ menu.item.name }}</span>
              <span class="text-xs text-muted-foreground truncate">{{ menu.item.path }}</span>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" @click="showPermDialog = false">取消</Button>
          <Button @click="handleSavePermissions">保存授权</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
