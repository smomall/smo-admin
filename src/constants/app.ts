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
