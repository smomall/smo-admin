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
