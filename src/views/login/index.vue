<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { userApi } from '@/api'
import { Shield, Lock, User, Mail, Clock, X } from '@lucide/vue'
import { APP_TITLE } from '@/constants/app'
import { BASE_URL } from '@/composables/useAuth'

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
const showCaptchaModal = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null
let tacInstance: TACInstance | null = null

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

// 实际执行登录（凭证校验），由 TAC 验证成功回调触发
async function doLogin() {
  try {
    if (loginMode.value === 'password') {
      const { data } = await userApi.login(username.value, password.value)
      if (data && data.value) {
        const { token, user } = data.value
        userStore.login(user, token)
      }
    } else {
      const { data } = await userApi.ottVerify(otpCode.value)
      if (data && data.value) {
        const { token, user } = data.value
        userStore.login(user, token)
      }
    }
    await router.push('/dashboard')
  } catch {
    // useRequest 已统一处理错误提示（业务错误 / 网络异常），不重复弹窗
  } finally {
    isLoading.value = false
  }
}

async function closeCaptcha() {
  if (tacInstance) {
    tacInstance.destroyWindow()
    tacInstance = null
  }
  showCaptchaModal.value = false
  isLoading.value = false
}

// 初始化 TAC 验证码（弹窗 DOM 已渲染后调用）
async function initTacCaptcha() {
  if (!window.initTAC) {
    await closeCaptcha()
    await doLogin()
    return
  }

  const config: TACCaptchaConfig = {
    requestCaptchaDataUrl: `${BASE_URL}/auth/captcha`,
    validCaptchaUrl: `${BASE_URL}/auth/check-captcha`,
    bindEl: '#captcha-box-inner',
    validSuccess: async (_res, _c, tac) => {
      tac.destroyWindow()
      tacInstance = null
      showCaptchaModal.value = false
      await doLogin()
    },
    validFail: (_res, _c, tac) => {
      tac.reloadCaptcha()
    },
    btnRefreshFun: (_el, tac) => {
      tac.reloadCaptcha()
    },
    btnCloseFun: (_el, tac) => {
      tac.destroyWindow()
      tacInstance = null
      showCaptchaModal.value = false
      isLoading.value = false
    },
  }

  const style: TACStyleConfig = {
    logoUrl: null,
  }

  window
    .initTAC('/tac', config, style)
    .then((tac) => {
      tacInstance = tac
      tac.init()
    })
    .catch(async (e) => {
      console.error('初始化tac失败', e)
      await closeCaptcha()
      await doLogin()
    })
}

// 启动天爱验证码
async function startCaptcha() {
  if (!window.initTAC) {
    await doLogin()
    return
  }
  // 先显示弹窗，等待 DOM 渲染完成后再初始化 TAC
  showCaptchaModal.value = true
  await nextTick()
  // 再等一帧确保 DOM 布局完成
  requestAnimationFrame(async () => {
    await initTacCaptcha()
  })
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
  await startCaptcha()
}

// 点击遮罩层关闭
async function handleMaskClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    await closeCaptcha()
  }
}

onUnmounted(async () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  await closeCaptcha()
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden"
  >
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-200/30 dark:bg-blue-800/20 blur-3xl"
      ></div>
      <div
        class="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-200/30 dark:bg-indigo-800/20 blur-3xl"
      ></div>
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-200/20 dark:bg-purple-800/10 blur-3xl"
      ></div>
    </div>

    <div class="relative z-10 w-full max-w-md px-4 animate-page-enter">
      <!-- Logo区域 -->
      <div class="flex flex-col items-center mb-8">
        <div
          class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4"
        >
          <Shield class="w-8 h-8 text-white" />
        </div>
        <h1
          class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
        >
          {{ APP_TITLE }}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">欢迎登录管理系统</p>
      </div>

      <Card
        class="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80"
      >
        <CardHeader class="pb-4">
          <CardTitle class="text-xl text-center">{{
            isOttMode ? '验证码登录' : '账号登录'
          }}</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- 登录方式切换 -->
            <div class="flex bg-muted/50 rounded-lg p-1">
              <button
                type="button"
                @click="loginMode = 'password'"
                class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200"
                :class="
                  loginMode === 'password'
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                "
              >
                <Lock class="w-4 h-4" />
                密码登录
              </button>
              <button
                type="button"
                @click="loginMode = 'ott'"
                class="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200"
                :class="
                  loginMode === 'ott'
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                "
              >
                <Mail class="w-4 h-4" />
                验证码登录
              </button>
            </div>

            <!-- 用户名 -->
            <div class="space-y-2">
              <Label for="username" class="text-sm font-medium">用户名</Label>
              <div class="relative">
                <User
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
                <Input id="username" v-model="username" placeholder="请输入用户名" class="pl-10" />
              </div>
            </div>

            <!-- 密码/验证码 -->
            <div v-if="!isOttMode" class="space-y-2">
              <Label for="password" class="text-sm font-medium">密码</Label>
              <div class="relative">
                <Lock
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
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
                <Mail
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
                <Input id="otpCode" v-model="otpCode" placeholder="请输入验证码" class="pl-10" />
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

    <!-- 验证码模态弹窗 -->
    <Teleport to="body">
      <div
        v-if="showCaptchaModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="handleMaskClick"
      >
        <div
          class="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl animate-captcha-in"
          @click.stop
        >
          <!-- 关闭按钮 -->
          <button
            type="button"
            @click="closeCaptcha"
            class="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
          <!-- TAC 验证码渲染容器 -->
          <div id="captcha-box-inner" class="p-0"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
/* 验证码弹窗进入动画 */
@keyframes captchaIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-captcha-in {
  animation: captchaIn 0.2s ease-out forwards;
}

/* TAC 验证码容器内边距重置，让验证码紧贴弹窗 */
#captcha-box-inner {
  position: relative;
  width: auto;
  height: auto;
}
#captcha-box-inner #tianai-captcha-parent {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  margin: 0 !important;
  border-radius: 12px;
  overflow: hidden;
}
/* 滑块等验证类型相对父容器定位 */
#captcha-box-inner .tianai-captcha-slider,
#captcha-box-inner .tianai-captcha-concat,
#captcha-box-inner .tianai-captcha-rotate,
#captcha-box-inner .tianai-captcha-word-click,
#captcha-box-inner .tianai-captcha-disable {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}
</style>
