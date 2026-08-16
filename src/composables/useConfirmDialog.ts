import { useDialog } from './useDialog'

/**
 * 向后兼容别名层。
 * 新代码请直接使用 useDialog()，其返回值包含 confirm / showSuccess / showError 等统一 API。
 * 本文件保留，避免 30 处现有 from '@/composables/useConfirmDialog' 的 import 失效。
 */
export function useConfirmDialog() {
  const d = useDialog()
  return {
    dialogVisible: d.confirmDialogVisible,
    dialogTitle: d.confirmDialogTitle,
    dialogMessage: d.confirmDialogMessage,
    confirm: d.confirm,
    handleConfirm: d.handleConfirm,
    handleCancel: d.handleCancel,
    handleOpenChange: d.handleConfirmOpenChange,
  }
}
