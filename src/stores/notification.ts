import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { usePagedList } from '@/composables/usePagedList'
import { notificationApi } from '@/api'
import type { Notice } from '@/types'

export type NotificationType = 'notice' | 'announcement'

export interface AnnouncementItem {
  id: string
  title: string
  content: string
  importance: number
  publishAt: string
}

export interface NoticeItem {
  id: string
  title: string
  content: string
  importance: number
  publishAt: string
  isRead: boolean
  readAt?: string
}

/** 将后端 Notice 结构映射为统一的 AnnouncementItem */
function toAnnouncement(n: Notice): AnnouncementItem {
  return {
    id: String(n.id),
    title: n.title || '',
    content: n.content || '',
    importance: Number(n.importance) || 0,
    publishAt: n.publishAt || '',
  }
}

/** 将后端 Notice 结构映射为统一的 NoticeItem */
function toNoticeItem(n: Notice): NoticeItem {
  return {
    id: String(n.id),
    title: n.title || '',
    content: n.content || '',
    importance: Number(n.importance) || 0,
    publishAt: n.publishAt || '',
    isRead: Boolean(n.isRead),
    readAt: n.readAt || undefined,
  }
}

export const useNotificationStore = defineStore('notification', () => {
  // ============= 公告 (Announcement) — 复用 usePagedList（含 requestId 竞态防护） =============
  const announcementPager = usePagedList<AnnouncementItem, Record<string, never>>({
    fetcher: async (query) => {
      const { data } = await notificationApi.announcementPage({
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      })
      return {
        data: {
          value: data.value
            ? {
                records: (data.value.records || []).map(toAnnouncement),
                totalRow: Number(data.value.totalRow) || 0,
                pageNumber: data.value.pageNumber ?? query.pageNumber,
                pageSize: data.value.pageSize ?? query.pageSize,
              }
            : null,
        },
      }
    },
    pageSize: 10,
    immediate: false,
  })

  // 公告未读标记（只用于公告 tab 小红点，不混入顶部总红点）
  const announcementUnreadRef = ref(false)
  const announcementUnread = computed({
    get: () => announcementUnreadRef.value,
    set: (v: boolean) => { announcementUnreadRef.value = v },
  })

  // ============= 个人通知 (Notice) — 复用 usePagedList =============
  const noticePager = usePagedList<NoticeItem, Record<string, never>>({
    fetcher: async (query) => {
      const { data } = await notificationApi.noticePage({
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      })
      return {
        data: {
          value: data.value
            ? {
                records: (data.value.records || []).map(toNoticeItem),
                totalRow: Number(data.value.totalRow) || 0,
                pageNumber: data.value.pageNumber ?? query.pageNumber,
                pageSize: data.value.pageSize ?? query.pageSize,
              }
            : null,
        },
      }
    },
    pageSize: 10,
    immediate: false,
  })

  // 个人通知未读数 = 顶部导航总红点
  const noticeUnreadCountRef = ref(0)
  const noticeUnreadCount = computed({
    get: () => noticeUnreadCountRef.value,
    set: (v: number) => { noticeUnreadCountRef.value = v },
  })

  // ============= 对调用方可读可写的分页镜像 =============
  // 说明：NotificationBell.vue 内部会直接写 currentPage computed setter
  // （currentPage → notificationStore.announcementPage = v），用于记录 UI 选中的页。
  // 真正的翻页走 fetchCurrentPage(p) / goto(p)，但写 setter 不做 fetch，避免与 goto 重复请求。
  // 同步方向：pager.goto(p) 会写 pager.currentPage → 本 computed getter 立即反映。

  const announcementPage = computed({
    get: () => announcementPager.currentPage.value,
    set: (_v: number) => { /* 仅用于 UI 记录值，真正翻页走 fetchAnnouncementsPage(v) */ },
  })

  const noticePage = computed({
    get: () => noticePager.currentPage.value,
    set: (_v: number) => { /* 仅用于 UI 记录值，真正翻页走 fetchNoticesPage(v) */ },
  })

  // ============= Computed =============

  /** 顶部导航总红点 = 只统计个人通知未读，公告绝不混入 */
  const unreadCount = computed(() => noticeUnreadCountRef.value)

  /** 按类型取未读数（用于 Tab 小红点：通知用 count 数字，公告用 flag 转 0/1） */
  function getUnreadCountByType(type: NotificationType) {
    if (type === 'notice') return noticeUnreadCountRef.value
    if (type === 'announcement') return announcementUnreadRef.value ? 1 : 0
    return 0
  }

  // ============= 未读数：通知红点 + 公告未读flag =============
  async function fetchNoticeUnreadCount() {
    try {
      const { data } = await notificationApi.noticeUnreadCount()
      noticeUnreadCountRef.value = Number(data.value) || 0
    } catch {
      noticeUnreadCountRef.value = 0
    }
  }

  async function fetchAnnouncementUnreadFlag() {
    try {
      const { data } = await notificationApi.announcementUnreadFlag()
      announcementUnreadRef.value = Boolean(data.value)
    } catch {
      announcementUnreadRef.value = false
    }
  }

  // ============= SSE 收到刷新信号：只刷新 2 个未读统计接口，不拉列表 =============
  async function refreshUnreadStats() {
    await Promise.all([fetchAnnouncementUnreadFlag(), fetchNoticeUnreadCount()])
  }

  // 兼容：老的 refreshAll → 只刷新未读数统计
  async function refreshAll() {
    await refreshUnreadStats()
  }

  // ============= 已读操作 =============

  /** 公告：打开 tab / 点击公告 → 自动已读 */
  async function markAnnouncementsRead() {
    if (!announcementUnreadRef.value) return
    try {
      await notificationApi.announcementsReadAll()
      announcementUnreadRef.value = false
    } catch {
      // 静默
    }
  }

  /** 通知：单条手动确认 → 标记已读，同步减未读数 */
  async function markNoticeRead(id: string) {
    const pureId = id.startsWith('not_') ? id.slice(4) : id
    const item = noticePager.list.value.find((n) => n.id === pureId)
    if (!item || item.isRead) return
    try {
      await notificationApi.noticeRead(pureId)
      item.isRead = true
      if (noticeUnreadCountRef.value > 0) noticeUnreadCountRef.value--
    } catch {
      // 静默
    }
  }

  /** 通知：全部已读 */
  async function markAllNoticesRead() {
    if (noticeUnreadCountRef.value <= 0) return
    try {
      await notificationApi.noticesReadAll()
      noticePager.list.value.forEach((n) => (n.isRead = true))
      noticeUnreadCountRef.value = 0
    } catch {
      // 静默
    }
  }

  // 兼容旧 API
  async function markAsRead(id: string) {
    if (id.startsWith('ann_')) {
      await markAnnouncementsRead()
    } else {
      await markNoticeRead(id)
    }
  }

  // 兼容旧 API：全部已读
  async function markAllAsRead() {
    await markAnnouncementsRead()
    await markAllNoticesRead()
  }

  // ============= 本地清理（不写后端） =============
  function clearAll() {
    announcementPager.list.value = []
    noticePager.list.value = []
  }

  return {
    // 公告 - 分页（通过 usePagedList 提供 requestId 过期响应防护）
    announcements: announcementPager.list,
    announcementPage,
    announcementPageSize: announcementPager.pageSize,
    announcementTotal: announcementPager.total,
    announcementLoading: announcementPager.loading,
    announcementUnread,
    fetchAnnouncementsPage: (page?: number, pageSize?: number) => {
      if (pageSize != null) announcementPager.setPageSize(pageSize)
      return announcementPager.goto(page ?? announcementPager.currentPage.value)
    },

    // 通知 - 分页
    notices: noticePager.list,
    noticePage,
    noticePageSize: noticePager.pageSize,
    noticeTotal: noticePager.total,
    noticeLoading: noticePager.loading,
    noticeUnreadCount,
    fetchNoticesPage: (page?: number, pageSize?: number) => {
      if (pageSize != null) noticePager.setPageSize(pageSize)
      return noticePager.goto(page ?? noticePager.currentPage.value)
    },

    // 未读数
    unreadCount,
    getUnreadCountByType,
    fetchNoticeUnreadCount,
    fetchAnnouncementUnreadFlag,
    refreshUnreadStats,
    refreshAll,

    // 已读
    markAnnouncementsRead,
    markNoticeRead,
    markAllNoticesRead,
    markAsRead,
    markAllAsRead,

    // 本地
    clearAll,
  }
})
