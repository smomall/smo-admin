<script setup lang="ts">
import { ref, computed } from 'vue'
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
import { Plus, Edit, Trash2, Clock, FileText } from '@lucide/vue'
import type { Job } from '@/types'
import { jobApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDict } from '@/composables/useDict'
import DictSelect from '@/components/DictSelect.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'
import { useRouter } from 'vue-router'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')
const { getLabel: getTriggerTypeLabel } = useDict('job_type')
const { getLabel: getStrategyLabel } = useDict('job_strategy')

const currentStrategies = computed(() => {
  return formData.value.triggerType === 'CRON' ? cronStrategies : periodStrategies
})

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const router = useRouter()

const cronStrategies = [
  { value: 'default', label: '默认' },
  { value: 'lenient', label: '宽松执行' },
  { value: 'fixed', label: '固定执行' },
]

const periodStrategies = [
  { value: 'fixed_rate', label: '固定速率' },
  { value: 'fixed_delay', label: '固定延迟' },
]

const searchKeyword = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const {
  list: jobs,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadJobs,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => jobApi.list(query),
  params: () => ({
    title: searchKeyword.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

const formData = ref({
  id: '',
  title: '',
  description: '',
  triggerType: 'CRON',
  className: '',
  beanName: '',
  methodName: '',
  expression: '',
  strategy: 'default',
  isBean: false,
  status: '0',
})

function handleReset() {
  searchKeyword.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    title: '',
    description: '',
    triggerType: 'CRON',
    className: '',
    beanName: '',
    methodName: '',
    expression: '',
    strategy: 'default',
    isBean: false,
    status: '0',
  }
  showDialog.value = true
}

function handleEdit(job: Job) {
  isEdit.value = true
  formData.value = {
    id: job.id,
    title: job.title,
    description: job.description || '',
    triggerType: job.triggerType || '',
    className: job.className || '',
    beanName: job.beanName || '',
    methodName: job.methodName || '',
    expression: job.expression || '',
    strategy: job.strategy || 'default',
    isBean: job.isBean || false,
    status: String(job.status),
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除任务', '确定要删除该任务吗？')
  if (!confirmed) return
  try {
    await jobApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleViewLogs(id: string) {
  router.push({ path: '/cms/jobs/logs', query: { jobId: id } })
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写任务名称')
    return
  }
  try {
    const submitData = {
      ...formData.value,
      strategy: formData.value.strategy === 'default' ? '' : formData.value.strategy,
    }
    if (isEdit.value) {
      await jobApi.update(submitData.id, submitData)
    } else {
      await jobApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadJobs()
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
        新增任务
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="任务名称"
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
            <TableHead>任务名称</TableHead>
            <TableHead>触发类型</TableHead>
            <TableHead>执行策略</TableHead>
            <TableHead>执行类</TableHead>
            <TableHead>执行表达式</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="job in jobs" :key="job.id">
            <TableCell>{{ job.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Clock class="w-4 h-4 text-primary" />
                <div class="font-medium">{{ job.title }}</div>
              </div>
            </TableCell>
            <TableCell>{{ getTriggerTypeLabel(job.triggerType) }}</TableCell>
            <TableCell class="text-xs">{{ getStrategyLabel(job.strategy) }}</TableCell>
            <TableCell class="text-xs">
              <div v-if="job.isBean">{{ job.beanName }}.{{ job.methodName }}</div>
              <div v-else>{{ job.className }}</div>
            </TableCell>
            <TableCell class="text-xs">{{ job.expression || '-' }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(job.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ job.createdAt ? formatDateTime(job.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleViewLogs(job.id)">
                  <FileText class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleEdit(job)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(job.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="jobs.length === 0">
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
          <DialogTitle>{{ isEdit ? '编辑任务' : '新增任务' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改任务信息' : '添加新任务' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>任务名称 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.title" placeholder="请输入任务名称" />
          </div>
          <div class="space-y-2">
            <Label>触发类型</Label>
            <DictSelect
              v-model="formData.triggerType"
              dict-type="job_type"
              placeholder="选择触发类型"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>描述</Label>
            <Textarea v-model="formData.description" placeholder="请输入任务描述" rows="2" />
          </div>
          <div class="space-y-2">
            <Label>是否Bean方法</Label>
            <Checkbox v-model="formData.isBean" />
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div v-if="formData.isBean" class="space-y-2">
            <Label>Bean名称</Label>
            <Input v-model="formData.beanName" placeholder="Spring Bean名称" />
          </div>
          <div v-if="formData.isBean" class="space-y-2">
            <Label>方法名称</Label>
            <Input v-model="formData.methodName" placeholder="方法名" />
          </div>
          <div v-if="!formData.isBean" class="space-y-2">
            <Label>执行类</Label>
            <Input v-model="formData.className" placeholder="完整类名" />
          </div>
          <div class="space-y-2">
            <Label>执行表达式</Label>
            <Input
              v-model="formData.expression"
              :placeholder="
                formData.triggerType === 'CRON'
                  ? 'Cron表达式，如：0 0 2 * * ?'
                  : '周期时间，如：PT5M（5分钟）'
              "
            />
          </div>
          <div class="space-y-2">
            <Label>执行策略</Label>
            <Select v-model="formData.strategy">
              <SelectTrigger>
                <SelectValue placeholder="选择执行策略" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="strategy in currentStrategies"
                  :key="strategy.value"
                  :value="strategy.value"
                >
                  {{ strategy.label }}
                </SelectItem>
              </SelectContent>
            </Select>
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
