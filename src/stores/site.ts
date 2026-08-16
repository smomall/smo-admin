import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Site } from '../types'

export const useSiteStore = defineStore('site', () => {
  const currentSite = ref<Site | null>(null)

  function setCurrentSite(site: Site | null) {
    currentSite.value = site
  }

  return {
    currentSite,
    setCurrentSite,
  }
})