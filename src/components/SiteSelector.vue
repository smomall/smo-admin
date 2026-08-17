<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Globe } from '@lucide/vue'
import type { Site } from '@/types'
import { siteApi } from '@/api'
import { useTabStore } from '@/stores/tab'
import { useSiteStore } from '@/stores/site'
import { useDict } from '@/composables/useDict'
import DictSelect from '@/components/DictSelect.vue'

const router = useRouter()
const route = useRoute()
const tabStore = useTabStore()
const siteStore = useSiteStore()

const currentSiteId = computed(() => route.query.siteId as string)
const showDialog = ref(false)
const sites = ref<Site[]>([])
const searchTitle = ref('')
const searchStatus = ref<string>('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const {
  items: siteStatusItems,
  fetchDict: fetchSiteStatus,
  getLabel: getStatusLabel,
} = useDict('common_status')

async function fetchSites(pageNumber = 1) {
  currentPage.value = pageNumber
  loading.value = true
  try {
    const { data } = await siteApi.list({
      pageNumber,
      pageSize: pageSize.value,
      title: searchTitle.value || undefined,
      status: searchStatus.value !== '' ? searchStatus.value : undefined,
    })
    if (data.value) {
      sites.value = data.value.records
      total.value = data.value.totalRow
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchSites(1)
}

function handleReset() {
  searchTitle.value = ''
  searchStatus.value = ''
  currentPage.value = 1
  fetchSites(1)
}

function handleSiteSelect(site: Site) {
  const siteId = site.id
  // 先收集可关闭 tab 的 id，避免遍历过程中修改数组导致漏删
  const closableTabIds = tabStore.tabs.filter((tab) => tab.closable).map((tab) => tab.id)
  closableTabIds.forEach((id) => tabStore.removeTab(id))
  siteStore.setCurrentSite(site)
  router.push({ path: route.path, query: { siteId } })
  showDialog.value = false
}

function handleOpen() {
  fetchSites(1)
  fetchSiteStatus()
  showDialog.value = true
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
  <div class="relative">
    <Button
      variant="outline"
      size="sm"
      class="gap-2 h-8 min-w-[50px] justify-start text-center items-center"
      @click="handleOpen"
    >
      <Globe class="w-4 h-4 text-primary shrink-0" />
      <span class="flex-1 truncate text-left">
        {{ siteStore.currentSite?.title || '选择站点' }}
      </span>
    </Button>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Globe class="w-5 h-5" />
            选择站点
          </DialogTitle>
          <DialogDescription>选择一个站点进行管理操作</DialogDescription>
        </DialogHeader>

        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchTitle"
              placeholder="站点名称"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <DictSelect
              v-model="searchStatus"
              :dict-items="siteStatusItems"
              placeholder="全部状态"
              class="w-32"
            />
            <Button variant="outline" @click="handleSearch">搜索</Button>
            <Button variant="ghost" @click="handleReset">重置</Button>
          </div>
        </div>

        <div class="overflow-y-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>站点名称</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="site in sites"
                :key="site.id"
                class="cursor-pointer hover:bg-muted transition-colors"
                :class="{ 'bg-primary/10': site.id === route.query.siteId }"
                @click="handleSiteSelect(site)"
              >
                <TableCell>{{ site.id }}</TableCell>
                <TableCell class="font-medium">{{ site.title }}</TableCell>
                <TableCell class="text-muted-foreground text-sm">{{
                  site.domain || '-'
                }}</TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="'bg-secondary text-secondary-foreground'"
                  >
                    {{ getStatusLabel(site.status) }}
                  </span>
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ site.createdAt ? formatDate(site.createdAt) : '-' }}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" @click.stop="handleSiteSelect(site)">
                    选择
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="loading">
                <TableCell colspan="7" class="text-center py-8">
                  <p class="text-muted-foreground">加载中...</p>
                </TableCell>
              </TableRow>
              <TableRow v-else-if="sites.length === 0">
                <TableCell colspan="7" class="text-center py-8">
                  <p class="text-muted-foreground">暂无站点数据</p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex items-center justify-between py-4">
          <span class="text-sm text-muted-foreground">
            显示 {{ (currentPage - 1) * pageSize + 1 }} -
            {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
          </span>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === 1"
              @click="fetchSites(currentPage - 1)"
            >
              上一页
            </Button>
            <span class="px-4 text-sm">第 {{ currentPage }} 页</span>
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage >= Math.ceil(total / pageSize)"
              @click="fetchSites(currentPage + 1)"
            >
              下一页
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
