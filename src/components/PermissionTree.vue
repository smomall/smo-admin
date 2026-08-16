<script setup lang="ts">
import { ref, onMounted, h, type VNode } from 'vue'
import { Key, ChevronRight } from '@lucide/vue'
import type { Permission } from '@/types'
import { permissionApi } from '@/api'
import TreeGuides from './TreeGuides.vue'

withDefaults(
  defineProps<{
    modelValue?: string
  }>(),
  {},
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const permissions = ref<Permission[]>([])
const expandedIds = ref<Set<string>>(new Set())

async function fetchPermissions() {
  const { data } = await permissionApi.tree()
  if (data.value) {
    permissions.value = data.value
  }
}

onMounted(() => {
  fetchPermissions()
})

defineExpose({
  fetchPermissions,
})

function handleClear() {
  emit('update:modelValue', undefined)
}

function toggleExpand(id: string) {
  const newSet = new Set(expandedIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedIds.value = newSet
}

function renderNode(
  perm: Permission,
  level: number,
  modelValue: string | undefined,
  expanded: Set<string>,
): VNode {
  const hasChildren = !!(perm.children && perm.children.length > 0)
  const isExpanded = expanded.has(perm.id)
  const selected = modelValue === perm.id

  function handleSelect() {
    if (selected) {
      emit('update:modelValue', undefined)
    } else {
      emit('update:modelValue', perm.id)
    }
  }

  function handleToggle(e: Event) {
    e.stopPropagation()
    toggleExpand(perm.id)
  }

  return h('div', null, [
    h('div', { class: 'flex h-8 items-stretch gap-1 px-1.5' }, [
      hasChildren
        ? h(
            'button',
            {
              type: 'button',
              class:
                'w-5 h-8 flex items-center justify-center rounded hover:bg-muted text-muted-foreground shrink-0',
              onClick: handleToggle,
            },
            [
              h(ChevronRight, {
                class: `w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`,
              }),
            ],
          )
        : h('span', { class: 'w-5 shrink-0' }),
      h(TreeGuides, { level }),
      h(
        'button',
        {
          type: 'button',
          class: `flex-1 min-w-0 flex items-center gap-2 px-1.5 rounded text-sm transition-colors ${
            selected ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'
          }`,
          onClick: handleSelect,
        },
        [
          h(Key, { class: 'w-3.5 h-3.5 shrink-0' }),
          h('span', { class: 'flex-1 truncate text-left' }, perm.name),
          perm.code
            ? h('span', { class: 'text-xs text-muted-foreground shrink-0' }, perm.code)
            : null,
        ],
      ),
    ]),
    hasChildren && isExpanded
      ? h(
          'div',
          null,
          perm.children!.map((child: Permission) =>
            renderNode(child, level + 1, modelValue, expanded),
          ),
        )
      : null,
  ])
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between px-2">
      <span class="text-sm font-medium text-muted-foreground">权限</span>
      <button
        v-if="modelValue"
        type="button"
        class="text-xs text-muted-foreground hover:text-foreground"
        @click="handleClear"
      >
        清除
      </button>
    </div>
    <div class="border rounded-lg bg-card p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div>
        <button
          type="button"
          class="w-full flex h-8 items-center gap-2 px-2 rounded text-sm transition-colors"
          :class="!modelValue ? 'bg-muted text-primary' : 'text-foreground hover:bg-muted'"
          @click="handleClear"
        >
          <Key class="w-3.5 h-3.5 flex-shrink-0" />
          <span>全部权限</span>
        </button>
        <component
          v-for="perm in permissions"
          :key="perm.id"
          :is="() => renderNode(perm, 0, modelValue, expandedIds)"
        />
      </div>
    </div>
  </div>
</template>
