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
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
} from '@lucide/vue'
import type { Comment } from '@/types'
import { commentApi } from '@/api'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useDict } from '@/composables/useDict'
import { useSiteStore } from '@/stores/site'
import DictSelect from '@/components/DictSelect.vue'
import OssUploader from '@/components/OssUploader.vue'
import type { OssFile } from '@/types'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const siteStore = useSiteStore()

const {
  items: commentStatusItems,
  fetchDict: fetchCommentStatus,
  getLabel: getStatusLabel,
} = useDict('comment_status')
const { items: commentBizTypeItems, fetchDict: fetchCommentBizType } = useDict('comment_biz_type')

const route = useRoute()
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const subComments = ref<Comment[]>([])
const searchKeyword = ref('')
const searchBizId = ref('')
const searchBizType = ref('')
const searchStatus = ref<string>('__all__')
const searchSort = ref('__all__')
const showDialog = ref(false)
const isEdit = ref(false)
const expandedCommentId = ref<string | null>(null)
const showImageUploadDialog = ref(false)
const subCurrentPage = ref(1)
const subPageSize = ref(10)
const subTotal = ref(0)

const {
  list: comments,
  loading,
  currentPage,
  pageSize,
  total,
  isEmpty,
  goto,
  search: handleSearch,
  reload: reloadComments,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => commentApi.list(query),
  params: () => ({
    siteId: siteId.value,
    bizId: searchBizId.value,
    bizType: searchBizType.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    sort: searchSort.value === '__all__' ? '' : searchSort.value,
  }),
})

const formData = ref({
  id: '',
  siteId: '',
  bizId: '',
  bizType: '',
  rootId: '',
  parentId: '',
  userId: '',
  replyUserId: '',
  nickname: '',
  avatar: '',
  content: '',
  images: [] as string[],
  ipAddress: '',
  ipLocation: '',
  isTop: false,
  status: '0',
})

async function fetchSubComments(rootId: string, pageNumber = 1) {
  subCurrentPage.value = pageNumber
  try {
    const { data } = await commentApi.subList({
      pageNumber,
      pageSize: subPageSize.value,
      rootId,
      status: searchStatus.value === '__all__' ? '' : searchStatus.value,
      sort: searchSort.value === '__all__' ? '' : searchSort.value,
    })
    if (data.value) {
      subComments.value = data.value.records
      subTotal.value = data.value.totalRow
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function toggleComment(comment: Comment) {
  if (expandedCommentId.value === comment.id) {
    expandedCommentId.value = null
    subComments.value = []
  } else {
    expandedCommentId.value = comment.id
    fetchSubComments(comment.id, 1)
  }
}

onMounted(() => {
  Promise.all([fetchCommentStatus(), fetchCommentBizType()])
})

function handleReset() {
  searchKeyword.value = ''
  searchBizId.value = ''
  searchBizType.value = ''
  searchStatus.value = '__all__'
  searchSort.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    siteId: '',
    bizId: '',
    bizType: '',
    rootId: '',
    parentId: '',
    userId: '',
    replyUserId: '',
    nickname: '',
    avatar: '',
    content: '',
    images: [],
    ipAddress: '',
    ipLocation: '',
    isTop: false,
    status: '0',
  }
  showDialog.value = true
}

function handleImageUploadSuccess(file: OssFile) {
  if (file.fileUrl) {
    formData.value.images.push(file.fileUrl)
  }
}

function removeImage(index: number) {
  formData.value.images.splice(index, 1)
}

function handleEdit(comment: Comment) {
  isEdit.value = true
  formData.value = {
    id: comment.id,
    siteId: comment.siteId || '',
    bizId: comment.bizId || '',
    bizType: String(comment.bizType || ''),
    rootId: comment.rootId || '',
    parentId: comment.parentId || '',
    userId: comment.userId || '',
    replyUserId: comment.replyUserId || '',
    nickname: comment.nickname || '',
    avatar: comment.avatar || '',
    content: comment.content,
    images: comment.images || [],
    ipAddress: comment.ipAddress || '',
    ipLocation: comment.ipLocation || '',
    isTop: comment.isTop || false,
    status: String(comment.status),
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除评论', '确定要删除该评论吗？')
  if (!confirmed) return
  try {
    await commentApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.content) {
    showError('请填写评论内容')
    return
  }
  const submitData = {
    ...formData.value,
    siteId: siteId.value,
  }
  try {
    if (isEdit.value) {
      await commentApi.update(formData.value.id, submitData)
    } else {
      await commentApi.create(submitData)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadComments()
    else handleSearch()
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
        新增评论
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchKeyword"
          placeholder="评论内容"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchBizId"
          placeholder="业务ID"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <DictSelect
          v-model="searchBizType"
          :dict-items="commentBizTypeItems"
          placeholder="业务类型"
          class="w-32"
        />
        <DictSelect
          v-model="searchSort"
          dict-type="comment_sort"
          placeholder="排序方式"
          class="w-32"
        />
        <DictSelect
          v-model="searchStatus"
          :dict-items="commentStatusItems"
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
            <TableHead>评论者</TableHead>
            <TableHead>内容</TableHead>
            <TableHead>置顶</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>点赞数</TableHead>
            <TableHead>回复数</TableHead>
            <TableHead>IP地址</TableHead>
            <TableHead>IP位置</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="comment in comments" :key="comment.id">
            <TableRow>
              <TableCell class="w-12">{{ comment.id }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="toggleComment(comment)"
                    class="w-6 h-6"
                  >
                    <ChevronDown v-if="expandedCommentId === comment.id" class="w-4 h-4" />
                    <ChevronRight v-else class="w-4 h-4" />
                  </Button>
                  <div
                    v-if="comment.avatar || comment.user?.avatar"
                    class="w-8 h-8 rounded-full overflow-hidden"
                  >
                    <img
                      :src="comment.avatar || comment.user?.avatar"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <MessageSquare v-else class="w-4 h-4 text-muted-foreground" />
                  <div>{{ comment.nickname || comment.user?.nickname || '匿名' }}</div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div class="max-w-xs truncate">{{ comment.content }}</div>
                  <div v-if="comment.images && comment.images.length > 0" class="flex gap-1 mt-2">
                    <img
                      v-for="(img, index) in comment.images.slice(0, 3)"
                      :key="index"
                      :src="img"
                      class="w-12 h-12 object-cover rounded"
                    />
                    <span
                      v-if="comment.images.length > 3"
                      class="w-12 h-12 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded"
                    >
                      +{{ comment.images.length - 3 }}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span v-if="comment.isTop" class="text-yellow-500">
                  <span class="text-lg">★</span>
                </span>
                <span v-else class="text-muted-foreground">-</span>
              </TableCell>
              <TableCell>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="'bg-secondary text-secondary-foreground'"
                >
                  {{ getStatusLabel(comment.status) }}
                </span>
              </TableCell>
              <TableCell>{{ comment.likeCount }}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="toggleComment(comment)"
                  class="text-blue-500"
                >
                  {{ comment.replyCount }} 条回复
                </Button>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{
                comment.ipAddress || '-'
              }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">{{
                comment.ipLocation || '-'
              }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ comment.createdAt ? formatDateTime(comment.createdAt) : '-' }}
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Button variant="ghost" size="sm" @click="handleEdit(comment)">
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleDelete(comment.id)">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <TableRow v-if="expandedCommentId === comment.id" colspan="11">
              <TableCell colspan="11">
                <div class="ml-8 mt-4 pb-4 border-t border-muted-foreground/20 pt-4">
                  <div v-if="subComments.length > 0">
                    <div
                      v-for="sub in subComments"
                      :key="sub.id"
                      class="flex items-start gap-3 mb-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div
                        v-if="sub.avatar || sub.user?.avatar"
                        class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                      >
                        <img
                          :src="sub.avatar || sub.user?.avatar"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <MessageSquare
                        v-else
                        class="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium">{{
                            sub.nickname || sub.user?.nickname || '匿名'
                          }}</span>
                          <span
                            v-if="sub.replyUserId || sub.replyUser"
                            class="text-xs text-muted-foreground"
                          >
                            回复 {{ sub.replyUser?.nickname || '用户' }}
                          </span>
                        </div>
                        <p class="text-sm text-muted-foreground mt-1">{{ sub.content }}</p>
                        <div v-if="sub.images && sub.images.length > 0" class="flex gap-1 mt-2">
                          <img
                            v-for="(img, index) in sub.images.slice(0, 3)"
                            :key="index"
                            :src="img"
                            class="w-10 h-10 object-cover rounded"
                          />
                          <span
                            v-if="sub.images.length > 3"
                            class="w-10 h-10 flex items-center justify-center text-xs text-muted-foreground bg-muted rounded"
                          >
                            +{{ sub.images.length - 3 }}
                          </span>
                        </div>
                        <div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{{ sub.likeCount }} 点赞</span>
                          <span>{{ sub.ipAddress || '-' }}</span>
                          <span>{{
                            sub.createdAt ? formatDateTime(sub.createdAt) : '-'
                          }}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                          <span
                            class="px-2 py-0.5 rounded text-xs"
                            :class="'bg-secondary text-secondary-foreground'"
                          >
                            {{ getStatusLabel(sub.status) }}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            class="w-5 h-5"
                            @click="handleEdit(sub)"
                          >
                            <Edit class="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            class="w-5 h-5"
                            @click="handleDelete(sub.id)"
                          >
                            <Trash2 class="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center justify-end gap-2 mt-2">
                      <span class="text-xs text-muted-foreground">
                        显示 {{ (subCurrentPage - 1) * subPageSize + 1 }} -
                        {{ Math.min(subCurrentPage * subPageSize, subTotal) }} 条，共
                        {{ subTotal }} 条
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        :disabled="subCurrentPage === 1"
                        @click="fetchSubComments(comment.id, subCurrentPage - 1)"
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        :disabled="subCurrentPage * subPageSize >= subTotal"
                        @click="fetchSubComments(comment.id, subCurrentPage + 1)"
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                  <div v-else class="text-center text-muted-foreground py-4">暂无子评论</div>
                </div>
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-if="isEmpty">
            <TableCell colspan="12" class="text-center text-muted-foreground py-12">
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
          <DialogTitle>{{ isEdit ? '编辑评论' : '新增评论' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改评论信息' : '添加新评论' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>业务ID</Label>
            <Input v-model="formData.bizId" placeholder="业务ID（如文章ID）" />
          </div>
          <div class="space-y-2">
            <Label>业务类型</Label>
            <DictSelect
              v-model="formData.bizType"
              :dict-items="commentBizTypeItems"
              placeholder="请选择业务类型"
            />
          </div>
          <div class="space-y-2">
            <Label>根评论ID</Label>
            <Input v-model="formData.rootId" placeholder="根评论ID" />
          </div>
          <div class="space-y-2">
            <Label>父评论ID</Label>
            <Input v-model="formData.parentId" placeholder="父评论ID" />
          </div>
          <div class="space-y-2">
            <Label>用户ID</Label>
            <Input v-model="formData.userId" placeholder="用户ID" />
          </div>
          <div class="space-y-2">
            <Label>回复用户ID</Label>
            <Input v-model="formData.replyUserId" placeholder="回复用户ID" />
          </div>
          <div class="space-y-2">
            <Label>昵称</Label>
            <Input v-model="formData.nickname" placeholder="评论者昵称" />
          </div>
          <div class="space-y-2">
            <Label>头像</Label>
            <Input v-model="formData.avatar" placeholder="头像URL" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>评论内容 <span class="text-red-500">*</span></Label>
            <Textarea v-model="formData.content" placeholder="请输入评论内容" rows="5" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>评论图片</Label>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(img, index) in formData.images"
                :key="index"
                class="relative w-20 h-20 rounded-lg overflow-hidden"
              >
                <img :src="img" class="w-full h-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  class="absolute top-1 right-1 w-5 h-5"
                  @click="removeImage(index)"
                >
                  <X class="w-3 h-3" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="w-20 h-20 flex flex-col items-center justify-center gap-1"
                @click="showImageUploadDialog = true"
              >
                <Upload class="w-5 h-5" />
                <span class="text-xs">添加图片</span>
              </Button>
            </div>
          </div>
          <div class="space-y-2">
            <Label>IP地址</Label>
            <Input v-model="formData.ipAddress" placeholder="IP地址" />
          </div>
          <div class="space-y-2">
            <Label>IP位置</Label>
            <Input v-model="formData.ipLocation" placeholder="IP位置" />
          </div>
          <div class="space-y-2 flex items-center">
            <Label class="flex-1">置顶</Label>
            <div class="flex items-center">
              <span class="mr-2">{{ formData.isTop ? '是' : '否' }}</span>
              <Button
                variant="outline"
                size="sm"
                @click="formData.isTop = !formData.isTop"
                :class="formData.isTop ? 'bg-yellow-500 text-white' : ''"
              >
                {{ formData.isTop ? '取消置顶' : '设置置顶' }}
              </Button>
            </div>
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="commentStatusItems" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <OssUploader
      v-model:open="showImageUploadDialog"
      accept="image/*"
      title="上传评论图片"
      description="选择图片上传到 OSS 对象存储"
      @success="handleImageUploadSuccess"
    />

    <ConfirmDialog />
  </div>
</template>
