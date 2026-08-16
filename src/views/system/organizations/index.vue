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
import { Plus, Building2 } from '@lucide/vue'
import type { Organization } from '@/types'
import { organizationApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import OrganizationTree from '@/components/OrganizationTree.vue'
import OrgTreeRow from '@/components/OrgTreeRow.vue'
import TreeGuides from '@/components/TreeGuides.vue'

const { dict: enableStatusDict, fetchDict: fetchEnableStatus } = useDict(() => 'common_status')

const enableStatusItems = computed(() => enableStatusDict.value?.items || [])

function getLabel(value: string | number | undefined): string {
  if (value === undefined || value === null) return '-'
  const strValue = String(value)
  const item = enableStatusItems.value.find((i) => i.value === strValue)
  return item?.label || strValue
}

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const loading = ref(false)
const organizations = ref<Organization[]>([])
const allOrganizations = ref<Organization[]>([])
const expandedIds = ref<Set<string>>(new Set())
const searchName = ref('')
const searchCode = ref('')
const searchStatus = ref<string>('__all__')
const searchOrgId = ref('')
const showDialog = ref(false)
const isEdit = ref(false)

const formData = ref({
  id: '',
  parentId: '0',
  name: '',
  code: '',
  leader: '',
  phone: '',
  email: '',
  sort: 0,
  status: '1',
})

async function fetchOrganizations() {
  loading.value = true
  try {
    const { data } = await organizationApi.tree()
    if (data.value) {
      const list = data.value || []
      // 保存完整树数据（未过滤），供父部门下拉使用
      allOrganizations.value = list
      organizations.value = hasSearchFilter()
        ? filterTree(
            list,
            searchName.value,
            searchCode.value,
            searchStatus.value,
            searchOrgId.value,
          )
        : list
      if (organizations.value.length > 0) {
        expandAll(organizations.value)
      }
    } else {
      organizations.value = []
      allOrganizations.value = []
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
}

function hasSearchFilter(): boolean {
  return !!(searchName.value || searchCode.value || searchStatus.value !== '' || searchOrgId.value)
}

function filterTree(
  list: Organization[],
  name: string,
  code: string,
  status: string,
  orgId?: string,
): Organization[] {
  const nameKw = name.toLowerCase()
  const codeKw = code.toLowerCase()
  return list.reduce<Organization[]>((acc, item) => {
    const nameMatch = !nameKw || item.name?.toLowerCase().includes(nameKw)
    const codeMatch = !codeKw || item.code?.toLowerCase().includes(codeKw)
    const statusMatch = status === 'all' || status === '__all__' || String(item.status) === status
    const orgMatch = !orgId || item.parentId === orgId
    const children = item.children ? filterTree(item.children, name, code, status) : []
    if ((nameMatch && codeMatch && statusMatch && orgMatch) || children.length > 0) {
      acc.push({ ...item, children })
    }
    return acc
  }, [])
}

watch(searchOrgId, () => {
  fetchOrganizations()
})

onMounted(() => {
  Promise.all([fetchOrganizations(), fetchEnableStatus()])
})

function expandAll(list: Organization[]) {
  const next = new Set(expandedIds.value)
  function walk(items: Organization[]) {
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        next.add(item.id)
        walk(item.children)
      }
    }
  }
  walk(list)
  expandedIds.value = next
}

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedIds.value = next
}

// 扁平化组织树，支持任意层级（给父部门 Select 用），编辑时排除自身及子树避免循环
const flatOrgOptions = computed<(Organization & { level: number })[]>(() => {
  const result: (Organization & { level: number })[] = []
  function walk(list: Organization[], level: number, exceptEditId?: string) {
    for (const org of list) {
      if (exceptEditId && org.id === exceptEditId) continue
      result.push({ ...org, level })
      if (org.children?.length) walk(org.children, level + 1, exceptEditId)
    }
  }
  walk(allOrganizations.value, 0, isEdit.value ? formData.value.id : undefined)
  return result
})

function handleSearch() {
  fetchOrganizations()
}

function handleReset() {
  searchName.value = ''
  searchCode.value = ''
  searchStatus.value = '__all__'
  searchOrgId.value = ''
  fetchOrganizations()
}

function handleAdd(parentId = '0') {
  isEdit.value = false
  formData.value = {
    id: '',
    parentId,
    name: '',
    code: '',
    leader: '',
    phone: '',
    email: '',
    sort: 0,
    status: '1',
  }
  showDialog.value = true
}

function handleEdit(org: Organization) {
  isEdit.value = true
  formData.value = {
    id: org.id,
    parentId: org.parentId || '0',
    name: org.name,
    code: org.code,
    leader: org.leader || '',
    phone: org.phone || '',
    email: org.email || '',
    sort: org.sort || 0,
    status: String(org.status),
  }
  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除部门', '确定要删除该部门吗？')
  if (!confirmed) return
  try {
    await organizationApi.delete(id)
    showSuccess('删除成功')
    // 若删除的是当前选中的部门，清除选中状态避免用不存在的 ID 筛选
    if (searchOrgId.value === id) {
      searchOrgId.value = ''
    }
    fetchOrganizations()
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
      await organizationApi.update(formData.value.id, formData.value)
    } else {
      await organizationApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    fetchOrganizations()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex items-center justify-end">
      <Button @click="handleAdd('0')">
        <Plus class="w-4 h-4 mr-2" />
        新增部门
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
              placeholder="部门名称"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchCode"
              placeholder="部门编码"
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
                <TableHead class="w-12">展开</TableHead>
                <TableHead>部门名称</TableHead>
                <TableHead>部门编码</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <OrgTreeRow
                v-for="org in organizations"
                :key="org.id"
                :org="org"
                :level="0"
                :expanded-ids="expandedIds"
                :get-label="getLabel"
                @toggle-expand="toggleExpand"
                @add="handleAdd"
                @edit="handleEdit"
                @delete="handleDelete"
              />
              <TableRow v-if="organizations.length === 0">
                <TableCell colspan="10" class="text-center text-muted-foreground py-12">
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
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑部门' : '新增部门' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改部门信息' : '创建新部门' }}</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="parentId">上级部门</Label>
            <Select v-model="formData.parentId">
              <SelectTrigger>
                <SelectValue placeholder="选择上级部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  <div class="flex items-center min-w-0">
                    <Building2 class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span class="ml-1.5 truncate">无（顶级部门）</span>
                  </div>
                </SelectItem>
                <SelectItem v-for="org in flatOrgOptions" :key="org.id" :value="org.id">
                  <div class="flex items-center min-w-0">
                    <TreeGuides :level="org.level" />
                    <Building2 class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5" />
                    <span class="ml-1.5 truncate">{{ org.name }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="name">部门名称 <span class="text-destructive">*</span></Label>
            <Input id="name" v-model="formData.name" placeholder="请输入部门名称" />
          </div>
          <div class="space-y-2">
            <Label for="code">部门编码 <span class="text-destructive">*</span></Label>
            <Input id="code" v-model="formData.code" placeholder="请输入部门编码" />
          </div>
          <div class="space-y-2">
            <Label for="leader">负责人</Label>
            <Input id="leader" v-model="formData.leader" placeholder="请输入负责人" />
          </div>
          <div class="space-y-2">
            <Label for="phone">联系电话</Label>
            <Input id="phone" v-model="formData.phone" placeholder="请输入联系电话" />
          </div>
          <div class="space-y-2">
            <Label for="email">邮箱</Label>
            <Input id="email" v-model="formData.email" placeholder="请输入邮箱" />
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
