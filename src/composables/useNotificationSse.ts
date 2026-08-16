import { ref, computed, watch, nextTick } from 'vue'
import { useEventSource } from '@vueuse/core'
import { useNotificationStore } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import { toast } from 'vue-sonner'

const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api'

// Module-level singleton state
const manualClose = ref(false)
const sseUrl = ref('')

// 只监听 'notice' 事件名，后端推送统一 event name = notice
const { status, data } = useEventSource(sseUrl, ['notice'], {
  autoReconnect: true,
})

const connected = computed(() => status.value === 'OPEN')

/** 由 token 派生 SSE 地址，空 token 返回空串（不连接） */
function buildSseUrl(token: string): string {
  if (!token) return ''
  return `${API_PREFIX}/events?access_token=${encodeURIComponent(token)}`
}

let initialized = false
let usersCount = 0

/**
 * 处理 SSE 消息：
 * 后端只推送刷新信号 {"type": "notice"}，不携带真实数据
 * 收到信号后只刷新 2 个未读统计接口：
 *   - /notifications/announcements/unread/flag  (公告 tab 小红点)
 *   - /notifications/notices/unread/count       (顶部总红点 + 通知 tab 小红点)
 * 不拉列表数据，列表在用户打开下拉时按当前 Tab 单独调用对应分页接口
 */
function handleMessage(rawData: string) {
  if (!rawData) return
  try {
    const text = typeof rawData === 'string' ? rawData : String(rawData)
    if (text.startsWith('{') || text.startsWith('[')) {
      const parsed = JSON.parse(text)
      if (parsed && parsed.type) {
        const notificationStore = useNotificationStore()
        notificationStore.refreshUnreadStats().catch(() => {
          // 静默处理刷新失败
        })
        // 轻量提示，避免打扰
        toast('有新的消息提醒', {
          description: '点击查看详情',
          duration: 3000,
        })
      }
    }
  } catch {
    // Ignore parse errors for keep-alive/comment messages
  }
}

function connect() {
  manualClose.value = false
  const userStore = useUserStore()
  const url = buildSseUrl(userStore.getToken())
  if (!url) {
    sseUrl.value = ''
    return
  }
  if (sseUrl.value === url) {
    // URL 未变：Vue 会合并同步赋值，直接重赋不会触发 useEventSource 重连。
    // 先清空，待响应式更新刷新后再于下一 tick 赋值，确保真正重建连接。
    sseUrl.value = ''
    nextTick(() => {
      if (!manualClose.value) sseUrl.value = url
    })
    return
  }
  sseUrl.value = url
}

function disconnect() {
  manualClose.value = true
  sseUrl.value = ''
}

export function useNotificationSse() {
  usersCount++

  if (!initialized) {
    const userStore = useUserStore()

    // Watch for incoming SSE messages - 仅作为刷新信号
    watch(data, (rawData) => {
      if (rawData) {
        handleMessage(rawData)
      }
    })

    // Auto connect/disconnect on token changes
    watch(
      () => userStore.getToken(),
      (token) => {
        if (token && !manualClose.value) {
          const url = buildSseUrl(token)
          if (sseUrl.value !== url) {
            sseUrl.value = url
          }
          // 连接成功后先做一次未读数初始化（不拉列表）
          const notificationStore = useNotificationStore()
          notificationStore.refreshUnreadStats().catch(() => {})
        } else if (!token) {
          disconnect()
        }
      },
      { immediate: true },
    )

    initialized = true
  }

  function cleanup() {
    usersCount--
    if (usersCount <= 0) {
      disconnect()
      usersCount = 0
    }
  }

  return { connected, status, connect, disconnect, cleanup }
}
