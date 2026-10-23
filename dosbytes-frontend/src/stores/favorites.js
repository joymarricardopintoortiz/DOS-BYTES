import { defineStore } from 'pinia'
import { favoritesApi } from '../api/client'

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    ids: [],
    loading: false,
    loaded: false,
  }),

  getters: {
    count: (state) => state.ids.length,
    isFavorite: (state) => (productId) => state.ids.includes(String(productId)),
  },

  actions: {
    async load(force = false) {
      if (this.loading) return
      if (this.loaded && !force) return
      this.loading = true
      try {
        const response = await favoritesApi.list()
        this.ids = (response.data.favorites || [])
          .map((favorite) => favorite.product?._id)
          .filter(Boolean)
          .map(String)
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async toggle(productId) {
      const id = String(productId)
      if (this.ids.includes(id)) {
        await favoritesApi.remove(id)
        this.ids = this.ids.filter((item) => item !== id)
        return false
      }
      await favoritesApi.add(id)
      this.ids = [...this.ids, id]
      return true
    },

    clear() {
      this.ids = []
      this.loaded = false
    },
  },
})
