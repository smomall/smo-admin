<script setup lang="ts">
import { DICT } from '@/constants/dict'
import { ref, computed, watch, onMounted } from 'vue'
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
import { Plus, Edit, Trash2, Folder, Settings2, ChevronLeft, ChevronRight } from '@lucide/vue'
import type { OssBucket, OssClientConfig } from '@/types'
import { ossBucketApi, ossClientConfigApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDict } from '@/composables/useDict'
import { usePagedList } from '@/composables/usePagedList'
import DictSelect from '@/components/DictSelect.vue'
import TablePagination from '@/components/TablePagination.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict(DICT.COMMON_STATUS)

const policyOptions = [
  { label: '私有', value: '0' },
  { label: '公开读', value: '1' },
  { label: '公开读写', value: '2' },
]

function getPolicyLabel(policy: number | string | undefined): string {
  const item = policyOptions.find((o) => o.value === String(policy))
  return item ? item.label : '-'
}

function getPolicyBadgeClass(policy: number | string | undefined): string {
  const p = String(policy)
  if (p === '0') return 'bg-gray-100 text-gray-800'
  if (p === '1') return 'bg-green-100 text-green-800'
  if (p === '2') return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-800'
}

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const selectedConfigId = ref('')
const searchBucketName = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  configId: '',
  bucketName: '',
  endpoint: '',
  basePath: '',
  isDefault: false,
  policy: '0',
  status: '1',
  remark: '',
})

// 左侧存储配置分页列表
const {
  list: configs,
  loading: configLoading,
  currentPage: configPage,
  pageSize: configPageSize,
  total: configTotal,
  totalPages: configTotalPages,
  hasPrev: hasPrevConfig,
  hasNext: hasNextConfig,
  search: searchConfigs,
  goto: configGoto,
} = usePagedList<OssClientConfig, {
  configName: string
  configKey: string
  region: string
  status: string
}>({
  fetcher: (query) => ossClientConfigApi.list(query),
  params: () => ({ configName: '', configKey: '', region: '', status: '' }),
  pageSize: 8,
  immediate: false,
})

// 右侧存储桶分页列表，按当前选中配置拉取
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
  fetcher: (query) => ossBucketApi.list(selectedConfigId.value, query),
  params: () => ({
    bucketName: searchBucketName.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
  immediate: false,
})

const selectedConfig = computed(() =>
  configs.value.find((c) => c.id === selectedConfigId.value),
)

async function fetchConfigs() {
  await searchConfigs()
  if (configs.value.length > 0) {
    selectedConfigId.value = configs.value[0]!.id
  } else {
    selectedConfigId.value = ''
  }
}

onMounted(() => {
  fetchConfigs()
})

function selectConfig(id: string) {
  selectedConfigId.value = id
}

// 配置翻页后，若当前选中不在本页，自动选中本页第一个
async function handleConfigGoto(page: number) {
  await configGoto(page)
  if (!configs.value.some((c) => c.id === selectedConfigId.value)) {
    selectedConfigId.value = configs.value[0]?.id || ''
  }
}

watch(selectedConfigId, (val) => {
  searchBucketName.value = ''
  searchStatus.value = '__all__'
  if (val) {
    handleSearch()
  }
})

function handleReset() {
  searchBucketName.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  if (!selectedConfigId.value) {
    showError('请先选择OSS配置')
    return
  }
  isEdit.value = false
  formData.value = {
    id: '',
    configId: selectedConfigId.value,
    bucketName: '',
    endpoint: '',
    basePath: '',
    isDefault: false,
    policy: '0',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(bucket: OssBucket) {
  isEdit.value = true
  formData.value = {
    id: bucket.id,
    configId: selectedConfigId.value,
    bucketName: bucket.bucketName || '',
    endpoint: bucket.endpoint || '',
    basePath: bucket.basePath || '',
    isDefault: bucket.isDefault ?? false,
    policy: String(bucket.policy ?? 0),
    status: String(bucket.status || 1),
    remark: bucket.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除存储桶', '确定要删除该存储桶吗？')
  if (!confirmed) return
  try {
    await ossBucketApi.delete(selectedConfigId.value, id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.bucketName) {
    showError('请填写存储桶名称')
    return
  }
  try {
    const payload = {
      ...formData.value,
      policy: Number(formData.value.policy),
    }
    if (isEdit.value) {
      await ossBucketApi.update(selectedConfigId.value, formData.value.id, payload)
    } else {
      await ossBucketApi.create(selectedConfigId.value, payload)
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
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Settings2 class="w-4 h-4" />
      选择左侧存储配置，管理该配置下的存储桶
    </div>

    <div class="flex gap-4 items-start">
      <!-- 左侧：存储配置分页列表 -->
      <div class="w-64 shrink-0 bg-card rounded-xl border shadow-sm p-2 flex flex-col min-h-[340px]">
        <div class="px-2 py-2 text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>存储配置</span>
          <span class="text-xs">共 {{ configTotal }} 个</span>
        </div>
        <div
          v-if="configLoading"
          class="px-2 py-8 text-center text-sm text-muted-foreground"
        >
          <div
            class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"
          ></div>
          加载中...
        </div>
        <template v-else>
          <button
            v-for="config in configs"
            :key="config.id"
            class="w-full text-left px-3 py-2.5 rounded-lg transition-colors"
            :class="
              selectedConfigId === config.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary'
            "
            @click="selectConfig(config.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="flex items-center gap-1.5 text-sm font-medium truncate">
                <span class="truncate">{{ config.configName }}</span>
                <span
                  v-if="config.isDefault"
                  class="shrink-0 px-1 py-0.5 rounded text-[10px] leading-none"
                  :class="
                    selectedConfigId === config.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-amber-100 text-amber-700'
                  "
                >
                  默认
                </span>
              </span>
              <span
                class="shrink-0 px-1.5 py-0.5 rounded-full text-[10px]"
                :class="
                  selectedConfigId === config.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                "
              >
                {{ getStatusLabel(config.status) }}
              </span>
            </div>
            <div
              class="mt-1 flex items-center justify-between gap-2 text-xs"
              :class="
                selectedConfigId === config.id
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
              "
            >
              <span class="truncate">{{ config.configKey }}</span>
              <span class="shrink-0 truncate">{{ config.region || '-' }}</span>
            </div>
          </button>
          <div
            v-if="configs.length === 0"
            class="px-2 py-8 text-center text-sm text-muted-foreground"
          >
            暂无配置
          </div>
        </template>
        <div
          class="mt-auto border-t pt-2 flex items-center justify-between px-1"
        >
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
            :disabled="!hasPrevConfig"
            @click="handleConfigGoto(configPage - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ configPage }} / {{ configTotalPages }}
          </span>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
            :disabled="!hasNextConfig"
            @click="handleConfigGoto(configPage + 1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- 右侧：存储桶列表 -->
      <div class="flex-1 min-w-0 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchBucketName"
              placeholder="存储桶名称"
              class="w-40"
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
          <Button @click="handleAdd">
            <Plus class="w-4 h-4 mr-2" />
            新增存储桶
          </Button>
        </div>

        <div class="bg-card rounded-xl border shadow-sm">
          <div
            v-if="!selectedConfigId"
            class="p-12 text-center text-sm text-muted-foreground"
          >
            请先创建存储配置
          </div>
          <div
            v-else-if="loading"
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
                <TableHead>存储桶名称</TableHead>
                <TableHead>端点</TableHead>
                <TableHead>基础路径</TableHead>
                <TableHead>策略</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="bucket in buckets" :key="bucket.id">
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Folder class="w-4 h-4 text-primary" />
                    <span class="font-medium">{{ bucket.bucketName }}</span>
                  </div>
                </TableCell>
                <TableCell class="max-w-[200px] truncate" :title="bucket.endpoint">
                  {{ bucket.endpoint || '-' }}
                </TableCell>
                <TableCell class="max-w-[200px] truncate">{{ bucket.basePath || '-' }}</TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                    :class="getPolicyBadgeClass(bucket.policy)"
                  >
                    {{ getPolicyLabel(bucket.policy) }}
                  </span>
                </TableCell>
                <TableCell>
                  <Checkbox :model-value="bucket.isDefault" disabled />
                </TableCell>
                <TableCell>
                  <StatusBadge :type="DICT.COMMON_STATUS" :value="bucket.status" />
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
                <TableCell colspan="8" class="text-center text-muted-foreground py-12">
                  <div class="inline-flex flex-col items-center gap-2">
                    <Folder class="w-10 h-10 opacity-30" />
                    <span class="text-sm">暂无数据</span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <TablePagination
          v-if="selectedConfigId"
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          @change="goto"
        />
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑存储桶' : '新增存储桶' }}</DialogTitle>
          <DialogDescription>
            所属配置：{{ selectedConfig?.configName || '-' }}
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>存储桶名称 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.bucketName" placeholder="如：my-bucket" />
          </div>
          <div class="space-y-2">
            <Label>端点</Label>
            <Input v-model="formData.endpoint" placeholder="如：oss-cn-beijing.aliyuncs.com" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>基础路径</Label>
            <Input v-model="formData.basePath" placeholder="如：images/" />
          </div>
          <div class="space-y-2">
            <Label>策略</Label>
            <Select v-model="formData.policy">
              <SelectTrigger>
                <SelectValue placeholder="选择策略" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in policyOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 flex items-center gap-4 col-span-2">
            <Label>默认存储桶</Label>
            <Checkbox
              :model-value="formData.isDefault"
              @update:model-value="formData.isDefault = Boolean($event)"
            />
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
