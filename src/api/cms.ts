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
  PageContent,
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

// ================================================
// 文章管理 API
// ================================================
export const articleApi = {
  // 获取文章列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    categoryId?: string
    status?: string
    siteId?: string
  }) => {
    return useRequest<PageResult<Article>>(`/articles/page${buildQuery(params)}`).json()
  },

  // 游标搜索文章（下拉搜索、无限滚动）
  cursor: (params: {
    title?: string
    siteId?: string
    lastId?: string
    lastPublishAt?: string
    pageSize?: number
  }) => {
    return useRequest<CursorResult<Article>>(`/articles/cursor${buildQuery(params)}`).json()
  },

  // 获取单个文章
  getById: (id: string) => {
    return useRequest<Article>(`/articles/${id}`).json()
  },

  // 创建文章
  create: (data: Partial<Article>) => {
    return useRequest('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新文章
  update: (id: string, data: Partial<Article>) => {
    return useRequest(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除文章
  delete: (id: string) => {
    return useRequest(`/articles/${id}`, { method: 'DELETE' }).json()
  },

  // 获取文章标签列表
  listTags: (id: string) => {
    return useRequest<Tag[]>(`/articles/${id}/tags`).json()
  },

  // 获取文章分类列表
  listCategories: (id: string) => {
    return useRequest<Category[]>(`/articles/${id}/categories`).json()
  },
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
// 页面内容 API（与 Page 1:1，承载正文与 SEO 等内容字段）
// ================================================
export const pageContentApi = {
  // 按 pageId 获取页面内容
  getByPageId: (pageId: string) => {
    return useRequest<PageContent>(`/page/contents${buildQuery({ pageId })}`).json()
  },

  // 新增页面内容
  create: (data: Partial<PageContent>) => {
    return useRequest<PageContent>('/page/contents', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新页面内容
  update: (id: string, data: Partial<PageContent>) => {
    return useRequest(`/page/contents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除页面内容
  delete: (id: string) => {
    return useRequest(`/page/contents/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 页面元数据 API
// ================================================
export const pageMetaApi = {
  // 后端仅提供分页接口 GET /page/metas/page，按大页一次性加载后由前端分页
  list: (params?: { pageId?: string; pageNumber?: number; pageSize?: number }) => {
    return useRequest<PageResult<PageMeta>>(
      `/page/metas/page${buildQuery({ pageNumber: 1, pageSize: 1000, ...params })}`,
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
  // 获取分类列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    slug?: string
    status?: string
    siteId?: string
    parentId?: string
  }) => {
    return useRequest<PageResult<Category>>(`/categories/page${buildQuery(params)}`).json()
  },

  // 获取所有分类
  getAll: () => {
    return useRequest<Category[]>('/categories').json()
  },

  // 获取分类树（无限级）
  tree: (siteId?: string) => {
    return useRequest<Category[]>(`/categories/tree${buildQuery({ siteId })}`).json()
  },

  // 获取单个分类
  getById: (id: string) => {
    return useRequest<Category>(`/categories/${id}`).json()
  },

  // 创建分类
  create: (data: Partial<Category>) => {
    return useRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新分类
  update: (id: string, data: Partial<Category>) => {
    return useRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除分类
  delete: (id: string) => {
    return useRequest(`/categories/${id}`, { method: 'DELETE' }).json()
  },
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
  // 获取任务列表（分页）
  list: (params?: { pageNumber?: number; pageSize?: number; title?: string; status?: string }) => {
    return useRequest<PageResult<Job>>(`/jobs/page${buildQuery(params)}`).json()
  },

  // 获取单个任务
  getById: (id: string) => {
    return useRequest<Job>(`/jobs/${id}`).json()
  },

  // 创建任务
  create: (data: Partial<Job>) => {
    return useRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新任务
  update: (id: string, data: Partial<Job>) => {
    return useRequest(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除任务
  delete: (id: string) => {
    return useRequest(`/jobs/${id}`, { method: 'DELETE' }).json()
  },

  // 启动任务
  start: (id: string) => {
    return useRequest(`/jobs/${id}/start`, { method: 'PUT' }).json()
  },

  // 停止任务
  stop: (id: string) => {
    return useRequest(`/jobs/${id}/stop`, { method: 'PUT' }).json()
  },

  // 立即执行任务
  execute: (id: string) => {
    return useRequest(`/jobs/${id}/execute`, { method: 'PUT' }).json()
  },
}

// ================================================
// 任务日志管理 API
// ================================================
export const taskLogApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    jobId?: string
    status?: string
    message?: string
    startTime?: string
    endTime?: string
  }) => {
    return useRequest<PageResult<TaskLog>>(`/task-logs/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<TaskLog>(`/task-logs/${id}`).json()
  },

  delete: (id: string) => {
    return useRequest(`/task-logs/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 邮件管理 API
// ================================================
export const emailApi = {
  // 获取邮件配置列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    host?: string
    username?: string
    status?: string
  }) => {
    return useRequest<PageResult<Email>>(`/emails/page${buildQuery(params)}`).json()
  },

  // 获取单个邮件配置
  getById: (id: string) => {
    return useRequest<Email>(`/emails/${id}`).json()
  },

  // 创建邮件配置
  create: (data: Partial<Email>) => {
    return useRequest('/emails', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新邮件配置
  update: (id: string, data: Partial<Email>) => {
    return useRequest(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除邮件配置
  delete: (id: string) => {
    return useRequest(`/emails/${id}`, { method: 'DELETE' }).json()
  },

  // 发送测试邮件
  sendTest: (id: string, testEmail: string) => {
    return useRequest(`/emails/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ email: testEmail }),
    }).json()
  },
}

// ================================================
// 导航管理 API
// ================================================
export const navApi = {
  // 导航项列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    status?: string
    siteId?: string
    groupId?: string
  }) => {
    return useRequest<PageResult<NavItem>>(`/nav/items/page${buildQuery(params)}`).json()
  },

  // 获取导航项树形结构
  tree: (params?: { title?: string; status?: string; siteId?: string; groupId?: string }) => {
    return useRequest<NavItem[]>(`/nav/items/tree${buildQuery(params)}`).json()
  },

  // 获取单个导航项
  getById: (id: string) => {
    return useRequest<NavItem>(`/nav/items/${id}`).json()
  },

  // 创建导航项
  create: (data: Partial<NavItem>) => {
    return useRequest('/nav/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新导航项
  update: (id: string, data: Partial<NavItem>) => {
    return useRequest(`/nav/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除导航项
  remove: (id: string) => {
    return useRequest(`/nav/items/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 站点管理 API
// ================================================
export const siteApi = {
  // 获取站点列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    domain?: string
    status?: string
  }) => {
    return useRequest<PageResult<Site>>(`/sites/page${buildQuery(params)}`).json()
  },

  // 获取所有站点
  getAll: () => {
    return useRequest<Site[]>('/sites').json()
  },

  // 获取单个站点
  getById: (id: string) => {
    return useRequest<Site>(`/sites/${id}`).json()
  },

  // 创建站点
  create: (data: Partial<Site>) => {
    return useRequest('/sites', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新站点
  update: (id: string, data: Partial<Site>) => {
    return useRequest(`/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除站点
  delete: (id: string) => {
    return useRequest(`/sites/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// OSS客户端配置管理 API
// ================================================
export const ossClientConfigApi = {
  // 获取OSS客户端配置列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    configName?: string
    configKey?: string
    region?: string
    status?: string
  }) => {
    return useRequest<PageResult<OssClientConfig>>(
      `/oss/client-configs/page${buildQuery(params)}`,
    ).json()
  },

  // 获取所有OSS客户端配置
  getAll: () => {
    return useRequest<OssClientConfig[]>('/oss/client-configs').json()
  },

  // 获取单个OSS客户端配置
  getById: (id: string) => {
    return useRequest<OssClientConfig>(`/oss/client-configs/${id}`).json()
  },

  // 创建OSS客户端配置
  create: (data: Partial<OssClientConfig>) => {
    return useRequest('/oss/client-configs', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新OSS客户端配置
  update: (id: string, data: Partial<OssClientConfig>) => {
    return useRequest(`/oss/client-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除OSS客户端配置
  delete: (id: string) => {
    return useRequest(`/oss/client-configs/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// OSS存储桶管理 API
// ================================================
export const ossBucketApi = {
  // 获取OSS存储桶列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    configId?: string
    bucketName?: string
    status?: string
  }) => {
    return useRequest<PageResult<OssBucket>>(`/oss/buckets/page${buildQuery(params)}`).json()
  },

  // 获取所有OSS存储桶
  getAll: () => {
    return useRequest<OssBucket[]>('/oss/buckets').json()
  },

  // 获取单个OSS存储桶
  getById: (id: string) => {
    return useRequest<OssBucket>(`/oss/buckets/${id}`).json()
  },

  // 创建OSS存储桶
  create: (data: Partial<OssBucket>) => {
    return useRequest('/oss/buckets', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新OSS存储桶
  update: (id: string, data: Partial<OssBucket>) => {
    return useRequest(`/oss/buckets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除OSS存储桶
  delete: (id: string) => {
    return useRequest(`/oss/buckets/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// OSS文件管理 API
// ================================================
export const ossFileApi = {
  // 获取OSS文件列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    uploadId?: string
    configId?: string
    bucketId?: string
    fileName?: string
    fileKey?: string
    fileExt?: string
    fileType?: string
    fileSubType?: string
    uploadStatus?: string
  }) => {
    return useRequest<PageResult<OssFile>>(`/oss/files/page${buildQuery(params)}`).json()
  },

  // 获取单个OSS文件
  getById: (id: string) => {
    return useRequest<OssFile>(`/oss/files/${id}`).json()
  },

  // 创建OSS文件记录
  create: (data: Partial<OssFile>) => {
    return useRequest('/oss/files', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  // 更新OSS文件记录
  update: (id: string, data: Partial<OssFile>) => {
    return useRequest(`/oss/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  // 删除OSS文件记录
  delete: (id: string) => {
    return useRequest(`/oss/files/${id}`, { method: 'DELETE' }).json()
  },
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
  remove: (id: string) => {
    return useRequest(`/page/model/field-indexes/${id}`, { method: 'DELETE' }).json()
  },

  // DELETE /page/model/field-indexes/batch/{ids} - 批量删
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
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    name?: string
    code?: string
    status?: string
    siteId?: string
  }) => {
    return useRequest<PageResult<NavGroup>>(`/nav/groups/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<NavGroup>(`/nav/groups/${id}`).json()
  },

  create: (data: Partial<NavGroup>) => {
    return useRequest('/nav/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<NavGroup>) => {
    return useRequest(`/nav/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/nav/groups/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 轮播图管理 API
// ================================================
export const carouselApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    status?: string
    siteId?: string
  }) => {
    return useRequest<PageResult<Carousel>>(`/carousels/page${buildQuery(params)}`).json()
  },

  getAll: (siteId?: string) => {
    return useRequest<Carousel[]>(`/carousels${buildQuery({ siteId })}`).json()
  },

  getById: (id: string) => {
    return useRequest<Carousel>(`/carousels/${id}`).json()
  },

  create: (data: Partial<Carousel>) => {
    return useRequest('/carousels', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Carousel>) => {
    return useRequest(`/carousels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/carousels/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 笔记管理 API
// ================================================
export const noteApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    status?: string
    siteId?: string
    categoryId?: string
  }) => {
    return useRequest<PageResult<Note>>(`/notes/page${buildQuery(params)}`).json()
  },

  // 游标搜索笔记（下拉搜索、无限滚动）
  cursor: (params: {
    title?: string
    siteId?: string
    lastId?: string
    lastPublishAt?: string
    pageSize?: number
  }) => {
    return useRequest<CursorResult<Note>>(`/notes/cursor${buildQuery(params)}`).json()
  },

  getAll: () => {
    return useRequest<Note[]>('/notes').json()
  },

  getById: (id: string) => {
    return useRequest<Note>(`/notes/${id}`).json()
  },

  create: (data: Partial<Note>) => {
    return useRequest('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Note>) => {
    return useRequest(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/notes/${id}`, { method: 'DELETE' }).json()
  },

  // 获取笔记标签列表
  listTags: (id: string) => {
    return useRequest<Tag[]>(`/notes/${id}/tags`).json()
  },

  // 获取笔记分类列表
  listCategories: (id: string) => {
    return useRequest<Category[]>(`/notes/${id}/categories`).json()
  },
}

// ================================================
// 章节管理 API
// ================================================
export const chapterApi = {
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    noteId?: string
    parentId?: string
    title?: string
    status?: string
  }) => {
    return useRequest<PageResult<Chapter>>(`/chapters/page${buildQuery(params)}`).json()
  },

  tree: (noteId: string) => {
    return useRequest<Chapter[]>(`/chapters/tree?noteId=${noteId}`).json()
  },

  getById: (id: string) => {
    return useRequest<Chapter>(`/chapters/${id}`).json()
  },

  create: (data: Partial<Chapter>) => {
    return useRequest('/chapters', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Chapter>) => {
    return useRequest(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/chapters/${id}`, { method: 'DELETE' }).json()
  },
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
