import { useDialog } from './useDialog'

/**
 * 向后兼容别名层。
 * 新代码请直接使用 useDialog()。
 * 本文件保留，避免 35 处现有 from '@/composables/useMessageDialog' 的 import 失效。
 */
export function useMessageDialog() {
  const d = useDialog()
  return {
    dialogVisible: d.messageDialogVisible,
    dialogTitle: d.messageDialogTitle,
    dialogMessage: d.messageDialogMessage,
    dialogType: d.messageDialogType,
    showSuccess: d.showSuccess,
    showError: d.showError,
    closeDialog: d.closeMessageDialog,
  }
}
