<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
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
import { Plus, Edit, Trash2, Image } from '@lucide/vue'
import type { Carousel } from '@/types'
import { carouselApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useSiteStore } from '@/stores/site'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import CoverInput from '@/components/CoverInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const siteStore = useSiteStore()

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const route = useRoute()
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const searchKeyword = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const {
  list: carousels,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadCarousels,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => carouselApi.list(query),
  params: () => ({
    title: searchKeyword.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    siteId: siteId.value,
  }),
})

const formData = ref({
  id: '',
  title: '',
  fileId: '',
  cover: '',
  description: '',
  linkUrl: '',
  sort: 0,
  status: '0',
})

/** 用于表单预览的 cover URL （编辑时来自后端回显） */
const coverPreviewUrl = ref('')

function handleReset() {
  searchKeyword.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    title: '',
    fileId: '',
    cover: '',
    description: '',
    linkUrl: '',
    sort: 0,
    status: '0',
  }
  coverPreviewUrl.value = ''
  showDialog.value = true
}

function handleEdit(carousel: Carousel) {
  isEdit.value = true
  formData.value = {
    id: carousel.id,
    title: carousel.title,
    fileId: carousel.fileId || '',
    cover: carousel.cover || '',
    description: carousel.description || '',
    linkUrl: carousel.linkUrl || '',
    sort: carousel.sort || 0,
    status: String(carousel.status),
  }
  coverPreviewUrl.value = carousel.cover || ''
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除轮播图', '确定要删除该轮播图吗？')
  if (!confirmed) return
  try {
    await carouselApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写轮播图标题')
    return
  }
  const submitData = {
    ...formData.value,
    siteId: siteId.value,
    cover: undefined as string | undefined,
  }
  try {
    if (isEdit.value) {
      await carouselApi.update(formData.value.id, submitData)
    } else {
      await carouselApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadCarousels()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleCoverUploaded(payload: { fileId: string; fileUrl: string }) {
  coverPreviewUrl.value = payload.fileUrl
}

</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增轮播图
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="轮播图标题"
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
            <TableHead>封面</TableHead>
            <TableHead>标题</TableHead>
            <TableHead>链接</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>排序</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="carousel in carousels" :key="carousel.id">
            <TableCell>{{ carousel.id }}</TableCell>
            <TableCell>
              <img
                v-if="carousel.cover"
                :src="carousel.cover"
                class="w-12 h-12 object-cover rounded"
                alt="封面"
              />
              <div v-else class="w-12 h-12 flex items-center justify-center bg-muted rounded">
                <Image class="w-6 h-6 text-muted-foreground" />
              </div>
            </TableCell>
            <TableCell>
              <div class="font-medium">{{ carousel.title }}</div>
              <div
                v-if="carousel.description"
                class="text-xs text-muted-foreground truncate max-w-xs"
              >
                {{ carousel.description }}
              </div>
            </TableCell>
            <TableCell class="text-xs">
              <a
                v-if="carousel.linkUrl"
                :href="carousel.linkUrl"
                target="_blank"
                class="text-primary hover:underline truncate max-w-xs"
              >
                {{ carousel.linkUrl }}
              </a>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(carousel.status) }}
              </span>
            </TableCell>
            <TableCell>{{ carousel.sort }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(carousel)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(carousel.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="carousels.length === 0">
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
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑轮播图' : '新增轮播图' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改轮播图信息' : '添加新轮播图' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="title">轮播图标题 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入轮播图标题" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <CoverInput
              v-model="formData.fileId"
              :cover-url="coverPreviewUrl"
              @uploaded="handleCoverUploaded"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="3"
              placeholder="请输入轮播图描述"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="linkUrl">链接地址</Label>
            <Input id="linkUrl" v-model="formData.linkUrl" placeholder="点击轮播图跳转的链接" />
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
