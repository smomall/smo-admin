import { ref, watch } from 'vue'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/constants/storage'

/**
 * 主题切换 composable。
 *
 * 提供响应式的 isDark 状态，以及切换主题的方法。
 * 主题状态持久化到 localStorage，并操作 <html> 的 class 来驱动 shadcn 的主题样式。
 *
 * 使用方式：
 *   const { isDark, toggleTheme, setTheme } = useTheme()
 */

const isDark = ref(false)
let initialized = false

function applyTheme(dark: boolean) {
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function initTheme() {
  if (initialized) return
  initialized = true

  const saved = readStorage(STORAGE_KEYS.THEME)
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    // 跟随系统偏好
    isDark.value =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
  }

  applyTheme(isDark.value)

  // 持久化同步
  watch(isDark, (val) => {
    applyTheme(val)
    writeStorage(STORAGE_KEYS.THEME, val ? 'dark' : 'light')
  })
}

export function useTheme() {
  // 延迟初始化：首次调用时再读取 localStorage 并应用
  if (!initialized && typeof document !== 'undefined') {
    initTheme()
  }

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  function setTheme(theme: 'light' | 'dark') {
    isDark.value = theme === 'dark'
  }

  return {
    isDark,
    toggleTheme,
    setTheme,
  }
}
