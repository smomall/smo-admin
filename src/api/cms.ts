import type {
  Article,
  Category,
  Tag,
  Comment,
  Job,
  TaskLog,
  Email,
  NavItem,
  Site,
  PageResult,
  CursorResult,
  OssFile,
  OssBucket,
  OssClientConfig,
  Page,
  PageModel,
  PageModelField,
  PageModelFieldIndex,
  PageMeta,
  NavGroup,
  Carousel,
  Note,
  Chapter,
  Document,
} from '@/types'
import { useRequest } from '@/composables/useRequest'
import { buildQuery } from './query'
import { createCrudApi } from './factory'
import { MAX_PAGE_SIZE } from '@/constants/app'

// ================================================
// 文章管理 API
// ================================================
export const articleApi = {
  ...createCrudApi<Article, {
    title?: string
    categoryId?: string
    status?: string
    siteId?: string
  }>('/articles'),

  // 游标搜索文章（下拉搜索、无限滚动）
  cursor: (params: {
    title?: string
    siteId?: string
    lastId?: string
    lastPublishAt?: string
    pageSize?: number
  }) => useRequest<CursorResult<Article>>(`/articles/cursor${buildQuery(params)}`).json(),

  // 获取文章标签列表
  listTags: (id: string) => useRequest<Tag[]>(`/articles/${id}/tags`).json(),

  // 获取文章分类列表
  listCategories: (id: string) => useRequest<Category[]>(`/articles/${id}/categories`).json(),
}

// ================================================
// 页面管理 API
// ================================================
export const pageApi = {
  // 获取页面列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    slug?: string
    status?: string
    siteId?: string
    parentId?: string
    modelId?: string
    pageType?: string
  }) => {
    return useRequest<PageResult<Page>>(`/pages/page${buildQuery(params)}`).json()
  },

  // 获取页面树
  tree: (siteId?: string) => {
    return useRequest<Page[]>(`/pages/tree${buildQuery({ siteId })}`).json()
  },

  // 获取单个页面
  getById: (id: string) => {
    return useRequest<Page>(`/pages/${id}`).json()
  },

  // 创建页面
  create: (data: Partial<Page>) => {
    return useRequest<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新页面（PUT /pages/{id}）
  update: (id: string, data: Partial<Page>) => {
    return useRequest(`/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除页面
  delete: (id: string) => {
    return useRequest(`/pages/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 页面元数据 API
// ================================================
export const pageMetaApi = {
  // 后端仅提供分页接口 GET /page/metas/page，按大页一次性加载后由前端分页
  list: (params?: { pageId?: string; pageNumber?: number; pageSize?: number }) => {
    return useRequest<PageResult<PageMeta>>(
      `/page/metas/page${buildQuery({ pageNumber: 1, pageSize: MAX_PAGE_SIZE, ...params })}`,
    ).json()
  },

  getById: (id: string) => {
    return useRequest<PageMeta>(`/page/metas/${id}`).json()
  },

  create: (data: Partial<PageMeta>) => {
    return useRequest('/page/metas', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<PageMeta>) => {
    return useRequest(`/page/metas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/page/metas/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 分类管理 API
// ================================================
export const categoryApi = {
  ...createCrudApi<Category, {
    title?: string
    slug?: string
    status?: string
    siteId?: string
    parentId?: string
  }>('/categories'),

  // 获取分类树（无限级）
  tree: (siteId?: string) => useRequest<Category[]>(`/categories/tree${buildQuery({ siteId })}`).json(),
}

// ================================================
// 标签管理 API
// ================================================
export const tagApi = {
  // 获取标签列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    slug?: string
    status?: string
    siteId?: string
  }) => {
    return useRequest<PageResult<Tag>>(`/tags/page${buildQuery(params)}`).json()
  },

  // 游标搜索标签（下拉搜索、无限滚动）
  cursor: (params: {
    title?: string
    siteId?: string
    lastId?: string
    lastPublishAt?: string
    pageSize?: number
  }) => {
    return useRequest<CursorResult<Tag>>(`/tags/cursor${buildQuery(params)}`).json()
  },

  // 获取所有标签
  getAll: (siteId?: string) => {
    return useRequest<Tag[]>(`/tags${buildQuery({ siteId })}`).json()
  },

  // 获取单个标签
  getById: (id: string) => {
    return useRequest<Tag>(`/tags/${id}`).json()
  },

  // 创建标签
  create: (data: Partial<Tag>) => {
    return useRequest('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新标签
  update: (id: string, data: Partial<Tag>) => {
    return useRequest(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除标签
  delete: (id: string) => {
    return useRequest(`/tags/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 评论管理 API
// ================================================
export const commentApi = {
  // 获取顶级评论列表（分页）- 楼中楼评论的一级评论
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    siteId?: string
    bizId?: string
    bizType?: string
    status?: string
    sort?: string
  }) => {
    return useRequest<PageResult<Comment>>(`/comments/page${buildQuery(params)}`).json()
  },

  // 获取子评论列表（分页）- 楼中楼评论的二级评论
  subList: (params?: {
    pageNumber?: number
    pageSize?: number
    rootId?: string
    status?: string
    sort?: string
  }) => {
    return useRequest<PageResult<Comment>>(`/comments/sub/page${buildQuery(params)}`).json()
  },

  // 获取单个评论
  getById: (id: string) => {
    return useRequest<Comment>(`/comments/${id}`).json()
  },

  // 创建评论
  create: (data: Partial<Comment>) => {
    return useRequest('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新评论
  update: (id: string, data: Partial<Comment>) => {
    return useRequest(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除评论
  delete: (id: string) => {
    return useRequest(`/comments/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 任务管理 API
// ================================================
export const jobApi = {
  ...createCrudApi<Job, { title?: string; status?: string }>('/jobs'),

  start: (id: string) => useRequest(`/jobs/${id}/start`, { method: 'PUT' }).json(),
  stop: (id: string) => useRequest(`/jobs/${id}/stop`, { method: 'PUT' }).json(),
  execute: (id: string) => useRequest(`/jobs/${id}/execute`, { method: 'PUT' }).json(),
}

// ================================================
// 任务日志管理 API
// ================================================
export const taskLogApi = {
  ...createCrudApi<TaskLog, {
    jobId?: string
    status?: string
    message?: string
    startTime?: string
    endTime?: string
  }>('/task-logs'),
}

// ================================================
// 邮件管理 API
// ================================================
export const emailApi = {
  ...createCrudApi<Email, { host?: string; username?: string; status?: string }>('/emails'),

  send: (id: string, params: { to: string; title: string; description: string }) =>
    useRequest(`/emails/${id}/send`, { method: 'POST', body: JSON.stringify(params) }).json(),
}

// ================================================
// 导航管理 API
// ================================================
export const navApi = {
  ...createCrudApi<NavItem, {
    title?: string
    status?: string
    siteId?: string
    groupId?: string
  }>('/nav/items'),

  // 获取导航项树形结构
  tree: (params?: { title?: string; status?: string; siteId?: string; groupId?: string }) =>
    useRequest<NavItem[]>(`/nav/items/tree${buildQuery(params)}`).json(),
}

// ================================================
// 站点管理 API
// ================================================
export const siteApi = {
  ...createCrudApi<Site, { title?: string; domain?: string; status?: string }>('/sites'),
}

// ================================================
// OSS客户端配置管理 API
// ================================================
export const ossClientConfigApi = {
  ...createCrudApi<OssClientConfig, {
    configName?: string
    configKey?: string
    region?: string
    status?: string
  }>('/oss/client-configs'),
}

// ================================================
// OSS存储桶管理 API
// ================================================
export const ossBucketApi = {
  ...createCrudApi<OssBucket, {
    configId?: string
    bucketName?: string
    status?: string
  }>('/oss/buckets'),
}

// ================================================
// OSS文件管理 API
// ================================================
export const ossFileApi = {
  ...createCrudApi<OssFile, {
    uploadId?: string
    configId?: string
    bucketId?: string
    fileName?: string
    fileKey?: string
    fileExt?: string
    fileType?: string
    fileSubType?: string
    uploadStatus?: string
  }>('/oss/files'),
}

// ================================================
// OSS预签名URL API
// ================================================
export interface PresignedUploadRequest {
  fileName: string
  fileSize?: number
  contentType?: string
  metadata?: Record<string, string>
}

export interface PresignedUrlResponse {
  uploadId: string
  uploadUrl: string
  fileUrl: string
  expire: number
}

export const presignedApi = {
  // 获取预签名上传URL
  getUploadUrl: (data: PresignedUploadRequest) => {
    return useRequest<PresignedUrlResponse>('/oss/presigned/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },
}

// ================================================
// OSS文件直接上传 API
// ================================================
export const ossUploadApi = {
  // 直接上传文件到OSS
  upload: (file: File, configKey?: string, bucketName?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (configKey) formData.append('configKey', configKey)
    if (bucketName) formData.append('bucketName', bucketName)
    // 大文件上传不做超时限制，timeout=0 表示无限等待
    return useRequest<OssFile>('/oss/upload', {
      method: 'POST',
      body: formData,
    }).json()
  },
}

// ================================================
// 页面模型管理 API
// ================================================
export const pageModelApi = {
  // 分页查询页面模型，对应后端 @GetMapping("/page")
  // 参数严格对齐后端 PageModelController#page：
  //   siteId/Long, modelCode, modelName, modelLabel, modelType, enabled/Boolean, status/Integer
  // （pageNumber/pageSize 由 usePagedList 合并注入，这里无需显式声明）
  list: (params?: {
    siteId?: string
    modelCode?: string
    modelName?: string
    modelLabel?: string
    modelType?: string
    enabled?: boolean
    status?: number
    pageNumber?: number
    pageSize?: number
  }) => {
    return useRequest<PageResult<PageModel>>(`/page/models/page${buildQuery(params)}`).json()
  },

  getAll: () => {
    return useRequest<PageModel[]>('/page/models').json()
  },

  getById: (id: string) => {
    return useRequest<PageModel>(`/page/models/${id}`).json()
  },

  create: (data: Partial<PageModel>) => {
    return useRequest('/page/models', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<PageModel>) => {
    return useRequest(`/page/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/page/models/${id}`, { method: 'DELETE' }).json()
  },

  generateCreateTableDdl: (id: string) => {
    return useRequest<string>(`/page/models/${id}/add/sql`).json()
  },

  executeCreateTable: (id: string) => {
    return useRequest(`/page/models/${id}/add/execute`, {
      method: 'POST',
    }).json()
  },

  generateFieldDdl: (id: string) => {
    return useRequest<string>(`/page/models/${id}/modify/sql`).json()
  },

  applyFieldDdl: (id: string) => {
    return useRequest<string>(`/page/models/${id}/modify/execute`, {
      method: 'POST',
    }).json()
  },

  generateDropTableDdl: (id: string) => {
    return useRequest<string>(`/page/models/${id}/remove/sql`).json()
  },

  dropTable: (id: string) => {
    return useRequest(`/page/models/${id}/remove/execute`, { method: 'POST' }).json()
  },

  // 模型级变更 DDL（表名/表注释变更，对比变更前快照与当前模型）
  generateChangeDdl: (id: string) => {
    return useRequest<string>(`/page/models/${id}/change/sql`).json()
  },

  applyChangeDdl: (id: string) => {
    return useRequest<string>(`/page/models/${id}/change/execute`, {
      method: 'POST',
    }).json()
  },
}

// ================================================
// 页面模型字段管理 API
// ================================================
export const pageModelFieldApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    siteId?: string
    modelId?: string
    fieldCode?: string
    fieldName?: string
    fieldLabel?: string
    fieldType?: string
    status?: string
  }) => {
    return useRequest<PageResult<PageModelField>>(
      `/page/model/fields/page${buildQuery(params)}`,
    ).json()
  },

  // 对应后端 PageModelFieldController#list（GET /page/model/fields）
  // 后端支持 modelId / enabled / status(Set<Integer>) 筛选，前端不再做 filter
  getAll: (modelId?: string, params?: { enabled?: boolean; status?: number[] }) => {
    const searchParams = new URLSearchParams()
    if (modelId) searchParams.set('modelId', modelId)
    if (params?.enabled !== undefined) searchParams.set('enabled', String(params.enabled))
    // status 为多值参数，后端用 Set<Integer> 接收 → 生成 IN 查询
    if (params?.status?.length) {
      for (const s of params.status) searchParams.append('status', String(s))
    }
    const queryString = searchParams.toString()
    return useRequest<PageModelField[]>(
      `/page/model/fields${queryString ? `?${queryString}` : ''}`,
    ).json()
  },

  getById: (id: string) => {
    return useRequest<PageModelField>(`/page/model/fields/${id}`).json()
  },

  create: (data: Partial<PageModelField>) => {
    return useRequest('/page/model/fields', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<PageModelField>) => {
    return useRequest(`/page/model/fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/page/model/fields/${id}`, { method: 'DELETE' }).json()
  },

  // 字段 DDL：按操作类型显式拆分（与模型级 add|modify|remove 命名一致）
  // 预览（查看）接口
  generateAddDdl: (id: string) => {
    return useRequest<string>(`/page/model/fields/${id}/add/sql`).json()
  },
  generateModifyDdl: (id: string) => {
    return useRequest<string>(`/page/model/fields/${id}/modify/sql`).json()
  },
  generateRemoveDdl: (id: string) => {
    return useRequest<string>(`/page/model/fields/${id}/remove/sql`).json()
  },
  // 执行接口
  executeAddDdl: (id: string) => {
    return useRequest(`/page/model/fields/${id}/add/execute`, { method: 'POST' }).json()
  },
  executeModifyDdl: (id: string) => {
    return useRequest(`/page/model/fields/${id}/modify/execute`, { method: 'POST' }).json()
  },
  executeRemoveDdl: (id: string) => {
    return useRequest(`/page/model/fields/${id}/remove/execute`, { method: 'POST' }).json()
  },

  // 字段变更 DDL（列重命名/类型/注释变更，对比变更前快照与当前字段）
  generateChangeDdl: (id: string) => {
    return useRequest<string>(`/page/model/fields/${id}/change/sql`).json()
  },
  applyChangeDdl: (id: string) => {
    return useRequest<string>(`/page/model/fields/${id}/change/execute`, {
      method: 'POST',
    }).json()
  },
}

// ================================================
// 页面数据管理 API（通过 modelName 定位模型；真实表名使用 PageModel.modelCode）
// ================================================
export const pageDataApi = {
  // POST /page/data/{modelName} - 新增
  save: (modelName: string, data: Record<string, unknown>) => {
    return useRequest(`/page/data/${encodeURIComponent(modelName)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // PUT /page/data/{modelName}/{id} - 修改
  update: (modelName: string, id: string, data: Record<string, unknown>) => {
    return useRequest(`/page/data/${encodeURIComponent(modelName)}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // DELETE /page/data/{modelName}/{id} - 删除
  delete: (modelName: string, id: string) => {
    return useRequest(`/page/data/${encodeURIComponent(modelName)}/${id}`, {
      method: 'DELETE',
    }).json()
  },
  /** @deprecated 请使用 delete 替代 */
  remove: (modelName: string, id: string) => {
    return useRequest(`/page/data/${encodeURIComponent(modelName)}/${id}`, {
      method: 'DELETE',
    }).json()
  },

  // GET /page/data/{modelName}/{id} - 详情
  getInfo: <T = Record<string, unknown>>(modelName: string, id: string) => {
    return useRequest<T>(`/page/data/${encodeURIComponent(modelName)}/${id}`).json()
  },

  // GET /page/data/page/{modelName} - 分页
  page: <T = Record<string, unknown>>(
    modelName: string,
    params?: {
      pageNumber?: number
      pageSize?: number
    },
  ) => {
    return useRequest<PageResult<T>>(
      `/page/data/page/${encodeURIComponent(modelName)}${buildQuery(params)}`,
    ).json()
  },
}

// ================================================
// 模型字段索引管理 API（REST：/page/model/field-indexes）
// ================================================
export const pageModelFieldIndexApi = {
  // POST /page/model/field-indexes - 新增
  create: (data: Partial<PageModelFieldIndex>) => {
    return useRequest('/page/model/field-indexes', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // PUT /page/model/field-indexes/{id} - 修改
  update: (id: string, data: Partial<PageModelFieldIndex>) => {
    return useRequest(`/page/model/field-indexes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // DELETE /page/model/field-indexes/{id} - 单删
  delete: (id: string) => {
    return useRequest(`/page/model/field-indexes/${id}`, { method: 'DELETE' }).json()
  },
  /** @deprecated 请使用 delete 替代 */
  remove: (id: string) => {
    return useRequest(`/page/model/field-indexes/${id}`, { method: 'DELETE' }).json()
  },

  // DELETE /page/model/field-indexes/batch/{ids} - 批量删
  batchDelete: (ids: string[]) => {
    return useRequest(`/page/model/field-indexes/batch/${ids.join(',')}`, {
      method: 'DELETE',
    }).json()
  },
  /** @deprecated 请使用 batchDelete 替代 */
  removeBatch: (ids: string[]) => {
    return useRequest(`/page/model/field-indexes/batch/${ids.join(',')}`, {
      method: 'DELETE',
    }).json()
  },

  // GET /page/model/field-indexes - 列表（可按 modelId/siteId 过滤）
  list: (params?: { modelId?: string; siteId?: string }) => {
    return useRequest<PageModelFieldIndex[]>(
      `/page/model/field-indexes${buildQuery(params)}`,
    ).json()
  },

  // GET /page/model/field-indexes/{id} - 详情
  getById: (id: string) => {
    return useRequest<PageModelFieldIndex>(`/page/model/field-indexes/${id}`).json()
  },

  // GET /page/model/field-indexes/page - 分页
  page: (params?: {
    pageNumber?: number
    pageSize?: number
    modelId?: string
    siteId?: string
    indexType?: string
    indexName?: string
  }) => {
    return useRequest<PageResult<PageModelFieldIndex>>(
      `/page/model/field-indexes/page${buildQuery(params)}`,
    ).json()
  },

  // ========== 索引 DDL（预览 + 执行） ==========
  // GET /page/model/field-indexes/{id}/create/sql
  generateCreateDdl: (id: string) => {
    return useRequest<string>(`/page/model/field-indexes/${id}/create/sql`).json()
  },
  // POST /page/model/field-indexes/{id}/create/execute
  executeCreateDdl: (id: string) => {
    return useRequest(`/page/model/field-indexes/${id}/create/execute`, {
      method: 'POST',
    }).json()
  },
  // GET /page/model/field-indexes/{id}/drop/sql
  generateDropDdl: (id: string) => {
    return useRequest<string>(`/page/model/field-indexes/${id}/drop/sql`).json()
  },
  // POST /page/model/field-indexes/{id}/drop/execute
  executeDropDdl: (id: string) => {
    return useRequest(`/page/model/field-indexes/${id}/drop/execute`, {
      method: 'POST',
    }).json()
  },
}

// ================================================
// 导航分组管理 API
// ================================================
export const navGroupApi = {
  ...createCrudApi<NavGroup, { name?: string; code?: string; status?: string; siteId?: string }>(
    '/nav/groups',
  ),
}

// ================================================
// 轮播图管理 API
// ================================================
export const carouselApi = {
  ...createCrudApi<Carousel, { title?: string; status?: string; siteId?: string }>('/carousels'),

  // 按站点获取全量轮播图
  getAll: (siteId?: string) =>
    useRequest<Carousel[]>(`/carousels${buildQuery({ siteId })}`).json(),
}

// ================================================
// 笔记管理 API
// ================================================
export const noteApi = {
  ...createCrudApi<Note, {
    title?: string
    status?: string
    siteId?: string
    categoryId?: string
  }>('/notes'),

  // 游标搜索笔记（下拉搜索、无限滚动）
  cursor: (params: {
    title?: string
    siteId?: string
    lastId?: string
    lastPublishAt?: string
    pageSize?: number
  }) => useRequest<CursorResult<Note>>(`/notes/cursor${buildQuery(params)}`).json(),

  // 获取笔记标签列表
  listTags: (id: string) => useRequest<Tag[]>(`/notes/${id}/tags`).json(),

  // 获取笔记分类列表
  listCategories: (id: string) => useRequest<Category[]>(`/notes/${id}/categories`).json(),
}

// ================================================
// 章节管理 API
// ================================================
export const chapterApi = {
  ...createCrudApi<Chapter, {
    noteId?: string
    parentId?: string
    title?: string
    status?: string
  }>('/chapters'),

  tree: (noteId: string) => useRequest<Chapter[]>(`/chapters/tree?noteId=${noteId}`).json(),
}

// ================================================
// 文档管理 API（章节与文档一对一，文档 id 复用章节 id，仅保留按章节 id 读取/更新正文）
// ================================================
export const documentApi = {
  getById: (id: string) => {
    return useRequest<Document>(`/documents/${id}`).json()
  },

  update: (id: string, data: Partial<Document>) => {
    return useRequest(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },
}
