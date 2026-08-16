<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  MapPin,
  Link,
  Save,
  Loader2,
  Camera,
  Home,
} from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import DictSelect from '@/components/DictSelect.vue'
import { useDict } from '@/composables/useDict'
import { userApi } from '@/api'
import { useUserStore } from '@/stores/user'
import { useMessageDialog } from '@/composables/useMessageDialog'
import type { UserProfile, UserAddress } from '@/types'

const userStore = useUserStore()
const { showSuccess, showError } = useMessageDialog()

const userId = computed(() => userStore.user?.id || '')

// ============== 字典（与 users/index.vue 对齐）==============
const { items: genderItems, fetchDict: fetchGender } = useDict('user_gender')
const { items: localeItems, fetchDict: fetchLocale } = useDict('common_locale')

// ============== 表单数据 ==============
const activeTab = ref('basic')

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
  emailVerified: false,
  gender: '',
  birthdate: '',
  zoneInfo: '',
  locale: '',
  phoneNumber: '',
  phoneNumberVerified: false,
  updateAt: '',
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

const loading = ref(false)
const saving = ref(false)

// ============== 加载资料（同时拉 profile + address）==============
onMounted(async () => {
  // 加载字典选项
  fetchGender()
  fetchLocale()
  if (!userId.value) return
  loading.value = true
  try {
    const [profileRes, addressRes] = await Promise.all([
      userApi.getProfile(userId.value),
      userApi.getAddress(userId.value),
    ])

    if (profileRes.data.value) {
      const p = profileRes.data.value
      profileForm.value = {
        userId: p.userId || userId.value,
        subject: p.subject || '',
        fullName: p.fullName || '',
        givenName: p.givenName || '',
        familyName: p.familyName || '',
        middleName: p.middleName || '',
        nickName: p.nickName || '',
        preferredUsername: p.preferredUsername || '',
        profile: p.profile || '',
        picture: p.picture || '',
        website: p.website || '',
        email: p.email || '',
        emailVerified: !!p.emailVerified,
        gender: p.gender || '',
        birthdate: p.birthdate || '',
        zoneInfo: p.zoneInfo || '',
        locale: p.locale || '',
        phoneNumber: p.phoneNumber || '',
        phoneNumberVerified: !!p.phoneNumberVerified,
        updateAt: p.updateAt || '',
      }
      // 若资料没有图片且 userStore 中有 avatar，作为初始值
      if (!profileForm.value.picture && userStore.user?.avatar) {
        profileForm.value.picture = userStore.user.avatar
      }
    } else {
      profileForm.value.userId = userId.value
      if (userStore.user) {
        profileForm.value.nickName = userStore.user.nickname || ''
        profileForm.value.picture = userStore.user.avatar || ''
      }
    }

    if (addressRes.data.value) {
      const a = addressRes.data.value
      addressForm.value = {
        userId: a.userId || userId.value,
        formatted: a.formatted || '',
        streetAddress: a.streetAddress || '',
        locality: a.locality || '',
        region: a.region || '',
        postalCode: a.postalCode || '',
        country: a.country || '',
      }
    } else {
      addressForm.value.userId = userId.value
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    loading.value = false
  }
})

// ============== 保存（同时调 updateProfile + updateAddress）==============
async function handleSave() {
  if (!userId.value) {
    showError('未获取到用户信息')
    return
  }
  if (saving.value) return
  saving.value = true
  try {
    await Promise.all([
      userApi.updateProfile(userId.value, profileForm.value),
      userApi.updateAddress(userId.value, addressForm.value),
    ])
    // 同步更新顶部 userStore 中的昵称/头像
    if (userStore.user) {
      userStore.setUser({
        ...userStore.user,
        nickname: profileForm.value.nickName || userStore.user.nickname,
        avatar: profileForm.value.picture || userStore.user.avatar,
      })
    }
    showSuccess('资料更新成功')
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    saving.value = false
  }
}

// ============== 头像首字母（顶部样式一致）==============
const avatarLetter = computed(
  () =>
    profileForm.value.nickName?.charAt(0) ||
    userStore.user?.username?.charAt(0) ||
    'U',
)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6 animate-page-enter">
    <!-- 页头 -->
    <div class="flex items-center justify-end">
      <Button :disabled="saving || loading" @click="handleSave">
        <Save v-if="!saving" class="w-4 h-4 mr-1.5" />
        <Loader2 v-else class="w-4 h-4 mr-1.5 animate-spin" />
        {{ saving ? '保存中...' : '保存修改' }}
      </Button>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-20"
    >
      <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
      <span class="ml-2 text-muted-foreground">加载中...</span>
    </div>

    <template v-else>
      <!-- 头像与昵称条 -->
      <Card class="border-0 shadow-md">
        <CardContent class="p-6">
          <div class="flex items-center gap-5">
            <div class="relative">
              <div
                v-if="profileForm.picture"
                class="w-20 h-20 rounded-full overflow-hidden ring-2 ring-border shadow-sm"
              >
                <img
                  :src="profileForm.picture"
                  alt="avatar"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-else
                class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold shadow-sm ring-2 ring-border"
              >
                {{ avatarLetter }}
              </div>
              <div
                class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center shadow-sm"
              >
                <Camera class="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <div class="flex-1">
              <h2 class="text-lg font-semibold">
                {{ profileForm.nickName || userStore.user?.username || '用户' }}
              </h2>
              <p class="text-sm text-muted-foreground mt-0.5">
                {{ profileForm.email || '未设置邮箱' }}
                <span v-if="profileForm.email" class="mx-1.5">·</span>
                {{ profileForm.phoneNumber }}
              </p>
              <p class="text-xs text-muted-foreground mt-1">
                上次更新：{{ profileForm.updateAt || '-' }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Tabs：基本资料 / 通讯地址 -->
      <Card class="border-0 shadow-md">
        <CardHeader class="pb-3">
          <CardTitle class="text-lg">资料信息</CardTitle>
          <CardDescription>完善以下信息以便获得更好的使用体验</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs v-model="activeTab" class="w-full">
            <TabsList variant="line" class="mb-5 w-full max-w-md gap-1">
              <TabsTrigger value="basic" class="flex-1">基本资料</TabsTrigger>
              <TabsTrigger value="address" class="flex-1">通讯地址</TabsTrigger>
            </TabsList>

            <!-- ========== 基本资料 ========== -->
            <TabsContent value="basic" class="space-y-5 pt-1 pb-2">
              <!-- 头像/昵称/用户名/第三方字段 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2 md:col-span-2">
                  <Label for="picture">
                    <span class="flex items-center gap-1.5">
                      <Camera class="w-3.5 h-3.5" />
                      头像 URL
                    </span>
                  </Label>
                  <Input
                    id="picture"
                    v-model="profileForm.picture"
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p class="text-xs text-muted-foreground">
                    输入图片直链，留空则显示首字母占位
                  </p>
                </div>

                <div class="space-y-2">
                  <Label for="nickName">
                    <span class="flex items-center gap-1.5">
                      <User class="w-3.5 h-3.5" />
                      昵称
                    </span>
                  </Label>
                  <Input
                    id="nickName"
                    v-model="profileForm.nickName"
                    placeholder="请输入昵称"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="preferredUsername">第三方登录首选用户名</Label>
                  <Input
                    id="preferredUsername"
                    v-model="profileForm.preferredUsername"
                    placeholder="preferred username"
                  />
                </div>

                <div class="space-y-2">
                  <Label for="fullName">完整姓名</Label>
                  <Input
                    id="fullName"
                    v-model="profileForm.fullName"
                    placeholder="请输入完整姓名"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="subject">OAuth/OIDC 唯一标识</Label>
                  <Input
                    id="subject"
                    v-model="profileForm.subject"
                    placeholder="subject"
                    disabled
                    class="opacity-80 bg-muted/30"
                  />
                </div>
              </div>

              <!-- 西方姓名体系 -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-2">
                  <Label for="givenName">名 (Given Name)</Label>
                  <Input
                    id="givenName"
                    v-model="profileForm.givenName"
                    placeholder="名"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="middleName">中间名 (Middle Name)</Label>
                  <Input
                    id="middleName"
                    v-model="profileForm.middleName"
                    placeholder="中间名"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="familyName">姓 (Family Name)</Label>
                  <Input
                    id="familyName"
                    v-model="profileForm.familyName"
                    placeholder="姓"
                  />
                </div>
              </div>

              <!-- 联系方式 + 验证状态 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="email">
                    <span class="flex items-center gap-1.5">
                      <Mail class="w-3.5 h-3.5" />
                      邮箱
                    </span>
                  </Label>
                  <Input
                    id="email"
                    v-model="profileForm.email"
                    type="email"
                    placeholder="you@example.com"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="emailVerified">邮箱已验证</Label>
                  <Switch
                    id="emailVerified"
                    v-model="profileForm.emailVerified"
                  />
                </div>

                <div class="space-y-2">
                  <Label for="phoneNumber">
                    <span class="flex items-center gap-1.5">
                      <Phone class="w-3.5 h-3.5" />
                      手机号
                    </span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    v-model="profileForm.phoneNumber"
                    placeholder="请输入手机号"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="phoneNumberVerified">手机已验证</Label>
                  <Switch
                    id="phoneNumberVerified"
                    v-model="profileForm.phoneNumberVerified"
                  />
                </div>
              </div>

              <!-- 个人属性 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="gender">
                    <span class="flex items-center gap-1.5">
                      <User class="w-3.5 h-3.5" />
                      性别
                    </span>
                  </Label>
                  <DictSelect
                    id="gender"
                    v-model="profileForm.gender"
                    :dict-items="genderItems"
                    placeholder="请选择性别"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="birthdate">
                    <span class="flex items-center gap-1.5">
                      <Calendar class="w-3.5 h-3.5" />
                      出生日期
                    </span>
                  </Label>
                  <Input
                    id="birthdate"
                    v-model="profileForm.birthdate"
                    type="date"
                  />
                </div>
              </div>

              <!-- 国际化 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="zoneInfo">
                    <span class="flex items-center gap-1.5">
                      <MapPin class="w-3.5 h-3.5" />
                      时区
                    </span>
                  </Label>
                  <Input
                    id="zoneInfo"
                    v-model="profileForm.zoneInfo"
                    placeholder="Asia/Shanghai"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="locale">
                    <span class="flex items-center gap-1.5">
                      <Globe class="w-3.5 h-3.5" />
                      语言地区
                    </span>
                  </Label>
                  <DictSelect
                    id="locale"
                    v-model="profileForm.locale"
                    :dict-items="localeItems"
                    placeholder="请选择语言"
                  />
                </div>
              </div>

              <!-- 外部链接 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="website">
                    <span class="flex items-center gap-1.5">
                      <Link class="w-3.5 h-3.5" />
                      个人网站
                    </span>
                  </Label>
                  <Input
                    id="website"
                    v-model="profileForm.website"
                    type="url"
                    placeholder="https://your-site.com"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="profile">
                    <span class="flex items-center gap-1.5">
                      <User class="w-3.5 h-3.5" />
                      个人主页 URL
                    </span>
                  </Label>
                  <Input
                    id="profile"
                    v-model="profileForm.profile"
                    type="url"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </TabsContent>

            <!-- ========== 通讯地址 ========== -->
            <TabsContent value="address" class="space-y-5 pt-1 pb-2">
              <div class="space-y-2">
                <Label for="formatted">
                  <span class="flex items-center gap-1.5">
                    <Home class="w-3.5 h-3.5" />
                    完整地址（一次性展示用）
                  </span>
                </Label>
                <Textarea
                  id="formatted"
                  v-model="addressForm.formatted"
                  rows="2"
                  placeholder="完整的可展示地址字符串"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2 md:col-span-2">
                  <Label for="streetAddress">街道地址</Label>
                  <Input
                    id="streetAddress"
                    v-model="addressForm.streetAddress"
                    placeholder="街道、门牌、室号等"
                  />
                </div>

                <div class="space-y-2">
                  <Label for="locality">
                    <span class="flex items-center gap-1.5">
                      <MapPin class="w-3.5 h-3.5" />
                      城市/地区 (locality)
                    </span>
                  </Label>
                  <Input
                    id="locality"
                    v-model="addressForm.locality"
                    placeholder="城市/区"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="region">省/州 (region)</Label>
                  <Input
                    id="region"
                    v-model="addressForm.region"
                    placeholder="省/直辖市/州"
                  />
                </div>

                <div class="space-y-2">
                  <Label for="postalCode">邮政编码</Label>
                  <Input
                    id="postalCode"
                    v-model="addressForm.postalCode"
                    placeholder="例如 100000"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="country">国家/地区</Label>
                  <Input
                    id="country"
                    v-model="addressForm.country"
                    placeholder="CN / 中国"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <!-- 底部保存按钮 -->
      <div class="flex justify-end gap-3 pt-2">
        <Button variant="outline" :disabled="saving" @click="$router.back()">
          取消
        </Button>
        <Button :disabled="saving" @click="handleSave">
          <Save v-if="!saving" class="w-4 h-4 mr-1.5" />
          <Loader2 v-else class="w-4 h-4 mr-1.5 animate-spin" />
          {{ saving ? '保存中...' : '保存修改' }}
        </Button>
      </div>
    </template>
  </div>
</template>
