<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Briefcase } from '@lucide/vue'
import type { Post, Organization } from '@/types'
import { postApi, organizationApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import OrganizationTree from '@/components/OrganizationTree.vue'
import OrganizationSelectItem from '@/components/OrganizationSelectItem.vue'

const { dict: enableStatusDict, fetchDict: fetchEnableStatus } = useDict(() => 'common_status')

const enableStatusItems = computed(() => enableStatusDict.value?.items || [])

function getLabel(value: string | number | undefined): string {
  if (value === undefined || value === null) return '-'
  const strValue = String(value)
  const item = enableStatusItems.value.find((i) => i.value === strValue)
  return item?.label || strValue
}

const loading = ref(false)
const posts = ref<Post[]>([])
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const organizations = ref<Organization[]>([])
const searchName = ref('')
const searchCode = ref('')
const searchOrgId = ref('all')
const searchStatus = ref<string>('__all__')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  organizationId: '',
  name: '',
  code: '',
  sort: 0,
  status: '1',
  remark: '',
})

// 分页参数
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

async function fetchPosts() {
  loading.value = true
  try {
    const { data } = await postApi.list({
      pageNumber: page.value,
      pageSize: pageSize.value,
      name: searchName.value,
      code: searchCode.value,
      organizationId: searchOrgId.value === 'all' ? '' : searchOrgId.value,
      status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    })
    if (data.value) {
      posts.value = data.value.records
      total.value = data.value.totalRow
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
}

async function fetchOrganizations() {
  try {
    const { data } = await organizationApi.tree()
    if (data.value) {
      organizations.value = data.value || []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

watch(searchOrgId, () => {
  page.value = 1
  fetchPosts()
})

onMounted(() => {
  Promise.all([fetchPosts(), fetchOrganizations(), fetchEnableStatus()])
})

function handleSearch() {
  page.value = 1
  fetchPosts()
}

function handleReset() {
  searchName.value = ''
  searchCode.value = ''
  searchOrgId.value = 'all'
  searchStatus.value = '__all__'
  page.value = 1
  fetchPosts()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchPosts()
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    organizationId: '',
    name: '',
    code: '',
    sort: 0,
    status: '1',
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(post: Post) {
  isEdit.value = true
  formData.value = {
    id: post.id,
    organizationId: post.organization?.id || '',
    name: post.name,
    code: post.code,
    sort: post.sort || 0,
    status: String(post.status),
    remark: post.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除岗位', '确定要删除该岗位吗？')
  if (!confirmed) return
  try {
    await postApi.delete(id)
    showSuccess('删除成功')
    if (posts.value.length === 1 && page.value > 1) {
      page.value--
    }
    fetchPosts()
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
      await postApi.update(formData.value.id, formData.value)
    } else {
      await postApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    fetchPosts()
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
        新增岗位
      </Button>
    </div>

    <div class="flex gap-4">
      <div class="w-64 flex-shrink-0">
        <OrganizationTree :organizations="organizations" v-model="searchOrgId" />
      </div>

      <div class="flex-1 space-y-4">
        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchName"
              placeholder="岗位名称"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchCode"
              placeholder="岗位编码"
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
                <TableHead>岗位名称</TableHead>
                <TableHead>岗位编码</TableHead>
                <TableHead>所属部门</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="post in posts" :key="post.id">
                <TableCell>{{ post.id }}</TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Briefcase class="w-4 h-4 text-muted-foreground" />
                    {{ post.name }}
                  </div>
                </TableCell>
                <TableCell>{{ post.code }}</TableCell>
                <TableCell>{{ post.organization?.name || '-' }}</TableCell>
                <TableCell>{{ post.sort || 0 }}</TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="'bg-secondary text-secondary-foreground'"
                  >
                    {{ getLabel(post.status) }}
                  </span>
                </TableCell>
                <TableCell>{{ post.remark || '-' }}</TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" @click="handleEdit(post)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDelete(post.id)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="posts.length === 0">
                <TableCell colspan="8" class="text-center text-muted-foreground py-8">
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
              :disabled="page === 1"
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
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑岗位' : '新增岗位' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改岗位信息' : '创建新岗位' }}</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="orgId">所属部门 <span class="text-destructive">*</span></Label>
            <Select v-model="formData.organizationId">
              <SelectTrigger>
                <SelectValue placeholder="选择所属部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">无</SelectItem>
                <OrganizationSelectItem
                  v-for="org in organizations"
                  :key="org.id"
                  :organization="org"
                />
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="name">岗位名称 <span class="text-destructive">*</span></Label>
            <Input id="name" v-model="formData.name" placeholder="请输入岗位名称" />
          </div>
          <div class="space-y-2">
            <Label for="code">岗位编码 <span class="text-destructive">*</span></Label>
            <Input id="code" v-model="formData.code" placeholder="请输入岗位编码" />
          </div>
          <div class="space-y-2">
            <Label for="sort">排序</Label>
            <Input
              id="sort"
              v-model.number="formData.sort"
              type="number"
              placeholder="数值越小越靠前"
            />
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
          <Button @click="handleSubmit">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
