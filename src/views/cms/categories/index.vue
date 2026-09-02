<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Folder } from '@lucide/vue'
import type { Category } from '@/types'
import { categoryApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useSiteStore } from '@/stores/site'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import CoverInput from '@/components/CoverInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CategoryTree from '@/components/CategoryTree.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const siteStore = useSiteStore()

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')

const route = useRoute()
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const allCategories = ref<Category[]>([])
const searchKeyword = ref('')
const searchSlug = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)
const selectedCategoryId = ref<string | undefined>(undefined)
const categoryTreeRef = ref<InstanceType<typeof CategoryTree> | null>(null)

const {
  list: categories,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadCategories,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => categoryApi.list(query),
  params: () => ({
    title: searchKeyword.value,
    slug: searchSlug.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    siteId: siteId.value,
    parentId: selectedCategoryId.value || '',
  }),
})

const formData = ref({
  id: '',
  title: '',
  slug: '',
  description: '',
  fileId: '',
  cover: '',
  icon: '',
  parentId: '0',
  status: '0',
  sort: 0,
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
})

/** 用于表单预览的 cover URL （编辑时来自后端回显） */
const coverPreviewUrl = ref('')

function renderCategoryOptions(categoriesList: Category[], level = 0): Category[] {
  const result: Category[] = []
  for (const cat of categoriesList) {
    if (cat.id && cat.id !== formData.value.id) {
      result.push({ ...cat, indent: level })
      if (cat.children?.length) {
        result.push(...renderCategoryOptions(cat.children, level + 1))
      }
    }
  }
  return result
}

const flatCategories = computed(() => renderCategoryOptions(allCategories.value))

// 获取完整分类树（用于父分类下拉选项，确保层级关系正确）
async function fetchAllCategories() {
  try {
    const { data } = await categoryApi.tree(siteId.value)
    if (data.value) {
      allCategories.value = data.value
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleCategorySelect(categoryId: string | undefined) {
  selectedCategoryId.value = categoryId
  handleSearch()
}

onMounted(fetchAllCategories)

function handleReset() {
  searchKeyword.value = ''
  searchSlug.value = ''
  selectedCategoryId.value = undefined
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
    fileId: '',
    cover: '',
    icon: '',
    parentId: '0',
    status: '0',
    sort: 0,
    seoTitle: '',
    seoKeywords: '',
    seoDescription: '',
  }
  coverPreviewUrl.value = ''
  showDialog.value = true
}

function handleEdit(category: Category) {
  isEdit.value = true
  formData.value = {
    id: category.id,
    title: category.title,
    slug: category.slug || '',
    description: category.description || '',
    fileId: category.fileId || '',
    cover: category.cover || '',
    icon: category.icon || '',
    parentId: category.parentId || '0',
    status: category.status ?? '0',
    sort: category.sort || 0,
    seoTitle: category.seoTitle || '',
    seoKeywords: category.seoKeywords || '',
    seoDescription: category.seoDescription || '',
  }
  coverPreviewUrl.value = category.cover || ''
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除分类', '确定要删除该分类吗？')
  if (!confirmed) return
  try {
    await categoryApi.delete(id)
    showSuccess('删除成功')
    // 若删除的是当前选中的分类，清除选中状态避免用不存在的 parentId 筛选
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = undefined
    }
    reloadAfterRemove()
    // 刷新左侧分类树（保留展开状态）
    categoryTreeRef.value?.fetchCategories()
    // 刷新父分类下拉选项（完整树数据）
    fetchAllCategories()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写分类名称')
    return
  }
  const submitData = {
    ...formData.value,
    siteId: siteId.value,
    parentId: formData.value.parentId,
    cover: undefined as string | undefined,
  }
  try {
    if (isEdit.value) {
      await categoryApi.update(formData.value.id, submitData)
    } else {
      await categoryApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadCategories()
    else handleSearch()
    // 刷新左侧分类树（保留展开状态）
    categoryTreeRef.value?.fetchCategories()
    // 刷新父分类下拉选项（完整树数据）
    fetchAllCategories()
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
        新增分类
      </Button>
    </div>

    <div class="flex gap-4">
      <!-- 左侧分类树 -->
      <div class="w-64 flex-shrink-0">
        <CategoryTree
          ref="categoryTreeRef"
          :site-id="siteId"
          v-model="selectedCategoryId"
          @update:model-value="handleCategorySelect"
        />
      </div>

      <!-- 右侧内容 -->
      <div class="flex-1 space-y-4">
        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchKeyword"
              placeholder="分类名称"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchSlug"
              placeholder="别名"
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
                <TableHead>分类名称</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>文章数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="category in categories" :key="category.id">
                <TableCell>{{ category.id }}</TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Folder class="w-4 h-4 text-primary" />
                    <div class="font-medium">{{ category.title }}</div>
                  </div>
                </TableCell>
                <TableCell class="font-mono text-xs text-muted-foreground">
                  {{ category.slug || '-' }}
                </TableCell>
                <TableCell>{{ category.articleCount }}</TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="'bg-secondary text-secondary-foreground'"
                  >
                    {{ getStatusLabel(category.status) }}
                  </span>
                </TableCell>
                <TableCell>{{ category.sort }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ category.createdAt ? formatDateTime(category.createdAt) : '-' }}
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" @click="handleEdit(category)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDelete(category.id)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="categories.length === 0">
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
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑分类' : '新增分类' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改分类信息' : '添加新分类' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">

          <div class="space-y-2">
            <Label for="parentId">父分类</Label>
            <Select v-model="formData.parentId">
              <SelectTrigger>
                <SelectValue placeholder="选择父分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  <div class="flex items-center min-w-0">
                    <Folder class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span class="ml-1.5 truncate">无（顶级分类）</span>
                  </div>
                </SelectItem>
                <SelectItem v-for="cat in flatCategories" :key="cat.id" :value="cat.id">
                  <div class="flex items-center min-w-0">
                    <TreeGuides :level="(cat as any).indent" />
                    <Folder class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5" />
                    <span class="ml-1.5 truncate">{{ cat.title }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2">
            <Label for="title">分类名称 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入分类名称" />
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
              placeholder="请输入分类描述"
            />
          </div>
          <div class="space-y-2">
            <CoverInput
              v-model="formData.fileId"
              :cover-url="coverPreviewUrl"
              @uploaded="handleCoverUploaded"
            />
          </div>
          <div class="space-y-2">
            <Label for="icon">图标</Label>
            <Input id="icon" v-model="formData.icon" placeholder="图标" />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序号</Label>
            <Input id="sort" v-model.number="formData.sort" type="number" placeholder="排序号" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="seoTitle">SEO标题</Label>
            <Input id="seoTitle" v-model="formData.seoTitle" placeholder="SEO标题" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="seoKeywords">SEO关键词</Label>
            <Input id="seoKeywords" v-model="formData.seoKeywords" placeholder="SEO关键词" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="seoDescription">SEO描述</Label>
            <Input id="seoDescription" v-model="formData.seoDescription" placeholder="SEO描述" />
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
