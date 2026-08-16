/**
 * 导航项链接类型枚举（前端枚举，不使用字典）。
 *
 * 与后端 com.kongjs.smo.cms.enums.LinkTypeEnum 保持一致。
 */
export const LINK_TYPE = {
  CATEGORY: 'CATEGORY',
  TAG: 'TAG',
  PAGE: 'PAGE',
  ARTICLE: 'ARTICLE',
  NOTE: 'NOTE',
  URL: 'URL',
} as const

export type LinkType = (typeof LINK_TYPE)[keyof typeof LINK_TYPE]

export interface LinkTypeOption {
  value: LinkType
  label: string
  /** 列表标签样式（Tailwind 类） */
  color: string
}

export const LINK_TYPE_OPTIONS: LinkTypeOption[] = [
  { value: LINK_TYPE.CATEGORY, label: '分类', color: 'bg-blue-50 text-blue-600' },
  { value: LINK_TYPE.TAG, label: '标签', color: 'bg-purple-50 text-purple-600' },
  { value: LINK_TYPE.PAGE, label: '页面', color: 'bg-cyan-50 text-cyan-600' },
  { value: LINK_TYPE.ARTICLE, label: '文章', color: 'bg-amber-50 text-amber-600' },
  { value: LINK_TYPE.NOTE, label: '笔记', color: 'bg-emerald-50 text-emerald-600' },
  { value: LINK_TYPE.URL, label: 'URL', color: 'bg-green-50 text-green-600' },
]

const LINK_TYPE_LABEL_MAP: Record<string, string> = LINK_TYPE_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.label
    return acc
  },
  {} as Record<string, string>,
)

const LINK_TYPE_COLOR_MAP: Record<string, string> = LINK_TYPE_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.value] = opt.color
    return acc
  },
  {} as Record<string, string>,
)

/** 获取链接类型中文标签 */
export function getLinkTypeLabel(value: string | undefined): string {
  if (!value) return '-'
  return LINK_TYPE_LABEL_MAP[value] || value
}

/** 获取链接类型标签样式 */
export function getLinkTypeColor(value: string | undefined): string {
  if (!value) return 'bg-secondary text-secondary-foreground'
  return LINK_TYPE_COLOR_MAP[value] || 'bg-secondary text-secondary-foreground'
}
