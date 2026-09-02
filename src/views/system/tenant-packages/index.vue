<script setup lang="ts">
import { ref } from 'vue'
import { formatDateTime } from '@/lib/utils'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Edit, Trash2, Package } from '@lucide/vue'
import type { TenantPackage } from '@/types'
import { tenantPackageApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { usePagedList } from '@/composables/usePagedList'
import TablePagination from '@/components/TablePagination.vue'

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchName = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const statusOptions = [
  { label: '正常', value: '1' },
  { label: '停用', value: '0' },
]

function getStatusLabel(status: number | string | undefined): string {
  const item = statusOptions.find((o) => o.value === String(status))
  return item ? item.label : '-'
}

function getStatusBadgeClass(status: number | string | undefined): string {
  return String(status) === '1'
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800'
}

const formData = ref({
  id: '',
  name: '',
  description: '',
  menuIds: '',
  price: '',
  accountLimit: '',
  expireDays: '',
  status: '1',
  remark: '',
})

const {
  list: packages,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadPackages,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => tenantPackageApi.list(query),
  params: () => ({
    name: searchName.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

function handleReset() {
  searchName.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    name: '',
    description: '',
    menuIds: '',
    price: '',
    accountLimit: '',
    expireDays: '',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(pkg: TenantPackage) {
  isEdit.value = true
  formData.value = {
    id: pkg.id,
    name: pkg.name || '',
    description: pkg.description || '',
    menuIds: pkg.menuIds || '',
    price: pkg.price != null ? String(pkg.price) : '',
    accountLimit: pkg.accountLimit != null ? String(pkg.accountLimit) : '',
    expireDays: pkg.expireDays != null ? String(pkg.expireDays) : '',
    status: String(pkg.status ?? 1),
    remark: pkg.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除租户套餐', '确定要删除该租户套餐吗？')
  if (!confirmed) return
  try {
    await tenantPackageApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSubmit() {
  if (!formData.value.name) {
    showError('请填写套餐名称')
    return
  }
  try {
    const payload = {
      ...formData.value,
      price: formData.value.price ? Number(formData.value.price) : undefined,
      accountLimit: formData.value.accountLimit
        ? Number(formData.value.accountLimit)
        : undefined,
      expireDays: formData.value.expireDays ? Number(formData.value.expireDays) : undefined,
      status: Number(formData.value.status),
    }
    if (isEdit.value) {
      await tenantPackageApi.update(formData.value.id, payload)
    } else {
      await tenantPackageApi.create(payload)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadPackages()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增套餐
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input v-model="searchName" placeholder="套餐名称" class="w-40" @keyup.enter="handleSearch" />
        <Select v-model="searchStatus" class="w-32">
          <SelectTrigger>
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部状态</SelectItem>
            <SelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
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
            <TableHead>套餐名称</TableHead>
            <TableHead>描述</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>账号上限</TableHead>
            <TableHead>有效天数</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="pkg in packages" :key="pkg.id">
            <TableCell>{{ pkg.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Package class="w-4 h-4 text-primary" />
                <span class="font-medium">{{ pkg.name }}</span>
              </div>
            </TableCell>
            <TableCell class="max-w-[200px] truncate" :title="pkg.description">
              {{ pkg.description || '-' }}
            </TableCell>
            <TableCell>{{ pkg.price != null ? `¥${pkg.price}` : '-' }}</TableCell>
            <TableCell>{{ pkg.accountLimit ?? '-' }}</TableCell>
            <TableCell>{{ pkg.expireDays != null ? `${pkg.expireDays}天` : '-' }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                :class="getStatusBadgeClass(pkg.status)"
              >
                {{ getStatusLabel(pkg.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ pkg.createdAt ? formatDateTime(pkg.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(pkg)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(pkg.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="packages.length === 0">
            <TableCell colspan="9" class="text-center text-muted-foreground py-12">
              <div class="inline-flex flex-col items-center gap-2">
                <svg
                  class="w-10 h-10 opacity-30"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                  <path
                    d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
                  />
                </svg>
                <span class="text-sm">暂无数据</span>
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
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑套餐' : '新增套餐' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改套餐信息' : '添加新套餐' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>套餐名称 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.name" placeholder="如：基础版" />
          </div>
          <div class="space-y-2">
            <Label>价格</Label>
            <Input v-model="formData.price" type="number" step="0.01" placeholder="如：99.00" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>描述</Label>
            <Textarea v-model="formData.description" placeholder="套餐描述" rows="2" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>关联菜单ID</Label>
            <Textarea
              v-model="formData.menuIds"
              placeholder='菜单ID列表，如 ["1","2","3"]'
              rows="2"
            />
          </div>
          <div class="space-y-2">
            <Label>账号上限</Label>
            <Input v-model="formData.accountLimit" type="number" placeholder="如：100" />
          </div>
          <div class="space-y-2">
            <Label>有效天数</Label>
            <Input v-model="formData.expireDays" type="number" placeholder="如：365" />
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <Select v-model="formData.status">
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 col-span-2">
            <Label>备注</Label>
            <Textarea v-model="formData.remark" placeholder="备注信息" rows="2" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '更新' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
