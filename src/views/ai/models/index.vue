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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Bot } from '@lucide/vue'
import type { ChatModel } from '@/types'
import { chatModelApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { usePagedList } from '@/composables/usePagedList'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchKeyword = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const {
  list: models,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => chatModelApi.list(query),
  params: () => ({
    modelName: searchKeyword.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

const formData = ref({
  id: '',
  baseUrl: '',
  apiKey: '',
  providerId: '',
  modelName: '',
  description: '',
  temperature: 0.7,
  topP: 1,
  maxOutputTokens: 2048,
  toolChoice: '',
  responseFormat: '',
  timeout: 60,
  maxRetries: 3,
  status: '1',
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
    baseUrl: '',
    apiKey: '',
    providerId: '',
    modelName: '',
    description: '',
    temperature: 0.7,
    topP: 1,
    maxOutputTokens: 2048,
    toolChoice: '',
    responseFormat: '',
    timeout: 60,
    maxRetries: 3,
    status: '1',
  }
  showDialog.value = true
}

function handleEdit(model: ChatModel) {
  isEdit.value = true
  formData.value = {
    id: model.id,
    baseUrl: model.baseUrl || '',
    apiKey: model.apiKey || '',
    providerId: model.providerId || '',
    modelName: model.modelName || '',
    description: model.description || '',
    temperature: model.temperature ?? 0.7,
    topP: model.topP ?? 1,
    maxOutputTokens: model.maxOutputTokens ?? 2048,
    toolChoice: model.toolChoice || '',
    responseFormat: model.responseFormat || '',
    timeout: model.timeout ?? 60,
    maxRetries: model.maxRetries ?? 3,
    status: model.status != null ? String(model.status) : '1',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除模型', '确定要删除该聊天模型吗？')
  if (!confirmed) return
  try {
    await chatModelApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSubmit() {
  if (!formData.value.modelName) {
    showError('请填写模型名称')
    return
  }
  if (!formData.value.baseUrl) {
    showError('请填写接口地址')
    return
  }
  if (!formData.value.apiKey) {
    showError('请填写API密钥')
    return
  }
  try {
    const data = {
      ...formData.value,
      status: Number(formData.value.status),
      temperature: Number(formData.value.temperature),
      topP: Number(formData.value.topP),
      maxOutputTokens: Number(formData.value.maxOutputTokens),
      timeout: Number(formData.value.timeout),
      maxRetries: Number(formData.value.maxRetries),
      toolChoice: formData.value.toolChoice && formData.value.toolChoice !== '__none__' ? formData.value.toolChoice : undefined,
      responseFormat: formData.value.responseFormat && formData.value.responseFormat !== '__none__' ? formData.value.responseFormat : undefined,
    }
    if (isEdit.value) {
      await chatModelApi.update(formData.value.id, data)
      showSuccess('更新成功')
      showDialog.value = false
      reload()
    } else {
      await chatModelApi.create(data)
      showSuccess('新增成功')
      showDialog.value = false
      handleSearch()
    }
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
        新增模型
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="模型名称"
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
            <TableHead>模型名称</TableHead>
            <TableHead>提供商</TableHead>
            <TableHead>接口地址</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="model in models" :key="model.id">
            <TableCell class="w-32 shrink-0 min-w-0 truncate" :title="model.id">
              {{ model.id }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Bot class="w-4 h-4 text-primary" />
                <div class="font-medium">{{ model.modelName }}</div>
              </div>
            </TableCell>
            <TableCell>{{ model.providerId || '-' }}</TableCell>
            <TableCell class="max-w-[200px] truncate" :title="model.baseUrl">
              {{ model.baseUrl }}
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {{ getStatusLabel(String(model.status)) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ model.createdAt ? formatDateTime(model.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(model)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(model.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="models.length === 0">
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

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑模型' : '新增模型' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改模型配置' : '添加新的聊天模型' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="modelName">模型名称 <span class="text-destructive">*</span></Label>
            <Input id="modelName" v-model="formData.modelName" placeholder="如 gpt-4o" />
          </div>
          <div class="space-y-2">
            <Label for="providerId">提供商</Label>
            <Input id="providerId" v-model="formData.providerId" placeholder="如 openai" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="baseUrl">接口地址 <span class="text-destructive">*</span></Label>
            <Input id="baseUrl" v-model="formData.baseUrl" placeholder="https://api.example.com/v1" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="apiKey">API密钥 <span class="text-destructive">*</span></Label>
            <Input id="apiKey" v-model="formData.apiKey" type="password" placeholder="sk-..." />
          </div>
          <div class="space-y-2">
            <Label for="temperature">温度 (temperature)</Label>
            <Input id="temperature" v-model.number="formData.temperature" type="number" step="0.1" min="0" max="2" />
          </div>
          <div class="space-y-2">
            <Label for="topP">Top P</Label>
            <Input id="topP" v-model.number="formData.topP" type="number" step="0.1" min="0" max="1" />
          </div>
          <div class="space-y-2">
            <Label for="maxOutputTokens">最大输出token</Label>
            <Input id="maxOutputTokens" v-model.number="formData.maxOutputTokens" type="number" min="1" />
          </div>
          <div class="space-y-2">
            <Label for="timeout">超时时间(秒)</Label>
            <Input id="timeout" v-model.number="formData.timeout" type="number" min="1" />
          </div>
          <div class="space-y-2">
            <Label for="maxRetries">最大重试次数</Label>
            <Input id="maxRetries" v-model.number="formData.maxRetries" type="number" min="0" />
          </div>
          <div class="space-y-2">
            <Label for="toolChoice">工具选择</Label>
            <Select v-model="formData.toolChoice">
              <SelectTrigger id="toolChoice">
                <SelectValue placeholder="默认" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">默认</SelectItem>
                <SelectItem value="auto">自动 (auto)</SelectItem>
                <SelectItem value="required">必须 (required)</SelectItem>
                <SelectItem value="none">禁用 (none)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="responseFormat">响应格式</Label>
            <Select v-model="formData.responseFormat">
              <SelectTrigger id="responseFormat">
                <SelectValue placeholder="文本" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">文本</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Textarea id="description" v-model="formData.description" rows="3" />
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
