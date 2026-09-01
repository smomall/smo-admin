<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from '@lucide/vue'
import { articleApi, categoryApi } from '@/api'
import type { Category } from '@/types'
import TagSelector from '@/components/TagSelector.vue'
import CategorySelector from '@/components/CategorySelector.vue'
import { useDict } from '@/composables/useDict'
import { useTabStore } from '@/stores/tab'
import { useSiteStore } from '@/stores/site'
import CoverInput from '@/components/CoverInput.vue'
import DictSelect from '@/components/DictSelect.vue'

const { dict: articleStatusDict, fetchDict: fetchArticleStatus } = useDict(() => 'publish_status')

const articleStatusItems = computed(() => articleStatusDict.value?.items || [])

import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const { showError, showSuccess } = useMessageDialog()

const route = useRoute()
const router = useRouter()
const tabStore = useTabStore()
const siteStore = useSiteStore()

const articleId = computed(() => route.query.id as string | undefined)
const isEdit = computed(() => !!articleId.value)

const selectedTagNames = ref<string[]>([])
const selectedCategoryIds = ref<string[]>([])
const showSettingsDialog = ref(false)
const loading = ref(false)
const saving = ref(false)

const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const categoryTree = ref<Category[]>([])

const flatCategoryOptions = computed(() => {
  const result: (Category & { indent: number })[] = []
  function flatten(list: Category[], level: number) {
    for (const cat of list) {
      result.push({ ...cat, indent: level })
      if (cat.children?.length) {
        flatten(cat.children, level + 1)
      }
    }
  }
  flatten(categoryTree.value, 0)
  return result
})

async function fetchCategoryTree() {
  try {
    const { data } = await categoryApi.tree(siteId.value)
    if (data.value) {
      categoryTree.value = data.value
    }
  } catch {
    // useRequest 已统一处理
  }
}

onMounted(async () => {
  await fetchArticleStatus()
  if (articleId.value) {
    await fetchArticle(articleId.value)
    fetchRelations(articleId.value)
  }
})

const formData = ref({
  id: '',
  title: '',
  categoryId: '__none__',
  description: '',
  content: '',
  contentType: '',
  cover: '',
  status: '0',
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  collectCount: 0,
  wordCount: 0,
  rating: 0,
  heatScore: 0,
  allowComment: true,
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
})

async function fetchArticle(id: string) {
  loading.value = true
  try {
    const { data } = await articleApi.getById(id)
    if (data.value) {
      const article = data.value
      formData.value = {
        id: article.id,
        title: article.title,
        categoryId: article.categoryId || '__none__',
        description: article.description || '',
        content: article.content || '',
        contentType: article.contentType || '',
        cover: article.cover || '',
        status: article.status ?? '0',
        viewCount: article.viewCount ?? 0,
        likeCount: article.likeCount ?? 0,
        commentCount: article.commentCount ?? 0,
        collectCount: article.collectCount ?? 0,
        wordCount: article.wordCount ?? 0,
        rating: article.rating ?? 0,
        heatScore: article.heatScore ?? 0,
        allowComment: article.allowComment ?? true,
        seoTitle: article.seoTitle || '',
        seoKeywords: article.seoKeywords || '',
        seoDescription: article.seoDescription || '',
      }
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
}

async function fetchRelations(id: string) {
  try {
    const [tagsRes, catsRes] = await Promise.all([
      articleApi.listTags(id),
      articleApi.listCategories(id),
    ])
    if (tagsRes.data.value) {
      selectedTagNames.value = tagsRes.data.value.map((t) => t.title)
    }
    if (catsRes.data.value) {
      selectedCategoryIds.value = catsRes.data.value.map((c) => c.id)
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSave() {
  if (!formData.value.title) {
    showError('请填写文章标题')
    return
  }
  saving.value = true
  const submitData = {
    ...formData.value,
    categoryId: formData.value.categoryId === '__none__' ? '' : formData.value.categoryId,
    siteId: siteId.value,
    categoryIds: selectedCategoryIds.value,
    tagNames: selectedTagNames.value,
  }
  try {
    if (isEdit.value) {
      await articleApi.update(formData.value.id, submitData)
    } else {
      await articleApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showSettingsDialog.value = false
    if (!isEdit.value && submitData.title) {
      const { data: listData } = await articleApi.list({
        pageNumber: 1,
        pageSize: 1,
        title: submitData.title,
      })
      if (listData.value?.records?.length) {
        const newId = listData.value.records[0]?.id
        if (newId) {
          router.replace({ path: '/articles/editor', query: { siteId: siteId.value, id: newId } })
          formData.value.id = newId
        }
      }
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    saving.value = false
  }
}

function handleOpenSaveDialog() {
  if (!formData.value.title) {
    showError('请填写文章标题')
    return
  }
  showSettingsDialog.value = true
  fetchCategoryTree()
}

function handleBack() {
  const currentTab = tabStore.activeTab
  if (currentTab) {
    tabStore.removeTab(currentTab.id)
  }
  router.push({ path: '/cms/articles', query: { siteId: siteId.value } })
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-100px)] animate-page-enter">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between px-4 py-3 border-b shrink-0">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" @click="handleBack">
          <ArrowLeft class="w-4 h-4 mr-1" />
          返回
        </Button>
        <span class="text-sm text-muted-foreground">
          {{ isEdit ? '编辑文章' : '新建文章' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" :disabled="saving" @click="handleOpenSaveDialog">
          <Save class="w-4 h-4 mr-1" />
          {{ saving ? '保存中...' : '保存' }}
        </Button>
      </div>
    </div>

    <!-- 标题输入 -->
    <div class="px-4 pt-4 shrink-0">
      <Input
        v-model="formData.title"
        placeholder="请输入文章标题"
        class="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
      />
    </div>

    <!-- Markdown 编辑器 -->
    <div class="flex-1 px-4 py-3 min-h-0 md-editor-wrapper">
      <MdEditor v-model="formData.content" preview-theme="github" auto-focus class="h-full" />
    </div>

    <!-- 设置弹窗 -->
    <Dialog v-model:open="showSettingsDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>文章设置</DialogTitle>
          <DialogDescription>配置文章的附加信息</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="categoryId">所属分类</Label>
            <Select id="categoryId" v-model="formData.categoryId">
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span class="text-muted-foreground">不选择</span>
                </SelectItem>
                <SelectItem v-for="cat in flatCategoryOptions" :key="cat.id" :value="cat.id">
                  <span :style="{ paddingLeft: cat.indent * 16 + 'px' }">
                    {{ cat.title }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="contentType">内容类型</Label>
            <DictSelect
              id="contentType"
              v-model="formData.contentType"
              dict-type="content_type"
              placeholder="选择内容类型"
            />
          </div>
          <div class="col-span-2">
            <CategorySelector v-model="selectedCategoryIds" :site-id="siteId" />
          </div>
          <div class="col-span-2">
            <TagSelector v-model="selectedTagNames" :site-id="siteId" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">摘要</Label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="3"
              placeholder="请输入文章摘要"
            />
          </div>
          <div class="space-y-2">
            <CoverInput v-model="formData.cover" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="articleStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>统计数据</Label>
            <div class="grid grid-cols-4 gap-3">
              <div class="space-y-1">
                <Label for="viewCount" class="text-xs text-muted-foreground">浏览量</Label>
                <Input
                  id="viewCount"
                  v-model="formData.viewCount"
                  type="number"
                  class="h-8"
                  placeholder="浏览量"
                />
              </div>
              <div class="space-y-1">
                <Label for="likeCount" class="text-xs text-muted-foreground">点赞数</Label>
                <Input
                  id="likeCount"
                  v-model="formData.likeCount"
                  type="number"
                  class="h-8"
                  placeholder="点赞数"
                />
              </div>
              <div class="space-y-1">
                <Label for="commentCount" class="text-xs text-muted-foreground">评论数</Label>
                <Input
                  id="commentCount"
                  v-model="formData.commentCount"
                  type="number"
                  class="h-8"
                  placeholder="评论数"
                />
              </div>
              <div class="space-y-1">
                <Label for="collectCount" class="text-xs text-muted-foreground">收藏数</Label>
                <Input
                  id="collectCount"
                  v-model="formData.collectCount"
                  type="number"
                  class="h-8"
                  placeholder="收藏数"
                />
              </div>
              <div class="space-y-1">
                <Label for="wordCount" class="text-xs text-muted-foreground">字数</Label>
                <Input
                  id="wordCount"
                  v-model="formData.wordCount"
                  type="number"
                  class="h-8"
                  placeholder="字数"
                />
              </div>
              <div class="space-y-1">
                <Label for="rating" class="text-xs text-muted-foreground">评分</Label>
                <Input
                  id="rating"
                  v-model="formData.rating"
                  type="number"
                  step="0.1"
                  class="h-8"
                  placeholder="评分"
                />
              </div>
              <div class="space-y-1">
                <Label for="heatScore" class="text-xs text-muted-foreground">热度</Label>
                <Input
                  id="heatScore"
                  v-model="formData.heatScore"
                  type="number"
                  class="h-8"
                  placeholder="热度"
                />
              </div>
            </div>
          </div>
          <div class="space-y-2 col-span-2">
            <Label>选项</Label>
            <div class="flex items-center gap-6 h-9">
              <div class="flex items-center gap-2">
                <Switch id="allowComment" v-model="formData.allowComment" />
                <Label for="allowComment">允许评论</Label>
              </div>
            </div>
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
          <Button variant="outline" @click="showSettingsDialog = false">取消</Button>
          <Button @click="handleSave" :disabled="saving">
            <Save class="w-4 h-4 mr-1" />
            {{ saving ? '保存中...' : '保存文章' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style>
.md-editor-wrapper {
  min-height: 0;
}
.md-editor-wrapper .md-editor {
  height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
