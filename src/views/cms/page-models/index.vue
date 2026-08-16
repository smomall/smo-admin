<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessageDialog } from '@/composables/useMessageDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, ChevronLeft, List, Database, Play, KeyRound, X } from '@lucide/vue'
import type { PageModel, PageModelField, PageModelFieldIndex } from '@/types'
import {
  DDL_FIELD_STATUS,
  DDL_FIELD_STATUS_OPTIONS,
  DICT_TYPE,
  getCompatibleComponents,
} from '@/constants/ddl'
import { pageModelApi, pageModelFieldApi, pageModelFieldIndexApi } from '@/api'
import { useDict } from '@/composables/useDict'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import DictSelect from '@/components/DictSelect.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useSiteStore } from '@/stores/site'
import { useRoute } from 'vue-router'
import TablePagination from '@/components/TablePagination.vue'
import { usePagedList } from '@/composables/usePagedList'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

const { getLabel: getModelTypeLabel } = useDict(DICT_TYPE.MODEL_TYPE)
const { getLabel: getFieldTypeLabel } = useDict(DICT_TYPE.FIELD_TYPE)
const { items: componentItems, getLabel: getComponentLabel } = useDict(DICT_TYPE.COMPONENT)

function getDdlStatusLabel(status: number | string | undefined): string {
  if (status === undefined || status === null || status === '') return '-'
  const code = Number(status)
  if (Number.isNaN(code)) return '-'
  const option = DDL_FIELD_STATUS_OPTIONS.find((o) => o.value === code)
  return option?.label || String(status)
}

function getDdlStatusClass(status: number | string | undefined): string {
  if (status === undefined || status === null || status === '') return ''
  const code = Number(status)
  if (Number.isNaN(code)) return ''
  const option = DDL_FIELD_STATUS_OPTIONS.find((o) => o.value === code)
  return option?.color || ''
}

const compatibleComponents = computed(() =>
  getCompatibleComponents(fieldFormData.value.fieldType, componentItems.value),
)

function handleFieldTypeChange(newType: string | number | undefined) {
  if (newType == null) {
    return
  }
  const type = String(newType)
  const compatible = getCompatibleComponents(type, componentItems.value)
  const currentComponent = fieldFormData.value.component
  if (currentComponent && !compatible.some((c) => c.value === currentComponent)) {
    fieldFormData.value.component = ''
  }
}

const route = useRoute()
const siteStore = useSiteStore()
const siteId = computed(() => (route.query.siteId as string) || siteStore.currentSite?.id || '')

const { showError, showSuccess } = useMessageDialog()
const { confirm } = useConfirmDialog()

const isListView = ref(true)

const searchModelCode = ref('')
const searchModelName = ref('')
const searchEnabled = ref<string>('__all__')
const searchDdlStatus = ref<string>('__all__')

const showDialog = ref(false)
const isEdit = ref(false)

const currentPageModel = ref<PageModel | null>(null)
const currentModelId = ref('')

const showDdlDialog = ref(false)
const ddlContent = ref('')
const ddlLoading = ref(false)
const ddlType = ref<'table' | 'fields'>('table')
const ddlTab = ref<'create' | 'drop' | 'modify' | 'add' | 'remove' | 'change'>('create')
const createDdlContent = ref('')
const dropDdlContent = ref('')
const modifyDdlContent = ref('')
const addDdlContent = ref('')
const removeDdlContent = ref('')
const changeDdlContent = ref('')
const ddlModelId = ref('')
const ddlFieldId = ref('')
// 当前字段 DDL 的操作类型（由字段状态映射而来）：add/modify/remove。
// 预览时记录，执行时复用，确保调用与预览一致的端点。
const ddlOperation = ref<'add' | 'modify' | 'remove'>('add')
// 当前打开 DDL 弹窗的字段状态（用于在 Tab 顶部显示状态徽章）
const currentFieldStatus = ref<number | string | undefined>(undefined)

const formData = ref({
  id: '',
  siteId: '',
  modelCode: '',
  modelLabel: '',
  modelName: '',
  modelType: '',
  enabled: true,
  status: DDL_FIELD_STATUS.PENDING_ADD as number,
  remark: '',
})

const fieldFormData = ref({
  // 一、身份定义
  id: '',
  siteId: '',
  modelId: '',
  fieldLabel: '',
  fieldName: '',
  fieldCode: '',
  // 二、类型定义
  fieldType: '',
  fieldSize: '',
  component: '',
  adminComponent: '',
  dictCode: '',
  validateRule: '',
  defaultValue: '',
  // 三、校验 + 启用
  required: false,
  enabled: true,
  // 四、权限
  addable: true,
  editable: true,
  // 五、列表能力
  visible: true,
  queryable: true,
  sortable: true,
  searchable: false,
  exportable: true,
  importable: true,
  // 六、其他
  sort: 0,
  status: DDL_FIELD_STATUS.PENDING_ADD as number,
  remark: '',
})

const {
  list: pageModels,
  loading,
  currentPage,
  pageSize,
  total,
  isEmpty,
  goto,
  search: handleSearch,
  reload: reloadPageModels,
  reloadAfterRemove,
} = usePagedList({
  fetcher: (query) => pageModelApi.list(query),
  params: () => ({
    siteId: siteId.value,
    modelCode: searchModelCode.value,
    modelName: searchModelName.value,
    // 全部不传；启用/禁用按后端 Boolean 类型传 true/false
    ...(searchEnabled.value === '__all__'
      ? {}
      : { enabled: searchEnabled.value === 'true' }),
    // 全部不传；DDL状态按后端 Integer 类型传数字
    ...(searchDdlStatus.value === '__all__'
      ? {}
      : { status: Number(searchDdlStatus.value) }),
  }),
})

const {
  list: fieldList,
  loading: fieldLoading,
  currentPage: fieldCurrentPage,
  pageSize: fieldPageSize,
  total: fieldTotal,
  goto: fieldGoto,
  reload: reloadFields,
  reloadAfterRemove: reloadFieldsAfterRemove,
} = usePagedList({
  fetcher: (query) => pageModelFieldApi.list(query),
  params: () => ({
    siteId: siteId.value,
    modelId: currentModelId.value,
  }),
  immediate: false,
})

function handleReset() {
  searchModelCode.value = ''
  searchModelName.value = ''
  searchEnabled.value = '__all__'
  searchDdlStatus.value = '__all__'
  handleSearch()
}

async function handleToggleEnabled(model: PageModel) {
  try {
    await pageModelApi.update(model.id, { ...model, enabled: !model.enabled })
    showSuccess(!model.enabled ? '已启用' : '已禁用')
    reloadPageModels()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleAdd() {
  isEdit.value = false
  formData.value = {
    id: '',
    siteId: siteId.value,
    modelCode: '',
    modelLabel: '',
    modelName: '',
    modelType: '',
    enabled: true,
    status: DDL_FIELD_STATUS.PENDING_ADD,
    remark: '',
  }
  showDialog.value = true
}

function handleEdit(model: PageModel) {
  isEdit.value = true
  const code = Number(model.status)
  // DDL 状态转换规则：编辑模型时若表已落实（ADDED/MODIFIED/DELETED）或待删除，
  // 表示用户触发了新变更，应标记为 PENDING_MODIFY；PENDING_ADD/PENDING_MODIFY 保留。
  let nextStatus: number
  if (
    code === DDL_FIELD_STATUS.ADDED ||
    code === DDL_FIELD_STATUS.MODIFIED ||
    code === DDL_FIELD_STATUS.DELETED ||
    code === DDL_FIELD_STATUS.PENDING_DELETE
  ) {
    nextStatus = DDL_FIELD_STATUS.PENDING_MODIFY
  } else if (
    code === DDL_FIELD_STATUS.PENDING_ADD ||
    code === DDL_FIELD_STATUS.PENDING_MODIFY
  ) {
    nextStatus = code
  } else {
    nextStatus = DDL_FIELD_STATUS.PENDING_ADD
  }
  formData.value = {
    id: model.id,
    siteId: model.siteId || '',
    modelCode: model.modelCode || '',
    modelLabel: model.modelLabel || '',
    modelName: model.modelName || '',
    modelType: model.modelType || '',
    enabled: model.enabled ?? true,
    status: nextStatus,
    remark: model.remark || '',
  }
  showDialog.value = true
}

async function handleDelete(model: PageModel) {
  const code = Number(model.status)
  // 与字段级规则一致：PENDING_ADD（未建表）直接物理删除；其余状态标记待删除，走删表DDL
  const directRemove = code === DDL_FIELD_STATUS.PENDING_ADD
  const confirmed = await confirm(
    '删除页面模型',
    directRemove
      ? '确定要删除该页面模型吗？该模型尚未建表，将直接移除。'
      : '确定要标记该模型为待删除吗？执行删表DDL后会在数据库中真正删除该表。',
  )
  if (!confirmed) return
  try {
    if (directRemove) {
      await pageModelApi.delete(model.id)
      showSuccess('删除成功')
      reloadAfterRemove()
    } else {
      await pageModelApi.update(model.id, {
        ...model,
        status: DDL_FIELD_STATUS.PENDING_DELETE,
      })
      showSuccess('已标记为待删除')
      reloadPageModels()
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleSubmit() {
  if (!formData.value.modelCode || !formData.value.modelLabel || !formData.value.modelName) {
    showError('请填写必填项')
    return
  }
  if (!formData.value.siteId) {
    showError('请先选择站点')
    return
  }
  try {
    if (isEdit.value) {
      await pageModelApi.update(formData.value.id, formData.value)
    } else {
      await pageModelApi.create(formData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    if (isEdit.value) reloadPageModels()
    else handleSearch()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

function handleViewFields(model: PageModel) {
  currentPageModel.value = model
  currentModelId.value = model.id
  isListView.value = false
  fieldList.value = []
  reloadFields()
}

function handleBackToList() {
  isListView.value = true
  currentPageModel.value = null
  currentModelId.value = ''
}

function handleAddField() {
  isEdit.value = false
  fieldFormData.value = {
    // 一、身份定义
    id: '',
    siteId: siteId.value,
    modelId: currentPageModel.value?.id || '',
    fieldLabel: '',
    fieldName: '',
    fieldCode: '',
    // 二、类型定义
    fieldType: '',
    fieldSize: '',
    component: '',
    adminComponent: '',
    dictCode: '',
    validateRule: '',
    defaultValue: '',
    // 三、校验 + 启用
    required: false,
    enabled: true,
    // 四、权限
    addable: true,
    editable: true,
    // 五、列表能力
    visible: true,
    queryable: true,
    sortable: true,
    searchable: false,
    exportable: true,
    importable: true,
    // 六、其他
    sort: 0,
    status: DDL_FIELD_STATUS.PENDING_ADD as number,
    remark: '',
  }
  showDialog.value = true
}

async function handleEditField(field: PageModelField) {
  isEdit.value = true
  const code = Number(field.status)
  // DDL 状态转换规则：编辑时若字段已落实（ADDED/MODIFIED/DELETED）或待删除，
  // 表示用户触发了新的修改，应标记为 PENDING_MODIFY（待执行修改DDL）。
  // PENDING_ADD / PENDING_MODIFY 保留其待定状态，其他未知兜底 PENDING_ADD。
  let nextStatus: number
  if (
    code === DDL_FIELD_STATUS.ADDED ||
    code === DDL_FIELD_STATUS.MODIFIED ||
    code === DDL_FIELD_STATUS.DELETED ||
    code === DDL_FIELD_STATUS.PENDING_DELETE
  ) {
    nextStatus = DDL_FIELD_STATUS.PENDING_MODIFY
  } else if (
    code === DDL_FIELD_STATUS.PENDING_ADD ||
    code === DDL_FIELD_STATUS.PENDING_MODIFY
  ) {
    nextStatus = code
  } else {
    nextStatus = DDL_FIELD_STATUS.PENDING_ADD
  }
  fieldFormData.value = {
    // 一、身份定义
    id: field.id,
    siteId: field.siteId || '',
    modelId: field.modelId || '',
    fieldLabel: field.fieldLabel || '',
    fieldName: field.fieldName || '',
    fieldCode: field.fieldCode || '',
    // 二、类型定义
    fieldType: field.fieldType || '',
    fieldSize: field.fieldSize || '',
    component: field.component || '',
    adminComponent: field.adminComponent || '',
    dictCode: field.dictCode || '',
    validateRule: field.validateRule || '',
    defaultValue: field.defaultValue || '',
    // 三、校验 + 启用
    required: field.required || false,
    enabled: field.enabled ?? true,
    // 四、权限
    addable: field.addable ?? true,
    editable: field.editable ?? true,
    // 五、列表能力
    visible: field.visible ?? true,
    queryable: field.queryable || false,
    sortable: field.sortable || false,
    searchable: field.searchable || false,
    exportable: field.exportable ?? true,
    importable: field.importable ?? true,
    // 六、其他
    sort: field.sort || 0,
    status: nextStatus,
    remark: field.remark || '',
  }
  showDialog.value = true
}

async function handleDeleteField(field: PageModelField) {
  const code = Number(field.status)
  // DDL 状态下的删除规则：
  // - PENDING_ADD（尚未建表/无 DDL 需要执行）：直接物理删除记录
  // - 其他所有状态（含 ADDED/MODIFIED/PENDING_MODIFY/PENDING_DELETE/DELETED）：
  //   更新为 PENDING_DELETE，交给"删除字段DDL"统一落实，避免用户在已建表字段上误删记录导致列悬空
  const directRemove = code === DDL_FIELD_STATUS.PENDING_ADD
  const confirmed = await confirm(
    '删除模型字段',
    directRemove
      ? '确定要删除该模型字段吗？该字段尚未建表，将直接移除。'
      : '确定要标记该字段为待删除吗？删除字段DDL执行后会在数据库中真正移除该列。',
  )
  if (!confirmed) return
  try {
    if (directRemove) {
      await pageModelFieldApi.delete(field.id)
      showSuccess('删除成功')
      reloadFieldsAfterRemove()
    } else {
      await pageModelFieldApi.update(field.id, { ...field, status: DDL_FIELD_STATUS.PENDING_DELETE })
      showSuccess('已标记为待删除')
      reloadFields()
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleToggleFieldVisible(field: PageModelField) {
  try {
    await pageModelFieldApi.update(field.id, { ...field, visible: !field.visible })
    reloadFields()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleToggleFieldEnabled(field: PageModelField) {
  try {
    await pageModelFieldApi.update(field.id, { ...field, enabled: !field.enabled })
    reloadFields()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

/** 由字段状态映射到 DDL 操作类型（与后端 FieldStatusEnum → DdlOperationEnum 一致） */
function fieldDdlOperation(status: number | string | undefined): 'add' | 'modify' | 'remove' {
  const code = Number(status)
  if (code === DDL_FIELD_STATUS.PENDING_MODIFY) return 'modify'
  if (code === DDL_FIELD_STATUS.PENDING_DELETE) return 'remove'
  return 'add'
}

async function handleFieldDdl(field: PageModelField) {
  try {
    ddlLoading.value = true
    ddlType.value = 'fields'
    ddlFieldId.value = field.id
    ddlModelId.value = currentModelId.value
    currentFieldStatus.value = field.status
    const defaultOperation = fieldDdlOperation(field.status)
    ddlOperation.value = defaultOperation
    // 按字段 status 定位默认 Tab（其余 Tab 用户可主动切换查看）
    ddlTab.value = defaultOperation
    addDdlContent.value = ''
    modifyDdlContent.value = ''
    removeDdlContent.value = ''
    changeDdlContent.value = ''
    showDdlDialog.value = true
    // 并发加载四种 DDL 预览：状态不匹配的 DDL 请求会被后端 400 拒绝，
    // 用 allSettled 隔离失败，避免单个请求失败导致整个弹窗无法加载
    const [addRes, modifyRes, removeRes, changeRes] = await Promise.allSettled([
      pageModelFieldApi.generateAddDdl(field.id),
      pageModelFieldApi.generateModifyDdl(field.id),
      pageModelFieldApi.generateRemoveDdl(field.id),
      pageModelFieldApi.generateChangeDdl(field.id),
    ])
    addDdlContent.value =
      addRes.status === 'fulfilled' ? (addRes.value.data.value || '') : ''
    modifyDdlContent.value =
      modifyRes.status === 'fulfilled' ? (modifyRes.value.data.value || '') : ''
    removeDdlContent.value =
      removeRes.status === 'fulfilled' ? (removeRes.value.data.value || '') : ''
    changeDdlContent.value =
      changeRes.status === 'fulfilled' ? (changeRes.value.data.value || '') : ''
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    ddlLoading.value = false
  }
}

async function handleSubmitField() {
  if (!fieldFormData.value.fieldCode || !fieldFormData.value.fieldName || !fieldFormData.value.fieldLabel) {
    showError('请填写必填项')
    return
  }
  if (!fieldFormData.value.siteId) {
    showError('请先选择站点')
    return
  }
  try {
    if (isEdit.value) {
      await pageModelFieldApi.update(fieldFormData.value.id, fieldFormData.value)
    } else {
      await pageModelFieldApi.create(fieldFormData.value)
    }
    showSuccess(isEdit.value ? '更新成功' : '新增成功')
    showDialog.value = false
    reloadFields()
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  }
}

async function handleShowDdl(model: PageModel) {
  try {
    ddlLoading.value = true
    ddlType.value = 'table'
    ddlTab.value = 'create'
    ddlModelId.value = model.id
    createDdlContent.value = ''
    dropDdlContent.value = ''
    modifyDdlContent.value = ''
    changeDdlContent.value = ''
    showDdlDialog.value = true
    const [createRes, dropRes, modifyRes, changeRes] = await Promise.allSettled([
      pageModelApi.generateCreateTableDdl(model.id),
      pageModelApi.generateDropTableDdl(model.id),
      pageModelApi.generateFieldDdl(model.id),
      pageModelApi.generateChangeDdl(model.id),
    ])
    createDdlContent.value =
      createRes.status === 'fulfilled' ? (createRes.value.data.value || '') : ''
    dropDdlContent.value =
      dropRes.status === 'fulfilled' ? (dropRes.value.data.value || '') : ''
    modifyDdlContent.value =
      modifyRes.status === 'fulfilled' ? (modifyRes.value.data.value || '') : ''
    changeDdlContent.value =
      changeRes.status === 'fulfilled' ? (changeRes.value.data.value || '') : ''
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    ddlLoading.value = false
  }
}

async function handleGenerateDdl() {
  if (!currentModelId.value) return
  try {
    ddlLoading.value = true
    ddlType.value = 'fields'
    ddlFieldId.value = ''
    ddlModelId.value = currentModelId.value
    const { data } = await pageModelApi.generateFieldDdl(currentModelId.value)
    ddlContent.value = data.value || ''
    showDdlDialog.value = true
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    ddlLoading.value = false
  }
}

async function handleExecuteDdl() {
  if (!ddlModelId.value) return
  try {
    ddlLoading.value = true
    if (ddlType.value === 'table') {
      if (ddlTab.value === 'create') {
        await pageModelApi.executeCreateTable(ddlModelId.value)
        showSuccess('建表DDL执行成功')
      } else if (ddlTab.value === 'drop') {
        await pageModelApi.dropTable(ddlModelId.value)
        showSuccess('删表DDL执行成功')
      } else if (ddlTab.value === 'change') {
        const { data } = await pageModelApi.applyChangeDdl(ddlModelId.value)
        changeDdlContent.value = data.value || ''
        showSuccess('模型变更DDL执行成功')
      } else {
        const { data } = await pageModelApi.applyFieldDdl(ddlModelId.value)
        modifyDdlContent.value = data.value || ''
        showSuccess('字段增量DDL执行成功')
      }
    } else {
      if (ddlFieldId.value) {
        if (ddlTab.value === 'change') {
          // 字段变更 DDL（列重命名/类型/注释，对比快照与当前字段）
          const { data } = await pageModelFieldApi.applyChangeDdl(ddlFieldId.value)
          changeDdlContent.value = data.value || ''
          showSuccess('字段变更DDL执行成功')
        } else {
          // 单字段 DDL：以当前激活 Tab 为准执行
          const tabOperations = { add: 'add', modify: 'modify', remove: 'remove' } as const
          const operation = tabOperations[ddlTab.value as keyof typeof tabOperations] ?? ddlOperation.value
          ddlOperation.value = operation
          const executeMap = {
            add: pageModelFieldApi.executeAddDdl,
            modify: pageModelFieldApi.executeModifyDdl,
            remove: pageModelFieldApi.executeRemoveDdl,
          } as const
          await executeMap[operation](ddlFieldId.value)
          const labelMap = { add: '添加', modify: '修改', remove: '删除' } as const
          showSuccess(`字段${labelMap[operation]}DDL执行成功`)
        }
      } else {
        const { data } = await pageModelApi.applyFieldDdl(ddlModelId.value)
        ddlContent.value = data.value || ''
        showSuccess('字段DDL执行成功')
      }
    }
    showDdlDialog.value = false
    // DDL 执行成功后，无论表级/字段级，都要刷新模型列表（确保模型 DDL 状态回显最新）
    reloadPageModels()
    // 字段视图下额外刷新字段列表
    if (!isListView.value) {
      reloadFields()
    }
  } catch {
    // useRequest 已统一处理错误提示，不重复弹窗
  } finally {
    ddlLoading.value = false
  }
}

// ================================================
// 索引管理（弹窗 + 分页列表 + 新增/编辑/删除/DDL）
// ================================================
const showIndexDialog = ref(false)
const indexQuery = ref<{ indexName?: string; indexType?: string }>({ indexType: '__all__' })
const currentIndexModel = ref<PageModel | null>(null)
const indexPage = ref(1)
const indexPageSize = ref(10)
const indexTotal = ref(0)
const indexLoading = ref(false)
const indexList = ref<PageModelFieldIndex[]>([])

// 索引管理弹窗专用的字段列表（独立于字段管理页的 fieldList，避免相互干扰）
// allIndexFields: 全量字段，用于 describeIndexFields 回显字段名
// indexFieldList: 过滤后仅含已启用且 DDL 状态为已添加/已修改的字段（数据库中已存在的列）
const allIndexFields = ref<PageModelField[]>([])
const indexFieldList = ref<PageModelField[]>([])
async function loadIndexFields(modelId: string) {
  if (!modelId) {
    allIndexFields.value = []
    indexFieldList.value = []
    return
  }
  try {
    // 并行发两个请求：
    //  - allIndexFields: 全量字段（不过滤），用于 describeIndexFields 回显索引引用的字段名
    //  - indexFieldList: 后端按 enabled + status IN(ADDED, MODIFIED) 筛选后的字段
    //    （即数据库中真实存在的列，索引可引用的合法范围），前端不再 filter
    const [allRes, filteredRes] = await Promise.all([
      pageModelFieldApi.getAll(modelId),
      pageModelFieldApi.getAll(modelId, {
        enabled: true,
        status: [DDL_FIELD_STATUS.ADDED, DDL_FIELD_STATUS.MODIFIED],
      }),
    ])
    allIndexFields.value = (allRes.data.value ?? []) as PageModelField[]
    indexFieldList.value = (filteredRes.data.value ?? []) as PageModelField[]
  } catch {
    allIndexFields.value = []
    indexFieldList.value = []
  }
}

const currentFields = computed<PageModelField[]>(() => {
  // 索引管理弹窗或索引表单弹窗打开时使用 indexFieldList；字段管理页使用 fieldList
  if (showIndexDialog.value || showIndexFormDialog.value) return indexFieldList.value
  return fieldList.value ?? []
})
const fieldMapById = computed<Map<string, PageModelField>>(() => {
  const m = new Map<string, PageModelField>()
  // 索引弹窗打开时基于全量字段构建，确保 describeIndexFields 能回显所有引用字段
  const source = (showIndexDialog.value || showIndexFormDialog.value) ? allIndexFields.value : currentFields.value
  for (const f of source) {
    if (f.id) m.set(f.id, f)
  }
  return m
})
function describeIndexFields(index: PageModelFieldIndex): string {
  const ids = index.fieldIds ?? []
  const labels = ids
    .map((id) => fieldMapById.value.get(id)?.fieldLabel ?? fieldMapById.value.get(id)?.fieldName ?? id)
  return labels.length ? labels.join('、') : '-'
}

async function handleManageIndexes(model: PageModel) {
  currentIndexModel.value = model
  indexQuery.value = { indexType: '__all__' }
  indexPage.value = 1
  showIndexDialog.value = true
  await Promise.all([reloadIndexes(), loadIndexFields(model.id)])
}
async function handleIndexPageChange(page: number) {
  indexPage.value = page
  await reloadIndexes()
}
async function reloadIndexes() {
  const m = currentIndexModel.value
  if (!m?.id) return
  try {
    indexLoading.value = true
    const { data } = await pageModelFieldIndexApi.page({
      pageNumber: indexPage.value,
      pageSize: indexPageSize.value,
      modelId: m.id,
      siteId: siteId.value,
      indexName: indexQuery.value.indexName,
      ...(indexQuery.value.indexType === '__all__' ? {} : { indexType: indexQuery.value.indexType }),
    })
    indexList.value = (data.value?.records ?? []) as PageModelFieldIndex[]
    indexTotal.value = Number(data.value?.totalRow ?? 0)
  } finally {
    indexLoading.value = false
  }
}

// ---- 新增 / 编辑 索引 ----
const showIndexFormDialog = ref(false)
const isIndexEdit = ref(false)
const indexForm = ref<Partial<PageModelFieldIndex>>({
  indexName: '',
  indexType: 'NORMAL',
})
// 选中的字段 ID 列表（独立 ref，确保响应式追踪可靠）
const indexFieldIds = ref<string[]>([])
// 索引已添加（DDL 已执行）时锁定结构字段，仅允许修改备注
const isIndexLocked = computed(() => Number(indexForm.value.status) === DDL_FIELD_STATUS.ADDED)
async function handleAddIndex() {
  isIndexEdit.value = false
  indexNameTimestamp.value = ''
  indexForm.value = {
    id: undefined,
    siteId: siteId.value,
    modelId: currentIndexModel.value?.id,
    indexName: '',
    indexType: 'NORMAL',
    remark: '',
  }
  indexFieldIds.value = []
  // 打开表单前重新加载字段列表
  if (currentIndexModel.value?.id) {
    await loadIndexFields(currentIndexModel.value.id)
  }
  showIndexFormDialog.value = true
}
async function handleEditIndex(index: PageModelFieldIndex) {
  isIndexEdit.value = true
  indexForm.value = {
    id: index.id,
    siteId: index.siteId,
    modelId: index.modelId,
    indexName: index.indexName,
    indexType: index.indexType,
    status: index.status,
    remark: index.remark,
  }
  indexFieldIds.value = [...(index.fieldIds ?? [])]
  // 打开表单前重新加载字段列表
  if (currentIndexModel.value?.id) {
    await loadIndexFields(currentIndexModel.value.id)
  }
  showIndexFormDialog.value = true
}
async function handleSaveIndex() {
  if (!indexForm.value.indexName?.trim()) {
    showError('请输入索引名称')
    return
  }
  if (!indexFieldIds.value.length) {
    showError('请至少选择一个字段')
    return
  }
  try {
    const payload = { ...indexForm.value, fieldIds: indexFieldIds.value }
    if (isIndexEdit.value && indexForm.value.id) {
      await pageModelFieldIndexApi.update(indexForm.value.id, payload)
      showSuccess('修改索引成功')
    } else {
      payload.status = DDL_FIELD_STATUS.PENDING_ADD
      await pageModelFieldIndexApi.create(payload)
      showSuccess('新增索引成功')
    }
    showIndexFormDialog.value = false
    await reloadIndexes()
  } catch {
    /* useRequest 已统一提示 */
  }
}
async function handleDeleteIndex(index: PageModelFieldIndex) {
  const ok = await confirm('删除索引', `确认删除索引「${index.indexName}」吗？`)
  if (!ok) return
  try {
    if (index.id) await pageModelFieldIndexApi.remove(index.id)
    showSuccess('删除成功')
    await reloadIndexes()
  } catch {
    /* useRequest 已统一提示 */
  }
}
function toggleIndexField(id: string, checked: boolean) {
  const arr = [...indexFieldIds.value]
  if (checked) {
    if (!arr.includes(id)) arr.push(id)
  } else {
    const idx = arr.indexOf(id)
    if (idx >= 0) arr.splice(idx, 1)
  }
  indexFieldIds.value = arr
  autoGenerateIndexName()
}
function clearIndexFields() {
  indexFieldIds.value = []
  autoGenerateIndexName()
}
/**
 * 新增索引时，根据选中的字段列表动态生成索引名。
 * 规则：idx_{表名}_{字段代码1}_{字段代码2}_{yyyyMMddHHmmss}
 * - 字段代码部分随勾选实时变化
 * - 时间戳在首次选中字段时生成，后续复用（避免每次勾选都变时间戳）
 * - 清空所有字段后重置时间戳，下次勾选重新生成
 * - 编辑模式不覆盖用户已修改的名称
 */
const indexNameTimestamp = ref('')
function autoGenerateIndexName() {
  if (isIndexEdit.value) return
  const ids = indexFieldIds.value
  if (!ids.length) {
    indexNameTimestamp.value = ''
    indexForm.value.indexName = ''
    return
  }
  // 首次选中字段时生成时间戳，后续复用
  if (!indexNameTimestamp.value) {
    const now = new Date()
    indexNameTimestamp.value =
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}` +
      `${String(now.getDate()).padStart(2, '0')}`
  }
  const model = currentIndexModel.value
  const table = model?.modelCode || 'tbl'
  const codes = ids
    .map((id) => indexFieldList.value.find((f) => f.id === id)?.fieldCode)
    .filter((c): c is string => !!c)
  if (!codes.length) return
  indexForm.value.indexName = `idx_${table}_${codes.join('_')}_${indexNameTimestamp.value}`
}

// ---- 索引 DDL 弹窗 ----
const showIndexDdlDialog = ref(false)
const indexDdlLoading = ref(false)
const indexDdlTab = ref<'create' | 'drop'>('create')
const currentDdlIndex = ref<PageModelFieldIndex | null>(null)
const createIndexDdlContent = ref('')
const dropIndexDdlContent = ref('')
async function handleIndexDdl(index: PageModelFieldIndex) {
  currentDdlIndex.value = index
  showIndexDdlDialog.value = true
  createIndexDdlContent.value = ''
  dropIndexDdlContent.value = ''
  indexDdlTab.value = 'create'
  try {
    indexDdlLoading.value = true
    const [cRes, dRes] = await Promise.allSettled([
      pageModelFieldIndexApi.generateCreateDdl(index.id!),
      pageModelFieldIndexApi.generateDropDdl(index.id!),
    ])
    createIndexDdlContent.value =
      cRes.status === 'fulfilled' ? (cRes.value.data.value || '') : ''
    dropIndexDdlContent.value =
      dRes.status === 'fulfilled' ? (dRes.value.data.value || '') : ''
  } finally {
    indexDdlLoading.value = false
  }
}
async function handleExecuteIndexDdl() {
  if (!currentDdlIndex.value?.id) return
  try {
    indexDdlLoading.value = true
    if (indexDdlTab.value === 'create') {
      await pageModelFieldIndexApi.executeCreateDdl(currentDdlIndex.value.id)
      showSuccess('创建索引DDL执行成功')
    } else {
      await pageModelFieldIndexApi.executeDropDdl(currentDdlIndex.value.id)
      showSuccess('删除索引DDL执行成功')
    }
    showIndexDdlDialog.value = false
    await reloadIndexes()
  } catch {
    /* useRequest 已统一提示 */
  } finally {
    indexDdlLoading.value = false
  }
}

function indexTypeBadgeClass(type?: string): string {
  if (type === 'UNIQUE') return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
function indexTypeLabel(type?: string): string {
  if (type === 'UNIQUE') return '唯一索引'
  if (type === 'NORMAL') return '普通索引'
  return type || '普通索引'
}
</script>

<template>
  <div class="p-6 space-y-4 animate-page-enter">
    <template v-if="isListView">
      <div class="flex items-center justify-end">
        <Button @click="handleAdd">
          <Plus class="w-4 h-4 mr-2" />
          新增模型
        </Button>
      </div>

      <div class="bg-card rounded-xl border shadow-sm p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <Input
            v-model="searchModelCode"
            placeholder="模型编码"
            class="w-36"
            @keyup.enter="handleSearch"
          />
          <Input
            v-model="searchModelName"
            placeholder="模型名称"
            class="w-36"
            @keyup.enter="handleSearch"
          />
          <Select v-model="searchEnabled" class="w-32">
            <SelectTrigger>
              <SelectValue placeholder="启用状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem value="true">启用</SelectItem>
              <SelectItem value="false">禁用</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="searchDdlStatus" class="w-32">
            <SelectTrigger>
              <SelectValue placeholder="DDL状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部</SelectItem>
              <SelectItem
                v-for="opt in DDL_FIELD_STATUS_OPTIONS"
                :key="opt.value"
                :value="String(opt.value)"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" @click="handleSearch">搜索</Button>
          <Button variant="ghost" @click="handleReset">重置</Button>
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
              <TableHead>ID</TableHead>
              <TableHead>模型编码</TableHead>
              <TableHead>模型名称</TableHead>
              <TableHead>模型表头</TableHead>
              <TableHead>模型类型</TableHead>
              <TableHead>启用</TableHead>
              <TableHead>DDL状态</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="model in pageModels" :key="model.id">
              <TableCell>{{ model.id }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Database class="w-4 h-4 text-primary" />
                  <span class="font-medium">{{ model.modelCode }}</span>
                </div>
              </TableCell>
              <TableCell>{{ model.modelName || '-' }}</TableCell>
              <TableCell>{{ model.modelLabel || '-' }}</TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600"
                >
                  {{ getModelTypeLabel(model.modelType) }}
                </span>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Switch
                    :model-value="!!model.enabled"
                    @update:model-value="handleToggleEnabled(model)"
                  />
                  <span
                    class="text-xs"
                    :class="model.enabled ? 'text-green-600' : 'text-muted-foreground'"
                  >
                    {{ model.enabled ? '启用' : '禁用' }}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="getDdlStatusClass(model.status)"
                >
                  {{ getDdlStatusLabel(model.status) }}
                </span>
              </TableCell>
              <TableCell>{{ model.remark || '-' }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Button variant="ghost" size="sm" @click="handleShowDdl(model)" title="DDL">
                    <Database class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleManageIndexes(model)"
                    title="索引管理"
                  >
                    <KeyRound class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleViewFields(model)"
                    title="查看字段"
                  >
                    <List class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleEdit(model)">
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleDelete(model)">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="isEmpty">
              <TableCell colspan="8" class="text-center text-muted-foreground py-12">
                <div class="inline-flex flex-col items-center gap-2">
                  <svg
                    class="w-10 h-10 opacity-30"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                    <path
                      d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
                    />
                  </svg>
                  <span class="text-sm">暂无数据</span>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <TablePagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @change="goto"
      />
    </template>

    <template v-else>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button variant="ghost" size="sm" @click="handleBackToList">
            <ChevronLeft class="w-4 h-4 mr-1" />
            返回
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" @click="handleGenerateDdl" :disabled="ddlLoading">
            <Database class="w-4 h-4 mr-2" />
            DDL
          </Button>
          <Button
            variant="outline"
            @click="handleManageIndexes(currentPageModel!)"
            :disabled="!currentPageModel"
          >
            <KeyRound class="w-4 h-4 mr-2" />
            索引管理
          </Button>
          <Button @click="handleAddField">
            <Plus class="w-4 h-4 mr-2" />
            新增字段
          </Button>
        </div>
      </div>

      <div class="bg-card rounded-xl border shadow-sm">
        <div
          v-if="fieldLoading"
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
              <TableHead>ID</TableHead>
              <TableHead>字段代码</TableHead>
              <TableHead>字段名称</TableHead>
              <TableHead>字段标签</TableHead>
              <TableHead>字段类型</TableHead>
              <TableHead>组件</TableHead>
              <TableHead>字段长度</TableHead>
              <TableHead>必填</TableHead>
              <TableHead>可见</TableHead>
              <TableHead>启用</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>DDL状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="field in fieldList" :key="field.id">
              <TableCell>{{ field.id }}</TableCell>
              <TableCell class="font-medium">{{ field.fieldCode || '-' }}</TableCell>
              <TableCell>{{ field.fieldName || '-' }}</TableCell>
              <TableCell>{{ field.fieldLabel || '-' }}</TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                >
                  {{ getFieldTypeLabel(field.fieldType) }}
                </span>
              </TableCell>
              <TableCell>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600"
                >
                  {{ getComponentLabel(field.component) }}
                </span>
              </TableCell>
              <TableCell>{{ field.fieldSize || '-' }}</TableCell>
              <TableCell>
                <span
                  :class="field.required ? 'text-green-600' : 'text-red-600'"
                  class="text-sm font-medium"
                >
                  {{ field.required ? '是' : '否' }}
                </span>
              </TableCell>
              <TableCell>
                <Switch
                  :model-value="!!field.visible"
                  @update:model-value="handleToggleFieldVisible(field)"
                />
              </TableCell>
              <TableCell>
                <Switch
                  :model-value="!!field.enabled"
                  @update:model-value="handleToggleFieldEnabled(field)"
                />
              </TableCell>
              <TableCell>{{ field.sort || 0 }}</TableCell>
              <TableCell>
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="getDdlStatusClass(field.status)"
                >
                  {{ getDdlStatusLabel(field.status) }}
                </span>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleFieldDdl(field)"
                    title="字段DDL"
                  >
                    <Database class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleEditField(field)">
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="handleDeleteField(field)">
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="fieldList.length === 0">
              <TableCell colspan="13" class="text-center text-muted-foreground py-12">
                <div class="inline-flex flex-col items-center gap-2">
                  <svg
                    class="w-10 h-10 opacity-30"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                    <path
                      d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
                    />
                  </svg>
                  <span class="text-sm">暂无数据</span>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <TablePagination
        :current-page="fieldCurrentPage"
        :page-size="fieldPageSize"
        :total="fieldTotal"
        @change="fieldGoto"
      />
    </template>

    <Dialog v-model:open="showDialog" v-if="isListView">
      <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑页面模型' : '新增页面模型' }}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <div class="space-y-2">
            <Label for="modelCode">模型编码 <span class="text-destructive">*</span></Label>
            <Input id="modelCode" v-model="formData.modelCode" placeholder="数据库表名" />
          </div>
          <div class="space-y-2">
            <Label for="modelName">模型名称 <span class="text-destructive">*</span></Label>
            <Input id="modelName" v-model="formData.modelName" placeholder="请输入模型名称" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="modelLabel">模型表头 <span class="text-destructive">*</span></Label>
            <Input id="modelLabel" v-model="formData.modelLabel" placeholder="列表页显示的表头名称" />
          </div>
          <div class="space-y-2">
            <Label for="modelType">模型类型</Label>
            <DictSelect
              v-model="formData.modelType"
              dict-type="cms_model_type"
              placeholder="选择模型类型"
            />
          </div>
          <div class="space-y-2">
            <Label for="enabled">是否启用</Label>
            <Switch id="enabled" v-model="formData.enabled" />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="remark">备注</Label>
            <Input id="remark" v-model="formData.remark" placeholder="请输入备注" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmit">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDialog" v-if="!isListView">
      <DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? '编辑模型字段' : '新增模型字段' }}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-4">
          <!-- ========== 一、身份定义（最核心） ========== -->
          <div class="space-y-2 col-span-2">
            <Label for="fieldLabel">字段标签（显示名）<span class="text-destructive">*</span></Label>
            <Input
              id="fieldLabel"
              v-model="fieldFormData.fieldLabel"
              placeholder="表单/列表显示的字段名，如：用户名"
            />
          </div>
          <div class="space-y-2">
            <Label for="fieldName">字段名称（接口键）<span class="text-destructive">*</span></Label>
            <Input id="fieldName" v-model="fieldFormData.fieldName" placeholder="前端接口字段名，如：username" />
          </div>
          <div class="space-y-2">
            <Label for="fieldCode">字段代码（列名）<span class="text-destructive">*</span></Label>
            <Input id="fieldCode" v-model="fieldFormData.fieldCode" placeholder="数据库列名，如：user_name" />
          </div>

          <!-- ========== 二、类型定义 ========== -->
          <div class="space-y-2">
            <Label for="fieldType">字段类型</Label>
            <DictSelect
              id="fieldType"
              v-model="fieldFormData.fieldType"
              dict-type="cms_field_type"
              placeholder="选择字段类型"
              @update:model-value="handleFieldTypeChange"
            />
          </div>
          <div class="space-y-2">
            <Label for="fieldSize">字段长度</Label>
            <Input id="fieldSize" v-model="fieldFormData.fieldSize" placeholder="如 255, 10,2" />
          </div>
          <div class="space-y-2">
            <Label for="component">前端组件</Label>
            <Select id="component" v-model="fieldFormData.component">
              <SelectTrigger>
                <SelectValue placeholder="选择前端组件" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in compatibleComponents" :key="opt.value" :value="opt.value">
                  {{ getComponentLabel(opt.value) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="adminComponent">后台编辑组件</Label>
            <DictSelect
              id="adminComponent"
              v-model="fieldFormData.adminComponent"
              dict-type="cms_admin_component"
              placeholder="选择后台编辑组件"
            />
          </div>
          <div class="space-y-2">
            <Label for="dictCode">字典编码</Label>
            <Input
              id="dictCode"
              v-model="fieldFormData.dictCode"
              placeholder="下拉组件绑定的数据字典编码，可留空"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="validateRule">校验规则</Label>
            <Textarea
              id="validateRule"
              v-model="fieldFormData.validateRule"
              placeholder='JSON格式，如 {"pattern":"^\\d+$","max":100}'
              class="min-h-[60px] font-mono text-xs"
            />
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="defaultValue">默认值</Label>
            <Input
              id="defaultValue"
              v-model="fieldFormData.defaultValue"
              placeholder="可留空；字符串无需额外加引号"
            />
          </div>

          <!-- ========== 三、校验 + 启用 ========== -->
          <div class="col-span-2 flex items-center gap-2 pt-2">
            <span class="text-xs font-semibold text-muted-foreground">校验 &amp; 启用</span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="required">必填</Label>
            <Switch v-model="fieldFormData.required" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="enabled">是否启用</Label>
            <Switch v-model="fieldFormData.enabled" />
          </div>

          <!-- ========== 四、权限：是否允许 新增 / 编辑 ========== -->
          <div class="col-span-2 flex items-center gap-2 pt-2">
            <span class="text-xs font-semibold text-muted-foreground">权限控制</span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="addable">允许新增</Label>
            <Switch v-model="fieldFormData.addable" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="editable">允许编辑</Label>
            <Switch v-model="fieldFormData.editable" />
          </div>

          <!-- ========== 五、列表能力 ========== -->
          <div class="col-span-2 flex items-center gap-2 pt-2">
            <span class="text-xs font-semibold text-muted-foreground">列表能力</span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="visible">列表显示</Label>
            <Switch v-model="fieldFormData.visible" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="queryable">允许查询</Label>
            <Switch v-model="fieldFormData.queryable" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="sortable">允许排序</Label>
            <Switch v-model="fieldFormData.sortable" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="searchable">全文搜索</Label>
            <Switch v-model="fieldFormData.searchable" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="importable">允许导入</Label>
            <Switch v-model="fieldFormData.importable" />
          </div>
          <div class="flex items-center justify-between space-y-0 rounded-md border px-3 py-2">
            <Label for="exportable">允许导出</Label>
            <Switch v-model="fieldFormData.exportable" />
          </div>

          <!-- ========== 六、其他 ========== -->
          <div class="col-span-2 flex items-center gap-2 pt-2">
            <span class="text-xs font-semibold text-muted-foreground">其他</span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          <div class="space-y-2">
            <Label for="sort">排序号</Label>
            <Input
              id="sort"
              v-model.number="fieldFormData.sort"
              type="number"
              placeholder="小的排前面"
            />
          </div>
          <div class="space-y-2">
            <Label>DDL 状态</Label>
            <div
              class="px-3 py-2 rounded-md text-sm font-medium border"
              :class="getDdlStatusClass(fieldFormData.status)"
            >
              {{ getDdlStatusLabel(fieldFormData.status) }}
              <span class="text-xs text-muted-foreground ml-2">（系统自动管理）</span>
            </div>
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="fieldRemark">备注</Label>
            <Input id="fieldRemark" v-model="fieldFormData.remark" placeholder="请输入备注" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDialog = false">取消</Button>
          <Button @click="handleSubmitField">{{ isEdit ? '保存' : '创建' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDdlDialog">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>DDL 语句预览</DialogTitle>
          <DialogDescription>生成的DDL语句，可确认后执行</DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <div
            v-if="ddlLoading"
            class="flex items-center justify-center text-muted-foreground text-sm py-12"
          >
            <div
              class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"
            ></div>
            加载中...
          </div>
          <template v-else-if="ddlType === 'table'">
            <Tabs v-model="ddlTab">
              <TabsList>
                <TabsTrigger value="create">建表</TabsTrigger>
                <TabsTrigger value="drop">删表</TabsTrigger>
                <TabsTrigger value="change">表变更</TabsTrigger>
                <TabsTrigger value="modify">字段变更</TabsTrigger>
              </TabsList>
              <TabsContent value="create">
                <pre
                  class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                  >{{ createDdlContent || '暂无DDL' }}</pre
                >
              </TabsContent>
              <TabsContent value="drop">
                <pre
                  class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                  >{{ dropDdlContent || '暂无DDL' }}</pre
                >
              </TabsContent>
              <TabsContent value="change">
                <pre
                  class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                  >{{ changeDdlContent || '暂无DDL（编辑模型表名或表头后，此处显示变更DDL）' }}</pre
                >
              </TabsContent>
              <TabsContent value="modify">
                <pre
                  class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                  >{{ modifyDdlContent || '暂无DDL' }}</pre
                >
              </TabsContent>
            </Tabs>
          </template>
          <Tabs v-else-if="ddlType === 'fields' && ddlFieldId" v-model="ddlTab">
            <TabsList>
              <TabsTrigger value="add">添加字段</TabsTrigger>
              <TabsTrigger value="modify">修改字段</TabsTrigger>
              <TabsTrigger value="remove">删除字段</TabsTrigger>
              <TabsTrigger value="change">变更</TabsTrigger>
            </TabsList>
            <TabsContent value="add">
              <pre
                class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                >{{ addDdlContent || '暂无DDL' }}</pre
              >
            </TabsContent>
            <TabsContent value="modify">
              <pre
                class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                >{{ modifyDdlContent || '暂无DDL' }}</pre
              >
            </TabsContent>
            <TabsContent value="remove">
              <pre
                class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                >{{ removeDdlContent || '暂无DDL' }}</pre
              >
            </TabsContent>
            <TabsContent value="change">
              <pre
                class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
                >{{ changeDdlContent || '暂无DDL（编辑字段代码/类型/长度/标签后，此处显示变更DDL）' }}</pre
              >
            </TabsContent>
          </Tabs>
          <pre
            v-else
            class="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all"
            >{{ ddlContent || '暂无DDL' }}</pre
          >
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDdlDialog = false">关闭</Button>
          <Button @click="handleExecuteDdl" :disabled="ddlLoading">
            <Play class="w-4 h-4 mr-1" />
            执行DDL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ============= 索引管理弹窗（分页列表 + 新增/编辑/删除/DDL） ============= -->
    <Dialog v-model:open="showIndexDialog">
      <DialogContent class="sm:max-w-7xl w-full">
        <DialogHeader>
          <DialogTitle>
            索引管理
            <span v-if="currentIndexModel?.modelLabel" class="text-muted-foreground text-sm ml-2">
              模型：{{ currentIndexModel.modelLabel }}
            </span>
          </DialogTitle>
          <DialogDescription>管理当前模型的数据库索引，支持创建索引 / 删除索引 DDL 预览与执行。</DialogDescription>
        </DialogHeader>

        <!-- 搜索 + 新增 -->
        <div class="flex flex-wrap items-center justify-between gap-3 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-2">
              <Label>索引名</Label>
              <Input
                v-model="indexQuery.indexName"
                placeholder="模糊匹配"
                class="w-44"
                @keyup.enter="reloadIndexes"
              />
            </div>
            <div class="flex items-center gap-2">
              <Label>类型</Label>
              <Select v-model="indexQuery.indexType" class="w-36">
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部</SelectItem>
                  <SelectItem value="NORMAL">普通索引</SelectItem>
                  <SelectItem value="UNIQUE">唯一索引</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" @click="reloadIndexes" :disabled="indexLoading">查询</Button>
          </div>
          <Button @click="handleAddIndex" :disabled="!currentIndexModel">
            <Plus class="w-4 h-4 mr-2" />
            新增索引
          </Button>
        </div>

        <!-- 表格 -->
        <div class="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>索引名</TableHead>
                <TableHead class="w-28">类型</TableHead>
                <TableHead>字段</TableHead>
                <TableHead class="w-24 text-center">状态</TableHead>
                <TableHead class="w-44 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <tr v-if="indexLoading">
                <TableCell colspan="5" class="text-center py-10 text-muted-foreground">
                  加载中…
                </TableCell>
              </tr>
              <tr v-else-if="!indexList.length">
                <TableCell colspan="5" class="text-center py-10 text-muted-foreground">
                  暂无索引，点击右上角「新增索引」创建第一条。
                </TableCell>
              </tr>
              <TableRow v-for="index in indexList" :key="index.id">
                <TableCell class="font-medium">{{ index.indexName }}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    class="border rounded-full px-2 py-0.5"
                    :class="indexTypeBadgeClass(index.indexType)"
                  >
                    {{ indexTypeLabel(index.indexType) }}
                  </Badge>
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ describeIndexFields(index) }}
                </TableCell>
                <TableCell class="text-center">
                  <Badge
                    v-if="index.status !== undefined"
                    variant="outline"
                    class="rounded-full px-2 py-0.5 text-xs"
                    :class="getDdlStatusClass(index.status)"
                  >
                    {{ getDdlStatusLabel(index.status) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div class="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" @click="handleIndexDdl(index)" title="索引DDL">
                      <Database class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleEditIndex(index)">
                      <Edit class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="handleDeleteIndex(index)">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <TablePagination
          :current-page="indexPage"
          :page-size="indexPageSize"
          :total="indexTotal"
          @change="handleIndexPageChange"
        />
      </DialogContent>
    </Dialog>

    <!-- ============= 新增 / 编辑 索引 表单弹窗 ============= -->
    <Dialog v-model:open="showIndexFormDialog">
      <DialogContent class="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>{{ isIndexEdit ? '编辑索引' : '新增索引' }}</DialogTitle>
          <DialogDescription>
            配置索引名、类型与包含字段，保存后可通过「DDL」按钮生成并执行建索引 SQL。
          </DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-4 py-3">
          <div class="space-y-2 col-span-2">
            <Label>索引名 <span class="text-destructive">*</span></Label>
            <Input
              v-model="indexForm.indexName"
              :disabled="isIndexLocked"
              placeholder="建议使用 idx_表名_列名 命名，如 idx_user_username"
            />
          </div>
          <div class="space-y-2">
            <Label>索引类型</Label>
            <Select v-model="indexForm.indexType" :disabled="isIndexLocked">
              <SelectTrigger>
                <SelectValue placeholder="选择索引类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">普通索引</SelectItem>
                <SelectItem value="UNIQUE">唯一索引</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 col-span-2">
            <div class="flex items-center justify-between">
              <Label>
                包含字段 <span class="text-destructive">*</span>
                <span class="text-muted-foreground text-xs ml-2">（按点击顺序排列）</span>
              </Label>
              <Button
                v-if="currentFields.length && !isIndexLocked"
                size="sm"
                variant="ghost"
                @click="clearIndexFields"
                type="button"
              >
                <X class="w-3.5 h-3.5 mr-1" />
                清空
              </Button>
            </div>
            <Card class="border p-0 overflow-hidden">
              <div
                v-if="!currentFields.length"
                class="text-center text-muted-foreground text-sm py-6"
              >
                当前模型还没有字段，请先创建字段再配置索引。
              </div>
              <ScrollArea v-else class="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead class="w-10"></TableHead>
                      <TableHead>字段标签</TableHead>
                      <TableHead class="w-32">字段代码</TableHead>
                      <TableHead class="w-24">字段类型</TableHead>
                      <TableHead class="w-20 text-center">DDL状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="field in currentFields"
                      :key="field.id"
                      :class="isIndexLocked ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:bg-muted/40'"
                      @click="!isIndexLocked && toggleIndexField(field.id!, !indexFieldIds.includes(field.id!))"
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          :checked="indexFieldIds.includes(field.id!)"
                          :disabled="isIndexLocked"
                          @change="(e) => toggleIndexField(field.id!, (e.target as HTMLInputElement).checked)"
                          @click.stop
                          class="size-4 rounded border-input accent-primary cursor-pointer"
                        />
                      </TableCell>
                      <TableCell class="font-medium">{{ field.fieldLabel || field.fieldName }}</TableCell>
                      <TableCell>
                        <code class="px-1 py-0.5 rounded bg-muted font-mono text-xs">{{ field.fieldCode || field.fieldName }}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" class="text-[10px] px-1.5 py-0 h-4">{{ field.fieldType }}</Badge>
                      </TableCell>
                      <TableCell class="text-center">
                        <Badge
                          variant="outline"
                          class="rounded-full px-1.5 py-0 text-[10px]"
                          :class="getDdlStatusClass(field.status)"
                        >
                          {{ getDdlStatusLabel(field.status) }}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </div>
          <div class="space-y-2 col-span-2">
            <Label for="indexRemark">备注</Label>
            <Textarea
              id="indexRemark"
              v-model="indexForm.remark"
              placeholder="可选，索引用途说明"
              class="min-h-[60px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showIndexFormDialog = false">取消</Button>
          <Button @click="handleSaveIndex">{{ isIndexEdit ? '保存修改' : '创建索引' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ============= 索引 DDL 弹窗：创建 / 删除 两个 Tab ============= -->
    <Dialog v-model:open="showIndexDdlDialog">
      <DialogContent class="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>
            索引 DDL
            <span v-if="currentDdlIndex?.indexName" class="text-muted-foreground text-sm ml-2">
              「{{ currentDdlIndex.indexName }}」 · {{ indexTypeLabel(currentDdlIndex.indexType) }}
            </span>
          </DialogTitle>
          <DialogDescription>预览生成的 DDL，点击执行后会在数据库中立即执行。</DialogDescription>
        </DialogHeader>
        <Tabs v-model="indexDdlTab">
          <TabsList class="mb-2">
            <TabsTrigger value="create">
              创建索引
              <Badge
                v-if="currentDdlIndex?.status !== undefined"
                variant="outline"
                class="ml-2 rounded-full px-1.5 py-0 text-[10px]"
                :class="getDdlStatusClass(currentDdlIndex.status)"
              >
                {{ getDdlStatusLabel(currentDdlIndex.status) }}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="drop">删除索引</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <ScrollArea class="max-h-[45vh]">
              <pre
                class="p-3 rounded-md text-sm font-mono bg-muted whitespace-pre-wrap break-all"
              >{{ createIndexDdlContent || '暂无DDL' }}</pre
              >
            </ScrollArea>
          </TabsContent>
          <TabsContent value="drop">
            <ScrollArea class="max-h-[45vh]">
              <pre
                class="p-3 rounded-md text-sm font-mono bg-muted whitespace-pre-wrap break-all"
              >{{ dropIndexDdlContent || '暂无DDL' }}</pre
              >
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" @click="showIndexDdlDialog = false">关闭</Button>
          <Button @click="handleExecuteIndexDdl" :disabled="indexDdlLoading">
            <Play class="w-4 h-4 mr-1" />
            执行DDL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog />
  </div>
</template>
