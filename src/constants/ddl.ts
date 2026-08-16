export const DDL_FIELD_STATUS = {
  PENDING_ADD: 0,
  ADDED: 1,
  PENDING_MODIFY: 2,
  MODIFIED: 3,
  PENDING_DELETE: 4,
  DELETED: 5,
} as const

export type DdlFieldStatus = (typeof DDL_FIELD_STATUS)[keyof typeof DDL_FIELD_STATUS]

export const DDL_FIELD_STATUS_OPTIONS: { value: DdlFieldStatus; label: string; color: string }[] = [
  { value: DDL_FIELD_STATUS.PENDING_ADD, label: '待添加', color: 'bg-amber-100 text-amber-700' },
  { value: DDL_FIELD_STATUS.ADDED, label: '已添加', color: 'bg-green-100 text-green-700' },
  {
    value: DDL_FIELD_STATUS.PENDING_MODIFY,
    label: '待修改',
    color: 'bg-orange-100 text-orange-700',
  },
  { value: DDL_FIELD_STATUS.MODIFIED, label: '已修改', color: 'bg-emerald-100 text-emerald-700' },
  { value: DDL_FIELD_STATUS.PENDING_DELETE, label: '待删除', color: 'bg-red-100 text-red-700' },
  { value: DDL_FIELD_STATUS.DELETED, label: '已删除', color: 'bg-gray-100 text-gray-500' },
]

// 字典类型编码
export const DICT_TYPE = {
  MODEL_TYPE: 'cms_model_type',
  FIELD_TYPE: 'cms_field_type',
  COMPONENT: 'cms_component',
  INDEX_TYPE: 'cms_field_index_type',
} as const

// 组件与字段类型的兼容映射（用于选择字段类型后过滤可用组件）
// 字段类型编码对齐 FieldTypeEnum
export const COMPONENT_FIELD_TYPE_MAP: Record<string, string[]> = {
  INPUT: [
    'VARCHAR',
    'TEXT',
    'SMALLINT',
    'INTEGER',
    'BIGINT',
    'FLOAT',
    'DOUBLE',
    'DECIMAL',
    'NUMERIC',
  ],
  TEXTAREA: ['VARCHAR', 'TEXT'],
  SELECT: ['VARCHAR', 'TEXT', 'SMALLINT', 'INTEGER', 'BIGINT'],
  RADIO: ['VARCHAR', 'SMALLINT', 'INTEGER', 'BOOLEAN'],
  CHECKBOX: ['TEXT', 'INTEGER', 'BIGINT'],
  DATE_PICKER: ['DATE', 'DATETIME', 'DATETIME_TZ'],
  DATETIME_PICKER: ['DATETIME', 'DATETIME_TZ'],
  NUMBER_INPUT: ['SMALLINT', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC'],
  SWITCH: ['BOOLEAN'],
  SLIDER: ['SMALLINT', 'INTEGER', 'DECIMAL', 'NUMERIC', 'FLOAT'],
  UPLOAD: ['VARCHAR', 'TEXT'],
  RICHTEXT: ['TEXT'],
  MARKDOWN: ['TEXT'],
  CODE_EDITOR: ['TEXT'],
  COLOR_PICKER: ['VARCHAR'],
}

export function getCompatibleComponents(
  fieldType: string | undefined,
  allComponents: { value: string }[],
): { value: string }[] {
  if (!fieldType) return allComponents
  const compatible = COMPONENT_FIELD_TYPE_MAP[fieldType]
  if (!compatible) return allComponents
  return allComponents.filter((c) => compatible.includes(c.value))
}
