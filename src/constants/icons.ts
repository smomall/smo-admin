/**
 * 菜单/侧边栏图标映射。
 *
 * 将图标名称字符串映射到 lucide 图标组件，集中管理便于查找和替换。
 * 新增图标类型时只需在此处补充。
 */

import {
  LayoutDashboard,
  Users,
  Shield,
  UserCog,
  Menu,
  Settings,
  BookOpen,
  FileText,
  Tag,
  FolderTree,
  MessageSquare,
  Globe,
  Layers,
  LayoutTemplate,
  Database,
  Clock,
  Mail,
  HardDrive,
  Palette,
  Image,
  Bell,
  ClipboardList,
  History,
  LogIn,
  Bot,
  Brain,
  MessageCircle,
  BookMarked,
  Sparkles,
} from '@lucide/vue'
import type { Component } from 'vue'

export const iconMap: Record<string, Component> = {
  // 仪表盘
  dashboard: LayoutDashboard,

  // 系统管理
  users: Users,
  roles: Shield,
  permissions: UserCog,
  menus: Menu,
  organizations: FolderTree,
  posts: ClipboardList,
  'dict-types': Settings,
  configs: Settings,
  notices: Bell,
  'operation-logs': History,
  'login-logs': LogIn,

  // CMS 内容管理
  articles: FileText,
  categories: FolderTree,
  tags: Tag,
  comments: MessageSquare,

  // CMS 页面管理
  pages: LayoutTemplate,
  'page-models': Database,
  'nav-groups': Menu,
  navs: Menu,

  // CMS 站点
  sites: Globe,
  carousels: Image,

  // CMS 任务/邮件/OSS
  jobs: Clock,
  'job-logs': Clock,
  emails: Mail,
  'oss-buckets': HardDrive,
  'oss-files': HardDrive,

  // CMS 笔记/文档
  notes: BookMarked,

  // AI
  'ai-models': Brain,
  'ai-agents': Bot,
  'ai-assistants': MessageCircle,
  'ai-knowledge': BookOpen,
  'ai-sessions': MessageSquare,

  // 其他
  settings: Settings,
  palette: Palette,
  sparkles: Sparkles,
  layers: Layers,
}

/**
 * 根据图标名称获取图标组件。
 * 找不到时返回 null，调用方需做兜底显示。
 */
export function getIcon(name: string | undefined): Component | null {
  if (!name) return null
  return iconMap[name] || null
}
