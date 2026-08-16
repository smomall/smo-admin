<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Image as ImageIcon } from '@lucide/vue'
import OssUploader from './OssUploader.vue'
import type { OssFile } from '@/types'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  /** 文件类型过滤，默认只允许图片 */
  accept?: string
  /** 必填标记 */
  required?: boolean
}

withDefaults(defineProps<Props>(), {
  label: '封面图片',
  placeholder: '封面图片URL',
  accept: 'image/*',
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showUploadDialog = ref(false)

function handleUploadSuccess(file: OssFile) {
  if (file.fileUrl) {
    emit('update:modelValue', file.fileUrl)
  }
}

function handleClear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-2">
    <Label>
      {{ label }}
      <span v-if="required" class="text-destructive">*</span>
    </Label>

    <!-- 输入框 + 上传按钮 -->
    <div class="flex items-center gap-2">
      <Input
        :value="modelValue"
        :placeholder="placeholder"
        @update:value="emit('update:modelValue', $event)"
        class="flex-1"
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
        v-if="modelValue"
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
      v-if="modelValue"
      class="relative w-full h-32 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center"
    >
      <img
        :src="modelValue"
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
      description="选择图片上传到 OSS 对象存储"
      @success="handleUploadSuccess"
    />
  </div>
</template>
