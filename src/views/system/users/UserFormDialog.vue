<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DictSelect from '@/components/DictSelect.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { userApi, roleApi, organizationApi, postApi } from '@/api/system'
import { useDict } from '@/composables/useDict'
import { DICT } from '@/constants/dict'
import type { User, Role, Organization, Post, UserProfile, UserAddress } from '@/types'

const props = defineProps<{
  open: boolean
  mode: 'add' | 'edit'
  userId?: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  success: []
}>()

const { items: userStatusItems } = useDict(DICT.USER_STATUS)
const { items: genderItems } = useDict(DICT.USER_GENDER)
const { items: localeItems } = useDict(DICT.COMMON_LOCALE)

// ========== 表单初始值常量 ==========
const DEFAULT_BASIC_FORM = {
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

const DEFAULT_PROFILE_FORM: UserProfileForm = {
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

const DEFAULT_ADDRESS_FORM: UserAddressForm = {
  userId: '',
  formatted: '',
  streetAddress: '',
  locality: '',
  region: '',
  postalCode: '',
  country: '',
}

interface UserProfileForm extends Omit<Partial<UserProfile>, 'emailVerified' | 'phoneNumberVerified'> {
  emailVerified?: string
  phoneNumberVerified?: string
}

type UserAddressForm = Partial<UserAddress>

const activeTab = ref('basic')
const submitting = ref(false)
const basicForm = ref({ ...DEFAULT_BASIC_FORM })
const profileForm = ref<UserProfileForm>({ ...DEFAULT_PROFILE_FORM })
const addressForm = ref<UserAddressForm>({ ...DEFAULT_ADDRESS_FORM })

// 角色、组织、岗位下拉数据
const roles = ref<Role[]>([])
const organizations = ref<Organization[]>([])
const posts = ref<Post[]>([])

const isEdit = computed(() => props.mode === 'edit')
const dialogTitle = computed(() => (isEdit.value ? '编辑用户' : '新增用户'))

/** 重置表单到初始状态 */
function resetForms() {
  basicForm.value = { ...DEFAULT_BASIC_FORM }
  profileForm.value = { ...DEFAULT_PROFILE_FORM }
  addressForm.value = { ...DEFAULT_ADDRESS_FORM }
  activeTab.value = 'basic'
}

/** 加载编辑态数据 */
async function loadUserDetail(id: string) {
  const [userResult, profileResult, addressResult] = await Promise.all([
    userApi.getById(id),
    userApi.getProfile(id),
    userApi.getAddress(id),
  ])

  const detail = userResult.data.value
  if (detail) {
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
}

async function loadOptions() {
  const [rolesRes, orgsRes, postsRes] = await Promise.all([
    roleApi.getAll(),
    organizationApi.tree(),
    postApi.getAll(),
  ])
  roles.value = rolesRes.data.value || []
  organizations.value = orgsRes.data.value || []
  posts.value = postsRes.data.value || []
}

async function handleSubmit() {
  submitting.value = true
  try {
    const profilePayload = {
      ...profileForm.value,
      emailVerified: profileForm.value.emailVerified === '1',
      phoneNumberVerified: profileForm.value.phoneNumberVerified === '1',
    }

    if (isEdit.value) {
      await userApi.update(basicForm.value.id, {
        username: basicForm.value.username,
        nickname: basicForm.value.nickname,
        organizationId: basicForm.value.organizationId || undefined,
        postId: basicForm.value.postId || undefined,
        avatar: basicForm.value.avatar || undefined,
        status: basicForm.value.status,
        remark: basicForm.value.remark || undefined,
      })
      await userApi.updateProfile(basicForm.value.id, profilePayload)
      await userApi.updateAddress(basicForm.value.id, addressForm.value)
    } else {
      const { data } = await userApi.create({
        username: basicForm.value.username,
        nickname: basicForm.value.nickname,
        password: basicForm.value.password,
        organizationId: basicForm.value.organizationId || undefined,
        postId: basicForm.value.postId || undefined,
        avatar: basicForm.value.avatar || undefined,
        status: basicForm.value.status,
        remark: basicForm.value.remark || undefined,
      })
      const created = data.value as User | null
      if (created) {
        await userApi.updateProfile(created.id, profilePayload)
        await userApi.updateAddress(created.id, addressForm.value)
      }
    }
    emit('success')
    emit('update:open', false)
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      resetForms()
      loadOptions()
      if (isEdit.value && props.userId) {
        loadUserDetail(props.userId)
      }
    }
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="profile">扩展资料</TabsTrigger>
          <TabsTrigger value="address">联系地址</TabsTrigger>
        </TabsList>

        <!-- 基本信息 -->
        <TabsContent value="basic" class="space-y-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>用户名</Label>
              <Input v-model="basicForm.username" placeholder="请输入用户名" />
            </div>
            <div class="space-y-2">
              <Label>昵称</Label>
              <Input v-model="basicForm.nickname" placeholder="请输入昵称" />
            </div>
            <div v-if="!isEdit" class="space-y-2">
              <Label>密码</Label>
              <Input v-model="basicForm.password" type="password" placeholder="请输入密码" />
            </div>
            <div class="space-y-2">
              <Label>状态</Label>
              <DictSelect v-model="basicForm.status" :dict-items="userStatusItems" />
            </div>
            <div class="space-y-2">
              <Label>组织</Label>
              <Select
                :model-value="basicForm.organizationId"
                @update:model-value="(v) => (basicForm.organizationId = v as string)"
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择组织" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  <SelectItem v-for="org in organizations" :key="org.id" :value="org.id">
                    {{ org.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>岗位</Label>
              <Select
                :model-value="basicForm.postId"
                @update:model-value="(v) => (basicForm.postId = v as string)"
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  <SelectItem v-for="post in posts" :key="post.id" :value="post.id">
                    {{ post.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="space-y-2">
            <Label>备注</Label>
            <Textarea v-model="basicForm.remark" placeholder="请输入备注" rows="3" />
          </div>
        </TabsContent>

        <!-- 扩展资料 -->
        <TabsContent value="profile" class="space-y-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>姓名</Label>
              <Input v-model="profileForm.fullName" placeholder="请输入姓名" />
            </div>
            <div class="space-y-2">
              <Label>昵称</Label>
              <Input v-model="profileForm.nickName" placeholder="请输入昵称" />
            </div>
            <div class="space-y-2">
              <Label>性别</Label>
              <DictSelect v-model="profileForm.gender" :dict-items="genderItems" />
            </div>
            <div class="space-y-2">
              <Label>生日</Label>
              <Input v-model="profileForm.birthdate" placeholder="YYYY-MM-DD" />
            </div>
            <div class="space-y-2">
              <Label>邮箱</Label>
              <Input v-model="profileForm.email" placeholder="请输入邮箱" />
            </div>
            <div class="space-y-2">
              <Label>邮箱已验证</Label>
              <DictSelect v-model="profileForm.emailVerified" dict-type="boolean_status" />
            </div>
            <div class="space-y-2">
              <Label>手机号</Label>
              <Input v-model="profileForm.phoneNumber" placeholder="请输入手机号" />
            </div>
            <div class="space-y-2">
              <Label>手机已验证</Label>
              <DictSelect v-model="profileForm.phoneNumberVerified" dict-type="boolean_status" />
            </div>
            <div class="space-y-2">
              <Label>地区</Label>
              <DictSelect v-model="profileForm.locale" :dict-items="localeItems" />
            </div>
            <div class="space-y-2">
              <Label>时区</Label>
              <Input v-model="profileForm.zoneInfo" placeholder="如 Asia/Shanghai" />
            </div>
            <div class="space-y-2">
              <Label>个人网站</Label>
              <Input v-model="profileForm.website" placeholder="https://" />
            </div>
            <div class="space-y-2">
              <Label>头像 URL</Label>
              <Input v-model="profileForm.picture" placeholder="请输入头像地址" />
            </div>
          </div>
        </TabsContent>

        <!-- 联系地址 -->
        <TabsContent value="address" class="space-y-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2 col-span-2">
              <Label>格式化地址</Label>
              <Input v-model="addressForm.formatted" placeholder="完整地址" />
            </div>
            <div class="space-y-2">
              <Label>街道地址</Label>
              <Input v-model="addressForm.streetAddress" />
            </div>
            <div class="space-y-2">
              <Label>城市</Label>
              <Input v-model="addressForm.locality" />
            </div>
            <div class="space-y-2">
              <Label>省/州</Label>
              <Input v-model="addressForm.region" />
            </div>
            <div class="space-y-2">
              <Label>邮编</Label>
              <Input v-model="addressForm.postalCode" />
            </div>
            <div class="space-y-2">
              <Label>国家</Label>
              <Input v-model="addressForm.country" />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="handleSubmit" :disabled="submitting">
          {{ submitting ? '提交中...' : '确定' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
