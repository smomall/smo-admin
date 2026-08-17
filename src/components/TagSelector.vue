<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, X } from '@lucide/vue'
import { tagApi } from '@/api'

const props = defineProps<{
  modelValue: string[]
  siteId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const popoverOpen = ref(false)
const searchText = ref('')
const allTags = ref<{ id: string; title: string; articleCount?: number }[]>([])
const loading = ref(false)

const MAX_TAGS = 5

const selectedTags = computed(() => props.modelValue)
const canAddMore = computed(() => selectedTags.value.length < MAX_TAGS)

async function fetchTags() {
  loading.value = true
  try {
    const { data } = await tagApi.getAll(props.siteId)
    if (data.value) {
      allTags.value = data.value
    }
  } finally {
    loading.value = false
  }
}

function handleOpenChange(open: boolean) {
  popoverOpen.value = open
  if (open) {
    searchText.value = ''
    fetchTags()
  }
}

function removeTag(tag: string) {
  const next = selectedTags.value.filter((t) => t !== tag)
  emit('update:modelValue', next)
}

function addTag(tag: string) {
  const trimmed = tag.trim()
  if (!trimmed) return
  if (selectedTags.value.includes(trimmed)) return
  if (selectedTags.value.length >= MAX_TAGS) return
  emit('update:modelValue', [...selectedTags.value, trimmed])
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const trimmed = searchText.value.trim()
    if (!trimmed) return
    if (selectedTags.value.includes(trimmed)) {
      searchText.value = ''
      return
    }
    if (selectedTags.value.length >= MAX_TAGS) return
    addTag(trimmed)
    searchText.value = ''
  }
}

const searchResults = computed(() => {
  if (!searchText.value.trim()) return []
  const keyword = searchText.value.trim().toLowerCase()
  return allTags.value.filter((t) => t.title.toLowerCase().includes(keyword)).slice(0, 10)
})

const recommendTags = computed(() => {
  return allTags.value
    .filter((t) => !selectedTags.value.includes(t.title))
    .sort((a, b) => (b.articleCount || 0) - (a.articleCount || 0))
    .slice(0, 10)
})

watch(popoverOpen, (v) => {
  if (!v) {
    searchText.value = ''
  }
})
</script>

<template>
  <div class="space-y-2">
    <Label>标签</Label>
    <!-- 已选标签区域（始终可见） -->
    <div class="flex items-start gap-3 mt-1">
      <div class="flex flex-wrap gap-2 flex-1 min-h-[32px]">
        <div
          v-for="tag in selectedTags"
          :key="tag"
          class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
        >
          <span>{{ tag }}</span>
          <button class="ml-0.5 hover:text-destructive" @click="removeTag(tag)">
            <X class="w-3 h-3" />
          </button>
        </div>
        <span v-if="selectedTags.length === 0" class="text-sm text-muted-foreground self-center">
          暂无标签
        </span>
      </div>

      <!-- 添加标签按钮 -->
      <Popover v-if="canAddMore" v-model:open="popoverOpen" @update:open="handleOpenChange">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm" class="shrink-0">
            <Plus class="w-4 h-4 mr-1" />
            添加标签
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-80 p-4" align="start" :side-offset="8">
          <div class="space-y-4">
            <!-- 搜索/输入框 -->
            <div class="space-y-2">
              <Input
                v-model="searchText"
                placeholder="搜索或输入标签名后回车创建..."
                @keydown="handleSearchKeydown"
                class="w-full"
              />
              <p class="text-xs text-muted-foreground">按回车添加标签，不存在的标签将自动创建</p>
            </div>

            <!-- 搜索结果 -->
            <div v-if="searchText.trim() && searchResults.length > 0" class="space-y-2">
              <p class="text-sm font-medium">搜索结果</p>
              <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <button
                  v-for="tag in searchResults"
                  :key="tag.id"
                  class="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="selectedTags.includes(tag.title)"
                  @click="addTag(tag.title)"
                >
                  <span>{{ tag.title }}</span>
                  <span v-if="tag.articleCount" class="text-xs text-muted-foreground">
                    ({{ tag.articleCount }})
                  </span>
                </button>
              </div>
            </div>

            <!-- 推荐标签 -->
            <div v-if="!searchText.trim() && recommendTags.length > 0" class="space-y-2">
              <p class="text-sm font-medium">推荐标签</p>
              <div class="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                <button
                  v-for="tag in recommendTags"
                  :key="tag.id"
                  class="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="selectedTags.includes(tag.title)"
                  @click="addTag(tag.title)"
                >
                  <span>{{ tag.title }}</span>
                  <span v-if="tag.articleCount" class="text-xs text-muted-foreground">
                    ({{ tag.articleCount }})
                  </span>
                </button>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="searchText.trim() && searchResults.length === 0" class="text-center py-2">
              <p class="text-sm text-muted-foreground">
                未找到匹配标签，按回车创建 "{{ searchText }}"
              </p>
            </div>
            <div v-if="!searchText.trim() && recommendTags.length === 0" class="text-center py-2">
              <p class="text-sm text-muted-foreground">暂无推荐标签</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <span v-else class="text-xs text-muted-foreground shrink-0 self-center">
        最多 {{ MAX_TAGS }} 个标签
      </span>
    </div>
  </div>
</template>
