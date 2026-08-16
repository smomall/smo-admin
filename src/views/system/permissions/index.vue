<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Key, Plus, Edit, Trash2 } from '@lucide/vue'
import type { Permission } from '@/types'
import { permissionApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useDict } from '@/composables/useDict'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'
import PermissionTree from '@/components/PermissionTree.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const { getLabel: getStatusLabel } = useDict('common_status')
const { getLabel: getModuleLabel } = useDict('permission_module')
const { getLabel: getFunctionLabel } = useDict('permission_function')
const { getLabel: getHttpMethodLabel } = useDict('http_method')
const { getLabel: getTypeLabel } = useDict('permission_type')

const allPermissions = ref<Permission[]>([])
const showDialog = ref(false)
const isEdit = ref(false)
const selectedPermissionId = ref<string | undefined>(undefined)
const permissionTreeRef = ref<InstanceType<typeof PermissionTree> | null>(null)

const searchName = ref('')
const searchCode = ref('')
const searchStatus = ref<string>('__all__')

const flatPermissionOptions = computed<(Permission & { level: number })[]>(() => {
  const result: (Permission & { level: number })[] = []
  function walk(list: Permission[], level: number, exceptEditId?: string) {
    for (const p of list) {
      if (exceptEditId && p.id === exceptEditId) continue
      result.push({ ...p, level })
      if (p.children?.length) walk(p.children, level + 1, exceptEditId)
    }
  }
  walk(allPermissions.value, 0, isEdit.value ? formData.value.id : undefined)
  return result
})

const formData = ref({
  id: '',
  moduleId: '',
  functionId: '',
  httpMethod: '',
  resourcePath: '',
  name: '',
  code: '',
  type: '1',
  description: '',
  sort: 0,
  status: '1',
  parentId: '0',
})

const {
  list: permissions,
  loading,
  currentPage,
  pageSize,
  total,
  isEmpty,
  goto,
  search: handleSearch,
  reload: reloadPermissions,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => permissionApi.page(query),
  params: () => ({
    name: searchName.value || undefined,
    code: searchCode.value || undefined,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    parentId: selectedPermissionId.value || '',
  }),
})

async function fetchAllPermissions() {
  try {
    const { data } = await permissionApi.tree()
    if (data.value) {
      allPermissions.value = data.value
    }
  } catch {
    allPermissions.value = []
  }
}

onMounted(() => {
  fetchAllPermissions()
})

function handlePermissionSelect(permissionId: string | undefined) {
  selectedPermissionId.value = permissionId
  handleSearch()
}

function handleReset() {
  searchName.value = ''
  searchCode.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd(parentId = '0') {
  isEdit.value = false
  formData.value = {
    id: '',
    moduleId: '',
    functionId: '',
    httpMethod: '',
    resourcePath: '',
    name: '',
    code: '',
    type: '1',
    description: '',
    sort: 0,
    status: '1',
    parentId,
  }
  showDialog.value = true
}

function handleEdit(permission: Permission) {
  isEdit.value = true
  formData.value = {
    id: permission.id,
    moduleId: permission.moduleId || '',
    functionId: permission.functionId || '',
    httpMethod: permission.httpMethod || '',
    resourcePath: permission.resourcePath || '',
    name: permission.name,
    code: permission.code,
    type: String(permission.type ?? 1),
    description: permission.description || '',
    sort: permission.sort ?? 0,
    status: String(permission.status),
    parentId: permission.parentId || '0',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除权限', '确定要删除该权限吗？删除后子权限也会被删除。')
  if (!confirmed) return
  try {
    await permissionApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
    fetchAllPermissions()
    permissionTreeRef.value?.fetchPermissions()
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
    if (isEdit.value) {
      await permissionApi.update(formData.value.id, formData.value)
    } else {
      await permissionApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadPermissions()
    else handleSearch()
    fetchAllPermissions()
    permissionTreeRef.value?.fetchPermissions()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd()">
        <Plus class="w-4 h-4 mr-2" />
        新增权限
      </Button>
    </div>

    <div class="flex gap-4">
      <!-- 左侧权限树 -->
      <div class="w-64 flex-shrink-0">
        <PermissionTree
          ref="permissionTreeRef"
          v-model="selectedPermissionId"
          @update:model-value="handlePermissionSelect"
        />
      </div>

      <!-- 右侧内容 -->
      <div class="flex-1 space-y-4">
        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchName"
              placeholder="权限名称"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchCode"
              placeholder="权限编码"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <DictSelect
              v-model="searchStatus"
              dictType="common_status"
              placeholder="状态"
              class="w-36"
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
                <TableHead>权限名称</TableHead>
                <TableHead>权限编码</TableHead>
                <TableHead>模块</TableHead>
                <TableHead>功能</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>HTTP方法</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="permission in permissions" :key="permission.id">
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Key class="w-4 h-4 text-primary shrink-0" />
                    <span>{{ permission.name }}</span>
                  </div>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">{{ permission.code }}</TableCell>
                <TableCell>{{ getModuleLabel(permission.moduleId) || '-' }}</TableCell>
                <TableCell>{{ getFunctionLabel(permission.functionId) || '-' }}</TableCell>
                <TableCell>
                  <span class="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                    {{ getTypeLabel(String(permission.type)) || '-' }}
                  </span>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">{{
                  permission.sort ?? 0
                }}</TableCell>
                <TableCell>
                  <span
                    v-if="permission.httpMethod"
                    class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {{ getHttpMethodLabel(permission.httpMethod) || permission.httpMethod }}
                  </span>
                  <span v-else>-</span>
                </TableCell>
                <TableCell>
                  <span class="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                    {{ getStatusLabel(permission.status) }}
                  </span>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" @click="handleAdd(permission.id)">
                      <Plus class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleEdit(permission)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDelete(permission.id)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="isEmpty">
                <TableCell colspan="9" class="text-center text-muted-foreground py-8">
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

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑权限' : '新增权限' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改权限信息' : '添加新权限' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2 col-span-2">
            <Label for="parentId">父级权限</Label>
            <Select v-model="formData.parentId">
              <SelectTrigger>
                <SelectValue placeholder="顶级权限" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">无（顶级）</SelectItem>
                <SelectItem v-for="p in flatPermissionOptions" :key="p.id" :value="p.id">
                  <div class="flex items-center gap-2 self-stretch">
                    <TreeGuides :level="p.level" />
                    <Key class="w-4 h-4 text-primary shrink-0" />
                    <span class="truncate">{{ p.name }}</span>
                    <span class="text-xs text-muted-foreground shrink-0">{{ p.code }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="moduleId">模块</Label>
            <DictSelect
              v-model="formData.moduleId"
              dictType="permission_module"
              placeholder="请选择模块"
            />
          </div>
          <div class="space-y-2">
            <Label for="functionId">功能</Label>
            <DictSelect
              v-model="formData.functionId"
              dictType="permission_function"
              placeholder="请选择功能"
            />
          </div>
          <div class="space-y-2">
            <Label for="httpMethod">HTTP方法</Label>
            <DictSelect
              v-model="formData.httpMethod"
              dictType="http_method"
              placeholder="请选择方法"
            />
          </div>
          <div class="space-y-2">
            <Label for="resourcePath">资源路径</Label>
            <Input id="resourcePath" v-model="formData.resourcePath" placeholder="如: /api/users" />
          </div>
          <div class="space-y-2">
            <Label for="name">权限名称</Label>
            <Input id="name" v-model="formData.name" placeholder="请输入权限名称" />
          </div>
          <div class="space-y-2">
            <Label for="code">权限编码</Label>
            <Input
              id="code"
              v-model="formData.code"
              placeholder="如: system:user:list"
              :disabled="isEdit"
            />
          </div>
          <div class="space-y-2">
            <Label for="type">权限类型</Label>
            <DictSelect
              v-model="formData.type"
              dictType="permission_type"
              placeholder="请选择类型"
            />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序号</Label>
            <Input id="sort" v-model.number="formData.sort" type="number" placeholder="排序号" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect
              v-model="formData.status"
              dictType="common_status"
              placeholder="请选择状态"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Input id="description" v-model="formData.description" placeholder="请输入描述" />
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
