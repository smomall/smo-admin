import { ref, watch } from 'vue'
import { useFetch } from '@vueuse/core'
import { getCookie } from './useCookie'

// ────────────────────────────────────────────────────────────
// 共享类型（useRequest 通过 re-export 复用）
// ────────────────────────────────────────────────────────────

/** 后端统一响应结构，对应 com.kongjs.smo.common.web.result.R */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
  success?: boolean
}

/** CSRF token 元信息，由 GET /auth/csrf 返回 */
export interface CsrfToken {
  headerName: string
  parameterName: string
  token: string
}

// ────────────────────────────────────────────────────────────
// 常量
// ────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_PREFIX || '/api'
const TOKEN_KEY = 'token'
const LOGIN_PATH = '/login'

const CSRF_TIMEOUT = 5_000
const XSRF_COOKIE_NAME = 'XSRF-TOKEN'
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN'

// ────────────────────────────────────────────────────────────
// Token 真相源（模块级单例 + localStorage hydrate 同步）
//
// 统一策略：
//   1. 应用启动时从 localStorage 一次性 hydrate 到 token.value；
//   2. 之后所有读写只操作 token.value；
//   3. setToken/clear 时写回 localStorage（保持刷新持久化）；
//   4. useRequest、useNotificationSse、stores 全部通过本模块读/写 token，
//      不再直接触碰 localStorage。
// ────────────────────────────────────────────────────────────

const token = ref<string>(localStorage.getItem(TOKEN_KEY) ?? '')

// 双向同步：token 变化 → 写 localStorage
watch(token, (val) => {
  if (val) localStorage.setItem(TOKEN_KEY, val)
  else localStorage.removeItem(TOKEN_KEY)
})

// ────────────────────────────────────────────────────────────
// CSRF token 管理
//
// 通过 setCsrfEnabled(true) 开启（默认关闭）。CSRF token 为一次性，
// 每次请求都重新获取，不缓存、不去重——缓存或共享会导致后续请求用旧 token
// 触发 403。
//
// 获取策略（cookie 优先，接口回退）：
// 1. 尝试从 cookie `XSRF-TOKEN` 读取 → 读到直接走快速路径，省一次 /auth/csrf 请求；
// 2. 若 cookie 为空（HttpOnly / 首访 / 已过期）→ 调用 GET /auth/csrf 接口，
//    使用其返回的 headerName（兼容不同后端配置，默认 X-XSRF-TOKEN）。
// 3. 两种方式均使用一次性 token，每请求独立获取、不复用。
// ────────────────────────────────────────────────────────────

let csrfEnabled = import.meta.env.VITE_CSRF_ENABLED === 'true'

// 鉴权 token 注入开关：默认 true（向后兼容），可通过 VITE_TOKEN_ENABLED=false
// 或运行时 setTokenEnabled(false) 关闭。关闭后 useRequest 不注入 Authorization 头。
let tokenEnabled = import.meta.env.VITE_TOKEN_ENABLED !== 'false'

/** 获取一次性 CSRF token（每次调用都发起新的 /auth/csrf 请求） */
async function fetchCsrfToken(): Promise<CsrfToken> {
  const { data } = await useFetch<ApiResponse<CsrfToken>>(
    `${BASE_URL}/auth/csrf`,
    { timeout: CSRF_TIMEOUT },
  ).json()
  const csrf = data.value?.data
  if (!csrf) throw new Error('CSRF token 缺失')
  return csrf
}

/**
 * 获取 CSRF：优先读 cookie `XSRF-TOKEN`（非 HttpOnly），失败再调接口。
 * 返回 `{ headerName, token }` 供调用方注入。
 */
async function resolveCsrf(): Promise<{ headerName: string; token: string }> {
  const fromCookie = getCookie(XSRF_COOKIE_NAME)
  if (fromCookie) return { headerName: XSRF_HEADER_NAME, token: fromCookie }
  return fetchCsrfToken()
}

/** 开关 CSRF token 注入。默认关闭；开启后每次请求自动获取并携带一次性 CSRF token。 */
export function setCsrfEnabled(enabled: boolean): void {
  csrfEnabled = enabled
}

/** 开关鉴权 token 注入。默认开启；关闭后请求不携带 Authorization 头。 */
export function setTokenEnabled(enabled: boolean): void {
  tokenEnabled = enabled
}

/** 读取当前 token 注入模式是否开启（运行时可被 setTokenEnabled 切换）。
 *  - true：token 模式，登录态由 token 是否存在判定
 *  - false：cookie 会话模式，登录态由 /user/info 接口判定，请求不携带 Authorization 头 */
export function isTokenEnabled(): boolean {
  return tokenEnabled
}

// ────────────────────────────────────────────────────────────
// Token 刷新管理
//
// 并发 401 共享同一次 /auth/refresh；刷新失败则清空会话并跳转登录。
// ────────────────────────────────────────────────────────────

let refreshInFlight: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  // 非 token 模式（cookie 会话）：无 token 可刷新，会话失效直接清空跳登录
  if (!tokenEnabled) {
    clearSession()
    return null
  }

  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const { data } = await useFetch<ApiResponse<{ token: string }>>(
        `${BASE_URL}/auth/refresh`,
      ).json()
      const newToken = data.value?.data?.token
      if (!newToken) {
        clearSession()
        return null
      }
      setToken(newToken)
      return newToken
    } catch {
      clearSession()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

// ────────────────────────────────────────────────────────────
// 对外 API
// ────────────────────────────────────────────────────────────

/** 读取当前 token（响应式 ref 的 getter 风格，不暴露 ref 本身以防外部意外写入） */
export function getToken(): string {
  return token.value
}

/** 写入 token，并同步到 localStorage（通过 watch）。传入空串等价于清理 token。 */
export function setToken(tokenValue: string): void {
  token.value = tokenValue || ''
}

/** 清空会话（token + 转登录页）。避免在登录页重复跳转。 */
export function clearSession(): void {
  token.value = ''
  if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
    window.location.href = LOGIN_PATH
  }
}

export { csrfEnabled, tokenEnabled, resolveCsrf, BASE_URL }
