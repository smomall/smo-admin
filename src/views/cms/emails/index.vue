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

import { Plus, Edit, Trash2, Mail } from '@lucide/vue'
import type { Email } from '@/types'
import { emailApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchHost = ref('')
const searchUsername = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  protocol: '',
  host: '',
  username: '',
  password: '',
  defaultEncoding: '',
  javaMailProperties: '',
  status: '0',
})

const {
  list: emails,
  loading,
  currentPage,
  pageSize,
  total,
  isEmpty,
  goto,
  search: handleSearch,
  reload: reloadEmails,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => emailApi.list(query),
  params: () => ({
    host: searchHost.value,
    username: searchUsername.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

function handleReset() {
  searchHost.value = ''
  searchUsername.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    protocol: '',
    host: '',
    username: '',
    password: '',
    defaultEncoding: '',
    javaMailProperties: '',
    status: '0',
  }
  showDialog.value = true
}

function handleEdit(email: Email) {
  isEdit.value = true
  formData.value = {
    id: email.id,
    protocol: email.protocol || '',
    host: email.host || '',
    username: email.username || '',
    password: email.password || '',
    defaultEncoding: email.defaultEncoding || '',
    javaMailProperties: email.javaMailProperties || '',
    status: String(email.status),
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除邮件配置', '确定要删除该邮件配置吗？')
  if (!confirmed) return
  try {
    await emailApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.host || !formData.value.username) {
    showError('请填写必填项')
    return
  }
  try {
    if (isEdit.value) {
      await emailApi.update(formData.value.id, formData.value)
    } else {
      await emailApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadEmails()
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
          v-model="searchHost"
          placeholder="服务器地址"
          class="w-40"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchUsername"
          placeholder="用户名"
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
            <TableHead>协议</TableHead>
            <TableHead>服务器地址</TableHead>
            <TableHead>用户名</TableHead>
            <TableHead>编码</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="email in emails" :key="email.id">
            <TableCell>{{ email.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Mail class="w-4 h-4 text-primary" />
                {{ email.protocol || '-' }}
              </div>
            </TableCell>
            <TableCell>{{ email.host }}</TableCell>
            <TableCell>{{ email.username }}</TableCell>
            <TableCell>{{ email.defaultEncoding || '-' }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(email.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ email.createdAt ? formatDateTime(email.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(email)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(email.id)">
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

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑邮件配置' : '新增邮件配置' }}</DialogTitle>
          <DialogDescription>{{
            isEdit ? '修改邮件服务器配置' : '添加新邮件服务器配置'
          }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>协议</Label>
            <DictSelect
              v-model="formData.protocol"
              dict-type="email_protocol"
              placeholder="选择协议"
            />
          </div>
          <div class="space-y-2">
            <Label>服务器地址 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.host" placeholder="smtp.example.com" />
          </div>
          <div class="space-y-2">
            <Label>用户名 <span class="text-red-500">*</span></Label>
            <Input v-model="formData.username" placeholder="user@example.com" />
          </div>
          <div class="space-y-2">
            <Label>密码</Label>
            <Input v-model="formData.password" type="password" placeholder="密码" />
          </div>
          <div class="space-y-2">
            <Label>默认编码</Label>
            <Input v-model="formData.defaultEncoding" placeholder="UTF-8" />
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>JavaMail属性</Label>
            <Textarea
              v-model="formData.javaMailProperties"
              placeholder="JSON格式的JavaMail配置属性"
              rows="4"
            />
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
