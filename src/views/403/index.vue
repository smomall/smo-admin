<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ShieldX, Home } from '@lucide/vue'

const router = useRouter()

function goHome() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6 animate-page-enter">
    <div class="relative">
      <div class="absolute inset-0 w-32 h-32 rounded-full bg-orange-100 dark:bg-orange-900/20 blur-2xl mx-auto"></div>
      <ShieldX class="relative w-24 h-24 text-muted-foreground/60" />
    </div>
    <div class="text-center space-y-2">
      <h1 class="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">403</h1>
      <p class="text-lg text-muted-foreground">抱歉，您没有权限访问该页面</p>
    </div>
    <Button @click="goHome" class="gap-2">
      <Home class="w-4 h-4" />
      返回首页
    </Button>
  </div>
</template>
