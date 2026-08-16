<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Edit, Trash2, ChevronLeft, List } from '@lucide/vue'
import type { DictType, DictItem } from '@/types'
import { dictApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const {
  fetchDict: fetchEnableStatus,
  items: enableStatusItems,
  getLabel,
} = useDict(() => 'common_status')

const isListView = ref(true) // true: 字典类型列表, false: 字典项列表
const loading = ref(false)
const dictTypes = ref<DictType[]>([])
const dictItems = ref<DictItem[]>([])
const searchName = ref('')
const searchCode = ref('')
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const currentDictType = ref<DictType | null>(null)

const formData = ref({
  id: '',
  name: '',
  code: '',
  status: '1',
  remark: '',
})

const itemFormData = ref({
  id: '',
  dictTypeId: '',
  label: '',
  value: '',
  sort: 0,
  status: '1',
  remark: '',
})

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const itemPage = ref(1)
const itemPageSize = ref(10)
const itemTotal = ref(0)

async function fetchDictTypes() {
  loading.value = true
  try {
    const { data } = await dictApi.typeList({
      pageNumber: page.value,
      pageSize: pageSize.value,
      name: searchName.value,
      code: searchCode.value,
      status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    })
    if (data.value) {
      dictTypes.value = data.value.records
      total.value = data.value.totalRow
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
}

async function fetchDictItems(dictTypeId: string) {
  try {
    const { data } = await dictApi.itemList(dictTypeId, {
      pageNumber: itemPage.value,
      pageSize: itemPageSize.value,
    })
    if (data.value) {
      dictItems.value = data.value.records
      itemTotal.value = data.value.totalRow
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

onMounted(() => {
  Promise.all([fetchDictTypes(), fetchEnableStatus()])
})

function handleSearch() {
  page.value = 1
  if (isListView.value) {
    fetchDictTypes()
  }
}

function handleReset() {
  searchName.value = ''
  searchCode.value = ''
  searchStatus.value = '__all__'
  page.value = 1
  fetchDictTypes()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchDictTypes()
}

function handleItemPageChange(newPage: number) {
  itemPage.value = newPage
  if (currentDictType.value) {
    fetchDictItems(currentDictType.value.id)
  }
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    name: '',
    code: '',
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(dict: DictType) {
  isEdit.value = true
  formData.value = {
    id: dict.id,
    name: dict.name,
    code: dict.code,
    status: String(dict.status),
    remark: dict.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除字典类型', '确定要删除该字典类型吗？')
  if (!confirmed) return
  try {
    await dictApi.typeDelete(id)
    showSuccess('删除成功')
    if (dictTypes.value.length === 1 && page.value > 1) {
      page.value--
    }
    fetchDictTypes()
    dictItems.value = []
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.code) {
    showError('请填写必填项')
    return
  }
  try {
    if (isEdit.value) {
      await dictApi.typeUpdate(formData.value.id, formData.value)
    } else {
      await dictApi.typeCreate(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    fetchDictTypes()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

// 字典项操作
function handleViewItems(dict: DictType) {
  currentDictType.value = dict
  isListView.value = false
  fetchDictItems(dict.id)
}

function handleBackToList() {
  isListView.value = true
  currentDictType.value = null
  dictItems.value = []
}

function handleAddItem() {
  isEdit.value = false
  itemFormData.value = {
    id: '',
    dictTypeId: currentDictType.value?.id || '',
    label: '',
    value: '',
    sort: 0,
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEditItem(item: DictItem) {
  isEdit.value = true
  itemFormData.value = {
    id: item.id,
    dictTypeId: item.dictTypeId,
    label: item.label,
    value: item.value,
    sort: item.sort || 0,
    status: String(item.status),
    remark: item.remark || '',
  }
  showDialog.value = true
}

async function handleDeleteItem(id: string) {
  const confirmed = await confirm('删除字典项', '确定要删除该字典项吗？')
  if (!confirmed) return
  try {
    await dictApi.itemDelete(currentDictType.value!.id, id)
    showSuccess('删除成功')
    if (dictItems.value.length === 1 && itemPage.value > 1) {
      itemPage.value--
    }
    if (currentDictType.value) {
      fetchDictItems(currentDictType.value.id)
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmitItem() {
  if (!itemFormData.value.label || !itemFormData.value.value) {
    showError('请填写必填项')
    return
  }
  try {
    if (isEdit.value) {
      await dictApi.itemUpdate(currentDictType.value!.id, itemFormData.value.id, itemFormData.value)
    } else {
      await dictApi.itemCreate(currentDictType.value!.id, itemFormData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (currentDictType.value) {
      fetchDictItems(currentDictType.value.id)
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <!-- 字典类型列表 -->
    <template v-if="isListView">
      <div class="flex items-center justify-end">
        <Button @click="handleAdd">
          <Plus class="w-4 h-4 mr-2" />
          新增字典
        </Button>
      </div>

      <div class="bg-card rounded-xl border shadow-sm p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <Input
            v-model="searchName"
            placeholder="字典名称"
            class="w-36"
            @keyup.enter="handleSearch"
          />
          <Input
            v-model="searchCode"
            placeholder="字典编码"
            class="w-36"
            @keyup.enter="handleSearch"
          />
          <DictSelect
            v-model="searchStatus"
            :dict-items="enableStatusItems"
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
              <TableHead>字典名称</TableHead>
              <TableHead>字典编码</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="dict in dictTypes" :key="dict.id">
              <TableCell>{{ dict.id }}</TableCell>
              <TableCell>{{ dict.name }}</TableCell>
              <TableCell>{{ dict.code }}</TableCell>
              <TableCell>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="'bg-secondary text-secondary-foreground'"
                >
                  {{ getLabel(dict.status) }}
                </span>
              </TableCell>
              <TableCell>{{ dict.remark || '-' }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleViewItems(dict)"
                    title="查看字典项"
                  >
                    <List class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleEdit(dict)">
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleDelete(dict.id)">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="dictTypes.length === 0">
              <TableCell colspan="6" class="text-center text-muted-foreground py-8">
                暂无数据
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div class="flex items-center justify-between py-4">
        <span class="text-sm text-muted-foreground">
          显示 {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, total) }} 条，共
          {{ total }} 条
        </span>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="handlePageChange(page - 1)"
          >
            上一页
          </Button>
          <span class="px-4 text-sm">第 {{ page }} 页</span>
          <Button
            variant="outline"
            size="sm"
            :disabled="page >= Math.ceil(total / pageSize)"
            @click="handlePageChange(page + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </template>

    <!-- 字典项列表 -->
    <template v-else>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button variant="ghost" size="sm" @click="handleBackToList">
            <ChevronLeft class="w-4 h-4 mr-1" />
            返回
          </Button>
        </div>
        <Button @click="handleAddItem">
          <Plus class="w-4 h-4 mr-2" />
          新增字典项
        </Button>
      </div>

      <div class="bg-card rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>字典项标签</TableHead>
              <TableHead>字典项值</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in dictItems" :key="item.id">
              <TableCell>{{ item.id }}</TableCell>
              <TableCell>{{ item.label }}</TableCell>
              <TableCell>{{ item.value }}</TableCell>
              <TableCell>{{ item.sort || 0 }}</TableCell>
              <TableCell>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="'bg-secondary text-secondary-foreground'"
                >
                  {{ getLabel(item.status) }}
                </span>
              </TableCell>
              <TableCell>{{ item.remark || '-' }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Button variant="ghost" size="sm" @click="handleEditItem(item)">
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleDeleteItem(item.id)">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="dictItems.length === 0">
              <TableCell colspan="7" class="text-center text-muted-foreground py-8">
                暂无数据
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div class="flex items-center justify-between py-4">
        <span class="text-sm text-muted-foreground">
          显示 {{ (itemPage - 1) * itemPageSize + 1 }} -
          {{ Math.min(itemPage * itemPageSize, itemTotal) }} 条，共 {{ itemTotal }} 条
        </span>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="itemPage <= 1"
            @click="handleItemPageChange(itemPage - 1)"
          >
            上一页
          </Button>
          <span class="px-4 text-sm">第 {{ itemPage }} 页</span>
          <Button
            variant="outline"
            size="sm"
            :disabled="itemPage >= Math.ceil(itemTotal / itemPageSize)"
            @click="handleItemPageChange(itemPage + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </template>

    <!-- 字典类型弹窗 -->
    <Dialog v-model:open="showDialog" v-if="isListView">
      <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑字典' : '新增字典' }}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="name">字典名称 <span class="text-destructive">*</span></Label>
            <Input id="name" v-model="formData.name" placeholder="请输入字典名称" />
          </div>
          <div class="space-y-2">
            <Label for="code">字典编码 <span class="text-destructive">*</span></Label>
            <Input id="code" v-model="formData.code" placeholder="请输入字典编码" />
          </div>
          <div class="space-y-2">
            <Label for="status">状态</Label>
            <DictSelect v-model="formData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="remark">备注</Label>
            <Input id="remark" v-model="formData.remark" placeholder="请输入备注" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 字典项弹窗 -->
    <Dialog v-model:open="showDialog" v-else>
      <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑字典项' : '新增字典项' }}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="label">字典项标签 <span class="text-destructive">*</span></Label>
            <Input id="label" v-model="itemFormData.label" placeholder="请输入字典项标签" />
          </div>
          <div class="space-y-2">
            <Label for="value">字典项值 <span class="text-destructive">*</span></Label>
            <Input id="value" v-model="itemFormData.value" placeholder="请输入字典项值" />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序</Label>
            <Input
              id="sort"
              v-model.number="itemFormData.sort"
              type="number"
              placeholder="请输入排序"
            />
          </div>
          <div class="space-y-2">
            <Label for="itemStatus">状态</Label>
            <DictSelect v-model="itemFormData.status" :dict-items="enableStatusItems" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="itemRemark">备注</Label>
            <Input id="itemRemark" v-model="itemFormData.remark" placeholder="请输入备注" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmitItem">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
