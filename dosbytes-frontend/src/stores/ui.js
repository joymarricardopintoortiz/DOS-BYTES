import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    mobileNav: false,
    recentSearches: [],
  }),

  actions: {
    toggleMobileNav(value) {
      this.mobileNav = typeof value === 'boolean' ? value : !this.mobileNav
    },

    closeMobileNav() {
      this.mobileNav = false
    },

    pushRecentSearch(term) {
      const clean = String(term || '').trim()
      if (clean.length < 2) return
      this.recentSearches = [
        clean,
        ...this.recentSearches.filter(
          (item) => item.toLowerCase() !== clean.toLowerCase()
        ),
      ].slice(0, 6)
    },

    clearRecentSearches() {
      this.recentSearches = []
    },
  },

  persist: {
    pick: ['recentSearches'],
  },
})
