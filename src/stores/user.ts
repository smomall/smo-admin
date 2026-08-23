import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { LoginUser } from '../types'
import { getToken as readAuthToken, setToken as writeAuthToken, clearSession } from '@/composables/useAuth'

export const useUserStore = defineStore('user', () => {
  const user = ref<LoginUser | null>(null)
  /**
   * 本地响应式镜像：
   *  - 初始化由 useAuth 模块统一从 localStorage hydrate（保证与 useRequest/SSE 共用同一真相源）
   *  - 写入时同步到 useAuth，useAuth 内部 watch 会写回 localStorage
   *  - 不再在此 store 内直接操作 localStorage
   */
  const token = ref<string>(readAuthToken())

  function login(userInfo?: LoginUser, tokenValue?: string) {
    user.value = userInfo || null
    setToken(tokenValue || '')
  }

  function logout() {
    user.value = null
    clearSession()
    token.value = ''
  }

  function setUser(userInfo: LoginUser) {
    user.value = userInfo
  }

  function setToken(tokenValue: string) {
    token.value = tokenValue || ''
    writeAuthToken(tokenValue)
  }

  function getToken() {
    return token.value || readAuthToken()
  }

  return {
    user,
    token,
    login,
    logout,
    setUser,
    setToken,
    getToken,
  }
})
