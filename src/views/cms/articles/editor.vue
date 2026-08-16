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
import { ArrowLeft, Save, Settings } from '@lucide/vue'
import { articleApi } from '@/api'
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

const formData = ref({
  id: '',
  title: '',
  slug: '',
  description: '',
  content: '',
  contentType: '',
  cover: '',
  status: '0',
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
        slug: article.slug || '',
        description: article.description || '',
        content: article.content || '',
        contentType: article.contentType || '',
        cover: article.cover || '',
        status: article.status ?? '0',
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

async function handleSaveTags() {
  if (!formData.value.id) {
    showError('请先保存文章')
    return
  }
  saving.value = true
  try {
    await articleApi.update(formData.value.id, {
      categoryIds: selectedCategoryIds.value,
      tagNames: selectedTagNames.value,
    })
    showSuccess('保存成功')
    showSettingsDialog.value = false
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    saving.value = false
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

function handleBack() {
  const currentTab = tabStore.activeTab
  if (currentTab) {
    tabStore.removeTab(currentTab.id)
  }
  router.push({ path: '/cms/articles', query: { siteId: siteId.value } })
}

onMounted(async () => {
  await fetchArticleStatus()
  if (articleId.value) {
    await fetchArticle(articleId.value)
    fetchRelations(articleId.value)
  }
})
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
        <Button variant="outline" size="sm" @click="showSettingsDialog = true">
          <Settings class="w-4 h-4 mr-1" />
          设置
        </Button>
        <Button size="sm" :disabled="saving" @click="handleSave">
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
            <Label for="slug">Slug</Label>
            <Input id="slug" v-model="formData.slug" placeholder="URL标识" />
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
            <TagSelector v-model="selectedTagNames" />
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
          <Button @click="handleSaveTags" :disabled="saving">
            <Save class="w-4 h-4 mr-1" />
            {{ saving ? '保存中...' : '保存设置' }}
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
