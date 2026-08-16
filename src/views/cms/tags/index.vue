<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
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
import { Plus, Edit, Trash2, Tag } from '@lucide/vue'
import type { Tag as TagType } from '@/types'
import { tagApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { usePagedList } from '@/composables/usePagedList'
import { useSiteStore } from '@/stores/site'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import CoverInput from '@/components/CoverInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'

const siteStore = useSiteStore()

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const route = useRoute()
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const searchKeyword = ref('')
const searchSlug = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const {
  list: tags,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => tagApi.list(query),
  params: () => ({
    title: searchKeyword.value,
    slug: searchSlug.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    siteId: siteId.value,
  }),
})

const formData = ref({
  id: '',
  title: '',
  slug: '',
  description: '',
  cover: '',
  icon: '',
  status: '0',
  sort: 0,
})

function handleReset() {
  searchKeyword.value = ''
  searchSlug.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    title: '',
    slug: '',
    description: '',
    cover: '',
    icon: '',
    status: '0',
    sort: 0,
  }
  showDialog.value = true
}

function handleEdit(tag: TagType) {
  isEdit.value = true
  formData.value = {
    id: tag.id,
    title: tag.title,
    slug: tag.slug || '',
    description: tag.description || '',
    cover: tag.cover || '',
    icon: tag.icon || '',
    status: tag.status ?? '0',
    sort: tag.sort || 0,
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除标签', '确定要删除该标签吗？')
  if (!confirmed) return
  try {
    await tagApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写标签名称')
    return
  }
  const submitData = {
    ...formData.value,
    siteId: siteId.value,
  }
  try {
    if (isEdit.value) {
      await tagApi.update(formData.value.id, submitData)
      showSuccess('更新成功')
      showDialog.value = false
      // 编辑不影响列表顺序，留在当前页刷新
      reload()
    } else {
      await tagApi.create(submitData)
      showSuccess('新增成功')
      showDialog.value = false
      handleSearch()
    }
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
        新增标签
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="标签名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input v-model="searchSlug" placeholder="别名" class="w-36" @keyup.enter="handleSearch" />
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
            <TableHead>标签名称</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>文章数</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>排序</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="tag in tags" :key="tag.id">
            <TableCell>{{ tag.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Tag class="w-4 h-4 text-primary" />
                <div class="font-medium">{{ tag.title }}</div>
              </div>
            </TableCell>
            <TableCell class="font-mono text-xs text-muted-foreground">
              {{ tag.slug || '-' }}
            </TableCell>
            <TableCell>{{ tag.articleCount }}</TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(tag.status) }}
              </span>
            </TableCell>
            <TableCell>{{ tag.sort }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ tag.createdAt ? formatDateTime(tag.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(tag)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(tag.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="tags.length === 0">
            <TableCell colspan="8" class="text-center text-muted-foreground py-12">
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
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑标签' : '新增标签' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改标签信息' : '添加新标签' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="title">标签名称 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入标签名称" />
          </div>
          <div class="space-y-2">
            <Label for="slug">Slug</Label>
            <Input id="slug" v-model="formData.slug" placeholder="URL标识" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="3"
              placeholder="请输入标签描述"
            />
          </div>
          <div class="space-y-2">
            <CoverInput v-model="formData.cover" />
          </div>
          <div class="space-y-2">
            <Label for="icon">图标</Label>
            <Input id="icon" v-model="formData.icon" placeholder="图标" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序号</Label>
            <Input id="sort" v-model.number="formData.sort" type="number" placeholder="排序号" />
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
