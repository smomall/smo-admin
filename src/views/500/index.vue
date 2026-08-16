<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ServerCrash, Home, RefreshCw } from '@lucide/vue'

const router = useRouter()

function goHome() {
  router.push('/dashboard')
}

function handleRefresh() {
  window.location.reload()
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6 animate-page-enter">
    <div class="relative">
      <div class="absolute inset-0 w-32 h-32 rounded-full bg-red-100 dark:bg-red-900/20 blur-2xl mx-auto"></div>
      <ServerCrash class="relative w-24 h-24 text-muted-foreground/60" />
    </div>
    <div class="text-center space-y-2">
      <h1 class="text-5xl font-bold bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">500</h1>
      <p class="text-lg text-muted-foreground">抱歉，服务器出了点问题</p>
    </div>
    <div class="flex items-center gap-3">
      <Button variant="outline" @click="handleRefresh" class="gap-2">
        <RefreshCw class="w-4 h-4" />
        刷新页面
      </Button>
      <Button @click="goHome" class="gap-2">
        <Home class="w-4 h-4" />
        返回首页
      </Button>
    </div>
  </div>
</template>
