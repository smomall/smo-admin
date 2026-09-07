<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDict } from '@/composables/useDict'
import { DICT } from '@/constants/dict'
import { userApi, roleApi } from '@/api/system'
import type { Role } from '@/types'

const props = defineProps<{
  open: boolean
  userId?: string
  username?: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  success: []
}>()

const { getLabel: getRoleStatusLabel } = useDict(DICT.COMMON_STATUS)

const allRoles = ref<Role[]>([])
const selectedRoleIds = ref<string[]>([])
const searchKeyword = ref('')
const submitting = ref(false)

// 前端分页
const rolePageSize = 20
const rolePageNum = ref(1)

const filteredRoles = computed(() => {
  if (!searchKeyword.value) return allRoles.value
  const kw = searchKeyword.value.toLowerCase()
  return allRoles.value.filter(
    (r) => r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw),
  )
})

const pagedRoles = computed(() => {
  const start = (rolePageNum.value - 1) * rolePageSize
  return filteredRoles.value.slice(start, start + rolePageSize)
})

const totalRoles = computed(() => filteredRoles.value.length)
const totalPages = computed(() => Math.ceil(totalRoles.value / rolePageSize))

const selectedCount = computed(() => selectedRoleIds.value.length)

async function loadRoles() {
  const { data } = await roleApi.getAll()
  allRoles.value = data.value || []
}

async function loadAssignedRoles(userId: string) {
  const { data } = await userApi.getRoleIds(userId)
  selectedRoleIds.value = data.value || []
}

function handleSearch() {
  rolePageNum.value = 1
}

function toggleRole(roleId: string) {
  const idx = selectedRoleIds.value.indexOf(roleId)
  if (idx >= 0) {
    selectedRoleIds.value.splice(idx, 1)
  } else {
    selectedRoleIds.value.push(roleId)
  }
}

function isSelected(roleId: string) {
  return selectedRoleIds.value.includes(roleId)
}

async function handleSubmit() {
  if (!props.userId) return
  submitting.value = true
  try {
    await userApi.assignRoles(props.userId, selectedRoleIds.value)
    emit('success')
    emit('update:open', false)
  } catch {
    // useRequest 已统一处理错误提示
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val && props.userId) {
      searchKeyword.value = ''
      rolePageNum.value = 1
      loadRoles().then(() => loadAssignedRoles(props.userId!))
    }
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>分配角色 - {{ username }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Input
            v-model="searchKeyword"
            placeholder="搜索角色名称/编码"
            class="flex-1"
            @input="handleSearch"
          />
          <span class="text-sm text-muted-foreground whitespace-nowrap">
            已选 {{ selectedCount }} 个
          </span>
        </div>

        <div class="border rounded-md max-h-[360px] overflow-y-auto">
          <div class="divide-y">
            <div
              v-for="role in pagedRoles"
              :key="role.id"
              class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer"
              @click="toggleRole(role.id)"
            >
              <input
                type="checkbox"
                :checked="isSelected(role.id)"
                class="h-4 w-4"
                @click.stop
              />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ role.name }}</div>
                <div class="text-xs text-muted-foreground">{{ role.code }}</div>
              </div>
              <span class="text-xs text-muted-foreground">
                {{ getRoleStatusLabel(String(role.status)) }}
              </span>
            </div>
            <div v-if="!pagedRoles.length" class="text-center text-muted-foreground py-8 text-sm">
              暂无数据
            </div>
          </div>
        </div>

        <!-- 前端分页 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="rolePageNum <= 1"
            @click="rolePageNum--"
          >
            上一页
          </Button>
          <span class="text-sm text-muted-foreground px-3">
            第 {{ rolePageNum }} / {{ totalPages }} 页，共 {{ totalRoles }} 条
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="rolePageNum >= totalPages"
            @click="rolePageNum++"
          >
            下一页
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button @click="handleSubmit" :disabled="submitting">
          {{ submitting ? '提交中...' : '确定' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
