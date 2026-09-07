/**
 * 字典类型编码常量。
 *
 * 所有字典编码集中在此处管理，避免业务代码中散落裸字符串。
 * 新增字典类型时，请在此处补充对应的常量，并保持命名与后端 DictType.code 一致。
 *
 * 使用方式：
 *   import { DICT } from '@/constants/dict'
 *   const { items } = useDict(DICT.COMMON_STATUS)
 */

export const DICT = {
  // ========== 通用 ==========
  COMMON_STATUS: 'common_status',
  COMMON_LOCALE: 'common_locale',
  BOOLEAN_STATUS: 'boolean_status',

  // ========== 用户 ==========
  USER_STATUS: 'user_status',
  USER_GENDER: 'user_gender',

  // ========== 角色 / 权限 ==========
  ROLE_TYPE: 'role_type',
  PERMISSION_MODULE: 'permission_module',
  PERMISSION_FUNCTION: 'permission_function',
  PERMISSION_TYPE: 'permission_type',
  HTTP_METHOD: 'http_method',

  // ========== 菜单 ==========
  MENU_TYPE: 'menu_type',

  // ========== 通知 / 公告 ==========
  NOTICE_TYPE: 'notice_type',
  NOTICE_LEVEL: 'notice_level',

  // ========== 日志 ==========
  OPERATION_TYPE: 'operation_type',
  OPERATION_STATUS: 'operation_status',
  LOGIN_STATUS: 'login_status',
  LOGIN_DEVICE: 'login_device',
  LOGIN_TYPE: 'login_type',

  // ========== CMS 内容 ==========
  PUBLISH_STATUS: 'publish_status',
  CONTENT_TYPE: 'content_type',
  COMMENT_STATUS: 'comment_status',
  COMMENT_BIZ_TYPE: 'comment_biz_type',
  COMMENT_SORT: 'comment_sort',

  // ========== CMS 页面 ==========
  PAGE_TYPE: 'page_type',

  // ========== CMS 页面模型 ==========
  CMS_MODEL_TYPE: 'cms_model_type',
  CMS_FIELD_TYPE: 'cms_field_type',
  CMS_ADMIN_COMPONENT: 'cms_admin_component',

  // ========== CMS 导航 ==========
  OPEN_TARGET: 'open_target',

  // ========== CMS 任务 ==========
  JOB_STATUS: 'job_status',

  // ========== CMS 邮件 ==========
  EMAIL_PROTOCOL: 'email_protocol',

  // ========== 配置 ==========
  CONFIG_TYPE: 'config_type',
} as const

export type DictTypeCode = (typeof DICT)[keyof typeof DICT]
