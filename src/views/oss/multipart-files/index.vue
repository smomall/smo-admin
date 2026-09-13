<script setup lang="ts">
import { DICT } from '@/constants/dict'
import { ref, onMounted } from 'vue'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  Eye,
  Trash2,
  File,
  Image,
  Film,
  Music,
  FileText,
  Archive,
} from '@lucide/vue'
import { ossMultipartFileApi } from '@/api'
import type { OssMultipartFile } from '@/types'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'
import TablePagination from '@/components/TablePagination.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: enableStatusItems } = useDict(DICT.OSS_UPLOAD_STATUS)

const { showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchFileName = ref('')
const searchStatus = ref('__all__')

const showDetailDialog = ref(false)
const detailData = ref<OssMultipartFile | null>(null)

const {
  list: files,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => ossMultipartFileApi.list(query),
  params: () => ({
    fileName: searchFileName.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

function handleReset() {
  searchFileName.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function getFileIcon(contentType: string | undefined) {
  if (!contentType) return File
  const type = contentType.toLowerCase()
  if (type.startsWith('image')) return Image
  if (type.startsWith('video')) return Film
  if (type.startsWith('audio')) return Music
  if (type.includes('text') || type.includes('markdown')) return FileText
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive
  return File
}

function getFileTypeName(contentType: string | undefined): string {
  if (!contentType) return '-'
  if (contentType.startsWith('image/')) return '图片'
  if (contentType.startsWith('video/')) return '视频'
  if (contentType.startsWith('audio/')) return '音频'
  if (contentType.includes('text')) return '文本'
  if (contentType.includes('zip') || contentType.includes('rar')) return '压缩包'
  if (contentType.includes('pdf')) return 'PDF'
  if (contentType.includes('json') || contentType.includes('xml')) return '数据'
  return contentType.split('/')[1] || '-'
}

function getFileTypeBadgeClass(contentType: string | undefined): string {
  if (!contentType) return 'bg-gray-100 text-gray-800'
  if (contentType.startsWith('image/')) return 'bg-pink-100 text-pink-800'
  if (contentType.startsWith('video/')) return 'bg-purple-100 text-purple-800'
  if (contentType.startsWith('audio/')) return 'bg-indigo-100 text-indigo-800'
  if (contentType.includes('text')) return 'bg-orange-100 text-orange-800'
  if (contentType.includes('zip') || contentType.includes('rar')) return 'bg-cyan-100 text-cyan-800'
  return 'bg-blue-100 text-blue-800'
}

async function handleView(file: OssMultipartFile) {
  try {
    const { data } = await ossMultipartFileApi.getById(file.id)
    detailData.value = data.value
    showDetailDialog.value = true
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除文件记录', '确定要删除该上传文件记录吗？')
  if (!confirmed) return
  try {
    await ossMultipartFileApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

onMounted(() => {
  handleSearch()
})
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <ConfirmDialog />

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative flex-1 max-w-md">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            v-model="searchFileName"
            placeholder="搜索文件名"
            class="pl-9"
            @keyup.enter="handleSearch"
          />
        </div>
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
            <TableHead class="w-[60px]">类型</TableHead>
            <TableHead>文件名</TableHead>
            <TableHead class="w-[90px]">大小</TableHead>
            <TableHead class="w-[70px]">分片</TableHead>
            <TableHead class="w-[70px]">状态</TableHead>
            <TableHead class="w-[130px]">过期时间</TableHead>
            <TableHead class="w-[110px]">创建时间</TableHead>
            <TableHead class="w-[90px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="file in files" :key="file.id" class="hover:bg-muted/50">
            <TableCell>
              <component
                :is="getFileIcon(file.contentType)"
                class="w-6 h-6 text-muted-foreground"
              />
            </TableCell>
            <TableCell>
              <div class="min-w-0 max-w-[200px]">
                <div class="font-medium truncate" :title="file.fileName">
                  {{ file.fileName || '-' }}
                </div>
                <span
                  v-if="file.fileKey"
                  class="text-xs text-muted-foreground font-mono truncate block max-w-[200px]"
                  :title="file.fileKey"
                >
                  {{ file.fileKey }}
                </span>
              </div>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ formatFileSize(file.fileSize) }}
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="
                  file.isPart
                    ? 'bg-cyan-100 text-cyan-800'
                    : 'bg-secondary text-secondary-foreground'
                "
              >
                {{ file.isPart ? '是' : '否' }}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge :type="DICT.OSS_UPLOAD_STATUS" :value="file.status" />
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ file.expireAt ? formatDateTime(file.expireAt) : '-' }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ file.createdAt ? formatDateTime(file.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button variant="ghost" size="icon" @click="handleView(file)" title="查看">
                  <Eye class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="handleDelete(file.id)" title="删除">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="files.length === 0">
            <TableCell colspan="8" class="text-center text-muted-foreground py-12">
              <div class="inline-flex flex-col items-center gap-2">
                <File class="w-10 h-10 opacity-30" />
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

    <Dialog v-model:open="showDetailDialog">
      <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>上传文件记录详情</DialogTitle>
        </DialogHeader>

        <div
          v-if="detailData"
          class="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 text-sm"
        >
          <div class="space-y-1">
            <Label class="text-muted-foreground">配置ID</Label>
            <div class="font-mono truncate" :title="detailData.configId">
              {{ detailData.configId || '-' }}
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">存储桶ID</Label>
            <div class="font-mono truncate" :title="detailData.bucketId">
              {{ detailData.bucketId || '-' }}
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">UploadID</Label>
            <div class="font-mono truncate" :title="detailData.uploadId">
              {{ detailData.uploadId || '-' }}
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">文件ID</Label>
            <div class="font-mono truncate" :title="detailData.fileId">
              {{ detailData.fileId || '-' }}
            </div>
          </div>
          <div class="space-y-1 col-span-2">
            <Label class="text-muted-foreground">文件名</Label>
            <div>{{ detailData.fileName || '-' }}</div>
          </div>
          <div class="space-y-1 col-span-2">
            <Label class="text-muted-foreground">ObjectKey</Label>
            <div class="font-mono break-all">{{ detailData.fileKey || '-' }}</div>
          </div>
          <div class="space-y-1 col-span-2">
            <Label class="text-muted-foreground">文件哈希</Label>
            <div class="font-mono break-all">{{ detailData.fileHash || '-' }}</div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">文件大小</Label>
            <div>{{ formatFileSize(detailData.fileSize) }}</div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">内容类型</Label>
            <div>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="getFileTypeBadgeClass(detailData.contentType)"
              >
                {{ getFileTypeName(detailData.contentType) }}
              </span>
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">是否分片</Label>
            <div>{{ detailData.isPart ? '是' : '否' }}</div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">状态</Label>
            <div>
              <StatusBadge :type="DICT.OSS_UPLOAD_STATUS" :value="detailData.status" />
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">过期时间</Label>
            <div>{{ detailData.expireAt ? formatDateTime(detailData.expireAt) : '-' }}</div>
          </div>
          <div class="space-y-1">
            <Label class="text-muted-foreground">创建时间</Label>
            <div>{{ detailData.createdAt ? formatDateTime(detailData.createdAt) : '-' }}</div>
          </div>
          <div class="space-y-1 col-span-2">
            <Label class="text-muted-foreground">备注</Label>
            <div>{{ detailData.remark || '-' }}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
