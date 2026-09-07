/**
 * localStorage / sessionStorage 存储 key 统一管理。
 *
 * 所有存储 key 都应集中在此处定义，避免硬编码散落在业务代码中。
 * 支持通过 STORAGE_PREFIX 环境变量加前缀，避免多系统共用域名时 key 冲突。
 */

const STORAGE_PREFIX = import.meta.env.VITE_STORAGE_PREFIX ?? ''

const withPrefix = (key: string) => `${STORAGE_PREFIX}${key}`

export const STORAGE_KEYS = {
  /** 登录 token（token 模式下使用） */
  TOKEN: withPrefix('token'),
  /** 主题设置（light / dark） */
  THEME: withPrefix('theme'),
  /** 当前激活站点 id */
  CURRENT_SITE: withPrefix('current_site'),
  /** 打开的 Tab 列表（多标签页） */
  TAB_LIST: withPrefix('tab_list'),
  /** 侧边栏折叠状态 */
  SIDEBAR_COLLAPSED: withPrefix('sidebar_collapsed'),
  /** 全量字典缓存 */
  DICT_CACHE: withPrefix('dict_cache'),
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/** 安全读取 localStorage（SSR/不可用时返回 null） */
export function readStorage(key: StorageKey): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 安全写入 localStorage */
export function writeStorage(key: StorageKey, value: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** 安全删除 localStorage 项 */
export function removeStorage(key: StorageKey): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
