import { ref, computed, shallowRef } from 'vue'
import type { DictSelectResult, DictItemOption } from '@/types'
import { dictApi } from '@/api'

/**
 * 字典数据全局缓存。
 * 字典是低频变更的枚举数据，同一 code 在多个组件中被反复使用（如 common_status 有十余处），
 * 这里按 code 缓存结果并合并在途请求，避免重复请求。
 */
const dictCache = new Map<string, DictSelectResult>()
const inflight = new Map<string, Promise<DictSelectResult | null>>()

/** 字典数据变更后调用，使缓存失效以便重新拉取 */
export function invalidateDict(code?: string) {
  if (code) {
    dictCache.delete(code)
    inflight.delete(code)
  } else {
    dictCache.clear()
    inflight.clear()
  }
}

async function loadDict(code: string): Promise<DictSelectResult | null> {
  const cached = dictCache.get(code)
  if (cached) return cached

  const pending = inflight.get(code)
  if (pending) return pending

  const task = (async () => {
    try {
      const { data } = await dictApi.select(code)
      const result = data.value || null
      if (result) dictCache.set(code, result)
      return result
    } catch (e) {
      console.error(`[useDict] 加载字典[${code}]失败:`, e)
      return null
    } finally {
      inflight.delete(code)
    }
  })()

  inflight.set(code, task)
  return task
}

export function useDict(dictTypeCode: string | (() => string)) {
  const dict = shallowRef<DictSelectResult | null>(null)
  const loading = ref(false)
  const items = ref<DictItemOption[]>([])

  const labelMap = computed(() => {
    const map = new Map<string, string>()
    items.value.forEach((item) => {
      map.set(String(item.value), item.label)
    })
    return map
  })

  function getCode() {
    return typeof dictTypeCode === 'function' ? dictTypeCode() : dictTypeCode
  }

  function apply(result: DictSelectResult | null) {
    dict.value = result
    items.value = result?.items || []
  }

  /**
   * 拉取字典。命中缓存时同步返回，不产生请求；
   * 并发调用会共享同一个在途请求，因此页面里 onMounted 再调一次也是安全的。
   */
  async function fetchDict() {
    const code = getCode()
    if (!code) return

    const cached = dictCache.get(code)
    if (cached) {
      apply(cached)
      return
    }

    loading.value = true
    try {
      apply(await loadDict(code))
    } finally {
      loading.value = false
    }
  }

  // 自动加载，组件只需 getLabel 时无需手动调用
  fetchDict()

  async function fetchItems() {
    await fetchDict()
  }

  function getLabel(value: string | number | undefined, defaultValue = '-'): string {
    if (value === undefined || value === null) return defaultValue
    const str = String(value)
    return labelMap.value.get(str) || defaultValue
  }

  return {
    dict,
    items,
    loading,
    fetchDict,
    fetchItems,
    getLabel,
  }
}
