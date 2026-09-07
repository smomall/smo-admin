<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { userApi } from '@/api/system'

const props = defineProps<{
  open: boolean
  userId?: string
  username?: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  success: []
}>()

const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const errorMsg = ref('')

function resetForm() {
  newPassword.value = ''
  confirmPassword.value = ''
  errorMsg.value = ''
}

async function handleSubmit() {
  if (!props.userId) return

  if (!newPassword.value) {
    errorMsg.value = '请输入新密码'
    return
  }
  if (newPassword.value.length < 6) {
    errorMsg.value = '密码长度不能少于 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  submitting.value = true
  errorMsg.value = ''
  try {
    await userApi.resetPassword(props.userId, newPassword.value)
    emit('success')
    emit('update:open', false)
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) resetForm()
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle>重置密码 - {{ username }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label>新密码</Label>
          <Input
            v-model="newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
          />
        </div>
        <div class="space-y-2">
          <Label>确认密码</Label>
          <Input
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
          />
        </div>
        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="handleSubmit" :disabled="submitting">
          {{ submitting ? '提交中...' : '确定' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
