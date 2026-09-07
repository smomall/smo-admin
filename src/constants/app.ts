/**
 * 应用级常量。
 *
 * 所有值来自 Vite 环境变量（见 .env），未配置时使用兜底默认值，
 * 确保即使忘记配置也能正常运行。
 */

/** 系统名称：用于侧边栏 Logo、登录页标题、document.title 等 */
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'SMO Admin'

/** 系统描述：用于 meta description */
export const APP_DESCRIPTION =
  import.meta.env.VITE_APP_DESCRIPTION || 'SMO Admin - 后台管理系统'

// ================================================
// 分页相关常量
// ================================================

/** 默认分页大小 */
export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 10

/** 分页大小可选值 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

/** 大分页（用于"不分页"场景下的后端分页接口） */
export const MAX_PAGE_SIZE = 1000

// ================================================
// 请求相关常量
// ================================================

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT =
  Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 15_000

// ================================================
// 通用占位常量（用于筛选场景）
// ================================================

/**
 * 筛选条件中表示"全部/不筛选"的占位值。
 * 建议优先使用 undefined / null 来表示"不筛选"，
 * 此常量仅用于 UI 层需要显示"全部"选项的场景。
 */
export const ALL_VALUE = '__all__'

/** 表示"无/顶级"的 id 占位值（如组织树的根节点、分类的根） */
export const NONE_ID = '0'

// ================================================
// 路由相关常量
// ================================================

/** 登录页路径 */
export const LOGIN_PATH = '/login'

/** 登录后默认跳转路径 */
export const HOME_PATH = '/dashboard'
