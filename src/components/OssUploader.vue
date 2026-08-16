<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, File, X } from '@lucide/vue'
import type { OssFile, OssClientConfig, OssBucket } from '@/types'
import { ossUploadApi, ossClientConfigApi, ossBucketApi } from '@/api'

interface Props {
  open: boolean
  /** 文件类型过滤，如 'image/*'、'.pdf,.doc' */
  accept?: string
  /** 最大文件大小（字节） */
  maxSize?: number
  /** 提示文字 */
  tip?: string
  /** 弹窗标题 */
  title?: string
  /** 弹窗描述 */
  description?: string
  /** 预选 OSS 配置 ID */
  defaultConfigId?: string
  /** 预选存储桶名称 */
  defaultBucketName?: string
  /** 是否隐藏配置/桶选择（直接上传到默认配置） */
  hideConfig?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '',
  maxSize: 0,
  tip: '支持任意格式文件',
  title: '上传文件',
  description: '选择文件上传到 OSS 对象存储',
  defaultConfigId: '',
  defaultBucketName: '',
  hideConfig: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': [file: OssFile]
}>()

const { showSuccess, showError } = useMessageDialog()

// 内部状态
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const configId = ref('')
const configKey = ref('')
const bucketName = ref('__default__')
const configs = ref<OssClientConfig[]>([])
const buckets = ref<OssBucket[]>([])

const isImageFile = computed(() => {
  if (!selectedFile.value) return false
  return selectedFile.value.type.startsWith('image/')
})

const filteredBuckets = computed(() => {
  if (!configId.value) return buckets.value
  return buckets.value.filter(b => b.configId === configId.value)
})

// 监听配置变化，重置桶选择
watch(configId, () => {
  bucketName.value = '__default__'
})

function handleClose(val: boolean) {
  if (uploading.value) return
  emit('update:open', val)
  if (!val) cleanup()
}

// 监听弹窗打开
watch(() => props.open, async (open) => {
  if (open) {
    await loadData()
    configId.value = props.defaultConfigId || ''
    bucketName.value = props.defaultBucketName || '__default__'
    if (configId.value) {
      const c = configs.value.find(x => x.id === configId.value)
      configKey.value = c?.configKey || ''
    }
  }
})

async function loadData() {
  if (!props.hideConfig) {
    const [configRes, bucketRes] = await Promise.all([
      ossClientConfigApi.getAll(),
      ossBucketApi.getAll(),
    ])
    if (configRes.data.value) configs.value = configRes.data.value as unknown as OssClientConfig[]
    if (bucketRes.data.value) buckets.value = bucketRes.data.value as unknown as OssBucket[]
  }
}

function handleConfigChange(val: unknown) {
  const strVal = String(val)
  if (strVal === '__default__') {
    configId.value = ''
    configKey.value = ''
  } else {
    configId.value = strVal
    const c = configs.value.find(x => x.id === strVal)
    configKey.value = c?.configKey || ''
  }
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    const file = target.files[0]!
    if (props.maxSize && file.size > props.maxSize) {
      showError(`文件大小不能超过 ${formatFileSize(props.maxSize)}`)
      target.files[0] = null as unknown as globalThis.File
      return
    }
    selectedFile.value = file
    if (file.type.startsWith('image/')) {
      previewUrl.value = URL.createObjectURL(file)
    } else {
      previewUrl.value = null
    }
  }
}

function removeSelectedFile() {
  revokePreviewUrl()
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

function cleanup() {
  revokePreviewUrl()
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function handleUpload() {
  if (!selectedFile.value) {
    showError('请选择文件')
    return
  }
  uploading.value = true
  try {
    const { data } = await ossUploadApi.upload(
      selectedFile.value,
      configKey.value || undefined,
      bucketName.value !== '__default__' ? bucketName.value : undefined,
    )
    if (data.value) {
      showSuccess('文件上传成功')
      emit('success', data.value as unknown as OssFile)
      emit('update:open', false)
    }
    // data.value 为 null 表示业务错误，useRequest 已统一弹出后端返回的 msg
  } catch (e: unknown) {
    const err = e as Error
    console.error('上传异常:', err)
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    uploading.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

onBeforeUnmount(() => {
  revokePreviewUrl()
})
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent
      class="sm:max-w-lg"
      @pointer-down-outside="(e: Event) => uploading && e.preventDefault()"
      @interact-outside="(e: Event) => uploading && e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- 文件选择 -->
        <div class="space-y-2">
          <Label>选择文件 <span class="text-destructive">*</span></Label>
          <div v-if="!selectedFile" class="flex items-center justify-center w-full">
            <label
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload class="w-8 h-8 mb-2 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">
                  <span class="font-semibold text-primary">点击选择文件</span> 或拖拽到此处
                </p>
                <p class="text-xs text-muted-foreground mt-1">{{ tip }}</p>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                :accept="accept || undefined"
                @change="handleFileChange"
                :disabled="uploading"
              />
            </label>
          </div>
          <div v-else class="rounded-lg border bg-muted/30 overflow-hidden">
            <!-- 图片预览 -->
            <template v-if="isImageFile && previewUrl">
              <div class="relative w-full h-48 bg-black/5 flex items-center justify-center">
                <img
                  :src="previewUrl"
                  :alt="selectedFile?.name"
                  class="max-w-full max-h-full object-contain"
                />
              </div>
            </template>
            <!-- 文件信息栏 -->
            <div class="flex items-center justify-between p-3">
              <div class="flex items-center gap-3 min-w-0">
                <template v-if="isImageFile && previewUrl">
                  <img :src="previewUrl" class="w-10 h-10 rounded object-cover shrink-0" />
                </template>
                <template v-else>
                  <File class="w-10 h-10 text-primary shrink-0" />
                </template>
                <div class="min-w-0">
                  <p class="font-medium truncate">{{ selectedFile?.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatFileSize(selectedFile?.size ?? 0) }}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" class="shrink-0" @click="removeSelectedFile" :disabled="uploading">
                <X class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- 配置 & 桶联动 -->
        <div v-if="!hideConfig" class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>OSS配置</Label>
            <Select
              :model-value="configId || '__default__'"
              :disabled="uploading"
              @update:model-value="handleConfigChange"
            >
              <SelectTrigger>
                <SelectValue placeholder="默认配置" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">默认配置</SelectItem>
                <SelectItem v-for="c in configs" :key="c.id" :value="c.id">{{ c.configName }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>存储桶</Label>
            <Select v-model="bucketName" :disabled="uploading">
              <SelectTrigger>
                <SelectValue placeholder="默认桶" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">默认桶</SelectItem>
                <SelectItem v-for="b in filteredBuckets" :key="b.id" :value="b.bucketName">{{ b.bucketName }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="uploading" @click="handleClose(false)">取消</Button>
        <Button @click="handleUpload" :disabled="!selectedFile || uploading">
          <Upload v-if="!uploading" class="w-4 h-4 mr-2" />
          {{ uploading ? '上传中...' : '开始上传' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
