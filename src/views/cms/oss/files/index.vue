<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  File,
  Image,
  Film,
  Music,
  FileText,
  Archive,
  Upload,
} from '@lucide/vue'
import type { OssFile, OssClientConfig, OssBucket } from '@/types'
import { ossFileApi, ossClientConfigApi, ossBucketApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import DictSelect from '@/components/DictSelect.vue'
import OssUploader from '@/components/OssUploader.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: enableStatusItems, getLabel: getStatusLabel } = useDict('common_status')
const { items: uploadStatusItems } = useDict('upload_status')

const { showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchFileName = ref('')
const searchFileKey = ref('')
const searchFileExt = ref('')
const searchFileType = ref('')
const searchFileSubType = ref('')
const searchUploadId = ref('')
const searchBucketId = ref('__all__')
const searchUploadStatus = ref<string>('__all__')
const searchConfigId = ref('__all__')
const showAdvancedSearch = ref(false)
const showDialog = ref(false)
const isEdit = ref(false)

// 上传弹窗
const showUploadDialog = ref(false)
const configs = ref<OssClientConfig[]>([])
const buckets = ref<OssBucket[]>([])

// 根据搜索配置ID联动过滤桶
const searchFilteredBuckets = computed(() => {
  if (searchConfigId.value === '__all__') return buckets.value
  return buckets.value.filter((b) => b.configId === searchConfigId.value)
})

watch(searchConfigId, () => {
  searchBucketId.value = '__all__'
})

const formData = ref({
  id: '',
  configId: '',
  bucketId: '',
  uploadId: '',
  fileUsage: 0,
  fileUrl: '',
  fileName: '',
  fileKey: '',
  fileExt: '',
  fileHash: '',
  fileSize: 0,
  fileMeta: '',
  fileType: '',
  fileSubType: '',
  contentType: '',
  thumbnail: '',
  width: 0,
  height: 0,
  duration: 0,
  isPart: 0,
  isTemp: 0,
  uploadStatus: '1',
  status: '1',
  remark: '',
})

const {
  list: files,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadFiles,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => ossFileApi.list(query),
  params: () => ({
    fileName: searchFileName.value,
    fileKey: searchFileKey.value,
    fileExt: searchFileExt.value,
    fileType: searchFileType.value,
    fileSubType: searchFileSubType.value,
    uploadId: searchUploadId.value,
    bucketId: searchBucketId.value === '__all__' ? '' : searchBucketId.value,
    uploadStatus: searchUploadStatus.value === '__all__' ? '' : searchUploadStatus.value,
    configId: searchConfigId.value === '__all__' ? '' : searchConfigId.value,
  }),
})

function handleReset() {
  searchFileName.value = ''
  searchFileKey.value = ''
  searchFileExt.value = ''
  searchFileType.value = ''
  searchFileSubType.value = ''
  searchUploadId.value = ''
  searchBucketId.value = '__all__'
  searchUploadStatus.value = '__all__'
  searchConfigId.value = '__all__'
  handleSearch()
}

// 获取配置和桶
async function fetchConfigs() {
  try {
    const { data } = await ossClientConfigApi.getAll()
    if (data.value) configs.value = data.value
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function fetchBuckets() {
  try {
    const { data } = await ossBucketApi.getAll()
    if (data.value) buckets.value = data.value
  } catch {
    // useRequest 已统一处理错误提示
  }
}

// 打开上传弹窗
function openUploadDialog() {
  showUploadDialog.value = true
}

// 上传成功回调
function handleUploadSuccess() {
  reloadFiles()
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

onMounted(() => {
  Promise.all([fetchConfigs(), fetchBuckets()])
})

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    configId: '',
    bucketId: '',
    uploadId: '',
    fileUsage: 0,
    fileUrl: '',
    fileName: '',
    fileKey: '',
    fileExt: '',
    fileHash: '',
    fileSize: 0,
    fileMeta: '',
    fileType: '',
    fileSubType: '',
    contentType: '',
    thumbnail: '',
    width: 0,
    height: 0,
    duration: 0,
    isPart: 0,
    isTemp: 0,
    uploadStatus: '1',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(file: OssFile) {
  isEdit.value = true
  formData.value = {
    id: file.id,
    configId: file.configId || '',
    bucketId: file.bucketId || '',
    uploadId: file.uploadId || '',
    fileUsage: Number(file.fileUsage || 0),
    fileUrl: file.fileUrl || '',
    fileName: file.fileName || '',
    fileKey: file.fileKey || '',
    fileExt: file.fileExt || '',
    fileHash: file.fileHash || '',
    fileSize: file.fileSize || 0,
    fileMeta: file.fileMeta || '',
    fileType: file.fileType || '',
    fileSubType: file.fileSubType || '',
    contentType: file.contentType || '',
    thumbnail: file.thumbnail || '',
    width: file.width || 0,
    height: file.height || 0,
    duration: file.duration || 0,
    isPart: file.isPart || 0,
    isTemp: file.isTemp || 0,
    uploadStatus: String(file.uploadStatus || 1),
    status: String(file.status || 1),
    remark: file.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除文件', '确定要删除该文件记录吗？')
  if (!confirmed) return
  try {
    await ossFileApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  try {
    if (isEdit.value) {
      await ossFileApi.update(formData.value.id, formData.value)
    } else {
      await ossFileApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadFiles()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function getFileIcon(fileType: string | undefined) {
  if (!fileType) return File
  const type = fileType.toLowerCase()
  if (type.startsWith('image')) return Image
  if (type.startsWith('video')) return Film
  if (type.startsWith('audio')) return Music
  if (type.includes('text') || type.includes('markdown')) return FileText
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive
  return File
}

// 判断是否为图片类型
function isImageFile(file: OssFile): boolean {
  return !!(file.fileType && file.fileType.toLowerCase().startsWith('image'))
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

function getUploadStatusText(status: string | undefined) {
  if (status === '1') return '成功'
  if (status === '0') return '失败'
  if (status === '2') return '上传中'
  return '-'
}

function getUploadStatusClass(status: string | undefined) {
  if (status === '1') return 'bg-green-100 text-green-800'
  if (status === '0') return 'bg-red-100 text-red-800'
  if (status === '2') return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-800'
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function copyUrl(url: string | undefined) {
  if (!url) return
  navigator.clipboard.writeText(url)
  showSuccess('链接已复制')
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <ConfirmDialog />
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="openUploadDialog">
          <Upload class="w-4 h-4 mr-2" />
          上传文件
        </Button>
        <Button @click="handleAdd">
          <Plus class="w-4 h-4 mr-2" />
          新增文件记录
        </Button>
      </div>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="space-y-3">
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
          <Select v-model="searchConfigId" class="w-36">
            <SelectTrigger>
              <SelectValue placeholder="全部配置" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部配置</SelectItem>
              <SelectItem v-for="c in configs" :key="c.id" :value="c.id">{{
                c.configName
              }}</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="searchBucketId" class="w-36">
            <SelectTrigger>
              <SelectValue placeholder="全部桶" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部桶</SelectItem>
              <SelectItem v-for="b in searchFilteredBuckets" :key="b.id" :value="b.id">{{
                b.bucketName
              }}</SelectItem>
            </SelectContent>
          </Select>
          <DictSelect
            v-model="searchUploadStatus"
            :dict-items="uploadStatusItems"
            placeholder="上传状态"
            class="w-32"
          />
          <Button variant="outline" @click="handleSearch">搜索</Button>
          <Button variant="ghost" @click="handleReset">重置</Button>
          <Button variant="ghost" @click="showAdvancedSearch = !showAdvancedSearch">
            {{ showAdvancedSearch ? '收起' : '高级筛选' }}
          </Button>
        </div>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="showAdvancedSearch"
            class="flex items-center gap-2 flex-wrap p-4 bg-muted/30 rounded-lg"
          >
            <Input
              v-model="searchFileKey"
              placeholder="ObjectKey"
              class="w-40"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchFileExt"
              placeholder="文件扩展名"
              class="w-32"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchFileType"
              placeholder="文件类型"
              class="w-32"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchFileSubType"
              placeholder="文件子类型"
              class="w-32"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchUploadId"
              placeholder="上传ID"
              class="w-40"
              @keyup.enter="handleSearch"
            />
          </div>
        </Transition>
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
            <TableHead class="w-[60px]">预览</TableHead>
            <TableHead>文件名</TableHead>
            <TableHead>文件URL</TableHead>
            <TableHead class="w-[90px]">大小</TableHead>
            <TableHead class="w-[70px]">类型</TableHead>
            <TableHead class="w-[80px]">尺寸</TableHead>
            <TableHead class="w-[80px]">时长</TableHead>
            <TableHead class="w-[60px]">上传状态</TableHead>
            <TableHead class="w-[60px]">状态</TableHead>
            <TableHead class="w-[100px]">创建时间</TableHead>
            <TableHead class="w-[90px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="file in files" :key="file.id" class="hover:bg-muted/50">
            <!-- 预览 -->
            <TableCell>
              <div
                v-if="isImageFile(file) && (file.thumbnail || file.fileUrl)"
                class="w-10 h-10 rounded overflow-hidden bg-muted"
              >
                <img
                  :src="file.thumbnail || file.fileUrl"
                  :alt="file.fileName"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <component
                v-else
                :is="getFileIcon(file.fileType)"
                class="w-8 h-8 text-muted-foreground"
              />
            </TableCell>
            <!-- 文件名 -->
            <TableCell>
              <div class="min-w-0 max-w-[180px]">
                <div class="font-medium truncate" :title="file.fileName">
                  {{ file.fileName || '-' }}
                </div>
                <span v-if="file.fileExt" class="text-xs text-muted-foreground font-mono">{{
                  file.fileExt
                }}</span>
              </div>
            </TableCell>
            <!-- 文件URL -->
            <TableCell>
              <span
                v-if="file.fileUrl"
                class="text-sm text-muted-foreground truncate block max-w-[200px] cursor-pointer hover:text-primary transition-colors"
                :title="file.fileUrl"
                @click="copyUrl(file.fileUrl)"
                >{{ file.fileUrl }}</span
              >
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ formatFileSize(file.fileSize) }}
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                :class="getFileTypeBadgeClass(file.contentType)"
              >
                {{ getFileTypeName(file.contentType) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ file.width && file.height ? `${file.width}×${file.height}` : '-' }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ file.duration ? formatDuration(file.duration) : '-' }}
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="getUploadStatusClass(file.uploadStatus)"
              >
                {{ getUploadStatusText(file.uploadStatus) }}
              </span>
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(file.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ file.createdAt ? formatDateTime(file.createdAt) : '-' }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button variant="ghost" size="icon" @click="handleEdit(file)" title="编辑">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="handleDelete(file.id)" title="删除">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="files.length === 0">
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
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑文件' : '新增文件记录' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改文件记录' : '添加新文件记录' }}</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <Label>配置ID</Label>
            <Input v-model="formData.configId" placeholder="配置ID" />
          </div>
          <div class="space-y-2">
            <Label>存储桶ID</Label>
            <Input v-model="formData.bucketId" placeholder="存储桶ID" />
          </div>
          <div class="space-y-2">
            <Label>上传ID</Label>
            <Input v-model="formData.uploadId" placeholder="分片上传ID" />
          </div>
          <div class="space-y-2">
            <Label>文件用途</Label>
            <DictSelect v-model="formData.fileUsage" dict-type="file_purpose" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>文件URL</Label>
            <Input v-model="formData.fileUrl" placeholder="文件访问URL" />
          </div>
          <div class="space-y-2">
            <Label>文件名</Label>
            <Input v-model="formData.fileName" placeholder="原始文件名" />
          </div>
          <div class="space-y-2">
            <Label>文件扩展名</Label>
            <Input v-model="formData.fileExt" placeholder="如：.jpg" />
          </div>
          <div class="space-y-2">
            <Label>文件大小(字节)</Label>
            <Input v-model.number="formData.fileSize" type="number" placeholder="文件大小" />
          </div>
          <div class="space-y-2">
            <Label>内容类型</Label>
            <Input v-model="formData.contentType" placeholder="如：image/jpeg" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>ObjectKey</Label>
            <Input v-model="formData.fileKey" placeholder="对象存储Key" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>文件哈希</Label>
            <Input v-model="formData.fileHash" placeholder="文件MD5/SHA256哈希值" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>文件元数据(JSON)</Label>
            <Input v-model="formData.fileMeta" placeholder="文件元数据JSON格式" />
          </div>
          <div class="space-y-2">
            <Label>文件类型</Label>
            <Input v-model="formData.fileType" placeholder="如：image" />
          </div>
          <div class="space-y-2">
            <Label>文件子类型</Label>
            <Input v-model="formData.fileSubType" placeholder="如：jpeg" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>缩略图URL</Label>
            <Input v-model="formData.thumbnail" placeholder="缩略图访问URL" />
          </div>
          <div class="space-y-2">
            <Label>宽度(px)</Label>
            <Input v-model.number="formData.width" type="number" placeholder="宽度" />
          </div>
          <div class="space-y-2">
            <Label>高度(px)</Label>
            <Input v-model.number="formData.height" type="number" placeholder="高度" />
          </div>
          <div class="space-y-2">
            <Label>时长(秒)</Label>
            <Input v-model.number="formData.duration" type="number" placeholder="时长" />
          </div>
          <div class="space-y-2">
            <Label>上传状态</Label>
            <DictSelect v-model="formData.uploadStatus" dict-type="upload_status" />
          </div>
          <div class="space-y-2 flex items-center gap-4">
            <Label>分片文件</Label>
            <Checkbox
              :model-value="formData.isPart === 1"
              @update:model-value="formData.isPart = $event ? 1 : 0"
            />
          </div>
          <div class="space-y-2 flex items-center gap-4">
            <Label>临时文件</Label>
            <Checkbox
              :model-value="formData.isTemp === 1"
              @update:model-value="formData.isTemp = $event ? 1 : 0"
            />
          </div>
          <div class="space-y-2">
            <Label>状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label>备注</Label>
            <Input v-model="formData.remark" placeholder="备注说明" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '更新' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 上传文件弹窗 -->
    <OssUploader v-model:open="showUploadDialog" @success="handleUploadSuccess" />
  </div>
</template>
