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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Trash2, Cloud } from '@lucide/vue'
import type { OssClientConfig } from '@/types'
import { ossClientConfigApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchKeyword = ref('')
const searchConfigKey = ref('')
const searchRegion = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  configName: '',
  configKey: '',
  endpoint: '',
  accessKey: '',
  secretKey: '',
  region: '',
  httpClientConfig: '',
  httpClientConfigAsync: '',
  presignUploadExpire: 'PT10M',
  presignDownloadExpire: 'PT10M',
  forcePathStyle: false,
  isDefault: '0',
  isPublic: '0',
  status: '1',
  remark: '',
})

const {
  list: configs,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadConfigs,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => ossClientConfigApi.list(query),
  params: () => ({
    configName: searchKeyword.value,
    configKey: searchConfigKey.value,
    region: searchRegion.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

function handleReset() {
  searchKeyword.value = ''
  searchConfigKey.value = ''
  searchRegion.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    configName: '',
    configKey: '',
    endpoint: '',
    accessKey: '',
    secretKey: '',
    region: '',
    httpClientConfig: '',
    httpClientConfigAsync: '',
    presignUploadExpire: 'PT10M',
    presignDownloadExpire: 'PT10M',
    forcePathStyle: false,
    isDefault: '0',
    isPublic: '0',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(config: OssClientConfig) {
  isEdit.value = true
  formData.value = {
    id: config.id,
    configName: config.configName || '',
    configKey: config.configKey || '',
    endpoint: config.endpoint || '',
    accessKey: config.accessKey || '',
    secretKey: config.secretKey || '',
    region: config.region || '',
    httpClientConfig: config.httpClientConfig || '',
    httpClientConfigAsync: config.httpClientConfigAsync || '',
    presignUploadExpire: config.presignUploadExpire || 'PT10M',
    presignDownloadExpire: config.presignDownloadExpire || 'PT10M',
    forcePathStyle: config.forcePathStyle || false,
    isDefault: String(config.isDefault ?? 0),
    isPublic: String(config.isPublic ?? 0),
    status: String(config.status || 1),
    remark: config.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除OSS客户端配置', '确定要删除该OSS客户端配置吗？')
  if (!confirmed) return
  try {
    await ossClientConfigApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.configName) {
    showError('请填写配置名称')
    return
  }
  if (!formData.value.endpoint) {
    showError('请填写服务端点')
    return
  }
  try {
    const payload = {
      ...formData.value,
      isDefault: Number(formData.value.isDefault),
      isPublic: Number(formData.value.isPublic),
    }
    if (isEdit.value) {
      await ossClientConfigApi.update(formData.value.id, payload)
    } else {
      await ossClientConfigApi.create(payload)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadConfigs()
    else handleSearch()
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
        新增配置
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="配置名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchConfigKey"
          placeholder="配置标识"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input v-model="searchRegion" placeholder="区域" class="w-36" @keyup.enter="handleSearch" />
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
            <TableHead>配置名称</TableHead>
            <TableHead>配置标识</TableHead>
            <TableHead>服务端点</TableHead>
            <TableHead>区域</TableHead>
            <TableHead>默认</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="config in configs" :key="config.id">
            <TableCell>{{ config.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Cloud class="w-4 h-4 text-primary" />
                <span class="font-medium">{{ config.configName }}</span>
              </div>
            </TableCell>
            <TableCell>{{ config.configKey }}</TableCell>
            <TableCell class="max-w-[200px] truncate">{{ config.endpoint }}</TableCell>
            <TableCell>{{ config.region || '-' }}</TableCell>
            <TableCell>
              <Checkbox :model-value="config.isDefault === 1" disabled />
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(config.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ config.createdAt ? formatDateTime(config.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(config)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(config.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="configs.length === 0">
            <TableCell colspan="10" class="text-center text-muted-foreground py-12">
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
          <DialogTitle>{{ isEdit ? '编辑配置' : '新增配置' }}</DialogTitle>
          <DialogDescription>{{
            isEdit ? '修改OSS客户端配置' : '添加新OSS客户端配置'
          }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>配置名称 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.configName" placeholder="如：阿里云OSS" />
          </div>
          <div class="space-y-2">
            <Label>配置标识 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.configKey" placeholder="如：aliyun-oss" />
          </div>
          <div class="space-y-2">
            <Label>服务端点 <span class="text-red-500">*</span></Label>
            <Input
              v-model="formData.endpoint"
              placeholder="如：https://oss-cn-hangzhou.aliyuncs.com"
            />
          </div>
          <div class="space-y-2">
            <Label>区域</Label>
            <Input v-model="formData.region" placeholder="如：cn-hangzhou" />
          </div>
          <div class="space-y-2">
            <Label>AccessKey</Label>
            <Input v-model="formData.accessKey" placeholder="访问密钥ID" />
          </div>
          <div class="space-y-2">
            <Label>SecretKey</Label>
            <Input v-model="formData.secretKey" type="password" placeholder="访问密钥Secret" />
          </div>
          <div class="space-y-2">
            <Label>预签名上传过期时间</Label>
            <Input v-model="formData.presignUploadExpire" placeholder="如：PT10M" />
          </div>
          <div class="space-y-2">
            <Label>预签名下载过期时间</Label>
            <Input v-model="formData.presignDownloadExpire" placeholder="如：PT10M" />
          </div>
          <div class="space-y-2 flex items-center gap-4">
            <Label>强制路径风格</Label>
            <Checkbox
              :model-value="formData.forcePathStyle === true"
              @update:model-value="formData.forcePathStyle = Boolean($event)"
            />
          </div>
          <div class="space-y-2 flex items-center gap-4">
            <Label>默认配置</Label>
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
