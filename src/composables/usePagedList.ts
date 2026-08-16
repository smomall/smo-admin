import { ref, computed, type Ref } from 'vue'
import type { PageResult } from '@/types'

export interface PagedQuery {
  pageNumber: number
  pageSize: number
}

/**
 * 分页接口的返回值。
 * 刻意写成结构类型而非 `UseFetchReturn`：api 层 `.json()` 返回的是 PromiseLike，
 * 且 data 是 ShallowRef，用结构类型可以避免这些差异带来的赋值不兼容。
 */
type PagedResponse<T> = { data: { value: PageResult<T> | null } }

export interface PagedListOptions<T, P extends Record<string, unknown>> {
  /** 分页请求，接收合并后的分页与筛选参数 */
  fetcher: (query: PagedQuery & P) => PromiseLike<PagedResponse<T>>
  /**
   * 筛选条件。必须是 getter：每次请求都重新读取，
   * 这样翻页、删除后刷新都会自动带上当前的搜索条件，不会像手工传参那样漏掉。
   */
  params?: () => P
  pageSize?: number
  /** 创建时立即加载第一页，默认 true */
  immediate?: boolean
}

/**
 * 列表页分页状态与取数逻辑。
 *
 * 统一解决各列表页手写分页时的三类问题：
 * 1. 翻页/删除后刷新丢失搜索条件（条件改为 getter 读取）；
 * 2. 快速翻页或连续搜索时旧响应覆盖新数据（请求序号丢弃过期响应）；
 * 3. 页码边界、条目区间等派生计算在模板里重复书写。
 */
export function usePagedList<T, P extends Record<string, unknown> = Record<string, never>>(
  options: PagedListOptions<T, P>,
) {
  const { fetcher, params, pageSize: initialPageSize = 10, immediate = true } = options

  const list = ref([]) as Ref<T[]>
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(initialPageSize)
  const total = ref(0)

  const totalPages = computed(() => (total.value ? Math.ceil(total.value / pageSize.value) : 0))
  const rangeStart = computed(() =>
    total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1,
  )
  const rangeEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))
  const hasPrev = computed(() => currentPage.value > 1)
  const hasNext = computed(() => currentPage.value < totalPages.value)
  const isEmpty = computed(() => !loading.value && list.value.length === 0)

  // 请求序号，只有最后一次请求的结果会被写入，防止过期响应覆盖新数据
  let requestId = 0

  async function load(pageNumber = currentPage.value) {
    currentPage.value = pageNumber
    const id = ++requestId
    loading.value = true
    try {
      const query = {
        ...(params ? params() : ({} as P)),
        pageNumber,
        pageSize: pageSize.value,
      } as PagedQuery & P
      const { data } = await fetcher(query)
      if (id !== requestId) return
      list.value = data.value?.records ?? []
      total.value = data.value?.totalRow ?? 0
    } catch {
      // 请求层（useRequest）已统一弹出错误提示并把 data 置空，这里只需保证
      // 不产生未捕获的 Promise 拒绝（immediate 首次加载没有调用方 await）
      if (id === requestId) {
        list.value = []
        total.value = 0
      }
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  /** 条件变化后重新从第一页开始查询 */
  function search() {
    return load(1)
  }

  /** 保持当前页刷新 */
  function reload() {
    return load(currentPage.value)
  }

  function goto(page: number) {
    if (page < 1) return
    if (totalPages.value && page > totalPages.value) return
    return load(page)
  }

  function prev() {
    return goto(currentPage.value - 1)
  }

  function next() {
    return goto(currentPage.value + 1)
  }

  /** 删除后刷新：当前页被删空时自动回退一页，避免停在空白页 */
  function reloadAfterRemove(removed = 1) {
    const page =
      list.value.length <= removed && currentPage.value > 1
        ? currentPage.value - 1
        : currentPage.value
    return load(page)
  }

  function setPageSize(size: number) {
    pageSize.value = size
    return load(1)
  }

  if (immediate) load(1)

  return {
    list,
    loading,
    currentPage,
    pageSize,
    total,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPrev,
    hasNext,
    isEmpty,
    load,
    search,
    reload,
    goto,
    prev,
    next,
    reloadAfterRemove,
    setPageSize,
  }
}
