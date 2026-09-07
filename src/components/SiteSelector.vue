<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from '@lucide/vue'
import { siteApi } from '@/api/cms'
import { usePagedList } from '@/composables/usePagedList'
import TablePagination from '@/components/TablePagination.vue'
import { useDict } from '@/composables/useDict'
import { DICT } from '@/constants/dict'
import type { Site } from '@/types'

const props = defineProps<{
  open: boolean
  /** 选中的站点 id */
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:modelValue': [id: string]
  confirm: [site: Site]
}>()

const searchKeyword = ref('')
const selectedId = ref<string | undefined>(props.modelValue)

const { getLabel: getStatusLabel } = useDict(DICT.COMMON_STATUS)

/**
 * 站点分页列表 —— 复用 usePagedList
 */
const {
  list: sites,
  loading,
  total,
  currentPage: pageNumber,
  pageSize,
  search: fetchPage,
  goto: goToPage,
} = usePagedList<Site, { title?: string }>({
  fetcher: (params) => siteApi.list(params),
  params: () => ({ title: searchKeyword.value || undefined }),
  pageSize: 10,
  immediate: false,
})

const handleSearch = () => {
  fetchPage()
}

const handleReset = () => {
  searchKeyword.value = ''
  fetchPage()
}

const handleSelect = (site: Site) => {
  selectedId.value = site.id
}

const handleConfirm = () => {
  const site = sites.value.find((s) => s.id === selectedId.value)
  if (site) {
    emit('update:modelValue', site.id)
    emit('confirm', site)
  }
  emit('update:open', false)
}

const handleCancel = () => {
  emit('update:open', false)
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      selectedId.value = props.modelValue
      fetchPage()
    }
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-[720px]">
      <DialogHeader>
        <DialogTitle>选择站点</DialogTitle>
      </DialogHeader>

      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchKeyword"
            placeholder="搜索站点名称"
            class="pl-8"
            @keyup.enter="handleSearch"
          />
        </div>
        <Button variant="default" size="sm" @click="handleSearch">搜索</Button>
        <Button variant="outline" size="sm" @click="handleReset">重置</Button>
      </div>

      <div class="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-12"></TableHead>
              <TableHead>站点名称</TableHead>
              <TableHead>域名</TableHead>
              <TableHead class="w-24">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="site in sites" :key="site.id" @click="handleSelect(site)">
              <TableCell>
                <input
                  type="radio"
                  :value="site.id"
                  v-model="selectedId"
                  class="h-4 w-4"
                />
              </TableCell>
              <TableCell class="font-medium">{{ site.title }}</TableCell>
              <TableCell class="text-muted-foreground">{{ site.domain }}</TableCell>
              <TableCell>
                <Badge variant="secondary" class="font-normal">
                  {{ getStatusLabel(String(site.status)) }}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow v-if="!loading && sites.length === 0">
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">
                暂无数据
              </TableCell>
            </TableRow>
            <TableRow v-if="loading">
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">
                加载中...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <TablePagination
        :current-page="pageNumber"
        :page-size="pageSize"
        :total="total"
        :compact="true"
        @change="goToPage"
      />

      <DialogFooter>
        <Button variant="outline" @click="handleCancel">取消</Button>
        <Button @click="handleConfirm" :disabled="!selectedId">确定</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
