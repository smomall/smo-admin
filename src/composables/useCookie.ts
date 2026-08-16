/**
 * Cookie 工具函数。
 * 注意：HttpOnly cookie 无法通过 document.cookie 读取；
 *       此时 getCookie 返回空字符串，由调用方回退到接口获取方式。
 */

export function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const prefix = `${encodeURIComponent(name)}=`
  for (const raw of document.cookie.split(';')) {
    const item = raw.trimStart()
    if (item.startsWith(prefix)) {
      try {
        return decodeURIComponent(item.slice(prefix.length))
      } catch {
        return item.slice(prefix.length)
      }
    }
  }
  return ''
}

export function setCookie(name: string, value: string, options?: {
  path?: string
  domain?: string
  maxAge?: number
  expires?: Date
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}): void {
  if (typeof document === 'undefined') return
  const parts: string[] = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]
  if (options?.path) parts.push(`path=${options.path}`)
  if (options?.domain) parts.push(`domain=${options.domain}`)
  if (options?.maxAge != null) parts.push(`max-age=${options.maxAge}`)
  if (options?.expires) parts.push(`expires=${options.expires.toUTCString()}`)
  if (options?.secure) parts.push('secure')
  if (options?.sameSite) parts.push(`samesite=${options.sameSite}`)
  document.cookie = parts.join('; ')
}

export function removeCookie(name: string, options?: { path?: string; domain?: string }): void {
  setCookie(name, '', { ...options, maxAge: -1 })
}
