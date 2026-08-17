<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, Globe } from '@lucide/vue'
import type { Site } from '@/types'
import { siteApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const {
  items: siteStatusItems,
  fetchDict: fetchSiteStatus,
  getLabel: getStatusLabel,
} = useDict('common_status')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchTitle = ref('')
const searchDomain = ref('')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  title: '',
  domain: '',
  keywords: '',
  description: '',
  status: '1',
  remark: '',
})

const {
  list: sites,
  loading,
  currentPage,
  pageSize,
  total,
  isEmpty,
  goto,
  search: handleSearch,
  reload: reloadSites,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => siteApi.list(query),
  params: () => ({
    title: searchTitle.value,
    domain: searchDomain.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
  }),
})

onMounted(() => {
  fetchSiteStatus()
})

function handleReset() {
  searchTitle.value = ''
  searchDomain.value = ''
  searchStatus.value = '__all__'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    title: '',
    domain: '',
    keywords: '',
    description: '',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(site: Site) {
  isEdit.value = true
  formData.value = {
    id: site.id,
    title: site.title,
    domain: site.domain || '',
    keywords: site.keywords || '',
    description: site.description || '',
    status: String(site.status),
    remark: site.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除站点', '确定要删除该站点吗？')
  if (!confirmed) return
  try {
    await siteApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.title) {
    showError('请填写站点名称')
    return
  }
  try {
    if (isEdit.value) {
      await siteApi.update(formData.value.id as string, formData.value)
    } else {
      await siteApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadSites()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd">
        <Plus class="w-4 h-4 mr-2" />
        新增站点
      </Button>
    </div>

    <div class="bg-card rounded-xl border shadow-sm p-4">
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          v-model="searchTitle"
          placeholder="站点名称"
          class="w-36"
          @keyup.enter="handleSearch"
        />
        <Input
          v-model="searchDomain"
          placeholder="域名"
          class="w-40"
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

    <div class="bg-card rounded-xl border shadow-sm">
      <div
        v-if="loading"
        class="p-12 flex items-center justify-center text-muted-foreground text-sm"
      >
        <div
          class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
        ></div>
        加载中...
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>站点名称</TableHead>
            <TableHead>域名</TableHead>
            <TableHead>关键词</TableHead>
            <TableHead>描述</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="site in sites" :key="site.id">
            <TableCell>{{ site.id }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Globe class="w-4 h-4 text-primary" />
                <span class="font-medium">{{ site.title }}</span>
              </div>
            </TableCell>
            <TableCell>
              <a
                v-if="site.domain"
                :href="site.domain.startsWith('http') ? site.domain : `https://${site.domain}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline text-sm truncate max-w-[200px] inline-block align-middle"
                :title="site.domain"
              >
                {{ site.domain }}
              </a>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="max-w-xs truncate text-muted-foreground">
              {{ site.keywords || '-' }}
            </TableCell>
            <TableCell class="max-w-xs truncate text-muted-foreground">
              {{ site.description || '-' }}
            </TableCell>
            <TableCell>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="'bg-secondary text-secondary-foreground'"
              >
                {{ getStatusLabel(site.status) }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ site.remark || '-' }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="handleEdit(site)">
                  <Edit class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="handleDelete(site.id)">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="isEmpty">
            <TableCell colspan="8" class="text-center text-muted-foreground py-12">
              <div class="inline-flex flex-col items-center gap-2">
                <svg
                  class="w-10 h-10 opacity-30"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                  <path
                    d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
                  />
                </svg>
                <span class="text-sm">暂无数据</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <TablePagination
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @change="goto"
    />

    <Dialog v-model:open="showDialog">
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑站点' : '新增站点' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改站点信息' : '创建新站点' }}</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="title">站点名称 <span class="text-destructive">*</span></Label>
            <Input id="title" v-model="formData.title" placeholder="请输入站点名称" />
          </div>
          <div class="space-y-2">
            <Label for="domain">域名</Label>
            <Input
              id="domain"
              v-model="formData.domain"
              placeholder="例如: example.com"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="keywords">关键词</Label>
            <Input
              id="keywords"
              v-model="formData.keywords"
              placeholder="请输入关键词，多个用逗号分隔"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="description">描述</Label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="3"
              placeholder="请输入站点描述"
            />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="siteStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="remark">备注</Label>
            <Textarea id="remark" v-model="formData.remark" rows="2" placeholder="备注信息" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
