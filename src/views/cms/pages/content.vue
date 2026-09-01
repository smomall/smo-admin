<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from '@lucide/vue'
import { pageApi } from '@/api'
import { useTabStore } from '@/stores/tab'
import { useSiteStore } from '@/stores/site'
import DictSelect from '@/components/DictSelect.vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const route = useRoute()
const router = useRouter()
const tabStore = useTabStore()
const siteStore = useSiteStore()
const { showError, showSuccess } = useMessageDialog()

const pageId = computed(() => route.query.id as string | undefined)
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const pageTitle = ref('')
const loading = ref(false)
const saving = ref(false)

const formData = ref({
  content: '',
  contentType: '',
})

async function fetchPage() {
  if (!pageId.value) return
  loading.value = true
  try {
    const { data } = await pageApi.getById(pageId.value)
    if (data.value) {
      pageTitle.value = data.value.title || ''
      formData.value.content = data.value.content || ''
      formData.value.contentType = data.value.contentType || ''
    }
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!pageId.value) {
    showError('页面未保存，请先返回编辑页面元数据并保存')
    return
  }
  saving.value = true
  try {
    await pageApi.update(pageId.value, {
      content: formData.value.content,
      contentType: formData.value.contentType,
    })
    showSuccess('保存成功')
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    saving.value = false
  }
}

function handleBack() {
  const currentTab = tabStore.activeTab
  if (currentTab) {
    tabStore.removeTab(currentTab.id)
  }
  router.push({ path: '/cms/pages', query: { siteId: siteId.value } })
}

onMounted(() => {
  fetchPage()
})
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-100px)] animate-page-enter">
    <div class="flex items-center justify-between px-4 py-3 border-b shrink-0">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" @click="handleBack">
          <ArrowLeft class="w-4 h-4 mr-1" />
          返回
        </Button>
        <span class="text-sm text-muted-foreground">
          编辑内容{{ pageTitle ? `：${pageTitle}` : '' }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <DictSelect
          v-model="formData.contentType"
          dict-type="content_type"
          placeholder="内容类型"
          class="w-32"
        />
        <Button size="sm" :disabled="saving" @click="handleSave">
          <Save class="w-4 h-4 mr-1" />
          {{ saving ? '保存中...' : '保存' }}
        </Button>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
    >
      <div
        class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
      ></div>
      加载中...
    </div>
    <div v-else class="flex-1 px-4 py-3 min-h-0 md-editor-wrapper">
      <MdEditor v-model="formData.content" preview-theme="github" class="h-full" />
    </div>
  </div>
</template>

<style>
.md-editor-wrapper {
  min-height: 0;
}
.md-editor-wrapper .md-editor {
  height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
