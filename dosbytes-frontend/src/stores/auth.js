import { defineStore } from 'pinia'
import { authApi, setAuthToken, usersApi } from '../api/client'

let readyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    mustChangePassword: false,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    role: (state) => state.user?.role || null,
    isCustomer: (state) => state.user?.role === 'customer',
    isEmployee: (state) => state.user?.role === 'employee',
    isAdmin: (state) => state.user?.role === 'admin',
    isStaff: (state) => state.user?.role === 'employee' || state.user?.role === 'admin',
    displayName: (state) => state.user?.name || 'Mi cuenta',
    roleLabel: (state) => {
      if (state.user?.role === 'admin') return 'Administrador'
      if (state.user?.role === 'employee') return 'Empleado'
      if (state.user?.role === 'customer') return 'Cliente'
      return ''
    },
    homeRoute: (state) => {
      if (state.user?.role === 'employee' || state.user?.role === 'admin') return '/panel'
      if (state.user?.role === 'customer') return '/mi-cuenta'
      return '/'
    },
  },

  actions: {
    setSession(token, user, mustChangePassword = false) {
      this.token = token || null
      this.user = user || null
      this.mustChangePassword = Boolean(mustChangePassword)
      setAuthToken(this.token)
    },

    clearSession() {
      this.token = null
      this.user = null
      this.mustChangePassword = false
      setAuthToken(null)
    },

    async ensureReady() {
      if (this.ready) return
      if (readyPromise) return readyPromise

      readyPromise = (async () => {
        if (this.token) {
          setAuthToken(this.token)
          try {
            const response = await authApi.me()
            this.user = response.data.user
            if (typeof response.data.user?.mustChangePassword === 'boolean') {
              this.mustChangePassword = response.data.user.mustChangePassword
            }
          } catch (error) {
            if (error.status === 401 || error.status === 403) this.clearSession()
          }
        }
        this.ready = true
      })().finally(() => {
        readyPromise = null
      })

      return readyPromise
    },

    async login(credentials) {
      const response = await authApi.login(credentials)
      const { token, user, mustChangePassword } = response.data
      this.setSession(token, user, mustChangePassword)
      this.ready = true
      return response
    },

    async register(payload) {
      return authApi.register(payload)
    },

    async refreshMe() {
      const response = await authApi.me()
      this.user = response.data.user
      this.mustChangePassword = Boolean(response.data.user?.mustChangePassword)
      return this.user
    },

    async updateProfile(payload) {
      const response = await usersApi.updateMe(payload)
      this.user = response.data.user
      return this.user
    },

    async changePassword(payload) {
      const response = await authApi.changePassword(payload)
      if (response.data?.token) {
        this.token = response.data.token
        setAuthToken(this.token)
      }
      this.mustChangePassword = false
      if (this.user) this.user.mustChangePassword = false
      return response
    },

    async logout() {
      try {
        if (this.token) await authApi.logout()
      } catch {
        // La sesión local se cierra incluso si el servidor no responde.
      } finally {
        this.clearSession()
      }
    },

    async deleteAccount(payload) {
      const response = await usersApi.deleteMe(payload)
      this.clearSession()
      return response
    },
  },

  persist: {
    storage: sessionStorage,
    pick: ['token', 'user', 'mustChangePassword'],
  },
})
