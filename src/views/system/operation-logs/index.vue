<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fromLocalDateTimeInput, formatDateTime } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Clock, User, MapPin, AlertCircle, CheckCircle2, FileText, Trash2 } from '@lucide/vue'
import type { OperationLog } from '@/types'
import { logApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { useDict } from '@/composables/useDict'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { confirm } = useConfirmDialog()
const { showSuccess } = useMessageDialog()

const { getLabel: getStatusLabel } = useDict('common_status')
const { getLabel: getOperationTypeLabel } = useDict('operation_type')
const { getLabel: getDeviceTypeLabel } = useDict('login_device')

const searchUsername = ref('')
const searchStatus = ref('__all__')
const searchModuleName = ref('')
const searchFunctionName = ref('')
const searchOperationType = ref('')
const startTime = ref('')
const endTime = ref('')
const showDetailDialog = ref(false)
const currentLog = ref<OperationLog | null>(null)

const {
  list: operationLogs,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => logApi.operationList(query),
  params: () => ({
    username: searchUsername.value,
    moduleName: searchModuleName.value,
    functionName: searchFunctionName.value,
    operationType: searchOperationType.value === '__all__' ? '' : searchOperationType.value,
    startAt: fromLocalDateTimeInput(startTime.value),
    endAt: fromLocalDateTimeInput(endTime.value),
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

function handleReset() {
  searchUsername.value = ''
  searchStatus.value = '__all__'
  searchModuleName.value = ''
  searchFunctionName.value = ''
  searchOperationType.value = ''
  startTime.value = ''
  endTime.value = ''
  handleSearch()
}

async function handleClear() {
  if (await confirm('确认清空', '确定清空所有操作日志？')) {
    await logApi.operationClear()
    handleSearch()
  }
}

async function handleDelete(log: OperationLog) {
  if (await confirm('确认删除', `确定删除ID为 ${log.id} 的操作日志？`)) {
    await logApi.operationDelete(log.id)
    showSuccess('删除成功')
    reloadAfterRemove()
  }
}

function getStatusIcon(status: string | undefined) {
  return status === '1' ? CheckCircle2 : AlertCircle
}

function formatDuration(duration: number | undefined): string {
  if (!duration) return '-'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

async function handleViewDetail(log: OperationLog) {
  try {
    const { data } = await logApi.operationGetById(log.id)
    if (data.value) {
      currentLog.value = data.value
      showDetailDialog.value = true
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button variant="destructive" @click="handleClear">
        <Trash2 class="w-4 h-4 mr-2" />
        清空日志
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchUsername"
          placeholder="用户名"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchModuleName"
          placeholder="模块名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchFunctionName"
          placeholder="功能名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <DictSelect
          v-model="searchOperationType"
          dict-type="operation_type"
          placeholder="操作类型"
          class="w-32"
        />
        <DictSelect
          v-model="searchStatus"
          dict-type="operation_status"
          placeholder="全部状态"
          class="w-32"
        />
        <Input v-model="startTime" type="datetime-local" placeholder="开始时间" class="w-48" />
        <Input v-model="endTime" type="datetime-local" placeholder="结束时间" class="w-48" />
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
            <TableHead>用户</TableHead>
            <TableHead>模块</TableHead>
            <TableHead>功能</TableHead>
            <TableHead>操作类型</TableHead>
            <TableHead>请求方法</TableHead>
            <TableHead>请求URL</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>属地</TableHead>
            <TableHead>浏览器</TableHead>
            <TableHead>操作系统</TableHead>
            <TableHead>设备类型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead>操作时间</TableHead>
            <TableHead class="sticky right-0 bg-background">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="log in operationLogs" :key="log.id">
            <TableCell>{{ log.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User class="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div>{{ log.username }}</div>
                  <div v-if="log.nickname" class="text-xs text-muted-foreground">
                    {{ log.nickname }}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell class="max-w-xs truncate">{{ log.moduleName || '-' }}</TableCell>
            <TableCell class="max-w-xs truncate">{{ log.functionName || '-' }}</TableCell>
            <TableCell>{{ getOperationTypeLabel(log.operateType) }}</TableCell>
            <TableCell>
              <span class="px-2 py-0.5 rounded text-xs bg-muted font-mono">{{
                log.requestMethod || '-'
              }}</span>
            </TableCell>
            <TableCell class="max-w-xs truncate font-mono text-sm">{{
              log.requestUrl || '-'
            }}</TableCell>
            <TableCell>
              <span class="flex items-center gap-1">
                <MapPin class="w-3 h-3 text-muted-foreground" />
                {{ log.ipAddress || '-' }}
              </span>
            </TableCell>
            <TableCell>{{ log.ipLocation || '-' }}</TableCell>
            <TableCell>{{ log.browser || '-' }}</TableCell>
            <TableCell>{{ log.osInfo || '-' }}</TableCell>
            <TableCell>{{ getDeviceTypeLabel(log.deviceType) }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                :class="'bg-secondary text-secondary-foreground'"
              >
                <component :is="getStatusIcon(log.status)" class="w-3 h-3" />
                {{ getStatusLabel(log.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm font-mono">{{ formatDuration(log.durationMs) }}</TableCell>
            <TableCell>
              <span class="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock class="w-3 h-3" />
                {{ log.endAt ? formatDateTime(log.endAt) : (log.startAt ? formatDateTime(log.startAt) : '-') }}
              </span>
            </TableCell>
            <TableCell class="sticky right-0 bg-background">
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleViewDetail(log)">
                  <FileText class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-red-500 hover:text-red-600"
                  @click="handleDelete(log)"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="operationLogs.length === 0">
            <TableCell colspan="17" class="text-center text-muted-foreground py-12">
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
      <DialogContent class="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>操作日志详情</DialogTitle>
          <DialogDescription>查看完整的操作记录信息</DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4" v-if="currentLog">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>ID</Label>
              <Input :model-value="currentLog.id" readonly class="font-mono" />
            </div>
            <div class="space-y-2">
              <Label>用户ID</Label>
              <Input :model-value="currentLog.userId" readonly class="font-mono" />
            </div>
            <div class="space-y-2">
              <Label>用户名</Label>
              <Input :model-value="currentLog.username" readonly />
            </div>
            <div class="space-y-2">
              <Label>昵称</Label>
              <Input :model-value="currentLog.nickname || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>模块名称</Label>
              <Input :model-value="currentLog.moduleName || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>功能名称</Label>
              <Input :model-value="currentLog.functionName || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>操作类型</Label>
              <Input :model-value="getOperationTypeLabel(currentLog.operateType)" readonly />
            </div>
            <div class="space-y-2">
              <Label>请求方法</Label>
              <Input :model-value="currentLog.requestMethod || '-'" readonly class="font-mono" />
            </div>
            <div class="space-y-2">
              <Label>请求URL</Label>
              <Input :model-value="currentLog.requestUrl || '-'" readonly class="font-mono" />
            </div>
            <div class="space-y-2">
              <Label>Content-Type</Label>
              <Input :model-value="currentLog.contentType || '-'" readonly class="font-mono" />
            </div>
            <div class="space-y-2">
              <Label>IP地址</Label>
              <Input :model-value="currentLog.ipAddress || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>IP属地</Label>
              <Input :model-value="currentLog.ipLocation || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>浏览器</Label>
              <Input :model-value="currentLog.browser || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>操作系统</Label>
              <Input :model-value="currentLog.osInfo || '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>设备类型</Label>
              <Input :model-value="getDeviceTypeLabel(currentLog.deviceType)" readonly />
            </div>
            <div class="space-y-2">
              <Label>状态</Label>
              <Input
                :model-value="getStatusLabel(currentLog.status)"
                readonly
                :class="'bg-secondary text-secondary-foreground'"
              />
            </div>
            <div class="space-y-2">
              <Label>耗时</Label>
              <Input
                :model-value="formatDuration(currentLog.durationMs)"
                readonly
                class="font-mono"
              />
            </div>
            <div class="space-y-2">
              <Label>开始时间</Label>
              <Input :model-value="currentLog.startAt ? formatDateTime(currentLog.startAt) : '-'" readonly />
            </div>
            <div class="space-y-2">
              <Label>结束时间</Label>
              <Input :model-value="currentLog.endAt ? formatDateTime(currentLog.endAt) : '-'" readonly />
            </div>
          </div>

          <div class="space-y-2">
            <Label>请求参数</Label>
            <Textarea
              :model-value="currentLog.requestParam || '-'"
              readonly
              class="font-mono"
              rows="4"
            />
          </div>

          <div class="space-y-2">
            <Label>请求体</Label>
            <Textarea
              :model-value="currentLog.requestBody || '-'"
              readonly
              class="font-mono"
              rows="4"
            />
          </div>

          <div class="space-y-2">
            <Label>响应结果</Label>
            <Textarea
              :model-value="currentLog.responseResult || '-'"
              readonly
              class="font-mono"
              rows="4"
            />
          </div>

          <div class="space-y-2">
            <Label>失败原因</Label>
            <Textarea
              :model-value="currentLog.failReason || '-'"
              readonly
              class="font-mono"
              rows="4"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
