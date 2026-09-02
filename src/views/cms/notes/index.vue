<script setup lang="ts">
import { ref, onMounted, computed, h, watch, type VNode } from 'vue'
import { useRoute } from 'vue-router'
import { formatDateTime, toLocalDateInput, fromLocalDateInput } from '@/lib/utils'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Folder, FolderOpen, ChevronRight, FileText, ChevronsDownUp, ChevronsUpDown } from '@lucide/vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import type { Note, Chapter, Category } from '@/types'
import { noteApi, chapterApi, documentApi, categoryApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useSiteStore } from '@/stores/site'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import CategoryTree from '@/components/CategoryTree.vue'
import CategorySelector from '@/components/CategorySelector.vue'
import TagSelector from '@/components/TagSelector.vue'
import DictSelect from '@/components/DictSelect.vue'
import CoverInput from '@/components/CoverInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TreeGuides from '@/components/TreeGuides.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'

const siteStore = useSiteStore()
const { items: noteStatusItems, getLabel: getStatusLabel } = useDict('publish_status')
const { items: chapterStatusItems } = useDict('publish_status')
const { items: contentTypeItems } = useDict('content_type')
const route = useRoute()
const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

// ===== 左侧分类树 =====
const selectedCategoryId = ref<string | undefined>(undefined)
const categoryTree = ref<Category[]>([])

const flatCategoryOptions = computed(() => {
  const result: (Category & { indent: number })[] = []
  function flatten(list: Category[], level: number) {
    for (const cat of list) {
      result.push({ ...cat, indent: level })
      if (cat.children?.length) {
        flatten(cat.children, level + 1)
      }
    }
  }
  flatten(categoryTree.value, 0)
  return result
})

async function fetchCategoryTree() {
  try {
    const { data } = await categoryApi.tree(siteId.value)
    if (data.value) {
      categoryTree.value = data.value
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

// ===== 笔记列表 =====
const searchTitle = ref('')
const searchStatus = ref<string>('__all__')
const selectedNote = ref<Note | null>(null)

// ===== 笔记弹窗 =====
const showNoteDialog = ref(false)
const isNoteEdit = ref(false)
const noteDialogTab = ref('info')
const selectedCategoryIds = ref<string[]>([])
const selectedTagNames = ref<string[]>([])
const noteForm = ref({
  id: '',
  title: '',
  description: '',
  categoryId: '__none__',
  fileId: '',
  cover: '',
  status: '0',
  publishAt: '',
})

/** 用于表单预览的 cover URL （编辑时来自后端回显） */
const coverPreviewUrl = ref('')

// ===== 笔记查询 =====
const {
  list: notes,
  loading,
  currentPage,
  pageSize,
  total,
  goto,
  search: handleSearch,
  reload: reloadNotes,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => noteApi.list(query),
  params: () => ({
    title: searchTitle.value,
    status: searchStatus.value === '__all__' ? '' : searchStatus.value,
    categoryId: selectedCategoryId.value || '',
    siteId: siteId.value,
  }),
})

function handleCategorySelect() {
  selectedNote.value = null
  handleSearch()
}

// ===== 章节树 + 右侧编辑器（左右分栏） =====
const chapters = ref<Chapter[]>([])
const expandedChapterIds = ref<Set<string>>(new Set())
const flatChapters = ref<Chapter[]>([])
/** 当前选中章节 id（切换章节 → 右侧加载对应文档编辑器） */
const activeChapterId = ref<string>('')
const docLoading = ref(false)
const mdReady = ref(false)
const docSaving = ref(false)
/** 文档内容是否已被用户修改（未保存时切换章节提示） */
const docDirty = ref(false)
/** 文档编辑表单（正文/内容类型独立维护；标题/摘要直接使用章节的） */
const docForm = ref({
  id: '',
  noteId: '',
  content: '',
  contentType: 'markdown',
})
/** 文档快照，用于判断脏 */
const docSnapshot = ref({
  content: '',
  contentType: 'markdown',
})

watch(
  () => [docForm.value.content, docForm.value.contentType],
  () => {
    docDirty.value =
      docForm.value.content !== docSnapshot.value.content ||
      docForm.value.contentType !== docSnapshot.value.contentType
  }
)

async function fetchChapters(noteId: string) {
  try {
    const { data } = await chapterApi.tree(noteId)
    if (data.value) {
      chapters.value = data.value
      buildFlatChapters(data.value)
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

function buildFlatChapters(list: Chapter[]) {
  flatChapters.value = []
  function flatten(items: Chapter[], lvl: number) {
    for (const item of items) {
      // 同步 level 字段，确保后端未返回时前端自动补充
      const synced = { ...item, indent: lvl, level: item.level ?? lvl }
      flatChapters.value.push(synced)
      if (item.children?.length) {
        flatten(item.children, lvl + 1)
      }
    }
  }
  flatten(list, 0)
}

/** 根据 parentId 计算层级 */
function calcLevel(parentId: string): number {
  if (!parentId || parentId === '0') return 0
  const parent = flatChapters.value.find((c) => c.id === parentId)
  return parent ? (parent.level ?? 0) + 1 : 0
}

/** 获取同级兄弟节点 */
function getSiblings(parentId: string): Chapter[] {
  if (!parentId || parentId === '0') {
    return chapters.value
  }
  function findIn(list: Chapter[]): Chapter[] | null {
    for (const item of list) {
      if (item.id === parentId) {
        return item.children || []
      }
      if (item.children?.length) {
        const found = findIn(item.children)
        if (found) return found
      }
    }
    return null
  }
  return findIn(chapters.value) || []
}

/** 计算下一个排序号（同级兄弟中最大 sort + 1） */
function calcNextSort(parentId: string): number {
  const siblings = getSiblings(parentId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((s) => s.sort ?? 0)) + 1
}

function toggleChapterExpand(id: string) {
  const newSet = new Set(expandedChapterIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedChapterIds.value = newSet
}

/** 收集所有有子节点的章节 id */
function collectParentIds(list: Chapter[]): string[] {
  const ids: string[] = []
  function walk(items: Chapter[]) {
    for (const item of items) {
      if (item.children?.length) {
        ids.push(item.id)
        walk(item.children)
      }
    }
  }
  walk(list)
  return ids
}

/** 是否所有父节点都已展开 */
const allExpanded = computed(() => {
  const parentIds = collectParentIds(chapters.value)
  return parentIds.length > 0 && parentIds.every((id) => expandedChapterIds.value.has(id))
})

function toggleExpandAll() {
  if (allExpanded.value) {
    expandedChapterIds.value = new Set()
  } else {
    expandedChapterIds.value = new Set(collectParentIds(chapters.value))
  }
}

/** 当前激活章节（用于标题显示） */
const activeChapter = computed<Chapter | undefined>(() => {
  return flatChapters.value.find((c) => c.id === activeChapterId.value)
})

async function activateChapter(id: string, force = false) {
  if (!force && id === activeChapterId.value) return
  if (!id) {
    activeChapterId.value = ''
    return
  }
  if (activeChapterId.value && docDirty.value) {
    const ok = await confirm('未保存的更改', '当前文档内容尚未保存，切换章节将丢失未保存内容，是否继续？')
    if (!ok) return
  }
  const chapter = flatChapters.value.find((c) => c.id === id)
  if (!chapter) return
  activeChapterId.value = id
  docLoading.value = true
  mdReady.value = false
  docDirty.value = false
  try {
    docForm.value = {
      id: chapter.id,
      noteId: chapter.noteId || selectedNote.value?.id || '',
      content: '',
      contentType: 'markdown',
    }
    // 文档标题/摘要使用章节的，仅正文/内容类型从文档实体取
    const { data } = await documentApi.getById(chapter.id)
    if (data.value) {
      docForm.value.content = data.value.content || ''
      docForm.value.contentType = data.value.contentType || 'markdown'
    }
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    docLoading.value = false
    docSnapshot.value = {
      content: docForm.value.content,
      contentType: docForm.value.contentType,
    }
    setTimeout(() => {
      mdReady.value = true
    }, 300)
  }
}

/** 保存当前文档内容（标题/摘要使用章节的，仅正文/内容类型保存到文档） */
async function handleSaveActiveDoc() {
  if (!activeChapterId.value) return
  docSaving.value = true
  try {
    const chapter = activeChapter.value
    const content = docForm.value.content || ''
    await documentApi.update(docForm.value.id, {
      id: docForm.value.id,
      siteId: siteId.value,
      noteId: docForm.value.noteId,
      title: chapter?.title || '',
      description: chapter?.description || '',
      content,
      contentType: docForm.value.contentType,
      wordCount: content.length,
    })
    docSnapshot.value = {
      content: docForm.value.content,
      contentType: docForm.value.contentType,
    }
    docDirty.value = false
    showSuccess('保存成功')
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    docSaving.value = false
  }
}

// ===== 章节基本信息弹窗（新增/编辑共用） =====
const showChapterDialog = ref(false)
const isAddChapterDialog = ref(true)
const editChapterForm = ref({
  id: '',
  title: '',
  description: '',
  parentId: '0',
  status: '0',
  sort: 0,
  level: 0,
})

function handleAddChapter(parentId?: string) {
  if (!selectedNote.value) return
  isAddChapterDialog.value = true
  const pId = parentId || '0'
  editChapterForm.value = {
    id: '',
    title: '',
    description: '',
    parentId: pId,
    status: '0',
    sort: calcNextSort(pId),
    level: calcLevel(pId),
  }
  showChapterDialog.value = true
}

function handleEditChapter(ch: Chapter) {
  isAddChapterDialog.value = false
  editChapterForm.value = {
    id: ch.id,
    title: ch.title,
    description: ch.description || '',
    parentId: ch.parentId || '0',
    status: String(ch.status || '0'),
    sort: ch.sort || 0,
    level: ch.level ?? calcLevel(ch.parentId || '0'),
  }
  showChapterDialog.value = true
}

async function handleSubmitChapterDialog() {
  if (!editChapterForm.value.title) {
    showError('请填写章节标题')
    return
  }
  // 提交前根据 parentId 重新计算 level，确保与父节点一致
  const calculatedLevel = calcLevel(editChapterForm.value.parentId)
  const chapterData: Partial<Chapter> = {
    noteId: selectedNote.value!.id,
    parentId: editChapterForm.value.parentId,
    title: editChapterForm.value.title,
    description: editChapterForm.value.description,
    status: editChapterForm.value.status,
    sort: editChapterForm.value.sort,
    level: calculatedLevel,
    siteId: siteId.value,
  }
  try {
    if (isAddChapterDialog.value) {
      await chapterApi.create(chapterData)
    } else {
      await chapterApi.update(editChapterForm.value.id, chapterData)
    }
    showSuccess(isAddChapterDialog.value ? '新增成功' : '更新成功')
    showChapterDialog.value = false
    if (selectedNote.value) {
      await fetchChapters(selectedNote.value.id)
      if (isAddChapterDialog.value && editChapterForm.value.parentId && editChapterForm.value.parentId !== '0') {
        expandedChapterIds.value.add(editChapterForm.value.parentId)
      }
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleDeleteChapter(id: string) {
  const ok = await confirm('删除章节', '删除章节将同时删除其下子章节和对应文档，确定继续？')
  if (!ok) return
  try {
    await chapterApi.delete(id)
    showSuccess('删除成功')
    if (activeChapterId.value === id) {
      activeChapterId.value = ''
    }
    if (selectedNote.value) await fetchChapters(selectedNote.value.id)
  } catch {
    // useRequest 已统一处理错误提示
  }
}

// ===== 笔记 CRUD =====
function handleAddNote() {
  isNoteEdit.value = false
  noteDialogTab.value = 'info'
  noteForm.value = {
    id: '',
    title: '',
    description: '',
    categoryId: selectedCategoryId.value || '__none__',
    fileId: '',
    cover: '',
    status: '0',
    publishAt: '',
  }
  coverPreviewUrl.value = ''
  selectedCategoryIds.value = []
  selectedTagNames.value = []
  activeChapterId.value = ''
  chapters.value = []
  selectedNote.value = null
  showNoteDialog.value = true
}

async function fetchNoteRelations(id: string) {
  try {
    const [tagsRes, catsRes] = await Promise.all([
      noteApi.listTags(id),
      noteApi.listCategories(id),
    ])
    if (tagsRes.data.value) {
      selectedTagNames.value = tagsRes.data.value.map((t) => t.title)
    }
    if (catsRes.data.value) {
      selectedCategoryIds.value = catsRes.data.value.map((c) => c.id)
    }
  } catch {
    // useRequest 已统一处理错误提示
  }
}

async function handleEditNote(note: Note) {
  isNoteEdit.value = true
  noteDialogTab.value = 'info'
  noteForm.value = {
    id: note.id,
    title: note.title,
    description: note.description || '',
    categoryId: note.categoryId || '__none__',
    fileId: note.fileId || '',
    cover: note.cover || '',
    status: String(note.status || '0'),
    publishAt: note.publishAt ? toLocalDateInput(note.publishAt) : '',
  }
  coverPreviewUrl.value = note.cover || ''
  selectedCategoryIds.value = []
  selectedTagNames.value = []
  selectedNote.value = note
  activeChapterId.value = ''
  await fetchChapters(note.id)
  fetchNoteRelations(note.id)
  showNoteDialog.value = true
}

async function handleDeleteNote(id: string) {
  const ok = await confirm('删除笔记', '删除笔记将同时删除其下所有章节和文档，确定继续？')
  if (!ok) return
  try {
    await noteApi.delete(id)
    showSuccess('删除成功')
    if (selectedNote.value?.id === id) {
      selectedNote.value = null
      chapters.value = []
      activeChapterId.value = ''
    }
    reloadAfterRemove()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

// 保存笔记（新增/编辑共用）
async function handleSubmitNote() {
  if (!noteForm.value.title) {
    showError('请填写标题')
    return
  }
  const noteData: Partial<Note> = {
    title: noteForm.value.title,
    description: noteForm.value.description,
    categoryId: noteForm.value.categoryId === '__none__' ? '' : noteForm.value.categoryId,
    cover: noteForm.value.cover,
    status: noteForm.value.status,
    publishAt: fromLocalDateInput(noteForm.value.publishAt),
    siteId: siteId.value,
    categoryIds: selectedCategoryIds.value,
    tagNames: selectedTagNames.value,
  }
  try {
    if (isNoteEdit.value) {
      await noteApi.update(noteForm.value.id, noteData)
      showSuccess('更新成功')
    } else {
      await noteApi.create(noteData)
      showSuccess('新增成功')
    }
    showNoteDialog.value = false
    reloadNotes()
  } catch {
    // useRequest 已统一处理错误提示
  }
}

// 笔记弹窗关闭时清理编辑器状态，避免下次打开残留 MdEditor 实例
watch(showNoteDialog, (open) => {
  if (!open) {
    mdReady.value = false
    docDirty.value = false
    activeChapterId.value = ''
    docLoading.value = false
  }
})

// 章节弹窗中切换父章节时，自动重算 level 和 sort（新增时）
watch(
  () => editChapterForm.value.parentId,
  (newParentId, oldParentId) => {
    if (!showChapterDialog.value || newParentId === oldParentId) return
    editChapterForm.value.level = calcLevel(newParentId)
    if (isAddChapterDialog.value) {
      editChapterForm.value.sort = calcNextSort(newParentId)
    }
  },
)

// ===== 章节树渲染（左右分栏版） =====
function renderChapterNode(chapter: Chapter, depth: number): VNode {
  const hasChildren = !!(chapter.children && chapter.children.length > 0)
  const isExpanded = expandedChapterIds.value.has(chapter.id)
  const isActive = activeChapterId.value === chapter.id
  const hasUnsaved = isActive && docDirty.value
  const statusLabel = getStatusLabel(chapter.status)
  const isPublished = String(chapter.status) === '1'

  return h('div', null, [
    h(
      'div',
      {
        class:
          'group/chapter-node flex h-8 items-stretch gap-0.5 px-1 rounded transition-colors ' +
          (isActive ? '' : 'hover:bg-muted/30'),
      },
      [
        hasChildren
          ? h(
              'button',
              {
                type: 'button',
                class:
                  'w-5 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground shrink-0',
                onClick: (e: Event) => {
                  e.stopPropagation()
                  toggleChapterExpand(chapter.id)
                },
              },
              [
                h(ChevronRight, {
                  class: `w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`,
                }),
              ],
            )
          : h('span', { class: 'w-5 shrink-0' }),
        h(TreeGuides, { level: depth }),
        h(
          'div',
          {
            class:
              'flex-1 min-w-0 flex items-center gap-1.5 px-1.5 rounded text-sm transition-colors cursor-pointer ' +
              (isActive
                ? 'bg-primary/10 text-primary font-medium '
                : 'hover:bg-muted/50'),
            onClick: () => activateChapter(chapter.id),
          },
          [
            // 叶子节点用 FileText，父节点用 Folder/FolderOpen
            h(hasChildren ? (isExpanded ? FolderOpen : Folder) : FileText, {
              class:
                'w-3.5 h-3.5 shrink-0 ' +
                (isActive
                  ? 'text-primary'
                  : hasChildren
                    ? 'text-primary/80'
                    : 'text-muted-foreground/70'),
            }),
            // 层级标识
            h(
              'span',
              {
                class:
                  'text-[10px] tabular-nums text-muted-foreground/50 shrink-0 font-mono',
              },
              `L${(chapter.level ?? depth) + 1}`,
            ),
            h('span', { class: 'flex-1 truncate' }, chapter.title),
            // 未保存标记
            hasUnsaved
              ? h('span', {
                  class:
                    'w-1.5 h-1.5 shrink-0 rounded-full bg-orange-500 animate-pulse',
                  title: '未保存',
                })
              : null,
            // 排序号
            chapter.sort != null
              ? h(
                  'span',
                  {
                    class:
                      'text-[10px] tabular-nums text-muted-foreground/50 shrink-0',
                    title: '排序',
                  },
                  `#${chapter.sort}`,
                )
              : null,
            // 状态徽章：非发布状态显示
            !isPublished
              ? h(
                  'span',
                  {
                    class:
                      'text-[10px] px-1 rounded-full bg-muted text-muted-foreground shrink-0 leading-tight',
                  },
                  statusLabel || '草稿',
                )
              : null,
            // 子节点数量
            hasChildren
              ? h(
                  'span',
                  {
                    class:
                      'text-xs px-1.5 rounded-full bg-muted text-muted-foreground shrink-0',
                  },
                  String(chapter.children!.length),
                )
              : null,
            // 操作按钮组：仅 hover 显示
            h(
              'span',
              {
                class:
                  'flex items-center gap-0.5 opacity-0 group-hover/chapter-node:opacity-100 transition-opacity',
                onClick: (e: Event) => e.stopPropagation(),
              },
              [
                h(
                  'button',
                  {
                    type: 'button',
                    class:
                      'w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground',
                    title: '新增子章节',
                    onClick: () => handleAddChapter(chapter.id),
                  },
                  [h(Plus, { class: 'w-3 h-3' })],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class:
                      'w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground',
                    title: '编辑章节信息',
                    onClick: () => handleEditChapter(chapter),
                  },
                  [h(Edit, { class: 'w-3 h-3' })],
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    class:
                      'w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-destructive',
                    title: '删除',
                    onClick: () => handleDeleteChapter(chapter.id),
                  },
                  [h(Trash2, { class: 'w-3 h-3' })],
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    hasChildren && isExpanded
      ? h(
          'div',
          null,
          chapter.children!.map((child: Chapter) => renderChapterNode(child, depth + 1)),
        )
      : null,
  ])
}

function handleReset() {
  searchTitle.value = ''
  searchStatus.value = '__all__'
  selectedCategoryId.value = undefined
  handleSearch()
}

onMounted(() => {
  fetchCategoryTree()
})
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <div class="flex gap-4">
      <!-- 层级1: 左侧分类树 -->
      <div class="w-56 flex-shrink-0">
        <CategoryTree
          :site-id="siteId"
          v-model="selectedCategoryId"
          @update:model-value="handleCategorySelect"
        />
      </div>

      <!-- 层级2: 笔记列表 -->
      <div class="flex-1 space-y-4">
        <div class="bg-card rounded-xl border shadow-sm p-4">
          <div class="flex items-center gap-2 flex-wrap">
            <Input
              v-model="searchTitle"
              placeholder="标题"
              class="w-48"
              @keyup.enter="handleSearch"
            />
            <DictSelect
              v-model="searchStatus"
              :dict-items="noteStatusItems"
              placeholder="全部状态"
              class="w-32"
            />
            <Button variant="outline" @click="handleSearch">搜索</Button>
            <Button variant="ghost" @click="handleReset">重置</Button>
            <div class="flex-1" />
            <Button @click="handleAddNote">
              <Plus class="w-4 h-4 mr-1" />
              新增笔记
            </Button>
          </div>
        </div>

        <div class="bg-card rounded-xl border shadow-sm">
          <div
            v-if="loading"
            class="p-12 flex items-center justify-center text-muted-foreground text-sm"
          >
            <div
              class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
            ></div>
            加载中...
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>摘要</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="note in notes" :key="note.id">
                <TableCell>
                  <div class="flex items-center gap-2">
                    <div
                      v-if="note.cover"
                      class="w-8 h-10 rounded bg-muted overflow-hidden flex-shrink-0"
                    >
                      <img :src="note.cover" class="w-full h-full object-cover" />
                    </div>
                    <span class="font-medium">{{ note.title }}</span>
                  </div>
                </TableCell>
                <TableCell class="text-muted-foreground text-sm max-w-64 truncate">{{
                  note.description || '-'
                }}</TableCell>
                <TableCell>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="'bg-secondary text-secondary-foreground'"
                  >
                    {{ getStatusLabel(note.status) }}
                  </span>
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ note.publishAt ? formatDateTime(note.publishAt) : '-' }}
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ note.createdAt ? formatDateTime(note.createdAt) : '-' }}
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-1">
                    <Button variant="ghost" size="sm" @click="handleEditNote(note)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDeleteNote(note.id)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div
            v-if="!loading && notes.length === 0"
            class="p-8 text-center text-muted-foreground text-sm"
          >
            暂无笔记
          </div>
        </div>

        <TablePagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          @change="goto"
        />
      </div>
    </div>

    <!-- 笔记弹窗 -->
    <Dialog v-model:open="showNoteDialog">
      <DialogContent class="!max-w-none w-[95vw] h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader class="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>{{ isNoteEdit ? '编辑笔记' : '新增笔记' }}</DialogTitle>
        </DialogHeader>
        <Tabs
          v-model="noteDialogTab"
          class="w-full flex-1 flex flex-col overflow-hidden group/tabs group-data-[orientation=horizontal]/tabs"
        >
          <TabsList
            variant="line"
            class="px-6 h-11 border-b border-border flex-shrink-0 gap-6 data-[variant=line]:gap-6"
          >
            <TabsTrigger
              value="info"
              class="!text-sm !h-11 !px-0.5 !rounded-none !border-transparent data-active:!text-foreground !text-foreground/70 hover:!text-foreground data-active:after:!bg-primary after:!h-0.5 group-data-horizontal/tabs:after:bottom-0 after:!transition-transform after:!duration-200 after:!ease-out"
              >基本信息</TabsTrigger
            >
            <TabsTrigger
              v-if="isNoteEdit"
              value="chapters"
              class="!text-sm !h-11 !px-0.5 !rounded-none !border-transparent data-active:!text-foreground !text-foreground/70 hover:!text-foreground data-active:after:!bg-primary after:!h-0.5 group-data-horizontal/tabs:after:bottom-0 after:!transition-transform after:!duration-200 after:!ease-out"
              >章节文档</TabsTrigger
            >
          </TabsList>

          <!-- 基本信息 -->
          <TabsContent value="info" class="space-y-5 py-6 px-6 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2 col-span-2">
                <Label>标题 <span class="text-destructive">*</span></Label>
                <Input v-model="noteForm.title" placeholder="请输入标题" />
              </div>
              <div class="space-y-2 col-span-2">
                <Label>摘要</Label>
                <Textarea v-model="noteForm.description" rows="3" placeholder="笔记摘要" />
              </div>
              <div class="space-y-2">
                <Label>所属分类</Label>
                <Select v-model="noteForm.categoryId">
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <div class="flex items-center min-w-0">
                        <Folder class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span class="ml-1.5 truncate">无（顶级）</span>
                      </div>
                    </SelectItem>
                    <SelectItem v-for="cat in flatCategoryOptions" :key="cat.id" :value="cat.id">
                      <div class="flex items-center min-w-0">
                        <TreeGuides :level="cat.indent" />
                        <Folder class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5" />
                        <span class="ml-1.5 truncate">{{ cat.title }}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label>状态</Label>
                <DictSelect v-model="noteForm.status" :dict-items="noteStatusItems" />
              </div>
              <div class="space-y-2">
                <Label>发布时间</Label>
                <Input v-model="noteForm.publishAt" type="date" />
              </div>
              <div class="space-y-2 col-span-2">
                <CoverInput
                  v-model="noteForm.fileId"
                  :cover-url="coverPreviewUrl"
                  @uploaded="(p) => (coverPreviewUrl = p.fileUrl)"
                />
              </div>
              <div class="col-span-2">
                <CategorySelector v-model="selectedCategoryIds" :site-id="siteId" />
              </div>
              <div class="col-span-2">
                <TagSelector v-model="selectedTagNames" :site-id="siteId" />
              </div>
            </div>
          </TabsContent>

          <!-- 章节文档（左右分栏：左章节树 / 右章节编辑器） -->
          <TabsContent
            v-if="isNoteEdit"
            value="chapters"
            class="py-0 px-0 flex-1 flex flex-col overflow-hidden"
          >
            <div class="flex-1 flex gap-0 overflow-hidden">
              <!-- 左：章节目录 -->
              <div class="w-80 shrink-0 border-r flex flex-col min-h-0">
                <div
                  class="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-muted/30"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">章节目录</span>
                    <Button
                      v-if="chapters.length > 0"
                      size="sm"
                      variant="ghost"
                      class="h-6 px-1.5 text-xs text-muted-foreground"
                      :title="allExpanded ? '全部收起' : '全部展开'"
                      @click="toggleExpandAll"
                    >
                      <component :is="allExpanded ? ChevronsDownUp : ChevronsUpDown" class="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" @click="handleAddChapter()">
                    <Plus class="w-3.5 h-3.5 mr-1" />
                    章节
                  </Button>
                </div>
                <div class="flex-1 overflow-y-auto py-2">
                  <component
                    v-for="ch in chapters"
                    :key="ch.id"
                    :is="() => renderChapterNode(ch, 0)"
                  />
                  <div
                    v-if="chapters.length === 0"
                    class="py-12 text-center text-muted-foreground text-sm"
                  >
                    <Folder class="w-10 h-10 mx-auto mb-2 opacity-40" />
                    暂无章节，点击右上角按钮新增
                  </div>
                </div>
              </div>

              <!-- 右：文档正文编辑器 -->
              <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <template v-if="activeChapterId">
                  <!-- 顶部操作栏 -->
                  <div
                    class="flex items-center justify-between gap-3 px-6 py-3 border-b shrink-0 bg-muted/20"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <FileText class="w-4 h-4 text-primary shrink-0" />
                      <span class="font-medium truncate">{{ activeChapter?.title || '章节' }}</span>
                      <span
                        v-if="activeChapter?.description"
                        class="text-xs text-muted-foreground truncate"
                      >
                        — {{ activeChapter.description }}
                      </span>
                      <span
                        v-if="docDirty"
                        class="text-xs text-orange-500 shrink-0"
                      >
                        ● 未保存
                      </span>
                    </div>
                    <Button
                      size="sm"
                      :disabled="!docDirty || docSaving"
                      :loading="docSaving"
                      @click="handleSaveActiveDoc"
                    >
                      保存内容
                    </Button>
                  </div>

                  <!-- 正文编辑区（占满剩余） -->
                  <div class="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
                    <div
                      v-if="docLoading || !mdReady"
                      class="flex-1 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg border-border bg-muted/10"
                    >
                      <div
                        v-if="docLoading"
                        class="flex items-center"
                      >
                        <div
                          class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
                        ></div>
                        加载文档...
                      </div>
                      <div v-else>准备编辑器...</div>
                    </div>
                    <div v-else class="flex-1 min-h-0 md-editor-wrapper flex flex-col gap-3">
                      <div class="flex-1 min-h-0 flex flex-col">
                        <div class="flex items-center justify-between mb-2 shrink-0">
                          <Label class="text-xs text-muted-foreground">文档正文</Label>
                          <DictSelect
                            v-model="docForm.contentType"
                            :dict-items="contentTypeItems"
                            placeholder="内容类型"
                            class="w-32 h-8 text-xs"
                          />
                        </div>
                        <MdEditor
                          v-model="docForm.content"
                          preview-theme="github"
                          :toolbars-exclude="[
                            'github',
                            'save',
                            'pageFullscreen',
                            'fullscreen',
                            'htmlPreview',
                          ]"
                          class="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 未选中章节时的占位 -->
                <div
                  v-else
                  class="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm"
                >
                  <FileText class="w-14 h-14 opacity-20 mb-3" />
                  <p class="mb-2 font-medium text-foreground/60">从左侧选择章节开始编辑文档</p>
                  <p class="text-xs text-muted-foreground/80 max-w-md text-center">
                    点击章节标题切换到对应章节的文档编辑器；编辑章节基本信息请点击章节点上的 <span class="text-primary">✎</span> 按钮
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter class="px-6 py-3 border-t flex-shrink-0">
          <Button variant="outline" @click="showNoteDialog = false">取消</Button>
          <Button @click="handleSubmitNote">
            {{ isNoteEdit ? '保存' : '创建' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 章节基本信息弹窗（新增/编辑共用） -->
    <Dialog v-model:open="showChapterDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ isAddChapterDialog ? '新增章节' : '编辑章节' }}</DialogTitle>
          <DialogDescription>
            {{ isAddChapterDialog ? '添加新章节（保存后可在右栏编辑器填写正文）' : '编辑章节基本信息（标题/父章节/状态/排序等）' }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <Label>章节标题 <span class="text-destructive">*</span></Label>
            <Input v-model="editChapterForm.title" placeholder="请输入章节标题" />
          </div>
          <div class="space-y-2">
            <Label>描述</Label>
            <Textarea v-model="editChapterForm.description" rows="2" placeholder="章节描述" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>父章节</Label>
              <Select v-model="editChapterForm.parentId">
                <SelectTrigger>
                  <SelectValue placeholder="无（顶级章节）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <div class="flex items-center min-w-0">
                      <Folder class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span class="ml-1.5 truncate">无（顶级章节）</span>
                    </div>
                  </SelectItem>
                  <SelectItem v-for="ch in flatChapters" :key="ch.id" :value="ch.id">
                    <div class="flex items-center min-w-0">
                      <TreeGuides :level="(ch as any).indent || 0" />
                      <Folder class="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1.5" />
                      <span class="ml-1.5 truncate">{{ ch.title }}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>状态</Label>
              <DictSelect v-model="editChapterForm.status" :dict-items="chapterStatusItems" />
            </div>
            <div class="space-y-2">
              <Label>层级 <span class="text-xs text-muted-foreground font-normal">（自动）</span></Label>
              <Input
                :model-value="`L${editChapterForm.level + 1}`"
                readonly
                class="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div class="space-y-2">
              <Label>排序</Label>
              <Input v-model.number="editChapterForm.sort" type="number" placeholder="排序号" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showChapterDialog = false">取消</Button>
          <Button @click="handleSubmitChapterDialog">
            {{ isAddChapterDialog ? '创建' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>

<style>
.md-editor-wrapper .md-editor {
  height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
