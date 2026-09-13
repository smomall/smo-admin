<script setup lang="ts">
import { DICT } from '@/constants/dict'
import { ref, onMounted } from 'vue'
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
import { Plus, Edit, Trash2, Sparkles } from '@lucide/vue'
import type { ChatAgent, ChatModel, KnowledgeBase } from '@/types'
import { chatAgentApi, chatModelApi, knowledgeBaseApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { usePagedList } from '@/composables/usePagedList'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const { items: enableStatusItems } = useDict(DICT.COMMON_STATUS)

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchKeyword = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const modelOptions = ref<ChatModel[]>([])
const knowledgeBaseOptions = ref<KnowledgeBase[]>([])

const {
  list: agents,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => chatAgentApi.list(query),
  params: () => ({
    agentName: searchKeyword.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

const formData = ref({
  id: '',
  projectId: '',
  modelId: '',
  knowledgeBaseId: '',
  agentName: '',
  description: '',
  systemPrompt: '',
  tools: '' as string,
  skills: '' as string,
  status: '1',
})

async function fetchOptions() {
  try {
    const [modelRes, kbRes] = await Promise.all([
      chatModelApi.list({ pageSize: 100 }),
      knowledgeBaseApi.list({ pageSize: 100 }),
    ])
    modelOptions.value = modelRes.data.value?.records ?? []
    knowledgeBaseOptions.value = kbRes.data.value?.records ?? []
  } catch {
    // useRequest 已统一处理错误提示
  }
}

onMounted(fetchOptions)

function handleReset() {
  searchKeyword.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    projectId: '',
    modelId: '',
    knowledgeBaseId: '',
    agentName: '',
    description: '',
    systemPrompt: '',
    tools: '',
    skills: '',
    status: '1',
  }
  showDialog.value = true
}

function handleEdit(agent: ChatAgent) {
  isEdit.value = true
  formData.value = {
    id: agent.id,
    projectId: agent.projectId || '',
    modelId: agent.modelId || '',
    knowledgeBaseId: agent.knowledgeBaseId || '',
    agentName: agent.agentName || '',
    description: agent.description || '',
    systemPrompt: agent.systemPrompt || '',
    tools: agent.tools?.join(', ') || '',
    skills: agent.skills?.join(', ') || '',
    status: agent.status != null ? String(agent.status) : '1',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除智能体', '确定要删除该智能体吗？')
  if (!confirmed) return
  try {
    await chatAgentApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSubmit() {
  if (!formData.value.agentName) {
    showError('请填写智能体名称')
    return
  }
  if (!formData.value.modelId) {
    showError('请选择聊天模型')
    return
  }
  try {
    const data = {
      ...formData.value,
      status: Number(formData.value.status),
      tools: formData.value.tools
        ? formData.value.tools.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      skills: formData.value.skills
        ? formData.value.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      projectId: formData.value.projectId || undefined,
      modelId: formData.value.modelId || undefined,
      knowledgeBaseId: formData.value.knowledgeBaseId && formData.value.knowledgeBaseId !== '__none__' ? formData.value.knowledgeBaseId : undefined,
    }
    if (isEdit.value) {
      await chatAgentApi.update(formData.value.id, data)
      showSuccess('更新成功')
      showDialog.value = false
      reload()
    } else {
      await chatAgentApi.create(data)
      showSuccess('新增成功')
      showDialog.value = false
      handleSearch()
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

function getModelName(modelId: string) {
  return modelOptions.value.find((m) => m.id === modelId)?.modelName || '-'
}

function getKnowledgeBaseName(kbId: string) {
  return knowledgeBaseOptions.value.find((k) => k.id === kbId)?.baseName || '-'
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增智能体
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="智能体名称"
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
            <TableHead>智能体名称</TableHead>
            <TableHead>模型</TableHead>
            <TableHead>知识库</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="agent in agents" :key="agent.id">
            <TableCell class="w-32 shrink-0 min-w-0 truncate" :title="agent.id">
              {{ agent.id }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-primary" />
                <div class="font-medium">{{ agent.agentName }}</div>
              </div>
            </TableCell>
            <TableCell>{{ agent.modelId ? getModelName(agent.modelId) : '-' }}</TableCell>
            <TableCell>{{ agent.knowledgeBaseId ? getKnowledgeBaseName(agent.knowledgeBaseId) : '-' }}</TableCell>
            <TableCell>
              <StatusBadge :type="DICT.COMMON_STATUS" :value="agent.status" />
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ agent.createdAt ? formatDateTime(agent.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(agent)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(agent.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="agents.length === 0">
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
          <DialogTitle>{{ isEdit ? '编辑智能体' : '新增智能体' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改智能体配置' : '创建新的智能体' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="agentName">智能体名称 <span class="text-destructive">*</span></Label>
            <Input id="agentName" v-model="formData.agentName" placeholder="请输入智能体名称" />
          </div>
          <div class="space-y-2">
            <Label for="modelId">聊天模型 <span class="text-destructive">*</span></Label>
            <Select v-model="formData.modelId">
              <SelectTrigger id="modelId">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in modelOptions" :key="m.id" :value="m.id">
                  {{ m.modelName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="knowledgeBaseId">知识库</Label>
            <Select v-model="formData.knowledgeBaseId">
              <SelectTrigger id="knowledgeBaseId">
                <SelectValue placeholder="选择知识库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">无</SelectItem>
                <SelectItem v-for="kb in knowledgeBaseOptions" :key="kb.id" :value="kb.id">
                  {{ kb.baseName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Input id="description" v-model="formData.description" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="systemPrompt">系统提示词</Label>
            <Textarea id="systemPrompt" v-model="formData.systemPrompt" rows="4" />
          </div>
          <div class="space-y-2">
            <Label for="tools">工具（逗号分隔）</Label>
            <Input id="tools" v-model="formData.tools" placeholder="tool1, tool2" />
          </div>
          <div class="space-y-2">
            <Label for="skills">技能（逗号分隔）</Label>
            <Input id="skills" v-model="formData.skills" placeholder="skill1, skill2" />
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
