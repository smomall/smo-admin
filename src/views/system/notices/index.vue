<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, Clock } from '@lucide/vue'
import type { Notice } from '@/types'
import { noticeApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'

const {
  items: noticeStatusItems,
  fetchDict: fetchNoticeStatus,
  getLabel: getStatusLabel,
} = useDict('common_status')
const {
  items: noticeTypeItems,
  fetchDict: fetchNoticeType,
  getLabel: getTypeName,
} = useDict('notice_type')
const {
  items: noticeImportanceItems,
  fetchDict: fetchNoticeImportance,
  getLabel: getImportanceName,
} = useDict('notice_level')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const loading = ref(false)
const notices = ref<Notice[]>([])
const searchTitle = ref('')
const searchContent = ref('')
const searchType = ref<string>('all')
const searchImportance = ref<string>('all')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  title: '',
  content: '',
  type: '1',
  timingPublish: false,
  publishAt: '',
  expireAt: '',
  importance: '1',
  status: '0',
})

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

async function fetchNotices() {
  loading.value = true
  try {
    const { data } = await noticeApi.list({
      pageNumber: page.value,
      pageSize: pageSize.value,
      title: searchTitle.value,
      type: searchType.value !== 'all' ? Number(searchType.value) : undefined,
      importance: searchImportance.value !== 'all' ? Number(searchImportance.value) : undefined,
      status: searchStatus.value === '__all__' ? undefined : Number(searchStatus.value),
    })
    if (data.value) {
      notices.value = data.value.records
      total.value = data.value.totalRow
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  Promise.all([fetchNotices(), fetchNoticeStatus(), fetchNoticeType(), fetchNoticeImportance()])
})

function handleSearch() {
  page.value = 1
  fetchNotices()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchNotices()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    title: '',
    content: '',
    type: '1',
    timingPublish: false,
    publishAt: '',
    expireAt: '',
    importance: '1',
    status: '0',
  }
  showDialog.value = true
}

function handleEdit(notice: Notice) {
  isEdit.value = true
  formData.value = {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    type: String(notice.type),
    timingPublish: notice.timingPublish || false,
    publishAt: notice.publishAt ? formatDateTime(notice.publishAt) : '',
    expireAt: notice.expireAt ? formatDateTime(notice.expireAt) : '',
    importance: String(notice.importance),
    status: String(notice.status),
  }
  showDialog.value = true
}

function formatDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除通知公告', '确定要删除该通知公告吗？')
  if (!confirmed) return
  try {
    await noticeApi.delete(id)
    showSuccess('删除成功')
    if (notices.value.length === 1 && page.value > 1) {
      page.value--
    }
    fetchNotices()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function convertDateTime(value: string): string {
  if (!value) return ''
  return value.replace('T', ' ') + ':00'
}

async function handleSubmit() {
  if (!formData.value.title || !formData.value.content) {
    showError('请填写必填项')
    return
  }
  if (formData.value.timingPublish && !formData.value.publishAt) {
    showError('请设置定时发布时间')
    return
  }
  if (formData.value.timingPublish && formData.value.publishAt && formData.value.expireAt) {
    if (new Date(formData.value.expireAt) <= new Date(formData.value.publishAt)) {
      showError('过期时间必须晚于发布时间')
      return
    }
  }
  try {
    const submitData = {
      ...formData.value,
      importance: Number(formData.value.importance),
      publishAt: formData.value.timingPublish ? convertDateTime(formData.value.publishAt) : '',
      expireAt: formData.value.timingPublish ? convertDateTime(formData.value.expireAt) : '',
    }
    if (isEdit.value) {
      await noticeApi.update(formData.value.id, submitData)
    } else {
      await noticeApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    fetchNotices()
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
        新增公告
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input v-model="searchTitle" placeholder="标题" class="w-36" @keyup.enter="handleSearch" />
        <Input
          v-model="searchContent"
          placeholder="内容"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <DictSelect v-model="searchType" dict-type="notice_type" placeholder="类型" class="w-32" />
        <DictSelect
          v-model="searchImportance"
          dict-type="notice_level"
          placeholder="重要性"
          class="w-32"
        />
        <DictSelect
          v-model="searchStatus"
          :dict-items="noticeStatusItems"
          placeholder="状态"
          class="w-32"
        />
        <Button variant="outline" @click="handleSearch">搜索</Button>
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
            <TableHead>标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>重要性</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>定时发布</TableHead>
            <TableHead>发布时间</TableHead>
            <TableHead>过期时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="notice in notices" :key="notice.id">
            <TableCell>{{ notice.id }}</TableCell>
            <TableCell class="max-w-xs truncate">{{ notice.title }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="
                  notice.type === '1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                "
              >
                {{ getTypeName(String(notice.type)) }}
              </span>
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getImportanceName(String(notice.importance)) }}
              </span>
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(String(notice.status)) }}
              </span>
            </TableCell>
            <TableCell>
              <span
                v-if="notice.timingPublish"
                class="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 flex items-center gap-1"
              >
                <Clock class="w-3 h-3" /> 是
              </span>
              <span v-else class="text-muted-foreground text-xs">否</span>
            </TableCell>
            <TableCell>{{ notice.publishAt || '-' }}</TableCell>
            <TableCell>{{ notice.expireAt || '-' }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(notice)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(notice.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="notices.length === 0">
            <TableCell colspan="9" class="text-center text-muted-foreground py-8">
              暂无数据
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="flex items-center justify-between py-4">
      <span class="text-sm text-muted-foreground">
        显示 {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, total) }} 条，共
        {{ total }} 条
      </span>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="page <= 1"
          @click="handlePageChange(page - 1)"
        >
          上一页
        </Button>
        <span class="px-4 text-sm">第 {{ page }} 页</span>
        <Button
          variant="outline"
          size="sm"
          :disabled="page >= Math.ceil(total / pageSize)"
          @click="handlePageChange(page + 1)"
        >
          下一页
        </Button>
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑公告' : '新增公告' }}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2 col-span-2">
            <Label for="title">标题 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入标题" />
          </div>
          <div class="space-y-2">
            <Label for="type">类型</Label>
            <DictSelect id="type" v-model="formData.type" :dict-items="noticeTypeItems" />
          </div>
          <div class="space-y-2">
            <Label for="importance">重要性</Label>
            <DictSelect
              id="importance"
              v-model="formData.importance"
              :dict-items="noticeImportanceItems"
            />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect id="status" v-model="formData.status" :dict-items="noticeStatusItems" />
          </div>
          <div class="space-y-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label for="timingPublish">定时发布</Label>
              <p class="text-xs text-muted-foreground">开启后可设置发布时间和过期时间</p>
            </div>
            <Switch id="timingPublish" v-model="formData.timingPublish" />
          </div>
          <div v-if="formData.timingPublish" class="space-y-2">
            <Label for="publishAt">发布时间</Label>
            <Input
              id="publishAt"
              v-model="formData.publishAt"
              type="datetime-local"
              placeholder="请选择发布时间"
            />
          </div>
          <div v-if="formData.timingPublish" class="space-y-2">
            <Label for="expireAt">过期时间</Label>
            <Input
              id="expireAt"
              v-model="formData.expireAt"
              type="datetime-local"
              placeholder="不设置则永不过期"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="content">内容 <span class="text-destructive">*</span></Label>
            <Textarea id="content" v-model="formData.content" rows="6" placeholder="请输入内容" />
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
