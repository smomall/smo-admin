<script setup lang="ts">
const props = withDefaults(defineProps<{
  level: number
}>(), {
  level: 0,
})

// 祖先层级的竖向引导线数量（当前层级自身用分支连接线渲染）
const ancestorGuides = Math.max(0, props.level - 1)
</script>

<template>
  <span class="inline-flex items-stretch self-stretch shrink-0" aria-hidden="true">
    <span
      v-for="n in ancestorGuides"
      :key="n"
      class="w-5 border-l border-border/70"
    />
    <span
      v-if="level > 0"
      class="w-5 border-l border-border/70 flex items-center"
    >
      <span class="h-px w-full bg-border/70" />
    </span>
  </span>
</template>
