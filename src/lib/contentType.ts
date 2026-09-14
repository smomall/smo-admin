import type { Component } from 'vue'
import { Image, Film, Music, FileText, Archive, File } from '@lucide/vue'

/**
 * 文件类型归类逻辑的共享字典配置。
 *
 * category 值（image/video/audio/text/archive/pdf/data/other）与字典
 * oss_file_type 的 item_value 完全一致，供各 OSS 页面复用，避免重复散落的 if 判断。
 */

/** content-type 关键字 → 字典类别（按顺序匹配，可同时命中 MIME 与已归类的类型值） */
const CATEGORY_RULES: { value: string; match: (t: string) => boolean }[] = [
  { value: 'image', match: (t) => t.includes('image') },
  { value: 'video', match: (t) => t.includes('video') },
  { value: 'audio', match: (t) => t.includes('audio') },
  { value: 'text', match: (t) => t.includes('text') || t.includes('markdown') },
  { value: 'archive', match: (t) => /zip|rar|tar|gzip|7z|compress/.test(t) },
  { value: 'pdf', match: (t) => t.includes('pdf') },
  { value: 'data', match: (t) => /json|xml|csv|yaml|yml/.test(t) },
]

/** 将 content-type（或已归类的类型值）统一归类为 oss_file_type 字典值 */
export function contentTypeToCategory(contentType?: string): string {
  if (!contentType) return 'other'
  const t = contentType.toLowerCase()
  return CATEGORY_RULES.find((r) => r.match(t))?.value ?? 'other'
}

/** 判断是否为图片类型 */
export function isImageFile(contentType?: string): boolean {
  return contentTypeToCategory(contentType) === 'image'
}

/** 字典类别 → lucide 图标组件 */
const ICON_BY_CATEGORY: Record<string, Component> = {
  image: Image,
  video: Film,
  audio: Music,
  text: FileText,
  pdf: FileText,
  archive: Archive,
  data: File,
  other: File,
}

/** 根据文件类型/内容类型解析展示图标 */
export function getFileTypeIcon(contentType?: string): Component {
  return ICON_BY_CATEGORY[contentTypeToCategory(contentType)] ?? File
}