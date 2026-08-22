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

/** 天爱验证码(TAC) 实例，由 window.initTAC 解析得到 */
interface TACInstance {
  init: () => void
  destroyWindow: () => void
  reloadCaptcha: () => void
}

/** TAC 验证回调参数类型 */
interface TACCaptchaConfig {
  requestCaptchaDataUrl: string
  validCaptchaUrl: string
  bindEl: string
  validSuccess?: (res: unknown, config: unknown, tac: TACInstance) => void
  validFail?: (res: unknown, config: unknown, tac: TACInstance) => void
  btnRefreshFun?: (el: unknown, tac: TACInstance) => void
  btnCloseFun?: (el: unknown, tac: TACInstance) => void
  requestHeaders?: Record<string, string>
  timeToTimestamp?: boolean
}

interface TACStyleConfig {
  logoUrl?: string | null
  btnUrl?: string
  bgUrl?: string
  moveTrackMaskBgColor?: string
  moveTrackMaskBorderColor?: string
}

interface Window {
  initTAC?: (
    path: string,
    config: TACCaptchaConfig,
    style?: TACStyleConfig,
  ) => Promise<TACInstance>
}
