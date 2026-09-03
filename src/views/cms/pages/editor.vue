<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Save, Tags, Plus, Edit, Trash2, FileText } from '@lucide/vue'
import type { Page, PageModel, PageMeta } from '@/types'
import { pageApi, pageModelApi, pageMetaApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDict } from '@/composables/useDict'
import { useTabStore } from '@/stores/tab'
import CoverInput from '@/components/CoverInput.vue'
import DictSelect from '@/components/DictSelect.vue'
import TreeGuides from '@/components/TreeGuides.vue'

const props = defineProps<{
  open: boolean
  pageId?: string
  siteId: string
  parentId?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved', pageId: string, isNew: boolean): void
}>()

const { dict: pageStatusDict, fetchDict: fetchPageStatus } = useDict(() => 'publish_status')

const pageStatusItems = computed(() => pageStatusDict.value?.items || [])

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const router = useRouter()
const tabStore = useTabStore()

// 弹窗内部维护的页面 ID（新建后回填，无需路由跳转）
const internalPageId = ref(props.pageId || '')
const isEdit = computed(() => !!internalPageId.value)

const pageModels = ref<PageModel[]>([])
const showMetaDialog = ref(false)
const showMetaFormDialog = ref(false)
const loading = ref(false)
const saving = ref(false)
const metaSaving = ref(false)
const metaLoading = ref(false)

const defaultForm = () => ({
  id: '',
  title: '',
  slug: '',
  description: '',
  fileId: '',
  cover: '',
  modelId: '__none__',
  parentId: props.parentId || '0',
  pageType: '',
  sort: 0,
  publishAt: '',
  status: '0',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
})

const formData = ref(defaultForm())

/** 用于表单预览的 cover URL （编辑时来自后端回显） */
const coverPreviewUrl = ref('')

const metaList = ref<PageMeta[]>([])
const metaFormData = ref({
  id: '',
  metaKey: '',
  metaValue: '',
})
const isMetaEdit = ref(false)

// 元数据列表单独分页编辑（前端分页，接口返回全量后切片）
const metaCurrentPage = ref(1)
const metaPageSize = ref(10)
const metaTotal = ref(0)
const metaTotalPages = computed(() => Math.max(1, Math.ceil(metaTotal.value / metaPageSize.value)))
const metaHasPrev = computed(() => metaCurrentPage.value > 1)
const metaHasNext = computed(() => metaCurrentPage.value < metaTotalPages.value)
const pagedMetas = computed(() => {
  const start = (metaCurrentPage.value - 1) * metaPageSize.value
  return metaList.value.slice(start, start + metaPageSize.value)
})

function handleMetaPageChange(page: number) {
  metaCurrentPage.value = Math.min(Math.max(1, page), metaTotalPages.value)
}

async function fetchMetas() {
  if (!internalPageId.value) {
    metaList.value = []
    metaTotal.value = 0
    return
  }
  metaLoading.value = true
  try {
    const { data } = await pageMetaApi.list({ pageId: internalPageId.value })
    metaList.value = data.value?.records || []
    metaTotal.value = data.value?.totalRow || 0
    // 当前页越界时回退到最后一页
    if (metaCurrentPage.value > metaTotalPages.value) {
      metaCurrentPage.value = metaTotalPages.value
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    metaLoading.value = false
  }
}

function handleOpenMetaDialog() {
  if (!internalPageId.value) {
    showError('请先保存页面')
    return
  }
  metaCurrentPage.value = 1
  fetchMetas()
  showMetaDialog.value = true
}

function handleAddMeta() {
  isMetaEdit.value = false
  metaFormData.value = {
    id: '',
    metaKey: '',
    metaValue: '',
  }
  showMetaFormDialog.value = true
}

function handleEditMeta(meta: PageMeta) {
  isMetaEdit.value = true
  metaFormData.value = {
    id: meta.id,
    metaKey: meta.metaKey || '',
    metaValue: meta.metaValue || '',
  }
  showMetaFormDialog.value = true
}

async function handleDeleteMeta(id: string) {
  const confirmed = await confirm('删除元数据', '确定要删除该元数据吗？')
  if (!confirmed) return
  try {
    await pageMetaApi.delete(id)
    showSuccess('删除成功')
    // fetchMetas 会自动把越界的当前页回退到最后一页，无需在此手动减页
    await fetchMetas()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSaveMeta() {
  if (!metaFormData.value.metaKey) {
    showError('请填写元数据键')
    return
  }
  if (!internalPageId.value) {
    showError('请先保存页面')
    return
  }
  metaSaving.value = true
  try {
    const submitData = {
      pageId: internalPageId.value,
      metaKey: metaFormData.value.metaKey,
      metaValue: metaFormData.value.metaValue,
    }
    if (isMetaEdit.value) {
      await pageMetaApi.update(metaFormData.value.id, submitData)
    } else {
      await pageMetaApi.create(submitData)
    }
    showSuccess(isMetaEdit.value ? '更新成功' : '新增成功')
    showMetaFormDialog.value = false
    fetchMetas()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    metaSaving.value = false
  }
}

async function fetchPage(id: string) {
  loading.value = true
  try {
    const { data } = await pageApi.getById(id)
    if (data.value) {
      const page = data.value
      formData.value = {
        id: page.id,
        title: page.title,
        slug: page.slug || '',
        description: page.description || '',
        fileId: page.fileId || '',
        cover: page.cover || '',
        modelId: page.modelId || '__none__',
        parentId: page.parentId || '0',
        pageType: page.pageType || '',
        sort: page.sort ?? 0,
        publishAt: page.publishAt ?? '',
        status: page.status ?? '0',
        seoTitle: page.seoTitle || '',
        seoKeywords: page.seoKeywords || '',
        seoDescription: page.seoDescription || '',
      }
      coverPreviewUrl.value = page.cover || ''
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
}

async function fetchPageModels() {
  try {
    const { data } = await pageModelApi.list({
      pageNumber: 1,
      pageSize: 100,
      siteId: props.siteId,
      enabled: true,
    })
    if (data.value) {
      // 过滤掉 DELETED(5) 与 PENDING_DELETE(4)，其余状态（PENDING_ADD/ADDED/PENDING_MODIFY/MODIFIED）均可被页面引用
      const EXCLUDE = new Set([4, 5])
      pageModels.value = (data.value.records || []).filter((m) => !EXCLUDE.has(Number(m.status)))
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

// 父级页面下拉：取整棵页面树扁平化，排除当前节点及其子树以避免成环
const allPages = ref<Page[]>([])
function renderPageOptions(pagesList: Page[], level = 0): Page[] {
  const result: Page[] = []
  for (const p of pagesList) {
    if (p.id && p.id !== internalPageId.value) {
      result.push({ ...p, indent: level } as Page)
      if (p.children?.length) {
        result.push(...renderPageOptions(p.children, level + 1))
      }
    }
  }
  return result
}
const flatPages = computed(() => renderPageOptions(allPages.value))

async function fetchAllPages() {
  try {
    const { data } = await pageApi.tree(props.siteId)
    if (data.value) {
      allPages.value = data.value
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

// 弹窗打开时按 pageId 初始化（新建或编辑）
watch(
  () => props.open,
  (open) => {
    if (!open) return
    internalPageId.value = props.pageId || ''
    formData.value = defaultForm()
    Promise.all([fetchPageModels(), fetchPageStatus(), fetchAllPages()])
    if (internalPageId.value) {
      fetchPage(internalPageId.value)
    }
  },
)

function closeDialog() {
  emit('update:open', false)
}

function handleCoverUploaded(payload: { fileId: string; fileUrl: string }) {
  coverPreviewUrl.value = payload.fileUrl
}

async function handleSave() {
  if (!formData.value.title) {
    showError('请填写页面标题')
    return
  }
  if (!props.siteId) {
    showError('请先选择站点')
    return
  }
  saving.value = true
  const wasNew = !isEdit.value
  const pageSubmitData = {
    id: formData.value.id,
    title: formData.value.title,
    slug: formData.value.slug,
    description: formData.value.description,
    fileId: formData.value.fileId,
    modelId: formData.value.modelId === '__none__' ? '' : formData.value.modelId,
    parentId: formData.value.parentId,
    pageType: formData.value.pageType,
    sort: formData.value.sort,
    publishAt: formData.value.publishAt,
    status: formData.value.status,
    siteId: props.siteId,
    seoTitle: formData.value.seoTitle,
    seoKeywords: formData.value.seoKeywords,
    seoDescription: formData.value.seoDescription,
  }
  try {
    if (isEdit.value) {
      await pageApi.update(pageSubmitData.id, pageSubmitData)
      showSuccess('更新成功')
    } else {
      // 后端 create 返回 R<Page>（含生成的 id），直接使用，避免按标题回查的歧义
      const { data: createdData } = await pageApi.create(pageSubmitData)
      if (createdData.value?.id) {
        internalPageId.value = createdData.value.id
        formData.value.id = createdData.value.id
      }
      showSuccess('新增成功')
    }
    // 刷新父级页面下拉选项（含本次保存的页面）
    fetchAllPages()
    // 通知父组件刷新列表和页面树
    emit('saved', internalPageId.value, wasNew)
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    saving.value = false
  }
}

function handleEditContent() {
  if (!internalPageId.value) return
  // 关闭弹窗后跳转到内容编辑页（独立路由，承载 md-editor）
  closeDialog()
  router.push({ path: '/pages/content', query: { siteId: props.siteId, id: internalPageId.value } })
  tabStore.addTab({
    label: `内容：${formData.value.title || '页面'}`,
    path: `/pages/content?siteId=${props.siteId}&id=${internalPageId.value}`,
    closable: true,
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden p-0">
      <DialogHeader class="px-6 py-4 border-b flex-shrink-0">
        <DialogTitle>{{ isEdit ? '编辑页面' : '新建页面' }}</DialogTitle>
        <DialogDescription>{{
          isEdit ? '修改页面元信息及 SEO 配置' : '添加新页面'
        }}</DialogDescription>
      </DialogHeader>

      <div
        v-if="loading"
        class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
      >
        <div
          class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
        ></div>
        加载中...
      </div>
      <div v-else class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="parentId">父级页面</Label>
              <Select v-model="formData.parentId">
                <SelectTrigger>
                  <SelectValue placeholder="选择父级页面" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <div class="flex items-center min-w-0">
                      <FileText class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span class="ml-1.5 truncate">无（顶级页面）</span>
                    </div>
                  </SelectItem>
                  <SelectItem v-for="page in flatPages" :key="page.id" :value="page.id">
                    <div class="flex items-center min-w-0">
                      <TreeGuides :level="(page as any).indent" />
                      <FileText class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5" />
                      <span class="ml-1.5 truncate">{{ page.title }}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="pageType">页面类型</Label>
              <DictSelect
                id="pageType"
                v-model="formData.pageType"
                dict-type="page_type"
                placeholder="选择页面类型"
              />
            </div>
            <div class="space-y-2">
              <Label for="modelId">页面模型</Label>
              <Select v-model="formData.modelId">
                <SelectTrigger>
                  <SelectValue placeholder="选择页面模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  <SelectItem v-for="model in pageModels" :key="model.id" :value="model.id">
                    {{ model.modelName || model.modelCode }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="sort">排序号</Label>
              <Input id="sort" v-model.number="formData.sort" type="number" placeholder="排序号" />
            </div>

            <div class="space-y-2">
              <Label for="title">页面标题 <span class="text-destructive">*</span></Label>
              <Input
                id="title"
                v-model="formData.title"
                placeholder="请输入页面标题"
                class="text-base font-medium"
              />
            </div>
            <div class="space-y-2">
              <Label for="slug">Slug</Label>
              <Input id="slug" v-model="formData.slug" placeholder="URL标识" />
            </div>
            <div class="space-y-2">
              <Label for="publishAt">发布时间</Label>
              <DateTimePicker
                id="publishAt"
                v-model="formData.publishAt"
                placeholder="请选择发布时间"
              />
            </div>
            <div class="space-y-2">
              <Label for="status">状态</Label>
              <DictSelect v-model="formData.status" :dict-items="pageStatusItems" />
            </div>
            <div class="space-y-2 col-span-2">
              <CoverInput
                v-model="formData.cover"
                :cover-url="coverPreviewUrl"
                @uploaded="handleCoverUploaded"
              />
            </div>
            <div class="space-y-2 col-span-2">
              <Label for="description">摘要</Label>
              <Textarea
                id="description"
                v-model="formData.description"
                rows="3"
                placeholder="请输入页面摘要"
              />
            </div>
          </div>
        </div>

        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="text-sm font-medium text-muted-foreground mb-3">SEO</div>
          <div class="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      <DialogFooter class="px-6 py-3 border-t flex-shrink-0 flex-row items-center justify-between">
        <Button variant="outline" :disabled="!isEdit" @click="handleEditContent">
          <FileText class="w-4 h-4 mr-1" />
          编辑内容
        </Button>
        <div class="flex items-center gap-2">
          <Button variant="outline" :disabled="!isEdit" @click="handleOpenMetaDialog">
            <Tags class="w-4 h-4 mr-1" />
            元数据
          </Button>
          <Button variant="outline" @click="closeDialog">取消</Button>
          <Button :disabled="saving" @click="handleSave">
            <Save class="w-4 h-4 mr-1" />
            {{ saving ? '保存中...' : '保存' }}
          </Button>
        </div>
      </DialogFooter>

      <Dialog v-model:open="showMetaDialog">
        <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>元数据管理</DialogTitle>
            <DialogDescription>单独管理页面的自定义元数据（分页浏览）</DialogDescription>
          </DialogHeader>

          <div class="py-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">共 {{ metaTotal }} 条</span>
              <Button size="sm" @click="handleAddMeta">
                <Plus class="w-3.5 h-3.5 mr-1" />
                添加元数据
              </Button>
            </div>

            <div v-if="metaLoading" class="flex items-center justify-center py-8">
              <div
                class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
              ></div>
            </div>
            <div
              v-else-if="metaList.length === 0"
              class="text-center text-muted-foreground py-8 text-sm"
            >
              暂无元数据，点击「添加元数据」创建
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="meta in pagedMetas"
                :key="meta.id"
                class="flex items-center gap-3 p-2 rounded border hover:bg-muted/50 transition-colors"
              >
                <span class="font-mono text-sm font-medium min-w-0 flex-shrink-0">{{
                  meta.metaKey
                }}</span>
                <span class="text-muted-foreground">:</span>
                <span class="flex-1 text-sm truncate">{{ meta.metaValue || '-' }}</span>
                <div class="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="h-7 w-7 hover:text-primary"
                    @click="handleEditMeta(meta)"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="h-7 w-7 text-red-500 hover:text-red-600"
                    @click="handleDeleteMeta(meta.id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div v-if="metaList.length > 0" class="flex items-center justify-between py-4">
              <span class="text-sm text-muted-foreground">
                显示 {{ (metaCurrentPage - 1) * metaPageSize + 1 }} -
                {{ Math.min(metaCurrentPage * metaPageSize, metaTotal) }} 条，共 {{ metaTotal }} 条
              </span>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="!metaHasPrev"
                  @click="handleMetaPageChange(metaCurrentPage - 1)"
                >
                  上一页
                </Button>
                <span class="px-4 text-sm">第 {{ metaCurrentPage }} 页</span>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="!metaHasNext"
                  @click="handleMetaPageChange(metaCurrentPage + 1)"
                >
                  下一页
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" @click="showMetaDialog = false">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="showMetaFormDialog">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ isMetaEdit ? '编辑元数据' : '新增元数据' }}</DialogTitle>
            <DialogDescription>{{
              isMetaEdit ? '修改元数据键值' : '添加新的元数据'
            }}</DialogDescription>
          </DialogHeader>

          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="metaKey">键 (Key)</Label>
              <Input id="metaKey" v-model="metaFormData.metaKey" placeholder="如：og_title" />
            </div>
            <div class="space-y-2">
              <Label for="metaValue">值 (Value)</Label>
              <Textarea
                id="metaValue"
                v-model="metaFormData.metaValue"
                rows="3"
                placeholder="请输入元数据值"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" @click="showMetaFormDialog = false">取消</Button>
            <Button @click="handleSaveMeta" :disabled="metaSaving">
              {{ metaSaving ? '保存中...' : isMetaEdit ? '保存' : '创建' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </DialogContent>
  </Dialog>
</template>
