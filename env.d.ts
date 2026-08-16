/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 系统名称（页面标题、侧边栏、登录页、index.html title） */
  readonly VITE_APP_TITLE?: string
  /** 系统描述（index.html meta description） */
  readonly VITE_APP_DESCRIPTION?: string
  /** API 请求前缀，默认 /api */
  readonly VITE_API_PREFIX?: string
  /** CSRF 注入开关（'true' / 'false'），默认 false */
  readonly VITE_CSRF_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
