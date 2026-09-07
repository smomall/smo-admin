import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import type { DictSelectResult, DictItemOption } from '@/types'
import { dictApi } from '@/api/system'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/constants/storage'

// ================================================
// 全量字典缓存（内存 + localStorage 双层）
// 缓存策略：
//   1. 应用启动时调用 preloadAllDict()，优先读 localStorage
//   2. 若 localStorage 无数据，调 /dict/all 拉全量并写入缓存
//   3. useDict(xxx) 读取时，内存有则直接返回
//   4. 内存无 → 查 localStorage → 还没有才调 /dict/select/{code} 单条加载
// ================================================

/** 内存缓存：dictCode → DictSelectResult */
const dictMemoryCache = new Map<string, DictSelectResult>()

/** 单条字典在途请求去重：dictCode → Promise */
const inflight = new Map<string, Promise<DictSelectResult | null>>()

/** 全量加载在途请求（并发时共享同一次全量请求） */
let allInflight: Promise<Record<string, DictSelectResult>> | null = null

let preloaded = false

/** 从 localStorage 恢复缓存 */
function hydrateFromStorage(): boolean {
  const raw = readStorage(STORAGE_KEYS.DICT_CACHE)
  if (!raw) return false
  try {
    const data = JSON.parse(raw) as Record<string, DictSelectResult>
    for (const [code, dict] of Object.entries(data)) {
      if (dict?.items) dictMemoryCache.set(code, dict)
    }
    return dictMemoryCache.size > 0
  } catch {
    return false
  }
}

/** 把内存缓存写入 localStorage */
function persistToStorage() {
  const obj: Record<string, DictSelectResult> = {}
  for (const [code, dict] of dictMemoryCache) {
    obj[code] = dict
  }
  writeStorage(STORAGE_KEYS.DICT_CACHE, JSON.stringify(obj))
}

/**
 * 全量预加载字典。
 *
 * 优先从 localStorage 恢复；若无则调后端 /dict/all 接口拉取全量。
 * 应用启动时调用一次即可。
 */
export async function preloadAllDict(): Promise<void> {
  if (preloaded) return

  // 先尝试从 localStorage 恢复
  const hasCache = hydrateFromStorage()
  if (hasCache) {
    preloaded = true
    // 后台静默刷新一次，保证数据不过时（不阻塞）
    fetchAllDict().catch(() => {
      /* 静默失败，使用本地缓存即可 */
    })
    return
  }

  // 无本地缓存，等待全量请求完成
  await fetchAllDict()
}

/**
 * 调用 /dict/all 拉取全量字典并写入缓存。
 * 并发共享同一次请求。
 */
async function fetchAllDict(): Promise<Record<string, DictSelectResult>> {
  if (allInflight) return allInflight

  allInflight = (async () => {
    const { data } = await dictApi.all()
    const result = data.value || {}
    for (const [code, dict] of Object.entries(result)) {
      if (dict?.items) dictMemoryCache.set(code, dict)
    }
    persistToStorage()
    preloaded = true
    return result
  })()

  try {
    return await allInflight
  } finally {
    allInflight = null
  }
}

/**
 * 单条加载字典（兜底：全量加载失败或字典不在全量结果中时使用）。
 * 并发去重，同一字典编码只发一次请求。
 */
async function loadSingleDict(code: string): Promise<DictSelectResult | null> {
  const cached = inflight.get(code)
  if (cached) return cached

  const p = (async () => {
    try {
      const { data } = await dictApi.select(code)
      const result = data.value || null
      if (result) {
        dictMemoryCache.set(code, result)
        persistToStorage()
      }
      return result
    } catch {
      return null
    } finally {
      inflight.delete(code)
    }
  })()

  inflight.set(code, p)
  return p
}

/**
 * 失效指定字典缓存（编辑字典后调用）。
 * 不传参数则清空全部缓存。
 */
export function invalidateDict(code?: string) {
  if (code) {
    dictMemoryCache.delete(code)
  } else {
    dictMemoryCache.clear()
  }
  persistToStorage()
}

// ================================================
// useDict —— 响应式字典
// ================================================

export function useDict(codeGetter: string | Ref<string> | (() => string)) {
  const getCode =
    typeof codeGetter === 'function'
      ? (codeGetter as () => string)
      : typeof codeGetter === 'string'
        ? () => codeGetter
        : () => (codeGetter as Ref<string>).value

  const dict = shallowRef<DictSelectResult | null>(null)
  const loading = ref(false)

  const items = computed<DictItemOption[]>(() => dict.value?.items ?? [])
  const name = computed<string>(() => dict.value?.name ?? '')
  const code = computed<string>(() => dict.value?.code ?? '')

  /** value → label 快速查找 */
  const labelMap = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const item of items.value) {
      map[String(item.value)] = item.label
    }
    return map
  })

  function getLabel(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return ''
    return labelMap.value[String(value)] || String(value)
  }

  async function fetchDict() {
    const code = getCode()
    if (!code) {
      dict.value = null
      return
    }

    // 1. 内存命中
    const cached = dictMemoryCache.get(code)
    if (cached) {
      dict.value = cached
      return
    }

    // 2. 全量加载未完成，先触发一次全量加载
    if (!preloaded) {
      try {
        await fetchAllDict()
        const fromAll = dictMemoryCache.get(code)
        if (fromAll) {
          dict.value = fromAll
          return
        }
      } catch {
        // 全量加载失败，走单条兜底
      }
    }

    // 3. 单条加载（兜底）
    loading.value = true
    try {
      const result = await loadSingleDict(code)
      dict.value = result
    } finally {
      loading.value = false
    }
  }

  function apply(result: DictSelectResult | null) {
    dict.value = result
  }

  watch(
    () => getCode(),
    (newCode) => {
      if (newCode && dictMemoryCache.has(newCode)) {
        apply(dictMemoryCache.get(newCode)!)
      } else if (!newCode) {
        apply(null)
      } else {
        fetchDict()
      }
    },
    { immediate: true },
  )

  return {
    items,
    name,
    code,
    loading,
    dict,
    labelMap,
    getLabel,
    fetchDict,
    invalidate: (c?: string) => invalidateDict(c),
  }
}
