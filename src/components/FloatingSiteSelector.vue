<script setup lang="ts">
import { DICT } from '@/constants/dict'
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Globe, Search, Check, ChevronsUpDown, ChevronLeft, ChevronRight, LoaderCircle, X } from '@lucide/vue'
import type { Site } from '@/types'
import { siteApi } from '@/api'
import { useTabStore } from '@/stores/tab'
import { useSiteStore } from '@/stores/site'
import { useDict } from '@/composables/useDict'

const router = useRouter()
const route = useRoute()
const tabStore = useTabStore()
const siteStore = useSiteStore()

const open = ref(false)
const sites = ref<Site[]>([])
const searchTitle = ref('')
const loading = ref(false)
const pageNumber = ref(1)
const pageSize = 50
const total = ref(0)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

// 拖拽状态
const pos = ref({ left: 0, top: 0 })
const isDragging = ref(false)
const moved = ref(false)
const hasDragged = ref(false)
let start = { x: 0, y: 0 }
let startLeft = 0
let startTop = 0

const currentSiteId = computed(() => route.query.siteId as string | undefined)

const { getLabel: getStatusLabel } = useDict(DICT.COMMON_STATUS)

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  moved.value = false
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  start = { x: e.clientX, y: e.clientY }
  startLeft = rect.left
  startTop = rect.top
  el.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (!moved.value && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved.value = true
  if (!moved.value) return
  const el = e.currentTarget as HTMLElement
  const left = Math.min(Math.max(0, startLeft + dx), window.innerWidth - el.offsetWidth)
  const top = Math.min(Math.max(0, startTop + dy), window.innerHeight - el.offsetHeight)
  pos.value = { left, top }
  hasDragged.value = true
}

function onPointerUp() {
  isDragging.value = false
}

function onClick() {
  // 拖拽结束后触发 click，忽略，避免误开面板
  if (moved.value) {
    moved.value = false
    return
  }
  handleOpenChange(!open.value)
}

async function fetchSites() {
  loading.value = true
  try {
    const { data } = await siteApi.list({
      pageNumber: pageNumber.value,
      pageSize,
      title: searchTitle.value.trim() || undefined,
    })
    sites.value = data.value?.records ?? []
    total.value = data.value?.totalRow ?? 0
  } finally {
    loading.value = false
  }
}

function goPage(page: number) {
  if (page < 1 || page > totalPages.value || page === pageNumber.value) return
  pageNumber.value = page
  fetchSites()
}

function handleOpenChange(value: boolean) {
  open.value = value
  if (value) fetchSites()
}

watch(searchTitle, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNumber.value = 1
    fetchSites()
  }, 300)
})

function handleSelect(site: Site) {
  // 先收集可关闭 tab 的 id，避免遍历过程中修改数组导致漏删
  const closableTabIds = tabStore.tabs.filter((tab) => tab.closable).map((tab) => tab.id)
  closableTabIds.forEach((id) => tabStore.removeTab(id))
  siteStore.setCurrentSite(site)
  router.push({ path: route.path, query: { siteId: site.id } })
  open.value = false
}

onMounted(async () => {
  if (currentSiteId.value) {
    // URL 里已有 siteId，按 id 拉取
    const { data } = await siteApi.getById(currentSiteId.value)
    if (data.value) {
      siteStore.setCurrentSite(data.value)
      return
    }
  }
  // 没有 siteId 或查不到 → 自动选列表中的第一个站点并写入 URL query
  try {
    const { data } = await siteApi.list({ pageNumber: 1, pageSize: 1 })
    const first = data.value?.records?.[0]
    if (first) {
      siteStore.setCurrentSite(first)
      router.replace({
        path: route.path,
        query: { ...route.query, siteId: first.id },
      })
    }
  } catch {
    // 取列表失败则保持空状态
  }
})

watch(
  () => route.query.siteId,
  async (newSiteId) => {
    if (!newSiteId) return
    // 已是当前站点则跳过，避免选择站点后重复拉取
    if (newSiteId === siteStore.currentSite?.id) return
    const { data } = await siteApi.getById(newSiteId as string)
    if (data.value) {
      siteStore.setCurrentSite(data.value)
    }
  },
)
</script>

<template>
  <Popover :open="open" @update:open="handleOpenChange">
    <PopoverAnchor as-child>
      <button
        class="fixed z-20 flex items-center gap-2 h-10 pl-3 pr-2 rounded-full border bg-background/95 backdrop-blur shadow-lg hover:shadow-xl cursor-pointer select-none touch-none"
        :class="[
          hasDragged ? 'right-auto bottom-auto' : 'right-6 bottom-6',
          !isDragging ? 'transition-all duration-200 hover:-translate-y-0.5' : '',
        ]"
        :style="hasDragged ? { left: `${pos.left}px`, top: `${pos.top}px` } : undefined"
        title="切换站点"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @click="onClick"
      >
        <Globe class="w-4 h-4 text-primary shrink-0" />
        <span class="text-sm font-medium max-w-40 truncate">
          {{ siteStore.currentSite?.title || '选择站点' }}
        </span>
        <ChevronsUpDown class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>
    </PopoverAnchor>

    <PopoverContent align="end" class="w-80 p-0" :side-offset="8">
      <div class="flex items-center gap-2 px-3 border-b h-11">
        <Search class="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          v-model="searchTitle"
          placeholder="搜索站点名称"
          class="h-full border-0 shadow-none focus-visible:ring-0 p-0 bg-transparent"
        />
        <button
          v-if="searchTitle"
          class="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          @click="searchTitle = ''"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="max-h-72 overflow-y-auto p-1.5">
        <div v-if="loading" class="flex items-center justify-center py-10 text-muted-foreground">
          <LoaderCircle class="w-4 h-4 animate-spin mr-2" />
          加载中...
        </div>
        <template v-else>
          <button
            v-for="site in sites"
            :key="site.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-secondary/70 cursor-pointer"
            :class="{ 'bg-primary/10': site.id === currentSiteId }"
            @click="handleSelect(site)"
          >
            <div
              class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center shrink-0"
            >
              {{ site.title.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium truncate">{{ site.title }}</span>
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] leading-none shrink-0"
                  :class="
                    site.status === '1'
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ getStatusLabel(site.status) }}
                </span>
              </div>
              <div v-if="site.domain" class="text-xs text-muted-foreground truncate mt-0.5">
                {{ site.domain }}
              </div>
            </div>
            <Check v-if="site.id === currentSiteId" class="w-4 h-4 text-primary shrink-0" />
          </button>
          <div
            v-if="!loading && sites.length === 0"
            class="text-center py-10 text-sm text-muted-foreground"
          >
            暂无站点
          </div>
        </template>
      </div>

      <div
        v-if="total > 0"
        class="flex items-center justify-between px-3 h-10 border-t text-sm"
      >
        <span class="text-muted-foreground">共 {{ total }} 个</span>
        <div class="flex items-center gap-1">
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
            :disabled="pageNumber <= 1"
            @click="goPage(pageNumber - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="px-1 text-muted-foreground tabular-nums">
            {{ pageNumber }} / {{ totalPages }}
          </span>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
            :disabled="pageNumber >= totalPages"
            @click="goPage(pageNumber + 1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
