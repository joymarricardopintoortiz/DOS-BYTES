import { defineStore } from 'pinia'
import { categoriesApi, configApi } from '../api/client'

const FALLBACK_CONFIG = {
  businessName: 'DOS BYTES',
  logoUrl: '',
  description:
    'Servicio técnico, cibercafé, papelería y accesorios de tecnología en un solo lugar.',
  address: '',
  schedule: '',
  phone: '',
  adminEmails: [],
  employeeEmail: '',
  banners: [],
}

export const useSiteStore = defineStore('site', {
  state: () => ({
    config: null,
    categories: [],
    loading: false,
    loaded: false,
    error: '',
  }),

  getters: {
    siteConfig: (state) => state.config || FALLBACK_CONFIG,
    adminEmails: (state) => (state.config?.adminEmails || []).filter(Boolean),
  },

  actions: {
    async load(force = false) {
      if (this.loading) return
      if (this.loaded && !force) return
      this.loading = true
      this.error = ''
      try {
        const [configResponse, categoriesResponse] = await Promise.all([
          configApi.get(),
          categoriesApi.list(),
        ])
        this.config = configResponse.data.config
        this.categories = categoriesResponse.data.categories || []
        this.loaded = true
      } catch (error) {
        this.error = error.message || 'No se pudo cargar la información del sitio'
      } finally {
        this.loading = false
      }
    },

    async refreshCategories() {
      const response = await categoriesApi.list({ includeHidden: true })
      this.categories = response.data.categories || []
    },

    async refreshConfig() {
      const response = await configApi.get()
      this.config = response.data.config
    },
  },
})
