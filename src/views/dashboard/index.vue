<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LayoutDashboard, Users, Shield, Key, Activity, ArrowUpRight } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { statisticsApi } from '@/api'

const router = useRouter()

const stats = ref([
  { label: '用户总数', value: 0, icon: Users, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-500' },
  { label: '角色数量', value: 0, icon: Shield, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-500' },
  { label: '权限数量', value: 0, icon: Key, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-500' },
  { label: '菜单数量', value: 0, icon: LayoutDashboard, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-500' },
])

const recentActivities = ref<{ icon: typeof Users; iconColor: string; title: string; time: string }[]>([])

onMounted(async () => {
  // 调用后端 StatisticsController 提供的 4 个 count 接口，并行请求
  const [
    { data: userData },
    { data: roleData },
    { data: permData },
    { data: menuData },
  ] = await Promise.all([
    statisticsApi.userCount(),
    statisticsApi.roleCount(),
    statisticsApi.permissionCount(),
    statisticsApi.menuCount(),
  ])

  // 后端返回 R<Long>，useRequest 自动 unwrap，这里转 Number 兜底
  if (userData.value != null) {
    stats.value[0]!.value = Number(userData.value) || 0
  }
  if (roleData.value != null) {
    stats.value[1]!.value = Number(roleData.value) || 0
  }
  if (permData.value != null) {
    stats.value[2]!.value = Number(permData.value) || 0
  }
  if (menuData.value != null) {
    stats.value[3]!.value = Number(menuData.value) || 0
  }

  // 动态生成最近活动
  const now = new Date()
  recentActivities.value = [
    {
      icon: Users,
      iconColor: 'text-blue-500',
      title: `当前系统共有 ${stats.value[0]!.value} 位用户`,
      time: formatTime(now),
    },
    {
      icon: Shield,
      iconColor: 'text-emerald-500',
      title: `当前系统共有 ${stats.value[1]!.value} 个角色`,
      time: formatTime(now),
    },
    {
      icon: Key,
      iconColor: 'text-violet-500',
      title: `当前系统共有 ${stats.value[2]!.value} 个权限`,
      time: formatTime(now),
    },
  ]
})

function formatTime(date: Date) {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="p-6 space-y-6 animate-page-enter">
    <!-- 页头 -->
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-sm">
        <Activity class="w-4 h-4" />
        <span class="font-medium">系统运行正常</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card v-for="(stat, index) in stats" :key="stat.label" class="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardContent class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground font-medium">{{ stat.label }}</p>
              <p class="text-3xl font-bold mt-2 animate-count-up" :style="{ animationDelay: `${index * 100}ms` }">{{ stat.value }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="stat.bg">
              <component :is="stat.icon" class="w-6 h-6" :class="stat.iconColor" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 最近活动 -->
      <Card class="lg:col-span-2 border-0 shadow-md">
        <CardHeader class="pb-3">
          <CardTitle class="text-lg">最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div
              v-for="(activity, index) in recentActivities"
              :key="index"
              class="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors duration-200"
            >
              <div class="w-10 h-10 rounded-xl bg-background shadow-sm flex items-center justify-center">
                <component :is="activity.icon" :class="activity.iconColor" class="w-5 h-5" />
              </div>
              <div class="flex-1">
                <p class="font-medium text-sm">{{ activity.title }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">{{ activity.time }}</p>
              </div>
            </div>
            <div v-if="recentActivities.length === 0" class="text-center text-muted-foreground py-8">
              暂无数据
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 快速操作 -->
      <Card class="border-0 shadow-md">
        <CardHeader class="pb-3">
          <CardTitle class="text-lg">快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <button
              class="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted transition-all duration-200 group"
              @click="navigateTo('/system/users')"
            >
              <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Users class="w-4.5 h-4.5 text-blue-500" />
              </div>
              <span class="flex-1 text-left font-medium text-sm">用户管理</span>
              <ArrowUpRight class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              class="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted transition-all duration-200 group"
              @click="navigateTo('/system/roles')"
            >
              <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Shield class="w-4.5 h-4.5 text-emerald-500" />
              </div>
              <span class="flex-1 text-left font-medium text-sm">角色管理</span>
              <ArrowUpRight class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              class="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted transition-all duration-200 group"
              @click="navigateTo('/system/permissions')"
            >
              <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                <Key class="w-4.5 h-4.5 text-violet-500" />
              </div>
              <span class="flex-1 text-left font-medium text-sm">权限管理</span>
              <ArrowUpRight class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              class="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted transition-all duration-200 group"
              @click="navigateTo('/system/menus')"
            >
              <div class="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <LayoutDashboard class="w-4.5 h-4.5 text-orange-500" />
              </div>
              <span class="flex-1 text-left font-medium text-sm">菜单管理</span>
              <ArrowUpRight class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
