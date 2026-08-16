<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon, CheckCircleIcon } from '@lucide/vue'
import { useMessageDialog } from '@/composables/useMessageDialog'

const { dialogVisible, dialogTitle, dialogMessage, dialogType, closeDialog } = useMessageDialog()
</script>

<template>
  <Dialog :open="dialogVisible" @open-change="closeDialog">
    <DialogContent class="sm:max-w-sm border-0 shadow-2xl rounded-2xl overflow-hidden z-999">
      <div :class="dialogType === 'success' ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100'" class="p-6">
        <div class="flex flex-col items-center text-center">
          <div :class="dialogType === 'success' ? 'bg-green-500' : 'bg-red-500'" class="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg animate-in fade-in zoom-in duration-300">
            <CheckCircleIcon v-if="dialogType === 'success'" class="w-8 h-8 text-white" />
            <AlertCircleIcon v-else class="w-8 h-8 text-white" />
          </div>
          <DialogTitle class="text-xl font-bold text-gray-900 mb-2">{{ dialogTitle }}</DialogTitle>
          <DialogDescription class="text-gray-600 text-sm leading-relaxed">{{ dialogMessage }}</DialogDescription>
        </div>
      </div>
      <DialogFooter class="p-6 pt-0">
        <Button :class="dialogType === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'" class="w-full text-white font-medium py-2.5 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0" @click="closeDialog">
          确定
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
