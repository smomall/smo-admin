<script setup lang="ts">
import { ref } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, MessagesSquare, Eye } from '@lucide/vue'
import type { ChatSession, ChatMessage } from '@/types'
import { chatSessionApi } from '@/api'
import { usePagedList } from '@/composables/usePagedList'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import { useDict } from '@/composables/useDict'
import { DICT } from '@/constants/dict'

const { items: sessionTypeItems, getLabel: getTypeLabel } = useDict(DICT.AI_SESSION_TYPE)

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchKeyword = ref('')
const searchType = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)
const showMessagesDialog = ref(false)
const currentMessages = ref<ChatMessage[]>([])
const currentSessionTitle = ref('')

const {
  list: sessions,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => chatSessionApi.list(query),
  params: () => ({
    title: searchKeyword.value,
    sessionType: searchType.value === '__all__' ? '' : searchType.value,
  }),
})

const formData = ref({
  id: '',
  aiId: '',
  sessionType: 'assistant',
  title: '',
  maxSeq: '',
})

function handleReset() {
  searchKeyword.value = ''
  searchType.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    aiId: '',
    sessionType: 'assistant',
    title: '',
    maxSeq: '',
  }
  showDialog.value = true
}

function handleEdit(session: ChatSession) {
  isEdit.value = true
  formData.value = {
    id: session.id,
    aiId: session.aiId || '',
    sessionType: session.sessionType || 'assistant',
    title: session.title || '',
    maxSeq: session.maxSeq || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除会话', '确定要删除该会话吗？')
  if (!confirmed) return
  try {
    await chatSessionApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写会话标题')
    return
  }
  try {
    const data = {
      ...formData.value,
      aiId: formData.value.aiId || undefined,
    }
    if (isEdit.value) {
      await chatSessionApi.update(formData.value.id, data)
      showSuccess('更新成功')
      showDialog.value = false
      reload()
    } else {
      await chatSessionApi.create(data)
      showSuccess('新增成功')
      showDialog.value = false
      handleSearch()
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleViewMessages(session: ChatSession) {
  try {
    const { data } = await chatSessionApi.getMessages(session.id)
    currentMessages.value = data.value || []
    currentSessionTitle.value = session.title || '未命名会话'
    showMessagesDialog.value = true
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
        新增会话
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="会话标题"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Select v-model="searchType">
          <SelectTrigger class="w-32">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部类型</SelectItem>
            <SelectItem v-for="opt in sessionTypeItems" :key="opt.value" :value="opt.value">
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
            <TableHead>会话标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>关联ID</TableHead>
            <TableHead>消息数</TableHead>
            <TableHead>更新时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="session in sessions" :key="session.id">
            <TableCell class="w-32 shrink-0 min-w-0 truncate" :title="session.id">
              {{ session.id }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <MessagesSquare class="w-4 h-4 text-primary" />
                <div class="font-medium">{{ session.title || '未命名会话' }}</div>
              </div>
            </TableCell>
            <TableCell>
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {{ getTypeLabel(session.sessionType) }}
              </span>
            </TableCell>
            <TableCell class="w-32 shrink-0 min-w-0 truncate" :title="session.aiId">
              {{ session.aiId || '-' }}
            </TableCell>
            <TableCell>{{ session.maxSeq || 0 }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ session.updatedAt ? formatDateTime(session.updatedAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleViewMessages(session)" title="查看消息">
                  <Eye class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleEdit(session)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(session.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="sessions.length === 0">
            <TableCell colspan="7" class="text-center text-muted-foreground py-12">
              <div class="inline-flex flex-col items-center gap-2">
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

    <!-- 新增/编辑弹窗 -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑会话' : '新增会话' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改会话信息' : '创建新的会话' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="title">会话标题 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入会话标题" />
          </div>
          <div class="space-y-2">
            <Label for="sessionType">会话类型</Label>
            <Select v-model="formData.sessionType">
              <SelectTrigger id="sessionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in sessionTypeItems" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="aiId">关联ID</Label>
            <Input id="aiId" v-model="formData.aiId" />
          </div>
          <div class="space-y-2">
            <Label for="maxSeq">最大序号</Label>
            <Input id="maxSeq" v-model="formData.maxSeq" placeholder="0" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 消息查看弹窗 -->
    <Dialog v-model:open="showMessagesDialog">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ currentSessionTitle }} - 消息记录</DialogTitle>
          <DialogDescription>共 {{ currentMessages.length }} 条消息</DialogDescription>
        </DialogHeader>

        <div class="space-y-3 py-4">
          <div
            v-for="(msg, idx) in currentMessages"
            :key="idx"
            class="p-3 rounded-lg"
            :class="msg.type === 'USER' ? 'bg-primary/10 ml-8' : 'bg-secondary mr-8'"
          >
            <div class="text-xs text-muted-foreground mb-1">
              {{ msg.type === 'USER' ? '用户' : 'AI' }}
            </div>
            <div class="text-sm whitespace-pre-wrap">{{ typeof msg.text === 'string' ? msg.text : JSON.stringify(msg) }}</div>
          </div>
          <div v-if="currentMessages.length === 0" class="text-center text-muted-foreground py-8">
            暂无消息记录
          </div>
        </div>

        <DialogFooter>
          <Button @click="showMessagesDialog = false">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
