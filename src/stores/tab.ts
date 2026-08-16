import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { TabItem, Menu } from '../types'

export const useTabStore = defineStore('tab', () => {
  const tabs = ref<TabItem[]>([])
  const activeTabId = ref<string>('')
  const initialized = ref(false)

  function initFixedTabs(menuList: Menu[]) {
    if (initialized.value) return

    const affixMenus: Menu[] = []

    function collectAffix(list: Menu[]) {
      list.forEach((menu) => {
        if (menu.type === 'm' && menu.affix && menu.path) {
          affixMenus.push(menu)
        }
        if (menu.children) {
          collectAffix(menu.children)
        }
      })
    }

    collectAffix(menuList)

    affixMenus
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .forEach((menu, index) => {
        tabs.value.push({
          id: `tab-fixed-${index}`,
          label: menu.name,
          path: menu.path,
          icon: menu.icon,
          closable: false,
          external: menu.external,
        })
      })

    if (tabs.value.length > 0) {
      activeTabId.value = tabs.value[0]!.id
    }

    initialized.value = true
  }

  function addTab(tab: Omit<TabItem, 'id'>) {
    const exists = tabs.value.find((t) => t.path === tab.path)
    if (!exists) {
      const newTab: TabItem = {
        ...tab,
        id: `tab-${Date.now()}`,
      }
      tabs.value.push(newTab)
      activeTabId.value = newTab.id
    } else {
      activeTabId.value = exists.id
    }
  }

  function removeTab(id: string) {
    const index = tabs.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      const tab = tabs.value[index]!
      if (!tab.closable) return
      const isActive = tab.id === activeTabId.value
      tabs.value.splice(index, 1)

      if (isActive && tabs.value.length > 0) {
        const newIndex = index > 0 ? index - 1 : 0
        activeTabId.value = tabs.value[newIndex]!.id
      } else if (tabs.value.length === 0) {
        activeTabId.value = ''
      }
    }
  }

  function setActiveTab(id: string) {
    activeTabId.value = id
  }

  function closeOtherTabs(keepId: string) {
    tabs.value = tabs.value.filter((t) => t.id === keepId || !t.closable)
    activeTabId.value = keepId
  }

  function closeAllTabs() {
    tabs.value = tabs.value.filter((t) => !t.closable)
    activeTabId.value = tabs.value[0]?.id || ''
  }

  function closeLeftTabs(keepId: string) {
    const index = tabs.value.findIndex((t) => t.id === keepId)
    if (index !== -1) {
      tabs.value = tabs.value.filter((t, i) => i >= index || !t.closable)
      activeTabId.value = keepId
    }
  }

  function closeRightTabs(keepId: string) {
    const index = tabs.value.findIndex((t) => t.id === keepId)
    if (index !== -1) {
      tabs.value = tabs.value.filter((t, i) => i <= index || !t.closable)
      activeTabId.value = keepId
    }
  }

  const activeTab = computed(() => {
    return tabs.value.find((t) => t.id === activeTabId.value)
  })

  return {
    tabs,
    activeTabId,
    activeTab,
    initialized,
    addTab,
    removeTab,
    setActiveTab,
    initFixedTabs,
    closeOtherTabs,
    closeAllTabs,
    closeLeftTabs,
    closeRightTabs,
  }
})
