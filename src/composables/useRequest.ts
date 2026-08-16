import { createFetch } from '@vueuse/core'
import type {
  AfterFetchContext,
  BeforeFetchContext,
  OnFetchErrorContext,
  UseFetchOptions,
  UseFetchReturn,
} from '@vueuse/core'
import { useMessageDialog } from './useMessageDialog'
import {
  BASE_URL,
  getToken,
  csrfEnabled,
  resolveCsrf,
  refreshAccessToken,
  clearSession,
  setCsrfEnabled,
} from './useAuth'
export type { ApiResponse, CsrfToken } from './useAuth'
export { setCsrfEnabled }

// ────────────────────────────────────────────────────────────
// 类型（避免循环依赖，从 useAuth re-export 主类型；此处定义私有局部类型）
// ────────────────────────────────────────────────────────────

/** 后端统一响应结构，对应 com.kongjs.smo.common.web.result.R */
export interface ApiResponseBackCompat<T = unknown> {
  code: number
  msg: string
  data: T
  success?: boolean
}

// ────────────────────────────────────────────────────────────
// 常量（HTTP/业务层特定，不属于 useAuth 的会话概念）
// ────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT = 15_000
const AUTH_PREFIX = '/auth/'
const SUCCESS_CODE = 200
const UNAUTHORIZED_CODE = 401

const { showError } = useMessageDialog()

// ────────────────────────────────────────────────────────────
// BusinessError：业务层（HTTP 200 + body.code !== 200）抛出的错误
//
// 后端 GlobalApiExceptionHandler.handleBusinessException 返回 R 对象，
// Spring 以 HTTP 200 序列化响应体，因此 fetch 认为请求"成功"，
// response.ok === true → vueuse 走 afterFetch 而非 onFetchError 路径。
// 当 interpretBusinessBody 检测到 body.code !== SUCCESS_CODE 时，
// 抛出本错误对象，使 afterFetch 的 await reject：
//   1. vueuse 进入 execute 的 catch 分支 → 调用 onFetchError
//   2. onFetchError 根据 BusinessError 的 code/msg 只弹一次错误提示
//      （不再在 interpret 里提示，避免重复）
//   3. vueuse 将 error ref 置位
//   4. wrapJsonResult 检测到 error ref → Promise.then reject →
//      调用方 `await api.xxx()` 进入 catch，showSuccess 不会误执行。
// ────────────────────────────────────────────────────────────

class BusinessError extends Error {
  readonly code: number
  override readonly message: string

  constructor(code: number, message: string) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
    this.message = message
  }
}

function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof BusinessError
}

// ────────────────────────────────────────────────────────────
// 响应解析与请求重放
// ────────────────────────────────────────────────────────────

/** 请求被 AbortController 主动取消 */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * 判断是否为鉴权接口（/auth/**，会话建立相关）。
 * beforeFetch/afterFetch 中的 url 已包含 baseUrl 前缀（如 "/api/auth/login"）。
 */
function isAuthEndpoint(url: string): boolean {
  return url.startsWith(`${BASE_URL}${AUTH_PREFIX}`)
}

function isBusinessResponse(body: unknown): body is ApiResponseBackCompat {
  return (
    !!body &&
    typeof body === 'object' &&
    typeof (body as ApiResponseBackCompat).code === 'number'
  )
}

/**
 * 解析业务响应：
 *  - code === 200：解包 data，返回 {data, response}
 *  - 其他业务码：抛出 BusinessError，让 afterFetch → vueuse catch 处理。
 *
 * 注意：本方法**不再调 showError**，错误提示统一由 onFetchError 处理，
 * 避免 interpret 在 retryAfterRefresh 中抛出时被 catch 误弹"网络异常"。
 * 也避免 interpretBusinessBody 在成功路径外与 onFetchError 两处同时弹错。
 */
function interpretBusinessBody(
  body: unknown,
  response: Response,
): Partial<AfterFetchContext> {
  if (!isBusinessResponse(body)) return { data: body, response }
  if (body.code === SUCCESS_CODE) return { data: body.data, response }
  throw new BusinessError(body.code, body.msg || '请求失败')
}

/**
 * 401 后用新 token 重放原始请求。
 *
 * 手动 fetch 以绕过 afterFetch 二次触发——若用 execute() 重放，外层 .then()
 * 会用 401 响应体覆盖内层重放写入的 data，导致 data.value 变为 undefined。
 */
async function retryAfterRefresh(
  ctx: AfterFetchContext,
): Promise<Partial<AfterFetchContext>> {
  const newToken = await refreshAccessToken()
  if (!newToken) return { data: null, response: ctx.response }

  const { url, options } = ctx.context
  const headers = new Headers(options.headers ?? {})
  headers.set('Authorization', `Bearer ${newToken}`)
  if (csrfEnabled) {
    try {
      const csrf = await resolveCsrf()
      headers.set(csrf.headerName, csrf.token)
    } catch {
      // CSRF 获取失败不阻塞：后端将返回 403 走正常错误处理
    }
  }

  try {
    const retryRes = await fetch(url, { ...options, headers })
    const retryBody = await retryRes.clone().json().catch(() => null)
    // 刷新后仍 401 → token 确已失效，清空会话
    if (isBusinessResponse(retryBody) && retryBody.code === UNAUTHORIZED_CODE) {
      clearSession()
      return { data: null, response: retryRes }
    }
    return interpretBusinessBody(retryBody, retryRes)
  } catch (error) {
    if (isAbortError(error)) {
      return { data: null, response: ctx.response }
    }
    // BusinessError 来自 interpretBusinessBody（业务层返回非 200），
    // 必须向外透传——否则会被 showError("网络异常") 覆盖真实错误信息。
    if (isBusinessError(error)) {
      throw error
    }
    showError('网络异常')
    return { data: null, response: ctx.response }
  }
}

// ────────────────────────────────────────────────────────────
// createFetch 实例
// ────────────────────────────────────────────────────────────

const _fetch = createFetch({
  baseUrl: BASE_URL,
  options: {
    timeout: REQUEST_TIMEOUT,

    async beforeFetch({ options }: BeforeFetchContext) {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
      }

      // CSRF：仅当 setCsrfEnabled(true) 开启时注入。cookie 优先（快），接口回退。
      // 后端仅对 /auth/csrf 豁免，其余请求（含 /auth/login）均需携带；
      // /auth/csrf 自身由 resolveCsrf → fetchCsrfToken 通过 raw useFetch 发起，不经过此处。
      if (csrfEnabled) {
        try {
          const csrf = await resolveCsrf()
          headers[csrf.headerName] = csrf.token
        } catch {
          // CSRF 获取失败不阻塞请求，后端 403 时由 onFetchError 兜底
        }
      }

      // 鉴权 token
      const token = getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`

      // FormData：移除默认 JSON Content-Type，交由浏览器设置 multipart boundary
      if (
        options.body instanceof FormData &&
        headers['Content-Type'] === 'application/json'
      ) {
        delete headers['Content-Type']
      }

      options.headers = headers
      return { options }
    },

    async afterFetch(ctx: AfterFetchContext) {
      const body = ctx.data
      // 401 且非鉴权接口 → 刷新 token 后重放一次；
      // 鉴权接口（如 /auth/login）返回 401 表示凭证错误，直接走业务错误提示
      if (
        isBusinessResponse(body) &&
        body.code === UNAUTHORIZED_CODE &&
        !isAuthEndpoint(ctx.context.url)
      ) {
        return retryAfterRefresh(ctx)
      }
      return interpretBusinessBody(body, ctx.response)
    },

    onFetchError(ctx: OnFetchErrorContext) {
      // 主动取消（切页/重复搜索中断旧请求）不算异常，不提示
      if (isAbortError(ctx.error)) {
        return { error: ctx.error, data: ctx.data }
      }
      // ① 来自 interpretBusinessBody / retryAfterRefresh 的业务错误
      //    （HTTP 200 + body.code !== 200，已在 afterFetch 内 throw）
      if (isBusinessError(ctx.error)) {
        showError(ctx.error.message, ctx.error.code)
        return { error: ctx.error, data: ctx.data }
      }
      // ② HTTP 非 2xx 时后端写回的 {code,msg,error} 体（防御性兜底）
      if (isBusinessResponse(ctx.data)) {
        showError(ctx.data.msg || '请求失败', ctx.data.code)
        return { error: ctx.error, data: ctx.data }
      }
      // ③ 纯网络断开 / fetch 失败 / DNS 错误等
      showError('网络异常', ctx.response?.status)
      return { error: ctx.error, data: ctx.data }
    },
  },

  fetchOptions: {
    mode: 'cors',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  },
})

// ────────────────────────────────────────────────────────────
// 类型化导出
//
// createFetch 返回的 useFetch，其 .json() 类型参数默认 any，会丢掉调用方
// 在 useRequest<T>() 上声明的 T，导致 api 层实际无类型。这里把 T 透传到 .json()。
// ────────────────────────────────────────────────────────────

type JsonReturn<T> = UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>

type TypedFetch = <T = unknown>(
  url: string,
  options?: RequestInit & UseFetchOptions,
) => Omit<UseFetchReturn<T>, 'json'> & {
  json(): JsonReturn<T>
}

/**
 * vueuse 的 .json() 返回的 thenable 在 fetch 失败（或 afterFetch 抛业务错）时
 * 仍 resolve（只看 isFinished），导致 `await api.xxx()` 不会 throw，
 * 调用方在 await 后的 showSuccess 会在失败时误执行。
 *
 * wrapJsonResult 覆盖 then：先等 fetch 完成、检查 error ref，
 * 有错误（非主动 abort）时让 Promise 进入 rejected 状态，
 * 使 await reject、调用方 catch 得以触发。
 *
 * 必须用两层 .then：第一层做 error 检查（throw → Promise reject），
 * 第二层接住 reject 调用调用方的 onRejected。
 */
function wrapJsonResult(shell: JsonReturn<unknown>): JsonReturn<unknown> {
  const originalThen = shell.then.bind(shell)
  // oxlint-disable-next-line unicorn/no-thenable -- shell 已为 PromiseLike（JsonReturn<T>），此处覆盖 then 以修复 vueuse .json() 不 reject 的问题
  ;(shell as { then: unknown }).then = function (
    onFulfilled: ((value: UseFetchReturn<unknown>) => unknown) | null | undefined,
    onRejected: ((reason: unknown) => unknown) | null | undefined,
  ) {
    return originalThen(
      (s: UseFetchReturn<unknown>) => {
        const err = (s as { error?: { value: unknown } }).error?.value
        if (err && !isAbortError(err)) throw err
        return s
      },
      undefined,
    ).then(onFulfilled, onRejected)
  }
  return shell
}

/**
 * 覆盖 createFetch 返回实例的 .json()：
 * .json() 被调用时，先拿原始返回（类型化壳），再用 wrapJsonResult 改造其 then，
 * 从而让业务/网络错误时 await 也能 reject，同时保留泛型 T 透传。
 */
export const useRequest = ((url: string, options?: RequestInit & UseFetchOptions) => {
  // 注意：当 options 为 undefined 时，不向 _fetch 传第二个参数。
  // createFetch 内部 useFactoryFetch 读取 args[0] 时，args.length === 0 才走"无 RequestInit"分支；
  // 若 args.length === 1 且值为 undefined，会被当成 RequestInit 对象访问 .headers → TypeError。
  const instance = options === undefined ? _fetch(url) : _fetch(url, options)
  const originalJson = instance.json.bind(instance)
  ;(instance as { json: () => JsonReturn<unknown> }).json = function () {
    return wrapJsonResult(originalJson())
  }
  return instance
}) as unknown as TypedFetch
