<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Megaphone,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from '@lucide/vue'
import { useNotificationStore, type NotificationType } from '@/stores/notification'
import { useNotificationSse } from '@/composables/useNotificationSse'
import { toast } from 'vue-sonner'

const notificationStore = useNotificationStore()
const { connected, cleanup } = useNotificationSse()

const isOpen = ref(false)
/** 默认展示公告（优先级更高） */
const selectedType = ref<NotificationType>('announcement')

onBeforeUnmount(() => {
  cleanup()
})

// ============== 类型配置：公告 + 通知 ==============
const typeIcons: Record<NotificationType, unknown> = {
  notice: Bell,
  announcement: Megaphone,
}

const typeColors: Record<NotificationType, { bg: string; border: string; icon: string; text: string }> = {
  notice: { bg: 'bg-blue-500/10', border: 'border-l-blue-500', icon: 'text-blue-500', text: 'text-blue-500' },
  announcement: { bg: 'bg-purple-500/10', border: 'border-l-purple-500', icon: 'text-purple-500', text: 'text-purple-500' },
}

const typeLabels: Record<NotificationType, string> = {
  notice: '通知',
  announcement: '公告',
}

const tabTypes: Array<{ value: NotificationType; label: string }> = [
  { value: 'announcement', label: '公告' },
  { value: 'notice', label: '通知' },
]

// ============== 取当前 Tab 的分页数据 ==============
const currentList = computed(() => {
  return selectedType.value === 'announcement'
    ? notificationStore.announcements.map((n) => ({
        id: 'ann_' + n.id,
        type: 'announcement' as const,
        title: n.title,
        content: n.content,
        publishedAt: n.publishAt,
        read: !notificationStore.announcementUnread,
        isRead: !notificationStore.announcementUnread,
        rawId: n.id,
      }))
    : notificationStore.notices.map((n) => ({
        id: 'not_' + n.id,
        type: 'notice' as const,
        title: n.title,
        content: n.content,
        publishedAt: n.publishAt,
        read: Boolean(n.isRead),
        isRead: Boolean(n.isRead),
        rawId: n.id,
      }))
})

const currentTotal = computed(() => {
  return selectedType.value === 'announcement'
    ? notificationStore.announcementTotal
    : notificationStore.noticeTotal
})

const currentPage = computed({
  get: () =>
    selectedType.value === 'announcement'
      ? notificationStore.announcementPage
      : notificationStore.noticePage,
  set: (v: number) => {
    if (selectedType.value === 'announcement') {
      notificationStore.announcementPage = v
    } else {
      notificationStore.noticePage = v
    }
  },
})

const currentPageSize = computed(() => {
  return selectedType.value === 'announcement'
    ? notificationStore.announcementPageSize
    : notificationStore.noticePageSize
})

const currentLoading = computed(() => {
  return selectedType.value === 'announcement'
    ? notificationStore.announcementLoading
    : notificationStore.noticeLoading
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(currentTotal.value / currentPageSize.value))
)

/** 头部显示的未读数 = 当前选中 Tab 的未读数 */
const filteredUnreadCount = computed(() => {
  return notificationStore.getUnreadCountByType(selectedType.value)
})

const hasRecords = computed(() => currentList.value.length > 0)

// ============== 当前 Tab 调对应的分页接口 ==============
function fetchCurrentPage(page?: number) {
  if (selectedType.value === 'announcement') {
    return notificationStore.fetchAnnouncementsPage(page)
  } else {
    return notificationStore.fetchNoticesPage(page)
  }
}

// ============== 打开下拉：调用当前 Tab 的分页接口 + 刷新未读数 ==============
watch(isOpen, (open) => {
  if (open) {
    // 刷新未读数（红点统计）
    notificationStore.refreshUnreadStats().catch(() => {})
    // 当前 Tab 从第 1 页开始拉
    fetchCurrentPage(1).catch(() => {})
    // 公告 Tab → 自动已读
    if (selectedType.value === 'announcement') {
      setTimeout(() => notificationStore.markAnnouncementsRead(), 200)
    }
  }
})

// ============== 切 Tab：调用对应 Tab 的分页接口；公告自动已读 ==============
watch(selectedType, (newType) => {
  if (!isOpen.value) return
  fetchCurrentPage(1).catch(() => {})
  if (newType === 'announcement') {
    notificationStore.markAnnouncementsRead()
  }
})

// ============== 分页翻页 ==============
function goPage(p: number) {
  if (p < 1 || p > totalPages.value || currentLoading.value) return
  fetchCurrentPage(p).catch(() => {})
}

// ============== 工具函数 ==============
function getTypeIcon(type: NotificationType) {
  return typeIcons[type] || Bell
}

function getTypeColor(type: NotificationType) {
  return typeColors[type] || typeColors.notice
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

/** 生成要显示的页码数组：1 ... 4 5 6 ... N */
function getVisiblePages(): Array<number | 'ellipsis'> {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  if (start > 2) out.push('ellipsis')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('ellipsis')
  out.push(total)
  return out
}

// ============== 通知：手动确认点击已读 ==============
function handleNoticeConfirm(rawId: string, event: Event) {
  event.stopPropagation()
  notificationStore.markNoticeRead(rawId)
}

// ============== 标记全部已读：只对当前 Tab 生效 ==============
function handleMarkAllAsRead() {
  if (selectedType.value === 'announcement') {
    notificationStore.markAnnouncementsRead()
  } else {
    notificationStore.markAllNoticesRead()
  }
  toast.success('已全部标记为已读')
}

function handleClearAll() {
  notificationStore.clearAll()
  toast.success('已清空通知')
}

/**
 * 点击通知项：
 * - 公告 → 打开即自动已读
 * - 通知 → 需手动确认，点击不自动已读
 */
function handleNotificationClick(item: { type: NotificationType; rawId: string; isRead: boolean }) {
  if (item.type === 'announcement') {
    if (notificationStore.announcementUnread) {
      notificationStore.markAnnouncementsRead()
    }
  }
  // 通知：手动点确认按钮才会标已读
}

function toggleDropdown(open: boolean) {
  isOpen.value = open
}
</script>

<template>
  <DropdownMenu v-model:open="isOpen" @update:open="toggleDropdown">
    <DropdownMenuTrigger as-child>
      <button
        class="relative p-2 rounded-md hover:bg-secondary hover:text-primary transition-all duration-200 group"
      >
        <Bell class="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
        <!-- 顶部导航总红点 = 只统计个人通知未读，公告绝不混入 -->
        <span
          v-if="notificationStore.noticeUnreadCount > 0"
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium px-1 animate-bounce"
        >
          {{ notificationStore.noticeUnreadCount > 99 ? '99+' : notificationStore.noticeUnreadCount }}
        </span>
        <span
          v-if="connected && notificationStore.noticeUnreadCount === 0"
          class="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500"
          title="已连接"
        ></span>
        <span
          v-else-if="!connected"
          class="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-gray-400"
          title="未连接"
        ></span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="w-[460px] p-0 overflow-hidden shadow-xl"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/50 to-transparent">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-md bg-primary/10">
            <Bell class="w-4 h-4 text-primary" />
          </div>
          <span class="font-semibold text-sm">消息中心</span>
          <span
            v-if="filteredUnreadCount > 0"
            class="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-medium"
          >
            {{ filteredUnreadCount }}
          </span>
        </div>
        <div class="flex items-center gap-0.5">
          <button
            v-if="filteredUnreadCount > 0"
            class="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all hover:scale-105"
            title="全部标记已读"
            @click="handleMarkAllAsRead"
          >
            <CheckCheck class="w-4 h-4" />
          </button>
          <button
            v-if="hasRecords"
            class="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all hover:scale-105"
            title="清空全部"
            @click="handleClearAll"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Tabs：通知 / 公告 -->
      <div class="px-3 pt-2 pb-1 border-b">
        <Tabs v-model="selectedType" class="w-full">
          <TabsList variant="line" class="w-full gap-1">
            <TabsTrigger
              v-for="tab in tabTypes"
              :key="tab.value"
              :value="tab.value"
              class="flex-1 px-2 py-1 text-xs"
            >
              {{ tab.label }}
              <span
                v-if="notificationStore.getUnreadCountByType(tab.value) > 0"
                class="ml-1 px-1 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-medium min-w-[14px] text-center"
              >
                {{ notificationStore.getUnreadCountByType(tab.value) }}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <!-- Empty State -->
      <div
        v-if="!currentLoading && !hasRecords"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div class="p-4 rounded-full bg-muted/50 mb-3">
          <Bell class="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <p class="text-sm text-muted-foreground">
          暂无{{ typeLabels[selectedType] }}
        </p>
        <p class="text-xs text-muted-foreground/70 mt-1">
          {{ connected ? '一切正常' : '等待连接...' }}
        </p>
      </div>

      <!-- Loading -->
      <div
        v-else-if="currentLoading && !hasRecords"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <Loader2 class="w-6 h-6 animate-spin text-muted-foreground mb-3" />
        <p class="text-xs text-muted-foreground">加载中...</p>
      </div>

      <!-- List -->
      <div v-else class="max-h-[360px] overflow-y-auto">
        <div
          v-for="(item, index) in currentList"
          :key="item.id"
          class="group relative flex gap-3 p-3 cursor-pointer transition-all duration-150 hover:bg-muted/30 border-l-[3px]"
          :class="[
            getTypeColor(item.type).border,
            !item.isRead ? 'bg-primary/5' : '',
          ]"
          :style="{ animationDelay: `${index * 50}ms` }"
          @click="handleNotificationClick(item)"
        >
          <!-- Icon -->
          <div
            class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            :class="getTypeColor(item.type).bg"
          >
            <component
              :is="getTypeIcon(item.type)"
              class="w-4 h-4"
              :class="getTypeColor(item.type).icon"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  :class="getTypeColor(item.type).bg + ' ' + getTypeColor(item.type).text"
                >
                  {{ typeLabels[item.type] }}
                </span>
                <span
                  v-if="!item.isRead"
                  class="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"
                ></span>
              </div>
              <button
                class="flex-shrink-0 p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
                @click.stop
                title="关闭"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
            <h4
              class="font-medium text-sm mt-1 truncate"
              :class="!item.isRead ? 'text-foreground' : 'text-muted-foreground'"
            >
              {{ item.title }}
            </h4>
            <p class="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
              {{ item.content }}
            </p>
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-[10px] text-muted-foreground">{{ formatTime(item.publishedAt) }}</span>

              <!-- 通知：手动确认点击按钮 -->
              <template v-if="item.type === 'notice' && !item.isRead">
                <button
                  class="text-[10px] px-2 py-0.5 rounded-md bg-primary text-white flex items-center gap-0.5 hover:opacity-90 transition-opacity"
                  @click.stop="handleNoticeConfirm(item.rawId, $event)"
                >
                  <Check class="w-3 h-3" />
                  确认已读
                </button>
              </template>
              <!-- 公告：打开自动已读标识 -->
              <template v-else-if="item.type === 'announcement'">
                <span class="text-[10px] text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  打开即已读
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination + Footer -->
      <template v-if="hasRecords">
        <DropdownMenuSeparator />

        <!-- 分页控件 -->
        <div class="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <!-- 左：总条数 -->
          <div class="text-[11px] text-muted-foreground whitespace-nowrap">
            共 <span class="font-medium text-foreground">{{ currentTotal }}</span> 条
            <span class="mx-1 opacity-50">·</span>
            第 <span class="font-medium text-foreground">{{ currentPage }}</span>/{{ totalPages }} 页
          </div>

          <!-- 右：上一页 / 页码 / 下一页 -->
          <div class="flex items-center gap-1">
            <button
              class="p-1 rounded hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="currentPage <= 1 || currentLoading"
              @click="goPage(currentPage - 1)"
              title="上一页"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>

            <template v-for="p in getVisiblePages()" :key="String(p)">
              <span
                v-if="p === 'ellipsis'"
                class="px-1 text-[11px] text-muted-foreground"
              >
                …
              </span>
              <button
                v-else
                class="min-w-[24px] h-6 px-1.5 rounded text-[11px] font-medium transition-colors"
                :class="
                  p === currentPage
                    ? 'bg-primary text-white'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                "
                :disabled="currentLoading"
                @click="goPage(p)"
              >
                {{ p }}
              </button>
            </template>

            <button
              class="p-1 rounded hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="currentPage >= totalPages || currentLoading"
              @click="goPage(currentPage + 1)"
              title="下一页"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          class="w-full px-4 py-2.5 text-center text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
          @click="handleMarkAllAsRead"
        >
          <CheckCheck class="w-4 h-4" />
          全部标记为已读
        </button>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
