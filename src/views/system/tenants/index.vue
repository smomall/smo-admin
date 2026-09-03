<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatDateTime } from '@/lib/utils'
import DateTimePicker from '@/components/DateTimePicker.vue'
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
import { Plus, Edit, Trash2, Building2 } from '@lucide/vue'
import type { Tenant, TenantPackage } from '@/types'
import { tenantApi, tenantPackageApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { usePagedList } from '@/composables/usePagedList'
import TablePagination from '@/components/TablePagination.vue'

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const packages = ref<TenantPackage[]>([])
const searchName = ref('')
const searchCode = ref('')
const searchContactPerson = ref('')
const searchPackageId = ref('__all__')
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
  return String(status) === '1' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
}

const formData = ref({
  id: '',
  packageId: '',
  name: '',
  code: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  expireAt: '',
  accountLimit: '',
  status: '1',
  remark: '',
})

const {
  list: tenants,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadTenants,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => tenantApi.list(query),
  params: () => ({
    name: searchName.value,
    code: searchCode.value,
    contactPerson: searchContactPerson.value,
    packageId: searchPackageId.value === '__all__' ? '' : searchPackageId.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

async function fetchPackages() {
  try {
    const { data } = await tenantPackageApi.getAll()
    if (data.value) {
      packages.value = data.value
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

onMounted(() => {
  fetchPackages()
})

function handleReset() {
  searchName.value = ''
  searchCode.value = ''
  searchContactPerson.value = ''
  searchPackageId.value = '__all__'
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    packageId: '',
    name: '',
    code: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    expireAt: '',
    accountLimit: '',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(tenant: Tenant) {
  isEdit.value = true
  formData.value = {
    id: tenant.id,
    packageId: tenant.packageId || '',
    name: tenant.name || '',
    code: tenant.code || '',
    contactPerson: tenant.contactPerson || '',
    contactPhone: tenant.contactPhone || '',
    contactEmail: tenant.contactEmail || '',
    expireAt: tenant.expireAt ?? '',
    accountLimit: tenant.accountLimit != null ? String(tenant.accountLimit) : '',
    status: String(tenant.status ?? 1),
    remark: tenant.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除租户', '确定要删除该租户吗？')
  if (!confirmed) return
  try {
    await tenantApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSubmit() {
  if (!formData.value.name) {
    showError('请填写租户名称')
    return
  }
  if (!formData.value.code) {
    showError('请填写租户编码')
    return
  }
  try {
    const payload = {
      ...formData.value,
      accountLimit: formData.value.accountLimit ? Number(formData.value.accountLimit) : undefined,
      status: Number(formData.value.status),
      expireAt: formData.value.expireAt || undefined,
    }
    if (isEdit.value) {
      await tenantApi.update(formData.value.id, payload)
    } else {
      await tenantApi.create(payload)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadTenants()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

function getPackageName(packageId: string | undefined) {
  if (!packageId) return '-'
  const pkg = packages.value.find((p) => p.id === packageId)
  return pkg ? pkg.name : packageId
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增租户
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchName"
          placeholder="租户名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchCode"
          placeholder="租户编码"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchContactPerson"
          placeholder="联系人"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Select v-model="searchPackageId" class="w-48">
          <SelectTrigger>
            <SelectValue placeholder="全部套餐" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部套餐</SelectItem>
            <SelectItem v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
              {{ pkg.name }}
            </SelectItem>
          </SelectContent>
        </Select>
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
            <TableHead>租户名称</TableHead>
            <TableHead>编码</TableHead>
            <TableHead>套餐</TableHead>
            <TableHead>联系人</TableHead>
            <TableHead>联系电话</TableHead>
            <TableHead>到期时间</TableHead>
            <TableHead>账号上限</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="tenant in tenants" :key="tenant.id">
            <TableCell>{{ tenant.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Building2 class="w-4 h-4 text-primary" />
                <span class="font-medium">{{ tenant.name }}</span>
              </div>
            </TableCell>
            <TableCell>{{ tenant.code }}</TableCell>
            <TableCell>{{ getPackageName(tenant.packageId) }}</TableCell>
            <TableCell>{{ tenant.contactPerson || '-' }}</TableCell>
            <TableCell>{{ tenant.contactPhone || '-' }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ tenant.expireAt ? formatDateTime(tenant.expireAt) : '-' }}
            </TableCell>
            <TableCell>{{ tenant.accountLimit ?? '-' }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                :class="getStatusBadgeClass(tenant.status)"
              >
                {{ getStatusLabel(tenant.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ tenant.createdAt ? formatDateTime(tenant.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(tenant)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(tenant.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="tenants.length === 0">
            <TableCell colspan="11" class="text-center text-muted-foreground py-12">
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
          <DialogTitle>{{ isEdit ? '编辑租户' : '新增租户' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改租户信息' : '添加新租户' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>租户名称 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.name" placeholder="如：某某公司" />
          </div>
          <div class="space-y-2">
            <Label>租户编码 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.code" placeholder="如：acme-corp" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>租户套餐</Label>
            <Select v-model="formData.packageId">
              <SelectTrigger>
                <SelectValue placeholder="选择套餐" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
                  {{ pkg.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>联系人</Label>
            <Input v-model="formData.contactPerson" placeholder="联系人姓名" />
          </div>
          <div class="space-y-2">
            <Label>联系电话</Label>
            <Input v-model="formData.contactPhone" placeholder="联系电话" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>联系邮箱</Label>
            <Input v-model="formData.contactEmail" placeholder="联系邮箱" />
          </div>
          <div class="space-y-2">
            <Label>到期时间</Label>
            <DateTimePicker v-model="formData.expireAt" placeholder="请选择到期时间" />
          </div>
          <div class="space-y-2">
            <Label>账号上限</Label>
            <Input v-model="formData.accountLimit" type="number" placeholder="如：100" />
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
