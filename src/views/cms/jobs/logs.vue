<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTime } from '@/lib/utils'
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
import { ArrowLeft, Trash2, Clock, AlertCircle, CheckCircle, XCircle } from '@lucide/vue'
import DictSelect from '@/components/DictSelect.vue'
import type { TaskLog } from '@/api'
import { taskLogApi, jobApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDict } from '@/composables/useDict'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const {
  fetchDict: fetchJobStatus,
  getLabel: getStatusLabel,
} = useDict('job_status')

const route = useRoute()
const router = useRouter()
const { showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchKeyword = ref('')
const searchStatus = ref<string>('__all__')
const jobId = ref('')
const jobTitle = ref('')

const showDetailDialog = ref(false)
const currentLog = ref<TaskLog | null>(null)

const {
  list: logs,
  loading,
  currentPage,
  pageSize,
  total,
  isEmpty,
  goto,
  search: handleSearch,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => taskLogApi.list(query),
  params: () => ({
    jobId: jobId.value || undefined,
    status: searchStatus.value === '__all__' ? undefined : searchStatus.value,
    message: searchKeyword.value || undefined,
  }),
  immediate: false,
})

function getStatusIcon(value: string | undefined) {
  if (value === '1') return Clock
  if (value === '2') return CheckCircle
  if (value === '3') return XCircle
  return AlertCircle
}

function formatDuration(durationMs: number | undefined): string {
  if (!durationMs) return '-'
  if (durationMs < 1000) return durationMs + 'ms'
  if (durationMs < 60000) return (durationMs / 1000).toFixed(2) + 's'
  return (durationMs / 60000).toFixed(2) + 'min'
}

async function fetchJobInfo() {
  const id = route.query.jobId as string
  if (id) {
    jobId.value = id
    try {
      const { data } = await jobApi.getById(id)
      if (data.value) {
        jobTitle.value = data.value.title || ''
      }
    } catch {
      jobTitle.value = ''
    }
  }
}

onMounted(async () => {
  fetchJobInfo()
  fetchJobStatus()
  handleSearch()
})

function handleReset() {
  searchKeyword.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleBack() {
  router.push('/cms/jobs/tasks')
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除日志', '确定要删除该日志吗？')
  if (!confirmed) return
  try {
    await taskLogApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleViewDetail(log: TaskLog) {
  currentLog.value = log
  showDetailDialog.value = true
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Button variant="outline" size="sm" @click="handleBack">
          <ArrowLeft class="w-4 h-4 mr-1" />
          返回
        </Button>
      </div>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="搜索日志消息"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <DictSelect
          v-model="searchStatus"
          dict-type="job_status"
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
            <TableHead>任务ID</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>消息</TableHead>
            <TableHead>开始时间</TableHead>
            <TableHead>结束时间</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="log in logs" :key="log.id">
            <TableCell class="font-mono text-sm">{{ log.id }}</TableCell>
            <TableCell class="font-mono text-sm">{{ log.jobId }}</TableCell>
            <TableCell>
              <span
                class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                <component :is="getStatusIcon(log.status)" class="w-3 h-3" />
                {{ getStatusLabel(log.status) }}
              </span>
            </TableCell>
            <TableCell
              class="max-w-xs truncate cursor-pointer hover:text-primary"
              @click="handleViewDetail(log)"
            >
              {{ log.message || '-' }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ log.startTime ? formatDateTime(log.startTime) : '-' }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ log.endTime ? formatDateTime(log.endTime) : '-' }}
            </TableCell>
            <TableCell class="text-sm">
              {{ formatDuration(log.durationMs) }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleViewDetail(log)"> 详情 </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(log.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="isEmpty">
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

    <Dialog v-model:open="showDetailDialog">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>日志详情</DialogTitle>
          <DialogDescription>查看任务执行日志的详细信息</DialogDescription>
        </DialogHeader>

        <div v-if="currentLog" class="space-y-4 mt-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>日志ID</Label>
              <div class="font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                {{ currentLog.id }}
              </div>
            </div>
            <div class="space-y-2">
              <Label>任务ID</Label>
              <div class="font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                {{ currentLog.jobId }}
              </div>
            </div>
            <div class="space-y-2">
              <Label>状态</Label>
              <span
                class="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                <component :is="getStatusIcon(currentLog.status)" class="w-4 h-4" />
                {{ getStatusLabel(currentLog.status) }}
              </span>
            </div>
            <div class="space-y-2">
              <Label>耗时</Label>
              <div class="font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                {{ formatDuration(currentLog.durationMs) }}
              </div>
            </div>
            <div class="space-y-2 col-span-2">
              <Label>开始时间</Label>
              <div class="font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                {{ currentLog.startTime ? formatDateTime(currentLog.startTime) : '-' }}
              </div>
            </div>
            <div class="space-y-2 col-span-2">
              <Label>结束时间</Label>
              <div class="font-mono text-sm bg-muted px-3 py-2 rounded-lg">
                {{ currentLog.endTime ? formatDateTime(currentLog.endTime) : '-' }}
              </div>
            </div>
            <div class="space-y-2 col-span-2">
              <Label>执行消息</Label>
              <div class="bg-muted px-3 py-2 rounded-lg min-h-[60px] whitespace-pre-wrap">
                {{ currentLog.message || '-' }}
              </div>
            </div>
            <div class="space-y-2 col-span-2">
              <Label>执行结果</Label>
              <div class="bg-muted px-3 py-2 rounded-lg min-h-[60px] whitespace-pre-wrap">
                {{ currentLog.result || '-' }}
              </div>
            </div>
            <div
              v-if="currentLog.stackTrace && currentLog.stackTrace.length > 0"
              class="space-y-2 col-span-2"
            >
              <Label>异常堆栈</Label>
              <div
                class="bg-red-50 border border-red-200 px-3 py-2 rounded-lg max-h-[300px] overflow-y-auto"
              >
                <pre class="text-sm text-red-700 whitespace-pre-wrap">{{
                  currentLog.stackTrace.join('\n')
                }}</pre>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDetailDialog = false">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
