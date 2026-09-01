export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

export interface PageResult<T = unknown> {
  records: T[]
  pageNumber: number
  pageSize: number
  totalPage: number
  totalRow: number
}

/** 游标分页结果（用于下拉搜索、无限滚动） */
export interface CursorResult<T = unknown> {
  records: T[]
  /** 下一页游标：最后一条记录 ID */
  nextId: string | null
  /** 下一页游标：最后一条记录的排序时间（发布时间或修改时间） */
  nextPublishAt: string | null
  hasMore: boolean
}

export interface Menu {
  id: string
  parentId: string
  name: string
  path: string
  icon?: string
  component?: string
  sort: number
  /** 菜单类型：d-目录 m-菜单 b-按钮 */
  type: 'd' | 'm' | 'b'
  visible: boolean
  permission?: string
  affix?: boolean
  /** 是否外部链接 */
  external?: boolean
  children?: Menu[]
}

/**
 * 登录用户信息，对应后端 com.kongjs.smo.common.security.dto.LoginUser
 */
export interface LoginUser {
  id: string
  organizationId?: string
  postId?: string
  avatar?: string
  nickname?: string
  username: string
  enabled: boolean
  roles: string[]
}

export interface LoginResponse {
  /** token 模式下返回；VITE_TOKEN_ENABLED=false 时后端不返回，依赖 cookie 会话 */
  token?: string
  user: LoginUser
}

export interface User {
  id: string
  /** OAuth/OIDC唯一标识 */
  subject?: string
  /** 用户完整姓名 */
  fullName?: string
  /** 名（西方姓名体系） */
  givenName?: string
  /** 姓（西方姓名体系） */
  familyName?: string
  /** 中间名 */
  middleName?: string
  /** 用户昵称 */
  nickname?: string
  /** 第三方登录首选用户名 */
  preferredUsername?: string
  /** 用户个人资料页URL */
  profile?: string
  /** 用户头像URL */
  picture?: string
  /** 用户个人网站URL */
  website?: string
  /** 用户邮箱 */
  email?: string
  /** 邮箱是否验证 */
  emailVerified?: boolean
  /** 用户性别 */
  gender?: string
  /** 出生日期 */
  birthdate?: string
  /** 时区信息 */
  zoneInfo?: string
  /** 语言地区 */
  locale?: string
  /** 用户手机号 */
  phoneNumber?: string
  /** 手机号是否验证 */
  phoneNumberVerified?: boolean
  /** 系统内唯一用户名 */
  username: string
  /** 登录密码 */
  password?: string
  /** 用户状态：1-启用 2-禁用 3-锁定 */
  status: string
  /** 登录失败次数 */
  loginFailCount?: number
  /** 最后登录时间 */
  lastLoginAt?: string
  /** 最后登录IP */
  lastLoginIp?: string
  /** 备注信息 */
  remark?: string
  /** 岗位ID */
  postId?: string
  /** 部门ID */
  organizationId?: string
  /** 角色列表 */
  roles?: Role[]
  /** 岗位 */
  post?: Post
  /** 部门 */
  organization?: Organization
  /** 头像 */
  avatar?: string
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

export interface Role {
  id: string
  name: string
  code: string
  description?: string
  /** 角色类型（后端 Integer，无 @JsonSerialize） */
  type?: number
  /** 数据范围（后端 Integer，无 @JsonSerialize） */
  dataScope?: number
  /** 状态（后端 Integer with @JsonSerialize → string） */
  status: string
  /** 是否内置 内置不可删除修改 */
  builtin?: boolean
}

export interface Permission {
  id: string
  /** 父级ID */
  parentId?: string
  /** 模块标识 */
  moduleId?: string
  /** 功能标识 */
  functionId?: string
  /** HTTP方法 */
  httpMethod?: string
  /** 资源路径 */
  resourcePath?: string
  name: string
  code: string
  /** 权限类型 */
  type?: number
  description?: string
  /** 排序号 */
  sort?: number
  /** 启用状态 */
  status: string
  /** 子权限（树形结构） */
  children?: Permission[]
}

export interface TabItem {
  id: string
  label: string
  path: string
  icon?: string
  closable: boolean
  /** 是否外部链接 */
  external?: boolean
}

export interface Organization {
  id: string
  parentId: string
  name: string
  code: string
  leader?: string
  phone?: string
  email?: string
  sort: number
  status: string
  children?: Organization[]
}

export interface Post {
  id: string
  organizationId?: string
  organization?: Organization
  name: string
  code: string
  sort: number
  status: string
  remark?: string
}

export interface DictType {
  id: string
  name: string
  code: string
  status: string
  remark?: string
}

export interface DictItem {
  id: string
  dictTypeId: string
  label: string
  value: string
  sort: number
  status: string
  remark?: string
}

export interface DictItemOption {
  label: string
  value: string
}

export interface DictSelectResult {
  name: string
  code: string
  items: DictItemOption[]
}

export interface ConfigType {
  id: string
  name: string
  code: string
  status: string
  remark?: string
}

export interface ConfigItem {
  id: string
  configTypeId: string
  label: string
  key: string
  value: string
  type: string
  sort: number
  status: string
  remark?: string
}

export interface Notice {
  id: string
  title: string
  content: string
  type: string
  timingPublish?: boolean
  publishAt?: string
  expireAt?: string
  /** 重要级别（后端 Integer，无 @JsonSerialize） */
  importance?: number
  status: string
  /** 是否已读（个人通知，后端瞬态字段） */
  isRead?: boolean
  /** 已读时间（个人通知，后端瞬态字段） */
  readAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface OperationLog {
  id: string
  userId: string
  username: string
  nickname?: string
  moduleName?: string
  functionName?: string
  operateType?: string
  contentType?: string
  requestUrl?: string
  requestMethod?: string
  requestParam?: string
  requestBody?: string
  responseResult?: string
  failReason?: string
  startAt?: string
  endAt?: string
  durationMs?: number
  ipAddress?: string
  ipLocation?: string
  userAgent?: string
  browser?: string
  osInfo?: string
  deviceType?: number
  status: string
}

export interface LoginLog {
  id: string
  userId: string
  username: string
  nickname?: string
  loginType?: string
  loginResult?: string
  failReason?: string
  loginAt?: string
  ipAddress?: string
  ipLocation?: string
  userAgent?: string
  browser?: string
  osInfo?: string
  deviceType?: number
  status: string
  createdAt?: string
}

export interface Article {
  id: string
  siteId?: string
  categoryId?: string
  categoryIds?: string[]
  tagNames?: string[]
  cover?: string
  title: string
  description?: string
  content?: string
  contentType?: string
  status?: string
  viewCount?: number
  likeCount?: number
  commentCount?: number
  collectCount?: number
  wordCount?: number
  rating?: number
  heatScore?: number
  allowComment?: boolean
  publishAt?: string
  sourceType?: number
  sourceUrl?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  createdAt?: string
  updatedAt?: string
}

export interface Page {
  id: string
  parentId?: string
  siteId?: string
  modelId?: string
  slug?: string
  cover?: string
  title: string
  description?: string
  publishAt?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  pageType?: string
  sort?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  children?: Page[]
  /** 树形缩进层级（前端渲染用瞬态字段） */
  indent?: number
}

export interface PageContent {
  id: string
  pageId?: string
  content?: string
  contentType?: string
  html?: string
}

export interface Category {
  id: string
  siteId?: string
  title: string
  slug?: string
  description?: string
  cover?: string
  icon?: string
  parentId?: string
  status?: string
  articleCount?: number
  sort?: number
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  createdAt?: string
  updatedAt?: string
  children?: Category[]
  /** 树形缩进层级（前端渲染用瞬态字段） */
  indent?: number
}

export interface Tag {
  id: string
  siteId?: string
  title: string
  slug?: string
  description?: string
  cover?: string
  icon?: string
  status?: string
  articleCount?: number
  sort?: number
  createdAt?: string
  updatedAt?: string
}

export interface Author {
  id?: string
  nickname?: string
  avatar?: string
  profile?: string
  status?: string
}

export interface Note {
  id: string
  siteId?: string
  categoryId?: string
  categoryIds?: string[]
  tagNames?: string[]
  cover?: string
  title: string
  description?: string
  status?: string
  publishAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface Chapter {
  id: string
  siteId?: string
  noteId?: string
  parentId?: string
  title: string
  description?: string
  /** 发布状态：0=草稿，1=发布 */
  status?: string
  sort?: number
  /** 层级：根节点为 0，子节点为父节点 level + 1 */
  level?: number
  children?: Chapter[]
  createdAt?: string
  updatedAt?: string
  /** 树形缩进层级（前端渲染用瞬态字段） */
  indent?: number
}

export interface Document {
  id: string
  siteId?: string
  noteId?: string
  title: string
  description?: string
  content?: string
  contentType?: string
  wordCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface Comment {
  id: string
  siteId?: string
  bizId?: string
  /** 业务类型（后端 Integer with @JsonSerialize → string） */
  bizType?: string
  rootId?: string
  parentId?: string
  userId?: string
  replyUserId?: string
  user?: Author
  replyUser?: Author
  nickname?: string
  avatar?: string
  content: string
  images?: string[]
  ipAddress?: string
  ipLocation?: string
  userAgent?: string
  isTop?: boolean
  status: string
  likeCount: number
  replyCount: number
  createdAt?: string
  updatedAt?: string
}

export interface Job {
  id: string
  lastTaskId?: string
  title: string
  description?: string
  /** 业务表达式 */
  bizExpression?: string
  /** 触发类型：cron / simple / daily_time / calendar */
  triggerType?: string
  /** Cron表达式或ISO-8601 Duration（如PT5M） */
  expression?: string
  /** misfire策略：do_nothing / fire_once / ignore_all / next_existing / next_remaining / now_existing / now_remaining */
  strategy?: string
  /** 间隔值（simple/daily_time/calendar触发器使用） */
  interval?: number
  /** 间隔单位：second / minute / hour / day / week / month / year */
  intervalUnit?: string
  /** 每周触发的星期（逗号分隔，1=周日..7=周六） */
  daysOfWeek?: string
  /** 每日触发开始时间 */
  startTimeOfDay?: string
  /** 每日触发结束时间 */
  endTimeOfDay?: string
  /** 重复次数（-1或null表示无限重复） */
  repeatCount?: number
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface TaskLog {
  id: string
  jobId: string
  message?: string
  result?: string
  status: string
  startTime?: string
  endTime?: string
  durationMs?: number
  stackTrace?: string[]
}

export interface Email {
  id: string
  /** 协议（后端 String） */
  protocol?: string
  host?: string
  username?: string
  password?: string
  defaultEncoding?: string
  javaMailProperties?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface NavItem {
  id: string
  siteId?: string
  groupId?: string
  linkId?: string
  parentId?: string
  title: string
  icon?: string
  /** 链接类型（后端 String） */
  linkType?: string
  linkUrl?: string
  target?: string
  visible?: boolean
  status: string
  sort?: number
  remark?: string
  children?: NavItem[]
  /** 树形缩进层级（前端渲染用瞬态字段） */
  indent?: number
}

export interface Site {
  id: string
  title: string
  keywords?: string
  description?: string
  domain?: string
  directory?: string
  status: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface Profile {
  id: string
  nickname?: string
  avatar?: string
  bio?: string
  status?: string
}

export interface UserProfile {
  userId?: string
  subject?: string
  fullName?: string
  givenName?: string
  familyName?: string
  middleName?: string
  nickName?: string
  preferredUsername?: string
  profile?: string
  picture?: string
  website?: string
  email?: string
  emailVerified?: boolean
  gender?: string
  birthdate?: string
  zoneInfo?: string
  locale?: string
  phoneNumber?: string
  phoneNumberVerified?: boolean
  updateAt?: string
}

export interface UserAddress {
  userId?: string
  formatted?: string
  streetAddress?: string
  locality?: string
  region?: string
  postalCode?: string
  country?: string
}

// ================================================
// OSS 类型定义
// ================================================

export interface OssClientConfig {
  id: string
  configName: string
  configKey: string
  endpoint: string
  accessKey: string
  secretKey: string
  region: string
  httpClientConfig?: string
  httpClientConfigAsync?: string
  presignUploadExpire?: string
  presignDownloadExpire?: string
  forcePathStyle?: boolean
  /** 是否默认 */
  isDefault?: boolean
  status: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface OssBucket {
  id: string
  configId: string
  bucketName: string
  endpoint?: string
  basePath?: string
  /** 是否默认 */
  isDefault?: boolean
  /** 访问策略（后端 Integer，无 @JsonSerialize） */
  policy?: number
  status: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface OssFile {
  id: string
  configId?: string
  bucketId?: string
  fileUrl?: string
  fileName?: string
  fileKey?: string
  fileExt?: string
  fileHash?: string
  fileSize?: number
  fileType?: string
  fileSubType?: string
  contentType?: string
  status?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface Relation {
  type?: string
  targetModelId?: string
  selfFieldId?: string
  targetFieldId?: string
  valueFieldId?: string
  mappedBy?: string
  inversedBy?: string
}

export interface PageMeta {
  id: string
  pageId?: string
  metaKey?: string
  metaValue?: string
}

export interface PageModelField {
  id: string
  siteId?: string
  modelId?: string
  /** 数据库字段代码（后端 entity: fieldCode） */
  fieldCode?: string
  fieldName?: string
  fieldLabel?: string
  fieldType?: string
  fieldSize?: string
  /** 前端组件 */
  component?: string
  /** 后台编辑组件（值对应 smo-admin/src/components/ui 目录名） */
  adminComponent?: string
  /** 字典编码（下拉选择组件绑定数据字典） */
  dictCode?: string
  /** 校验规则JSON（正则、最大最小、长度限制） */
  validateRule?: string
  /** 默认值 */
  defaultValue?: string
  required?: boolean
  visible?: boolean
  /** 是否作为查询条件 */
  queryable?: boolean
  /** 是否允许新增 */
  addable?: boolean
  /** 是否可编辑 */
  editable?: boolean
  /** 是否允许作为排序条件 */
  sortable?: boolean
  /** 是否全文搜索 */
  searchable?: boolean
  /** 是否可导出 */
  exportable?: boolean
  /** 是否可导入 */
  importable?: boolean
  enabled?: boolean
  sort?: number
  /** DDL状态: 0待添加 1已添加 2待修改 3已修改 4待删除 5已删除 */
  status?: number
  remark?: string
}

/** 普通索引/唯一索引 */
export type FieldIndexType = 'NORMAL' | 'UNIQUE'

/** 页面模型字段索引（对应 cms_page_model_field_index） */
export interface PageModelFieldIndex {
  id: string
  siteId?: string
  modelId?: string
  /** 索引名 */
  indexName?: string
  /** 索引类型：普通 NORMAL / 唯一 UNIQUE */
  indexType?: FieldIndexType
  /** 索引字段 ID 列表（DB 逗号分隔，前端以数组读写） */
  fieldIds?: string[]
  /** DDL 状态：0待添加 1已添加 2待修改 3已修改 4待删除 5已删除 */
  status?: number
  remark?: string
}

export interface PageModel {
  id: string
  siteId?: string
  modelCode?: string
  /** 模型名称(表头) */
  modelLabel?: string
  modelName?: string
  modelType?: string
  enabled?: boolean
  status?: number
  remark?: string
  fields?: PageModelField[]
}

export interface NavGroup {
  id: string
  siteId?: string
  code?: string
  name?: string
  status: string
}

export interface Carousel {
  id: string
  siteId?: string
  title: string
  cover?: string
  description?: string
  linkUrl?: string
  sort?: number
  status: string
}
