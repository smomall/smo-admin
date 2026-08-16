<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { userApi } from '@/api'
import type { LoginUser } from '@/types'
import { Shield, Lock, User, Mail, Clock } from '@lucide/vue'
import { APP_TITLE } from '@/constants/app'

const router = useRouter()
const userStore = useUserStore()

const { showError, showSuccess } = useMessageDialog()

const loginMode = ref<'password' | 'ott'>('password')
const username = ref('')
const password = ref('')
const otpCode = ref('')
const isLoading = ref(false)
const isSendingCode = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const isOttMode = computed(() => loginMode.value === 'ott')

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  }, 1000)
}

async function handleSendCode() {
  if (!username.value) {
    showError('请输入用户名')
    return
  }
  if (countdown.value > 0) return

  isSendingCode.value = true
  try {
    const { data } = await userApi.ottSend(username.value)
    if (data) {
      showSuccess('验证码已发送')
      startCountdown()
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    isSendingCode.value = false
  }
}

async function handleLogin() {
  if (!username.value) {
    showError('请输入用户名')
    return
  }

  if (loginMode.value === 'password') {
    if (!password.value) {
      showError('请输入密码')
      return
    }
  } else {
    if (!otpCode.value) {
      showError('请输入验证码')
      return
    }
  }

  isLoading.value = true

  try {
    let resultData: { token: string; user: LoginUser } | null = null

    if (loginMode.value === 'password') {
      const { data } = await userApi.login(username.value, password.value)
      resultData = data.value
    } else {
      const { data } = await userApi.ottVerify(otpCode.value)
      resultData = data.value
    }

    if (resultData) {
      const { token, user } = resultData
      userStore.login(user, token)
      //showSuccess('登录成功')
      await router.push('/dashboard')
    }
    // data.value 为 null 表示业务错误（如密码错误），
    // useRequest 已统一弹出后端返回的 msg，此处不重复提示以免覆盖
  } catch {
    // useRequest 已统一处理错误提示（业务错误 / 网络异常），不重复弹窗
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-200/30 dark:bg-blue-800/20 blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-200/30 dark:bg-indigo-800/20 blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-200/20 dark:bg-purple-800/10 blur-3xl"></div>
    </div>

    <div class="relative z-10 w-full max-w-md px-4 animate-page-enter">
      <!-- Logo区域 -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
          <Shield class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{{ APP_TITLE }}</h1>
        <p class="text-sm text-muted-foreground mt-1">欢迎登录管理系统</p>
      </div>

      <Card class="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
        <CardHeader class="pb-4">
          <CardTitle class="text-xl text-center">{{ isOttMode ? '验证码登录' : '账号登录' }}</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- 登录方式切换 -->
            <div class="flex bg-muted/50 rounded-lg p-1">
              <button
                type="button"
                @click="loginMode = 'password'"
                class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200"
                :class="loginMode === 'password' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'"
              >
                <Lock class="w-4 h-4" />
                密码登录
              </button>
              <button
                type="button"
                @click="loginMode = 'ott'"
                class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200"
                :class="loginMode === 'ott' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'"
              >
                <Mail class="w-4 h-4" />
                验证码登录
              </button>
            </div>

            <!-- 用户名 -->
            <div class="space-y-2">
              <Label for="username" class="text-sm font-medium">用户名</Label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  v-model="username"
                  placeholder="请输入用户名"
                  class="pl-10"
                />
              </div>
            </div>

            <!-- 密码/验证码 -->
            <div v-if="!isOttMode" class="space-y-2">
              <Label for="password" class="text-sm font-medium">密码</Label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  v-model="password"
                  placeholder="请输入密码"
                  class="pl-10"
                />
              </div>
            </div>

            <div v-else class="space-y-2">
              <Label for="otpCode" class="text-sm font-medium">验证码</Label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="otpCode"
                  v-model="otpCode"
                  placeholder="请输入验证码"
                  class="pl-10"
                />
                <Button
                  type="button"
                  @click="handleSendCode"
                  :disabled="isSendingCode || countdown > 0 || !username"
                  class="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <template v-if="countdown > 0">
                    <Clock class="w-3 h-3 mr-1 inline" />
                    {{ countdown }}s
                  </template>
                  <template v-else-if="isSendingCode">发送中...</template>
                  <template v-else>获取验证码</template>
                </Button>
              </div>
            </div>

            <Button
              class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              :disabled="isLoading"
              type="submit"
              size="lg"
            >
              {{ isLoading ? '登录中...' : '登 录' }}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
