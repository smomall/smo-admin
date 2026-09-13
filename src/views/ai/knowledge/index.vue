<script setup lang="ts">
import { DICT } from '@/constants/dict'
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
import { Plus, Edit, Trash2, Upload, BookOpen, Database } from '@lucide/vue'
import type { KnowledgeBase } from '@/types'
import { knowledgeBaseApi } from '@/api'
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

const {
  list: knowledgeBases,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => knowledgeBaseApi.list(query),
  params: () => ({
    baseName: searchKeyword.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

const formData = ref({
  id: '',
  projectId: '',
  baseName: '',
  description: '',
  collection: '',
  dimension: 1536,
  embeddingModelId: '',
  maxSegmentSizeInChars: 800,
  maxOverlapSizeInChars: 200,
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
    projectId: '',
    baseName: '',
    description: '',
    collection: '',
    dimension: 1536,
    embeddingModelId: '',
    maxSegmentSizeInChars: 800,
    maxOverlapSizeInChars: 200,
    status: '1',
  }
  showDialog.value = true
}

function handleEdit(kb: KnowledgeBase) {
  isEdit.value = true
  formData.value = {
    id: kb.id,
    projectId: kb.projectId || '',
    baseName: kb.baseName || '',
    description: kb.description || '',
    collection: kb.collection || '',
    dimension: kb.dimension ?? 1536,
    embeddingModelId: kb.embeddingModelId || '',
    maxSegmentSizeInChars: kb.maxSegmentSizeInChars ?? 800,
    maxOverlapSizeInChars: kb.maxOverlapSizeInChars ?? 200,
    status: kb.status != null ? String(kb.status) : '1',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除知识库', '确定要删除该知识库吗？')
  if (!confirmed) return
  try {
    await knowledgeBaseApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSubmit() {
  if (!formData.value.baseName) {
    showError('请填写知识库名称')
    return
  }
  if (!formData.value.collection) {
    showError('请填写向量集合名称')
    return
  }
  try {
    const data = {
      ...formData.value,
      status: Number(formData.value.status),
      dimension: Number(formData.value.dimension),
      maxSegmentSizeInChars: Number(formData.value.maxSegmentSizeInChars),
      maxOverlapSizeInChars: Number(formData.value.maxOverlapSizeInChars),
      projectId: formData.value.projectId || undefined,
      embeddingModelId: formData.value.embeddingModelId || undefined,
    }
    if (isEdit.value) {
      await knowledgeBaseApi.update(formData.value.id, data)
      showSuccess('更新成功')
      showDialog.value = false
      reload()
    } else {
      await knowledgeBaseApi.create(data)
      showSuccess('新增成功')
      showDialog.value = false
      handleSearch()
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleUpload(id: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf,.txt,.md,.docx'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      await knowledgeBaseApi.upload(id, file)
      showSuccess('上传成功，正在处理中')
    } catch {
      // useRequest 已统一处理错误提示
    }
  }
  input.click()
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增知识库
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="知识库名称"
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
            <TableHead>知识库名称</TableHead>
            <TableHead>向量集合</TableHead>
            <TableHead>维度</TableHead>
            <TableHead>分块大小</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="kb in knowledgeBases" :key="kb.id">
            <TableCell class="w-32 shrink-0 min-w-0 truncate" :title="kb.id">
              {{ kb.id }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <BookOpen class="w-4 h-4 text-primary" />
                <div class="font-medium">{{ kb.baseName }}</div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Database class="w-3 h-3 text-muted-foreground" />
                <span class="font-mono text-xs">{{ kb.collection }}</span>
              </div>
            </TableCell>
            <TableCell>{{ kb.dimension }}</TableCell>
            <TableCell>{{ kb.maxSegmentSizeInChars }}</TableCell>
            <TableCell>
              <StatusBadge :type="DICT.COMMON_STATUS" :value="kb.status" />
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ kb.createdAt ? formatDateTime(kb.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleUpload(kb.id)" title="上传文档">
                  <Upload class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleEdit(kb)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(kb.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="knowledgeBases.length === 0">
            <TableCell colspan="8" class="text-center text-muted-foreground py-12">
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
          <DialogTitle>{{ isEdit ? '编辑知识库' : '新增知识库' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改知识库配置' : '创建新的知识库' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="baseName">知识库名称 <span class="text-destructive">*</span></Label>
            <Input id="baseName" v-model="formData.baseName" placeholder="请输入知识库名称" />
          </div>
          <div class="space-y-2">
            <Label for="collection">向量集合 <span class="text-destructive">*</span></Label>
            <Input id="collection" v-model="formData.collection" placeholder="如 knowledge_base_01" />
          </div>
          <div class="space-y-2">
            <Label for="dimension">向量维度</Label>
            <Input id="dimension" v-model.number="formData.dimension" type="number" min="1" />
          </div>
          <div class="space-y-2">
            <Label for="embeddingModelId">嵌入模型ID</Label>
            <Input id="embeddingModelId" v-model="formData.embeddingModelId" />
          </div>
          <div class="space-y-2">
            <Label for="maxSegmentSizeInChars">分块大小(字符)</Label>
            <Input id="maxSegmentSizeInChars" v-model.number="formData.maxSegmentSizeInChars" type="number" min="1" />
          </div>
          <div class="space-y-2">
            <Label for="maxOverlapSizeInChars">分块重叠(字符)</Label>
            <Input id="maxOverlapSizeInChars" v-model.number="formData.maxOverlapSizeInChars" type="number" min="0" />
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
