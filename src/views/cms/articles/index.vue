<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDateTime } from '@/lib/utils'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Edit, Trash2, Tags } from '@lucide/vue'
import type { Article } from '@/types'
import { articleApi } from '@/api'
import TagSelector from '@/components/TagSelector.vue'
import CategorySelector from '@/components/CategorySelector.vue'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CategoryTree from '@/components/CategoryTree.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: articleStatusItems, getLabel: getStatusLabel } = useDict('publish_status')
import { useTabStore } from '@/stores/tab'
import { useSiteStore } from '@/stores/site'

const { showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const router = useRouter()
const route = useRoute()
const tabStore = useTabStore()
const siteStore = useSiteStore()

const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const searchKeyword = ref('')
const searchSlug = ref('')
const searchStatus = ref<string>('__all__')
const showTagDialog = ref(false)
const currentArticle = ref<Article | null>(null)
const selectedTagNames = ref<string[]>([])
const selectedCategoryIds = ref<string[]>([])
const selectedCategoryId = ref<string | undefined>(undefined)

const {
  list: articles,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => articleApi.list(query),
  params: () => ({
    title: searchKeyword.value,
    slug: searchSlug.value,
    categoryId: selectedCategoryId.value || '',
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    siteId: siteId.value,
  }),
})

function handleCategorySelect(categoryId: string | undefined) {
  selectedCategoryId.value = categoryId
  handleSearch()
}

function handleReset() {
  searchKeyword.value = ''
  searchSlug.value = ''
  selectedCategoryId.value = undefined
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  router.push({ path: '/articles/editor', query: { siteId: siteId.value } })
  tabStore.addTab({
    label: '新建文章',
    path: `/articles/editor?siteId=${siteId.value}`,
    closable: true,
  })
}

function handleEdit(article: Article) {
  router.push({ path: '/articles/editor', query: { siteId: siteId.value, id: article.id } })
  tabStore.addTab({
    label: `编辑: ${article.title}`,
    path: `/articles/editor?siteId=${siteId.value}&id=${article.id}`,
    closable: true,
  })
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除文章', '确定要删除该文章吗？')
  if (!confirmed) return
  try {
    await articleApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleAssignTag(article: Article) {
  currentArticle.value = article
  showTagDialog.value = true
  selectedTagNames.value = []
  selectedCategoryIds.value = []
  try {
    const [tagsRes, catsRes] = await Promise.all([
      articleApi.listTags(article.id),
      articleApi.listCategories(article.id),
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
  if (!currentArticle.value) return
  try {
    await articleApi.update(currentArticle.value.id, {
      categoryIds: selectedCategoryIds.value,
      tagNames: selectedTagNames.value,
    })
    showSuccess('保存成功')
    showTagDialog.value = false
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
        新增文章
      </Button>
    </div>

    <div class="flex gap-4">
      <!-- 左侧分类树 -->
      <div class="w-64 flex-shrink-0">
        <CategoryTree
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
              placeholder="文章标题"
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
              :dict-items="articleStatusItems"
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
                <TableHead>标题</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>浏览</TableHead>
                <TableHead>评论</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="article in articles" :key="article.id">
                <TableCell>{{ article.id }}</TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <div v-if="article.cover" class="w-10 h-10 rounded bg-muted overflow-hidden">
                      <img :src="article.cover" class="w-full h-full object-cover" />
                    </div>
                    <div class="font-medium">{{ article.title }}</div>
                  </div>
                </TableCell>
                <TableCell class="font-mono text-xs text-muted-foreground">
                  {{ article.slug || '-' }}
                </TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="'bg-secondary text-secondary-foreground'"
                  >
                    {{ getStatusLabel(article.status) }}
                  </span>
                </TableCell>
                <TableCell>{{ article.viewCount }}</TableCell>
                <TableCell>{{ article.commentCount }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ article.createdAt ? formatDateTime(article.createdAt) : '-' }}
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" @click="handleAssignTag(article)">
                      <Tags class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleEdit(article)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDelete(article.id)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="articles.length === 0">
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

    <Dialog v-model:open="showTagDialog">
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>分配标签与分类 - {{ currentArticle?.title }}</DialogTitle>
          <DialogDescription>为文章分配标签和分类</DialogDescription>
        </DialogHeader>

        <div class="mt-4 space-y-4">
          <TagSelector v-model="selectedTagNames" />
          <CategorySelector v-model="selectedCategoryIds" :site-id="siteId" />
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showTagDialog = false">取消</Button>
          <Button @click="handleSaveTags">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
