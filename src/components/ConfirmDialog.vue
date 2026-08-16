<script setup lang="ts">
import { watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangleIcon } from '@lucide/vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { dialogVisible, dialogTitle, dialogMessage, handleConfirm, handleCancel, handleOpenChange } = useConfirmDialog()

watch(dialogVisible, (newVal) => {
  if (!newVal) {
    handleOpenChange(false)
  }
})
</script>

<template>
  <Dialog v-model:open="dialogVisible">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangleIcon class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <DialogTitle>{{ dialogTitle }}</DialogTitle>
            <DialogDescription class="mt-0">{{ dialogMessage }}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <DialogFooter class="mt-6">
        <Button variant="outline" @click="handleCancel">取消</Button>
        <Button class="bg-red-500 hover:bg-red-600" @click="handleConfirm">确定</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
