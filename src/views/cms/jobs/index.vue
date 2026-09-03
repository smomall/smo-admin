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

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const router = useRouter()

// 触发器类型选项（与后端 JobServiceImpl 保持一致）
const triggerTypes = [
  { value: 'cron', label: 'Cron 表达式' },
  { value: 'simple', label: '简单间隔' },
  { value: 'daily_time', label: '每日时间段' },
  { value: 'calendar', label: '日历周期' },
]

function getTriggerTypeLabel(value: string | undefined) {
  return triggerTypes.find((t) => t.value === (value || '').toLowerCase())?.label || value || '-'
}

// misfire 策略选项（按触发器类型区分）
const cronStrategies = [
  { value: 'do_nothing', label: '不执行（等待下次）' },
  { value: 'fire_once', label: '立即补跑一次' },
  { value: 'ignore_all', label: '补跑所有错过' },
]

const simpleStrategies = [
  { value: 'ignore_all', label: '补跑所有错过' },
  { value: 'fire_once', label: '立即触发一次' },
  { value: 'next_existing', label: '等下一次（保持总次数）' },
  { value: 'next_remaining', label: '等下一次（扣减剩余）' },
  { value: 'now_existing', label: '立即触发（保持总次数）' },
  { value: 'now_remaining', label: '立即触发（扣减剩余）' },
]

const dailyTimeStrategies = [
  { value: 'do_nothing', label: '不执行（等待下次）' },
  { value: 'ignore_all', label: '补跑所有错过' },
  { value: 'fire_once', label: '立即补跑一次' },
]

const calendarStrategies = [
  { value: 'do_nothing', label: '不执行（等待下次）' },
  { value: 'ignore_all', label: '补跑所有错过' },
  { value: 'fire_once', label: '立即补跑一次' },
]

// 间隔单位选项
const dailyTimeIntervalUnits = [
  { value: 'second', label: '秒' },
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
]

const calendarIntervalUnits = [
  { value: 'second', label: '秒' },
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
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
  bizExpression: '',
  triggerType: 'cron',
  expression: '',
  strategy: '',
  interval: undefined as number | undefined,
  intervalUnit: '',
  daysOfWeek: '',
  startTimeOfDay: '',
  endTimeOfDay: '',
  repeatCount: undefined as number | undefined,
  status: '0',
})

// 触发器类型归一化（小写）
const normalizedTriggerType = computed(() => (formData.value.triggerType || '').toLowerCase())

// 根据触发器类型返回可选策略
const currentStrategies = computed(() => {
  switch (normalizedTriggerType.value) {
    case 'cron':
      return cronStrategies
    case 'simple':
      return simpleStrategies
    case 'daily_time':
      return dailyTimeStrategies
    case 'calendar':
      return calendarStrategies
    default:
      return cronStrategies
  }
})

// 根据触发器类型返回可选间隔单位
const currentIntervalUnits = computed(() => {
  switch (normalizedTriggerType.value) {
    case 'daily_time':
      return dailyTimeIntervalUnits
    case 'calendar':
      return calendarIntervalUnits
    default:
      return dailyTimeIntervalUnits
  }
})

// 是否需要 interval + intervalUnit 字段（daily_time 和 calendar）
const showInterval = computed(() =>
  ['daily_time', 'calendar'].includes(normalizedTriggerType.value),
)

// 是否需要 daysOfWeek / startTimeOfDay / endTimeOfDay 字段（仅 daily_time）
const showDailyTimeFields = computed(() => normalizedTriggerType.value === 'daily_time')

// 是否需要 repeatCount 字段（simple 和 daily_time）
const showRepeatCount = computed(() =>
  ['simple', 'daily_time'].includes(normalizedTriggerType.value),
)

function getExpressionPlaceholder() {
  switch (normalizedTriggerType.value) {
    case 'cron':
      return 'Cron表达式，如：0 0 2 * * ?'
    case 'simple':
      return 'ISO-8601 Duration，如：PT5M（5分钟）'
    default:
      return '请输入表达式'
  }
}

function handleReset() {
  searchKeyword.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function getDefaultFormData() {
  return {
    id: '',
    title: '',
    description: '',
    bizExpression: '',
    triggerType: 'cron',
    expression: '',
    strategy: '',
    interval: undefined as number | undefined,
    intervalUnit: '',
    daysOfWeek: '',
    startTimeOfDay: '',
    endTimeOfDay: '',
    repeatCount: undefined as number | undefined,
    status: '0',
  }
}

function handleAdd() {
  isEdit.value = false
  formData.value = getDefaultFormData()
  showDialog.value = true
}

function handleEdit(job: Job) {
  isEdit.value = true
  formData.value = {
    id: job.id,
    title: job.title,
    description: job.description || '',
    bizExpression: job.bizExpression || '',
    triggerType: job.triggerType || 'cron',
    expression: job.expression || '',
    strategy: job.strategy || '',
    interval: job.interval,
    intervalUnit: job.intervalUnit || '',
    daysOfWeek: job.daysOfWeek || '',
    startTimeOfDay: job.startTimeOfDay || '',
    endTimeOfDay: job.endTimeOfDay || '',
    repeatCount: job.repeatCount,
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
    const submitData = { ...formData.value }
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
            <TableHead>业务表达式</TableHead>
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
            <TableCell class="text-xs">{{ job.strategy || '-' }}</TableCell>
            <TableCell class="text-xs">{{ job.bizExpression || '-' }}</TableCell>
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
            <Select v-model="formData.triggerType">
              <SelectTrigger>
                <SelectValue placeholder="选择触发类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in triggerTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 col-span-2">
            <Label>描述</Label>
            <Textarea v-model="formData.description" placeholder="请输入任务描述" rows="2" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>业务表达式</Label>
            <Textarea v-model="formData.bizExpression" placeholder="请输入业务表达式" rows="3" />
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>

          <!-- 执行表达式（所有触发器类型通用） -->
          <div class="space-y-2">
            <Label>执行表达式</Label>
            <Input v-model="formData.expression" :placeholder="getExpressionPlaceholder()" />
          </div>

          <!-- DailyTime / Calendar 触发器：间隔值 + 间隔单位 -->
          <div v-if="showInterval" class="space-y-2">
            <Label>间隔值</Label>
            <Input v-model.number="formData.interval" type="number" placeholder="如：5" />
          </div>
          <div v-if="showInterval" class="space-y-2">
            <Label>间隔单位</Label>
            <Select v-model="formData.intervalUnit">
              <SelectTrigger>
                <SelectValue placeholder="选择间隔单位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in currentIntervalUnits"
                  :key="unit.value"
                  :value="unit.value"
                >
                  {{ unit.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Simple / DailyTime 触发器：重复次数 -->
          <div v-if="showRepeatCount" class="space-y-2">
            <Label>重复次数</Label>
            <Input
              v-model.number="formData.repeatCount"
              type="number"
              placeholder="-1 或留空表示无限重复"
            />
          </div>

          <!-- DailyTime 触发器：每周触发日 -->
          <div v-if="showDailyTimeFields" class="space-y-2">
            <Label>每周触发日</Label>
            <Input
              v-model="formData.daysOfWeek"
              placeholder="逗号分隔，1=周日,2=周一,...,7=周六。如：2,3,4,5,6"
            />
          </div>

          <!-- DailyTime 触发器：每日开始时间 -->
          <div v-if="showDailyTimeFields" class="space-y-2">
            <Label>每日开始时间</Label>
            <Input v-model="formData.startTimeOfDay" type="time" />
          </div>

          <!-- DailyTime 触发器：每日结束时间 -->
          <div v-if="showDailyTimeFields" class="space-y-2">
            <Label>每日结束时间</Label>
            <Input v-model="formData.endTimeOfDay" type="time" />
          </div>

          <!-- misfire 策略 -->
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
