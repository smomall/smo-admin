<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Image as ImageIcon } from '@lucide/vue'
import OssUploader from './OssUploader.vue'
import type { OssFile } from '@/types'

interface Props {
  /** 绑定的文件ID，提交给后端 */
  modelValue: string
  /** 后端回显的封面URL（只读用于展示），优先用于图片预览 */
  coverUrl?: string
  label?: string
  placeholder?: string
  /** 文件类型过滤，默认只允许图片 */
  accept?: string
  /** 必填标记 */
  required?: boolean
}

withDefaults(defineProps<Props>(), {
  label: '封面图片',
  placeholder: '上传后自动绑定文件ID',
  accept: 'image/*',
  required: false,
  coverUrl: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** 上传成功：提供 fileId 和预签名URL，父组件可直接更新本地回显 */
  uploaded: [payload: { fileId: string; fileUrl: string }]
}>()

const showUploadDialog = ref(false)
/** 本地暂存上传成功返回的URL（避免重新加载数据） */
const localCoverUrl = ref('')

watch(
  () => [localCoverUrl.value],
  () => {
    // no-op
  },
)

/** 用于预览的实际URL：本地暂存 > 后端回显coverUrl */
const previewUrl = computed(() => localCoverUrl.value || '')
const displayCoverUrl = computed(() => localCoverUrl.value)

function handleUploadSuccess(file: OssFile) {
  if (!file.id) return
  const url = file.fileUrl || ''
  localCoverUrl.value = url
  emit('update:modelValue', file.id)
  emit('uploaded', { fileId: file.id, fileUrl: url })
}

function handleClear() {
  localCoverUrl.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-2">
    <Label>
      {{ label }}
      <span v-if="required" class="text-destructive">*</span>
    </Label>

    <!-- 文件ID输入框(只读提示) + 上传按钮 -->
    <div class="flex items-center gap-2">
      <Input
        :value="modelValue ? `已绑定文件ID：${modelValue}` : ''"
        :placeholder="placeholder"
        readonly
        class="flex-1 text-muted"
      />
      <Button
        variant="outline"
        size="sm"
        class="shrink-0"
        @click="showUploadDialog = true"
        title="上传图片"
      >
        <Upload class="w-4 h-4" />
      </Button>
      <Button
        v-if="modelValue || coverUrl || localCoverUrl"
        variant="outline"
        size="sm"
        class="shrink-0"
        @click="handleClear"
        title="清除封面"
      >
        <X class="w-4 h-4" />
      </Button>
    </div>

    <!-- 图片预览 -->
    <div
      v-if="displayCoverUrl || coverUrl"
      class="relative w-full h-32 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center"
    >
      <img
        :src="displayCoverUrl || coverUrl"
        alt="封面预览"
        class="max-w-full max-h-full object-contain"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <div
        class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 bg-black/20 transition-opacity"
      >
        <ImageIcon class="w-8 h-8 text-white/70" />
      </div>
    </div>

    <!-- 上传弹窗 -->
    <OssUploader
      v-model:open="showUploadDialog"
      :accept="accept"
      :tip="'支持 JPG、PNG、GIF、WebP 等图片格式'"
      title="上传封面图片"
      description="选择图片上传到 OSS 对象存储，上传成功后自动绑定文件ID"
      @success="handleUploadSuccess"
    />
  </div>
</template>
