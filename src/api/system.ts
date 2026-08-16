import type {
  User,
  UserProfile,
  UserAddress,
  Role,
  Menu,
  Permission,
  Organization,
  Post,
  DictType,
  DictItem,
  DictSelectResult,
  ConfigType,
  ConfigItem,
  Notice,
  OperationLog,
  LoginLog,
  LoginUser,
  LoginResponse,
  PageResult,
} from '@/types'
import { useRequest } from '@/composables/useRequest'
import { buildQuery } from './query'

// ================================================
// 用户管理 API
// ================================================
export const userApi = {
  // 登录（tenant 对应后端 LoginRequest#tenant，必填；默认可填 'default'，后续页面自行替换）
  login: (username: string, password: string, tenant: string = 'default') => {
    return useRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tenant, username, password }),
    }).json()
  },

  // OTT发送验证码
  ottSend: (username: string) => {
    return useRequest<{ success: boolean; message: string }>(
      `/auth/ott/send?username=${username}`,
      {
        method: 'POST',
      },
    ).json()
  },

  // OTT验证登录
  ottVerify: (token: string) => {
    return useRequest<LoginResponse>(`/auth/ott/verify?token=${token}`, {
      method: 'POST',
    }).json()
  },

  // 获取当前登录用户信息
  getInfo: () => {
    return useRequest<LoginUser>('/user/info').json()
  },

  // 获取用户列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    username?: string
    nickname?: string
    status?: string
    organizationId?: string
  }) => {
    return useRequest<PageResult<User>>(`/users/page${buildQuery(params)}`).json()
  },

  getAll: () => {
    return useRequest<User[]>('/users').json()
  },

  getById: (id: string) => {
    return useRequest<User>(`/users/${id}`).json()
  },

  create: (data: Partial<User>) => {
    return useRequest('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<User>) => {
    return useRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/users/${id}`, { method: 'DELETE' }).json()
  },

  batchDelete: (ids: string[]) => {
    return useRequest('/users/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }).json()
  },

  resetPassword: (id: string, password: string) => {
    return useRequest(`/users/${id}/password`, {
      method: 'PATCH', // 后端 @PatchMapping /users/{id}/password
      body: JSON.stringify({ password }),
    }).json()
  },

  assignRoles: (id: string, roleIds: string[]) => {
    return useRequest(`/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleIds }),
    }).json()
  },

  getRoleIds: (id: string) => {
    return useRequest<string[]>(`/users/${id}/roles`).json()
  },

  getProfile: (id: string) => {
    return useRequest<UserProfile>(`/users/${id}/profile`).json()
  },

  updateProfile: (id: string, data: Partial<UserProfile>) => {
    return useRequest(`/users/${id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  getAddress: (id: string) => {
    return useRequest<UserAddress>(`/users/${id}/address`).json()
  },

  updateAddress: (id: string, data: Partial<UserAddress>) => {
    return useRequest(`/users/${id}/address`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },
}

// ================================================
// 角色管理 API
// ================================================
export const roleApi = {
  // 获取角色列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    name?: string
    code?: string
    status?: string
  }) => {
    return useRequest<PageResult<Role>>(`/roles/page${buildQuery(params)}`).json()
  },

  getAll: () => {
    return useRequest<Role[]>('/roles').json()
  },

  getById: (id: string) => {
    return useRequest<Role>(`/roles/${id}`).json()
  },

  create: (data: Partial<Role>) => {
    return useRequest('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Role>) => {
    return useRequest(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/roles/${id}`, { method: 'DELETE' }).json()
  },

  assignPermissions: (id: string, permissionIds: string[]) => {
    return useRequest(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    }).json()
  },

  getPermissionIds: (id: string) => {
    return useRequest<string[]>(`/roles/${id}/permissions`).json()
  },

  assignMenus: (id: string, menuIds: string[]) => {
    return useRequest(`/roles/${id}/menus`, {
      method: 'PUT',
      body: JSON.stringify({ menuIds }),
    }).json()
  },

  getMenuIds: (id: string) => {
    return useRequest<string[]>(`/roles/${id}/menus`).json()
  },

  getOrganizationIds: (id: string) => {
    return useRequest<string[]>(`/roles/${id}/organizations`).json()
  },

  assignOrganizations: (id: string, organizationIds: string[]) => {
    return useRequest(`/roles/${id}/organizations`, {
      method: 'PUT',
      body: JSON.stringify({ organizationIds }),
    }).json()
  },
}

// ================================================
// 菜单管理 API
// ================================================
export const menuApi = {
  list: () => {
    return useRequest<Menu[]>('/menus').json()
  },

  tree: () => {
    return useRequest<Menu[]>('/menus/tree').json()
  },

  getById: (id: string) => {
    return useRequest<Menu>(`/menus/${id}`).json()
  },

  create: (data: Partial<Menu>) => {
    return useRequest('/menus', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Menu>) => {
    return useRequest(`/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  sort: (menus: Menu[]) => {
    return useRequest('/menus/sort', {
      method: 'PUT',
      body: JSON.stringify(menus),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/menus/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 权限管理 API
// ================================================
export const permissionApi = {
  list: () => {
    return useRequest<Permission[]>('/permissions').json()
  },

  page: (params: {
    pageNumber: number
    pageSize: number
    moduleId?: string
    functionId?: string
    httpMethod?: string
    name?: string
    code?: string
    status?: string
  }) => {
    return useRequest<PageResult<Permission>>(`/permissions/page${buildQuery(params)}`).json()
  },

  tree: () => {
    return useRequest<Permission[]>('/permissions/tree').json()
  },

  getById: (id: string) => {
    return useRequest<Permission>(`/permissions/${id}`).json()
  },

  create: (data: Partial<Permission>) => {
    return useRequest('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Permission>) => {
    return useRequest(`/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/permissions/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 组织管理 API
// ================================================
export const organizationApi = {
  list: () => {
    return useRequest<Organization[]>('/organizations').json()
  },

  tree: () => {
    return useRequest<Organization[]>('/organizations/tree').json()
  },

  getById: (id: string) => {
    return useRequest<Organization>(`/organizations/${id}`).json()
  },

  create: (data: Partial<Organization>) => {
    return useRequest('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Organization>) => {
    return useRequest(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/organizations/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 岗位管理 API
// ================================================
export const postApi = {
  // 获取岗位列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    name?: string
    code?: string
    organizationId?: string
    status?: string
  }) => {
    return useRequest<PageResult<Post>>(`/posts/page${buildQuery(params)}`).json()
  },

  getAll: () => {
    return useRequest<Post[]>('/posts').json()
  },

  getById: (id: string) => {
    return useRequest<Post>(`/posts/${id}`).json()
  },

  create: (data: Partial<Post>) => {
    return useRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Post>) => {
    return useRequest(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/posts/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 字典管理 API
// ================================================
export const dictApi = {
  // 字典类型列表（分页）
  typeList: (params?: {
    pageNumber?: number
    pageSize?: number
    name?: string
    code?: string
    status?: string
  }) => {
    return useRequest<PageResult<DictType>>(`/dict/types/page${buildQuery(params)}`).json()
  },

  typeGetById: (id: string) => {
    return useRequest<DictType>(`/dict/types/${id}`).json()
  },

  typeCreate: (data: Partial<DictType>) => {
    return useRequest('/dict/types', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  typeUpdate: (id: string, data: Partial<DictType>) => {
    return useRequest(`/dict/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  typeDelete: (id: string) => {
    return useRequest(`/dict/types/${id}`, { method: 'DELETE' }).json()
  },

  // 字典项列表（分页）
  itemList: (
    dictTypeId: string,
    params?: { pageNumber?: number; pageSize?: number; label?: string; status?: string },
  ) => {
    return useRequest<PageResult<DictItem>>(
      `/dict/items/page${buildQuery({ ...params, dictTypeId })}`,
    ).json()
  },

  itemCreate: (dictTypeId: string, data: Partial<DictItem>) => {
    return useRequest('/dict/items', {
      method: 'POST',
      body: JSON.stringify({ ...data, dictTypeId }),
    }).json()
  },

  itemUpdate: (dictTypeId: string, id: string, data: Partial<DictItem>) => {
    return useRequest(`/dict/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  itemDelete: (dictTypeId: string, id: string) => {
    return useRequest(`/dict/items/${id}`, { method: 'DELETE' }).json()
  },

  select: (dictTypeCode: string) => {
    return useRequest<DictSelectResult>(`/dict/select/${dictTypeCode}`).json()
  },
}

// ================================================
// 配置管理 API
// ================================================
export const configApi = {
  // 配置类型列表（分页）
  typeList: (params?: {
    pageNumber?: number
    pageSize?: number
    name?: string
    code?: string
    status?: string
  }) => {
    return useRequest<PageResult<ConfigType>>(`/config/types/page${buildQuery(params)}`).json()
  },

  typeGetById: (id: string) => {
    return useRequest<ConfigType>(`/config/types/${id}`).json()
  },

  typeCreate: (data: Partial<ConfigType>) => {
    return useRequest('/config/types', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  typeUpdate: (id: string, data: Partial<ConfigType>) => {
    return useRequest(`/config/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  typeDelete: (id: string) => {
    return useRequest(`/config/types/${id}`, { method: 'DELETE' }).json()
  },

  // 配置项列表（分页）
  itemList: (
    configTypeId: string,
    params?: { pageNumber?: number; pageSize?: number; label?: string; status?: string },
  ) => {
    return useRequest<PageResult<ConfigItem>>(
      `/config/items/page${buildQuery({ ...params, configTypeId })}`,
    ).json()
  },

  itemCreate: (configTypeId: string, data: Partial<ConfigItem>) => {
    return useRequest('/config/items', {
      method: 'POST',
      body: JSON.stringify({ ...data, configTypeId }),
    }).json()
  },

  itemUpdate: (configTypeId: string, id: string, data: Partial<ConfigItem>) => {
    return useRequest(`/config/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  itemDelete: (configTypeId: string, id: string) => {
    return useRequest(`/config/items/${id}`, { method: 'DELETE' }).json()
  },
}

// ================================================
// 通知管理 API
// ================================================
export const noticeApi = {
  // 获取通知列表（分页）
  list: (params?: {
    pageNumber?: number
    pageSize?: number
    title?: string
    type?: string | number
    importance?: string | number
    status?: string | number
  }) => {
    return useRequest<PageResult<Notice>>(`/notices/page${buildQuery(params)}`).json()
  },

  getById: (id: string) => {
    return useRequest<Notice>(`/notices/${id}`).json()
  },

  create: (data: Partial<Notice>) => {
    return useRequest('/notices', {
      method: 'POST',
      body: JSON.stringify(data),
    }).json()
  },

  update: (id: string, data: Partial<Notice>) => {
    return useRequest(`/notices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).json()
  },

  delete: (id: string) => {
    return useRequest(`/notices/${id}`, { method: 'DELETE' }).json()
  },

  publish: (id: string) => {
    return useRequest(`/notices/${id}/publish`, { method: 'PUT' }).json()
  },

  unpublish: (id: string) => {
    return useRequest(`/notices/${id}/unpublish`, { method: 'PUT' }).json()
  },
}

// ================================================
// 个人通知中心 API（公告 + 通知）
// ================================================
export const notificationApi = {
  // 公告列表（分页）
  announcementPage: (params?: { pageNumber?: number; pageSize?: number }) => {
    return useRequest<PageResult<Notice>>(
      `/notifications/announcements${buildQuery(params)}`,
    ).json()
  },

  // 公告 - 标记全部已读（打开公告时自动调用）
  announcementsReadAll: () => {
    return useRequest('/notifications/announcements/read/all', { method: 'PUT' }).json()
  },

  // 公告未读标识（用于公告 tab 显示小红点，不混入顶部总红点）
  announcementUnreadFlag: () => {
    return useRequest<boolean>('/notifications/announcements/unread/flag').json()
  },

  // 个人通知列表（分页）
  noticePage: (params?: { pageNumber?: number; pageSize?: number }) => {
    return useRequest<PageResult<Notice>>(`/notifications/notices${buildQuery(params)}`).json()
  },

  // 个人通知 - 标记单条已读（手动确认点击）
  noticeRead: (id: string) => {
    return useRequest(`/notifications/notices/${id}/read`, { method: 'PUT' }).json()
  },

  // 个人通知 - 标记全部已读
  noticesReadAll: () => {
    return useRequest('/notifications/notices/read/all', { method: 'PUT' }).json()
  },

  // 个人通知未读数（顶部总红点 = 只统计这个）
  noticeUnreadCount: () => {
    return useRequest<number>('/notifications/notices/unread/count').json()
  },
}

// ================================================
// 仪表盘统计 API（对应后端 StatisticsController）
// 后端：com.kongjs.smo.system.controller.api.statistics.StatisticsController
// 类级 @RequestMapping("statistics")，4 个 GET 接口直接返回 R<Long>
// ================================================
export const statisticsApi = {
  // 用户总数 → GET /statistics/user/count
  userCount: () => {
    return useRequest<number>('/statistics/user/count').json()
  },

  // 角色总数 → GET /statistics/role/count
  roleCount: () => {
    return useRequest<number>('/statistics/role/count').json()
  },

  // 权限总数 → GET /statistics/permission/count
  permissionCount: () => {
    return useRequest<number>('/statistics/permission/count').json()
  },

  // 菜单总数 → GET /statistics/menu/count
  menuCount: () => {
    return useRequest<number>('/statistics/menu/count').json()
  },
}

// ================================================
// 日志管理 API
// ================================================
export const logApi = {
  operationList: (params?: {
    pageNumber?: number
    pageSize?: number
    userId?: string
    username?: string
    moduleName?: string
    functionName?: string
    operationType?: string
    startAt?: string
    endAt?: string
    status?: string
  }) => {
    return useRequest<PageResult<OperationLog>>(`/logs/operation/page${buildQuery(params)}`).json()
  },

  operationGetById: (id: string) => {
    return useRequest<OperationLog>(`/logs/operation/${id}`).json()
  },

  operationDelete: (id: string) => {
    return useRequest(`/logs/operation/${id}`, { method: 'DELETE' }).json()
  },

  operationClear: () => {
    return useRequest('/logs/operation/clear', { method: 'DELETE' }).json()
  },

  loginList: (params?: {
    pageNumber?: number
    pageSize?: number
    loginType?: number
    userId?: string
    username?: string
    startAt?: string
    endAt?: string
    status?: string
  }) => {
    return useRequest<PageResult<LoginLog>>(`/logs/login/page${buildQuery(params)}`).json()
  },

  loginGetById: (id: string) => {
    return useRequest<LoginLog>(`/logs/login/${id}`).json()
  },

  loginDelete: (id: string) => {
    return useRequest(`/logs/login/${id}`, { method: 'DELETE' }).json()
  },

  loginClear: () => {
    return useRequest('/logs/login/clear', { method: 'DELETE' }).json()
  },
}
