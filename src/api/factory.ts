import type { PageResult } from '@/types'
import { useRequest } from '@/composables/useRequest'
import { buildQuery } from './query'
import type { QueryValue } from './query'

/**
 * 标准 CRUD API 工厂函数。
 *
 * 为遵循 RESTful 约定的资源自动生成 list / getAll / getById / create / update / delete
 * 六个标准方法，消除各 API 对象中大量重复的样板代码。
 *
 * 使用方式：
 *   const userApi = {
 *     ...createCrudApi<User>('/users'),
 *     // 自定义方法写在这里
 *     login: (...) => { ... }
 *   }
 *
 * 后端约定：
 *   GET    /resource/page       → PageResult<T>  分页列表
 *   GET    /resource            → T[]            全量列表
 *   GET    /resource/{id}       → T              单条详情
 *   POST   /resource            → T              新增
 *   PUT    /resource/{id}       → T              修改
 *   DELETE /resource/{id}       → void           删除
 */
export interface CrudApi<T, P extends Record<string, QueryValue> = Record<string, QueryValue>> {
  /** 分页查询 */
  list: (params?: P & { pageNumber?: number; pageSize?: number }) => PromiseLike<{
    data: { value: PageResult<T> | null }
  }>
  /** 全量列表 */
  getAll: () => PromiseLike<{ data: { value: T[] | null } }>
  /** 单条详情 */
  getById: (id: string) => PromiseLike<{ data: { value: T | null } }>
  /** 新增 */
  create: (data: Partial<T>) => PromiseLike<{ data: { value: unknown } }>
  /** 修改 */
  update: (id: string, data: Partial<T>) => PromiseLike<{ data: { value: unknown } }>
  /** 删除 */
  delete: (id: string) => PromiseLike<{ data: { value: unknown } }>
}

export function createCrudApi<T, P extends Record<string, QueryValue> = Record<string, QueryValue>>(
  basePath: string,
): CrudApi<T, P> {
  return {
    list: (params?) => {
      return useRequest<PageResult<T>>(`${basePath}/page${buildQuery(params)}`).json()
    },

    getAll: () => {
      return useRequest<T[]>(basePath).json()
    },

    getById: (id: string) => {
      return useRequest<T>(`${basePath}/${id}`).json()
    },

    create: (data: Partial<T>) => {
      return useRequest(basePath, {
        method: 'POST',
        body: JSON.stringify(data),
      }).json()
    },

    update: (id: string, data: Partial<T>) => {
      return useRequest(`${basePath}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).json()
    },

    delete: (id: string) => {
      return useRequest(`${basePath}/${id}`, { method: 'DELETE' }).json()
    },
  }
}

/**
 * 树形资源 API 工厂（比基础 CRUD 多一个 tree 方法）。
 */
export interface TreeCrudApi<T, P extends Record<string, QueryValue> = Record<string, QueryValue>>
  extends CrudApi<T, P> {
  tree: (params?: Record<string, QueryValue>) => PromiseLike<{ data: { value: T[] | null } }>
}

export function createTreeCrudApi<
  T,
  P extends Record<string, QueryValue> = Record<string, QueryValue>,
>(basePath: string): TreeCrudApi<T, P> {
  return {
    ...createCrudApi<T, P>(basePath),
    tree: (params?) => {
      return useRequest<T[]>(`${basePath}/tree${buildQuery(params)}`).json()
    },
  }
}
