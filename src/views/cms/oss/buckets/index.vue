<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Trash2, Folder } from '@lucide/vue'
import type { OssBucket, OssClientConfig } from '@/types'
import { ossBucketApi, ossClientConfigApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDict } from '@/composables/useDict'
import DictSelect from '@/components/DictSelect.vue'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const configs = ref<OssClientConfig[]>([])
const searchConfigId = ref('__all__')
const searchBucketName = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  configId: '',
  bucketName: '',
  basePath: '',
  isDefault: '0',
  isPublic: '0',
  status: '1',
  remark: '',
})

const {
  list: buckets,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadBuckets,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => ossBucketApi.list(query),
  params: () => ({
    configId: searchConfigId.value === '__all__' ? '' : searchConfigId.value,
    bucketName: searchBucketName.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

async function fetchConfigs() {
  try {
    const { data } = await ossClientConfigApi.getAll()
    if (data.value) {
      configs.value = data.value
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

onMounted(() => {
  fetchConfigs()
})

function handleReset() {
  searchConfigId.value = '__all__'
  searchBucketName.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    configId: configs.value[0]?.id || '',
    bucketName: '',
    basePath: '',
    isDefault: '0',
    isPublic: '0',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(bucket: OssBucket) {
  isEdit.value = true
  formData.value = {
    id: bucket.id,
    configId: bucket.configId,
    bucketName: bucket.bucketName || '',
    basePath: bucket.basePath || '',
    isDefault: bucket.isDefault || '0',
    isPublic: bucket.isPublic || '0',
    status: String(bucket.status || 1),
    remark: bucket.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除存储桶', '确定要删除该存储桶吗？')
  if (!confirmed) return
  try {
    await ossBucketApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.configId) {
    showError('请选择OSS配置')
    return
  }
  if (!formData.value.bucketName) {
    showError('请填写存储桶名称')
    return
  }
  try {
    if (isEdit.value) {
      await ossBucketApi.update(formData.value.id, formData.value)
    } else {
      await ossBucketApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadBuckets()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function getConfigName(configId: string) {
  const config = configs.value.find((c) => c.id === configId)
  return config ? config.configName : configId
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增存储桶
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchBucketName"
          placeholder="存储桶名称"
          class="w-40"
          @keyup.enter="handleSearch"
        />
        <Select v-model="searchConfigId" class="w-48">
          <SelectTrigger>
            <SelectValue placeholder="全部配置" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部配置</SelectItem>
            <SelectItem v-for="config in configs" :key="config.id" :value="config.id">
              {{ config.configName }}
            </SelectItem>
          </SelectContent>
        </Select>
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
            <TableHead>存储桶名称</TableHead>
            <TableHead>所属配置</TableHead>
            <TableHead>基础路径</TableHead>
            <TableHead>默认</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="bucket in buckets" :key="bucket.id">
            <TableCell>{{ bucket.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Folder class="w-4 h-4 text-primary" />
                <span class="font-medium">{{ bucket.bucketName }}</span>
              </div>
            </TableCell>
            <TableCell>{{ getConfigName(bucket.configId) }}</TableCell>
            <TableCell class="max-w-[200px] truncate">{{ bucket.basePath || '-' }}</TableCell>
            <TableCell>
              <Checkbox :model-value="bucket.isDefault === '1'" disabled />
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(bucket.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ bucket.createdAt ? formatDateTime(bucket.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(bucket)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(bucket.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="buckets.length === 0">
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
          <DialogTitle>{{ isEdit ? '编辑存储桶' : '新增存储桶' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改存储桶配置' : '添加新存储桶' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2 col-span-2">
            <Label>OSS配置 <span class="text-red-500">*</span></Label>
            <Select v-model="formData.configId">
              <SelectTrigger>
                <SelectValue placeholder="选择OSS配置" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="config in configs" :key="config.id" :value="config.id">
                  {{ config.configName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>存储桶名称 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.bucketName" placeholder="如：my-bucket" />
          </div>
          <div class="space-y-2">
            <Label>基础路径</Label>
            <Input v-model="formData.basePath" placeholder="如：images/" />
          </div>
          <div class="space-y-2 flex items-center gap-4">
            <Label>默认存储桶</Label>
            <Checkbox
              :model-value="formData.isDefault === '1'"
              @update:model-value="formData.isDefault = $event ? '1' : '0'"
            />
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
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
