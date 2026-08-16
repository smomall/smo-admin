export type QueryValue = string | number | boolean | undefined | null

/**
 * 构建查询串，统一处理空值与编码。
 *
 * 空值（undefined / null / 空字符串）一律视为“不筛选”并跳过，
 * 因此调用方可以直接把 `status: '' ` 之类的空筛选条件传进来。
 * 返回值带 `?` 前缀，无有效参数时返回空串。
 */
export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return ''

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    searchParams.set(key, String(value))
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}
