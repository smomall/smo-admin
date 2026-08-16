import { ref, computed } from 'vue'

// ────────────────────────────────────────────────────────────
// 类型
// ────────────────────────────────────────────────────────────

type PendingConfirm = {
  title: string
  message: string
  resolve: (value: boolean) => void
}

type MessageDialogType = 'success' | 'error'

// ────────────────────────────────────────────────────────────
// 共享模块级单例状态（所有组件共享同一份）
// ────────────────────────────────────────────────────────────

// ==== Confirm 队列 ====
const confirmDialogVisible = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const pendingConfirmQueue: PendingConfirm[] = []

function showNextConfirm(): void {
  // 只 peek 队列头部，不 shift。
  // resolve 由 handleConfirm/handleCancel/handleConfirmOpenChange 在用户操作后才调用，
  // 若此处提前 shift，handleConfirm 取不到 current → resolve 永远不触发 → await confirm 永久 pending。
  const next = pendingConfirmQueue[0]
  if (next) {
    confirmDialogTitle.value = next.title
    confirmDialogMessage.value = next.message
    confirmDialogVisible.value = true
  } else {
    confirmDialogVisible.value = false
  }
}

// ==== Message 态 ====
const messageDialogVisible = ref(false)
const messageDialogTitle = ref('')
const messageDialogMessage = ref('')
const messageDialogType = ref<MessageDialogType>('success')

// ────────────────────────────────────────────────────────────
// 对外 API
// ────────────────────────────────────────────────────────────

/**
 * 统一对话框 composable。
 * 包含两种交互：
 *   1. confirm(title, message): Promise<boolean> —— 确认/取消（队列化，并发安全）
 *   2. showSuccess / showError —— 成功/错误 结果消息提示
 */
export function useDialog() {
  // ─── Confirm ────────────────────────────────────────────────

  function confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      pendingConfirmQueue.push({ title, message, resolve })
      if (!confirmDialogVisible.value) {
        showNextConfirm()
      }
    })
  }

  function handleConfirm() {
    const current = pendingConfirmQueue[0]
    if (current) {
      pendingConfirmQueue.shift()
      current.resolve(true)
    }
    showNextConfirm()
  }

  function handleCancel() {
    const current = pendingConfirmQueue[0]
    if (current) {
      pendingConfirmQueue.shift()
      current.resolve(false)
    }
    showNextConfirm()
  }

  function handleConfirmOpenChange(open: boolean) {
    if (!open) {
      const current = pendingConfirmQueue[0]
      if (current) {
        pendingConfirmQueue.shift()
        current.resolve(false)
      }
      showNextConfirm()
    }
  }

  // ─── Message ────────────────────────────────────────────────

  function showSuccess(message: string) {
    messageDialogTitle.value = '成功'
    messageDialogMessage.value = message
    messageDialogType.value = 'success'
    messageDialogVisible.value = true
  }

  function showError(message: string, code?: number | string) {
    messageDialogTitle.value = code ? `${code}` : '错误'
    messageDialogMessage.value = message
    messageDialogType.value = 'error'
    messageDialogVisible.value = true
  }

  function closeMessageDialog() {
    messageDialogVisible.value = false
    messageDialogMessage.value = ''
  }

  return {
    // Confirm 相关（给 ConfirmDialog.vue / 调用方直接 await confirm()）
    confirmDialogVisible: computed(() => confirmDialogVisible.value),
    confirmDialogTitle: computed(() => confirmDialogTitle.value),
    confirmDialogMessage: computed(() => confirmDialogMessage.value),
    confirm,
    handleConfirm,
    handleCancel,
    handleConfirmOpenChange,

    // Message 相关（给 MessageDialog.vue / 调用方直接 showXxx()）
    messageDialogVisible: computed(() => messageDialogVisible.value),
    messageDialogTitle: computed(() => messageDialogTitle.value),
    messageDialogMessage: computed(() => messageDialogMessage.value),
    messageDialogType: computed(() => messageDialogType.value),
    showSuccess,
    showError,
    closeMessageDialog,
  }
}
