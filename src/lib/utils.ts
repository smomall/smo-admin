import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化 JS Date 为指定字符串
 */
function formatJsDate(d: Date, withTime: boolean): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (!withTime) return date
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 格式化日期时间，与后端格式一致：yyyy-MM-dd HH:mm:ss
 * 后端 OffsetDateTimeSerializer 已按服务器时区转为该格式字符串，
 * 因此后端返回的字符串直接截取前 19 位即可，避免前端时区二次转换。
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-'
  if (value instanceof Date) {
    return formatJsDate(value, true)
  }
  const s = value.trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    return s.substring(0, 19)
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return formatJsDate(d, true)
}

/**
 * 格式化日期，与后端格式一致：yyyy-MM-dd
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-'
  if (value instanceof Date) {
    return formatJsDate(value, false)
  }
  const s = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10)
  }
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return formatJsDate(d, false)
}

/**
 * 将后端返回的 yyyy-MM-dd HH:mm:ss 转为 <input type="datetime-local"> 所需的 yyyy-MM-ddTHH:mm。
 * 全程纯字符串操作，避免 new Date() 导致的时区二次偏移。
 */
export function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(' ', 'T').substring(0, 16)
}

/**
 * 将 <input type="datetime-local"> 输出的 yyyy-MM-ddTHH:mm 转回后端期望的 yyyy-MM-dd HH:mm:ss。
 * 缺失的秒补 :00。空值原样返回。
 */
export function fromLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const s = value.replace('T', ' ')
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s) ? `${s}:00` : s
}

/**
 * 将后端返回的 yyyy-MM-dd HH:mm:ss 转为 <input type="date"> 所需的 yyyy-MM-dd。
 */
export function toLocalDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.substring(0, 10)
}

/**
 * 将 <input type="date"> 输出的 yyyy-MM-dd 转回后端期望的 yyyy-MM-dd HH:mm:ss。
 * 不足的时间部分补 00:00:00。空值原样返回。
 */
export function fromLocalDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 00:00:00` : value
}

/**
 * 安全地把后端 yyyy-MM-dd HH:mm:ss 字符串解析为本地时间的 Date 实例。
 * 直接 new Date('yyyy-MM-dd HH:mm:ss') 在部分浏览器（如 Safari）会被当作 UTC 解析，
 * 导致相对时间计算出现时区偏移。先转换为 ISO yyyy-MM-ddTHH:mm:ss 再解析可保证按本地时间处理。
 */
export function parseLocalDateTime(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value.replace(' ', 'T'))
  return isNaN(d.getTime()) ? null : d
}
