<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckboxGroupRoot } from 'reka-ui'
import { Plus, Edit, Trash2, User, Shield, Key } from '@lucide/vue'
import type { User as UserType, Role, Organization, Post, UserProfile, UserAddress } from '@/types'
import { userApi, roleApi, organizationApi, postApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import OrganizationTree from '@/components/OrganizationTree.vue'
import OrganizationSelectItem from '@/components/OrganizationSelectItem.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const { items: userStatusItems, getLabel: getStatusLabel } = useDict('user_status')
const { items: genderItems } = useDict('user_gender')
const { items: localeItems } = useDict('common_locale')
const { getLabel: getRoleStatusLabel } = useDict('common_status')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const organizations = ref<Organization[]>([])
const searchUsername = ref('')
const searchNickname = ref('')
const searchStatus = ref<string>('__all__')
const searchOrgId = ref('all')
const showDialog = ref(false)
const showRoleDialog = ref(false)
const showResetPasswordDialog = ref(false)
const isEdit = ref(false)
const currentUser = ref<UserType | null>(null)
const selectedRoleIds = ref<string[]>([])
const posts = ref<Post[]>([])
const resetPasswordUserId = ref('')
const newPassword = ref('')
const rolePage = ref(1)
const searchRoleName = ref('')
const searchRoleCode = ref('')

const activeTab = ref('basic')

const basicForm = ref({
  id: '',
  username: '',
  nickname: '',
  password: '',
  organizationId: '',
  postId: '',
  avatar: '',
  status: '1',
  remark: '',
})

const profileForm = ref<UserProfile>({
  userId: '',
  subject: '',
  fullName: '',
  givenName: '',
  familyName: '',
  middleName: '',
  nickName: '',
  preferredUsername: '',
  profile: '',
  picture: '',
  website: '',
  email: '',
  emailVerified: '',
  gender: '',
  birthdate: '',
  zoneInfo: '',
  locale: '',
  phoneNumber: '',
  phoneNumberVerified: '',
})

const addressForm = ref<UserAddress>({
  userId: '',
  formatted: '',
  streetAddress: '',
  locality: '',
  region: '',
  postalCode: '',
  country: '',
})

const {
  list: users,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadUsers,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => userApi.list(query),
  params: () => ({
    username: searchUsername.value,
    nickname: searchNickname.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    organizationId: searchOrgId.value === 'all' ? '' : searchOrgId.value,
  }),
})

const rolePageSize = 20
const allRoles = ref<Role[]>([])

const filteredRoles = computed(() => {
  let result = allRoles.value
  if (searchRoleName.value) {
    result = result.filter((r) =>
      r.name?.toLowerCase().includes(searchRoleName.value.toLowerCase()),
    )
  }
  if (searchRoleCode.value) {
    result = result.filter((r) =>
      r.code?.toLowerCase().includes(searchRoleCode.value.toLowerCase()),
    )
  }
  return result
})

const roles = computed(() => {
  const start = (rolePage.value - 1) * rolePageSize
  const end = start + rolePageSize
  return filteredRoles.value.slice(start, end)
})

const roleTotal = computed(() => filteredRoles.value.length)

async function fetchRoles() {
  try {
    const { data } = await roleApi.getAll()
    if (data.value) {
      allRoles.value = data.value
      rolePage.value = 1
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
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

async function fetchPosts() {
  try {
    const { data } = await postApi.getAll()
    if (data.value) {
      posts.value = data.value
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

watch(searchOrgId, () => {
  handleSearch()
})

onMounted(() => {
  Promise.all([fetchRoles(), fetchOrganizations(), fetchPosts()])
})

function handleReset() {
  searchUsername.value = ''
  searchNickname.value = ''
  searchStatus.value = '__all__'
  searchOrgId.value = 'all'
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  activeTab.value = 'basic'
  basicForm.value = {
    id: '',
    username: '',
    nickname: '',
    password: '',
    organizationId: '',
    postId: '',
    avatar: '',
    status: '1',
    remark: '',
  }
  profileForm.value = {
    userId: '',
    subject: '',
    fullName: '',
    givenName: '',
    familyName: '',
    middleName: '',
    nickName: '',
    preferredUsername: '',
    profile: '',
    picture: '',
    website: '',
    email: '',
    emailVerified: '',
    gender: '',
    birthdate: '',
    zoneInfo: '',
    locale: '',
    phoneNumber: '',
    phoneNumberVerified: '',
  }
  addressForm.value = {
    userId: '',
    formatted: '',
    streetAddress: '',
    locality: '',
    region: '',
    postalCode: '',
    country: '',
  }
  showDialog.value = true
}

async function handleEdit(user: UserType) {
  isEdit.value = true
  activeTab.value = 'basic'

  const [userResult, profileResult, addressResult] = await Promise.all([
    userApi.getById(user.id),
    userApi.getProfile(user.id),
    userApi.getAddress(user.id),
  ])

  const detail = userResult.data.value || user

  basicForm.value = {
    id: detail.id,
    username: detail.username,
    nickname: detail.nickname || '',
    password: '',
    organizationId: detail.organization?.id || '',
    postId: detail.post?.id ?? '',
    avatar: detail.avatar || '',
    status: String(detail.status ?? 1),
    remark: detail.remark ?? '',
  }

  const profile = profileResult.data.value || {}
  profileForm.value = {
    userId: profile.userId || '',
    subject: profile.subject || '',
    fullName: profile.fullName || '',
    givenName: profile.givenName || '',
    familyName: profile.familyName || '',
    middleName: profile.middleName || '',
    nickName: profile.nickName || '',
    preferredUsername: profile.preferredUsername || '',
    profile: profile.profile || '',
    picture: profile.picture || '',
    website: profile.website || '',
    email: profile.email || '',
    emailVerified: profile.emailVerified ? '1' : '',
    gender: profile.gender || '',
    birthdate: profile.birthdate || '',
    zoneInfo: profile.zoneInfo || '',
    locale: profile.locale || '',
    phoneNumber: profile.phoneNumber || '',
    phoneNumberVerified: profile.phoneNumberVerified ? '1' : '',
  }

  const address = addressResult.data.value || {}
  addressForm.value = {
    userId: address.userId || '',
    formatted: address.formatted || '',
    streetAddress: address.streetAddress || '',
    locality: address.locality || '',
    region: address.region || '',
    postalCode: address.postalCode || '',
    country: address.country || '',
  }

  showDialog.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm('删除用户', '确定要删除该用户吗？')
  if (!confirmed) return
  try {
    await userApi.delete(id)
    showSuccess('删除成功')
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!basicForm.value.username || !basicForm.value.nickname) {
    showError('请填写必填项')
    return
  }
  try {
    const userPayload = {
      ...basicForm.value,
      organizationId: basicForm.value.organizationId === '0' ? '' : basicForm.value.organizationId,
      postId: basicForm.value.postId === '0' ? '' : basicForm.value.postId,
    }

    if (isEdit.value) {
      await userApi.update(basicForm.value.id, userPayload)
      await userApi.updateProfile(basicForm.value.id, profileForm.value)
      await userApi.updateAddress(basicForm.value.id, addressForm.value)
    } else {
      await userApi.create({ ...userPayload, id: undefined, password: '' })
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    // 编辑留在当前页，新增回到第一页
    if (isEdit.value) reloadUsers()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleAssignRole(user: UserType) {
  currentUser.value = user
  try {
    const { data } = await userApi.getRoleIds(user.id)
    if (data.value) {
      selectedRoleIds.value = data.value
    } else {
      selectedRoleIds.value = []
    }
    await fetchRoles()
    showRoleDialog.value = true
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleSaveRoles() {
  if (!currentUser.value) return
  try {
    await userApi.assignRoles(currentUser.value.id, selectedRoleIds.value)
    showSuccess('角色分配成功')
    showRoleDialog.value = false
    reloadUsers()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleResetPassword(user: UserType) {
  resetPasswordUserId.value = user.id
  newPassword.value = ''
  showResetPasswordDialog.value = true
}

async function handleSavePassword() {
  if (!newPassword.value) {
    showError('请输入新密码')
    return
  }
  try {
    await userApi.resetPassword(resetPasswordUserId.value, newPassword.value)
    showSuccess('密码修改成功')
    showResetPasswordDialog.value = false
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
        新增用户
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
              v-model="searchUsername"
              placeholder="用户名"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <Input
              v-model="searchNickname"
              placeholder="昵称"
              class="w-36"
              @keyup.enter="handleSearch"
            />
            <DictSelect
              v-model="searchStatus"
              :dict-items="userStatusItems"
              placeholder="全部状态"
              class="w-32"
            />
            <Button variant="outline" @click="handleSearch">搜索</Button>
            <Button variant="ghost" @click="handleReset">重置</Button>
          </div>
        </div>

        <div class="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <Table class="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead class="w-14">头像</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead class="w-20">状态</TableHead>
                  <TableHead class="w-28 sticky right-0 bg-card">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="user in users" :key="user.id">
                  <TableCell class="w-14">
                    <div v-if="user.avatar" class="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        :src="user.avatar"
                        :alt="user.username"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div
                      v-else
                      class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                    >
                      <User class="w-4 h-4 text-primary" />
                    </div>
                  </TableCell>
                  <TableCell>{{ user.username }}</TableCell>
                  <TableCell>{{ user.nickname || '-' }}</TableCell>
                  <TableCell>{{ user.organization?.name || '-' }}</TableCell>
                  <TableCell>{{ user.post?.name || '-' }}</TableCell>
                  <TableCell class="w-20">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="'bg-secondary text-secondary-foreground'"
                    >
                      {{ getStatusLabel(user.status) }}
                    </span>
                  </TableCell>
                  <TableCell class="w-28 sticky right-0 bg-card">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="handleAssignRole(user)"
                        title="分配角色"
                      >
                        <Shield class="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" @click="handleEdit(user)" title="编辑">
                        <Edit class="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="handleResetPassword(user)"
                        title="修改密码"
                      >
                        <Key class="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        @click="handleDelete(user.id)"
                        title="删除"
                      >
                        <Trash2 class="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow v-if="users.length === 0">
                  <TableCell colspan="7" class="text-center text-muted-foreground py-8"
                    >暂无数据</TableCell
                  >
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <TablePagination
            class="px-4 border-t"
            :current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            @change="goto"
          />
        </div>
      </div>
    </div>

    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑用户' : '新增用户' }}</DialogTitle>
          <DialogDescription>{{ isEdit ? '修改用户信息' : '添加新用户' }}</DialogDescription>
        </DialogHeader>

        <Tabs v-model="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="basic">账号基础信息</TabsTrigger>
            <TabsTrigger value="profile">OIDC 扩展档案</TabsTrigger>
            <TabsTrigger value="address">OIDC 标准地址</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" class="space-y-4 py-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="basic-username">用户名 <span class="text-destructive">*</span></Label>
                <Input
                  id="basic-username"
                  v-model="basicForm.username"
                  placeholder="请输入用户名"
                  :disabled="isEdit"
                />
              </div>
              <div class="space-y-2" v-if="!isEdit">
                <Label for="basic-password">密码</Label>
                <Input id="basic-password" v-model="basicForm.password" placeholder="请输入密码" />
              </div>
              <div class="space-y-2">
                <Label for="basic-nickname">昵称 <span class="text-destructive">*</span></Label>
                <Input id="basic-nickname" v-model="basicForm.nickname" placeholder="请输入昵称" />
              </div>
              <div class="space-y-2">
                <Label for="basic-avatar">头像</Label>
                <Input id="basic-avatar" v-model="basicForm.avatar" placeholder="请输入头像地址" />
              </div>
              <div class="space-y-2">
                <Label for="basic-organizationId">部门</Label>
                <Select v-model="basicForm.organizationId">
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">无</SelectItem>
                    <OrganizationSelectItem
                      v-for="org in organizations.filter((o) => o.id)"
                      :key="org.id"
                      :organization="org"
                    />
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="basic-postId">岗位</Label>
                <Select v-model="basicForm.postId">
                  <SelectTrigger>
                    <SelectValue placeholder="选择岗位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">无</SelectItem>
                    <SelectItem
                      v-for="post in posts.filter((p) => p.id)"
                      :key="post.id"
                      :value="post.id"
                      >{{ post.name }}</SelectItem
                    >
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="basic-status">状态</Label>
                <DictSelect v-model="basicForm.status" :dict-items="userStatusItems" />
              </div>
              <div class="space-y-2 col-span-2">
                <Label for="basic-remark">备注</Label>
                <Textarea
                  id="basic-remark"
                  v-model="basicForm.remark"
                  rows="2"
                  placeholder="请输入备注信息"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" class="space-y-4 py-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="profile-subject">Subject</Label>
                <Input
                  id="profile-subject"
                  v-model="profileForm.subject"
                  placeholder="OAuth/OIDC唯一标识"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-fullName">用户姓名</Label>
                <Input
                  id="profile-fullName"
                  v-model="profileForm.fullName"
                  placeholder="请输入用户姓名"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-givenName">名</Label>
                <Input
                  id="profile-givenName"
                  v-model="profileForm.givenName"
                  placeholder="请输入名"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-familyName">姓</Label>
                <Input
                  id="profile-familyName"
                  v-model="profileForm.familyName"
                  placeholder="请输入姓"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-middleName">中间名</Label>
                <Input
                  id="profile-middleName"
                  v-model="profileForm.middleName"
                  placeholder="请输入中间名"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-nickName">昵称</Label>
                <Input
                  id="profile-nickName"
                  v-model="profileForm.nickName"
                  placeholder="请输入昵称"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-preferredUsername">首选用户名</Label>
                <Input
                  id="profile-preferredUsername"
                  v-model="profileForm.preferredUsername"
                  placeholder="请输入首选用户名"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-profile">个人资料页</Label>
                <Input
                  id="profile-profile"
                  v-model="profileForm.profile"
                  type="url"
                  placeholder="请输入URL"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-picture">头像URL</Label>
                <Input
                  id="profile-picture"
                  v-model="profileForm.picture"
                  type="url"
                  placeholder="请输入URL"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-website">个人网站</Label>
                <Input
                  id="profile-website"
                  v-model="profileForm.website"
                  type="url"
                  placeholder="请输入URL"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-email">邮箱</Label>
                <Input
                  id="profile-email"
                  v-model="profileForm.email"
                  type="email"
                  placeholder="请输入邮箱"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-emailVerified">邮箱已验证</Label>
                <DictSelect
                  id="profile-emailVerified"
                  v-model="profileForm.emailVerified"
                  dict-type="boolean_status"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-phoneNumber">手机号</Label>
                <Input
                  id="profile-phoneNumber"
                  v-model="profileForm.phoneNumber"
                  placeholder="请输入手机号"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-phoneNumberVerified">手机已验证</Label>
                <DictSelect
                  id="profile-phoneNumberVerified"
                  v-model="profileForm.phoneNumberVerified"
                  dict-type="boolean_status"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-gender">性别</Label>
                <DictSelect
                  v-model="profileForm.gender"
                  :dict-items="genderItems"
                  placeholder="请选择性别"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-birthdate">出生日期</Label>
                <Input id="profile-birthdate" v-model="profileForm.birthdate" type="date" />
              </div>
              <div class="space-y-2">
                <Label for="profile-zoneInfo">时区</Label>
                <Input
                  id="profile-zoneInfo"
                  v-model="profileForm.zoneInfo"
                  placeholder="请输入时区"
                />
              </div>
              <div class="space-y-2">
                <Label for="profile-locale">语言地区</Label>
                <DictSelect
                  v-model="profileForm.locale"
                  :dict-items="localeItems"
                  placeholder="请选择语言"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="address" class="space-y-4 py-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="address-formatted">完整地址</Label>
                <Input
                  id="address-formatted"
                  v-model="addressForm.formatted"
                  placeholder="请输入完整地址"
                />
              </div>
              <div class="space-y-2">
                <Label for="address-streetAddress">街道地址</Label>
                <Input
                  id="address-streetAddress"
                  v-model="addressForm.streetAddress"
                  placeholder="请输入街道地址"
                />
              </div>
              <div class="space-y-2">
                <Label for="address-locality">城市/地区</Label>
                <Input
                  id="address-locality"
                  v-model="addressForm.locality"
                  placeholder="请输入城市"
                />
              </div>
              <div class="space-y-2">
                <Label for="address-region">省份/州</Label>
                <Input id="address-region" v-model="addressForm.region" placeholder="请输入省份" />
              </div>
              <div class="space-y-2">
                <Label for="address-postalCode">邮政编码</Label>
                <Input
                  id="address-postalCode"
                  v-model="addressForm.postalCode"
                  placeholder="请输入邮政编码"
                />
              </div>
              <div class="space-y-2">
                <Label for="address-country">国家</Label>
                <Input
                  id="address-country"
                  v-model="addressForm.country"
                  placeholder="请输入国家"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showRoleDialog">
      <DialogContent class="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>分配角色 - {{ currentUser?.username }}</DialogTitle>
          <DialogDescription>已选择 {{ selectedRoleIds.length }} 个角色</DialogDescription>
        </DialogHeader>

        <div class="flex gap-2 py-4">
          <Input
            v-model="searchRoleName"
            placeholder="角色名"
            class="flex-1"
            @keyup.enter="rolePage = 1"
          />
          <Input
            v-model="searchRoleCode"
            placeholder="角色code"
            class="flex-1"
            @keyup.enter="rolePage = 1"
          />
        </div>
        <div class="max-h-[50vh] overflow-y-auto">
          <Table class="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead class="w-12">选择</TableHead>
                <TableHead class="w-8">图标</TableHead>
                <TableHead>角色名</TableHead>
                <TableHead class="w-32">角色Code</TableHead>
                <TableHead class="w-16">状态</TableHead>
                <TableHead class="w-16">内置</TableHead>
                <TableHead>描述</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <CheckboxGroupRoot v-model="selectedRoleIds">
                <TableRow v-for="role in roles" :key="role.id">
                  <TableCell class="w-12">
                    <Checkbox :value="role.id" />
                  </TableCell>
                  <TableCell class="w-8">
                    <Shield class="w-5 h-5 text-primary" />
                  </TableCell>
                  <TableCell class="font-medium">{{ role.name }}</TableCell>
                  <TableCell class="w-32 text-sm text-muted-foreground">{{ role.code }}</TableCell>
                  <TableCell class="w-16">
                    <span
                      class="px-2 py-0.5 rounded text-xs"
                      :class="'bg-secondary text-secondary-foreground'"
                    >
                      {{ getRoleStatusLabel(role.status) }}
                    </span>
                  </TableCell>
                  <TableCell class="w-16">
                    <span
                      v-if="role.builtin"
                      class="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700"
                      >是</span
                    >
                    <span v-else class="text-muted-foreground">否</span>
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">{{
                    role.description || '-'
                  }}</TableCell>
                </TableRow>
                <TableRow v-if="roles.length === 0">
                  <TableCell colspan="7" class="text-center text-muted-foreground py-8"
                    >暂无角色数据</TableCell
                  >
                </TableRow>
              </CheckboxGroupRoot>
            </TableBody>
          </Table>
        </div>

        <div class="flex items-center justify-between py-4 border-t">
          <span class="text-sm text-muted-foreground">共 {{ roleTotal }} 条</span>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="rolePage === 1" @click="rolePage--"
              >上一页</Button
            >
            <span class="px-4 text-sm">第 {{ rolePage }} 页</span>
            <Button
              variant="outline"
              size="sm"
              :disabled="rolePage >= Math.ceil(roleTotal / rolePageSize)"
              @click="rolePage++"
              >下一页</Button
            >
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showRoleDialog = false">取消</Button>
          <Button @click="handleSaveRoles">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showResetPasswordDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>为用户设置新密码</DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="newPassword">新密码 <span class="text-destructive">*</span></Label>
            <Input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="请输入新密码"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showResetPasswordDialog = false">取消</Button>
          <Button @click="handleSavePassword">确认修改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
