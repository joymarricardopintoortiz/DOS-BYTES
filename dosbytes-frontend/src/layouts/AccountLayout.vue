<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { notifySuccess } from '../utils/notify'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const favorites = useFavoritesStore()

const initials = computed(() => {
  const name = auth.user?.name || ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DB'
})

const links = [
  { label: 'Resumen', icon: 'dashboard', to: '/mi-cuenta', exact: true },
  { label: 'Mis pedidos', icon: 'receipt_long', to: '/mi-cuenta/pedidos' },
  { label: 'Mis reparaciones', icon: 'build_circle', to: '/mi-cuenta/reparaciones' },
  { label: 'Favoritos', icon: 'favorite', to: '/mi-cuenta/favoritos' },
  { label: 'Mis opiniones', icon: 'star', to: '/mi-cuenta/opiniones' },
  { label: 'Mis preguntas', icon: 'help_outline', to: '/mi-cuenta/preguntas' },
]

async function logout() {
  await auth.logout()
  favorites.clear()
  cart.clear()
  notifySuccess('Sesión cerrada')
  router.push('/')
}
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Mi cuenta</span>
      </div>

      <div class="account-grid">
        <aside class="account-nav surface-card">
          <div class="account-nav-head">
            <q-avatar size="48px" color="secondary" text-color="primary" class="q-mb-sm">
              {{ initials }}
            </q-avatar>
            <strong>{{ auth.displayName }}</strong>
            <span>{{ auth.user?.email }}</span>
          </div>

          <q-list padding>
            <q-item
              v-for="link in links"
              :key="link.to"
              clickable
              :to="link.to"
              :exact="link.exact"
              active-class="text-primary text-weight-bold"
            >
              <q-item-section avatar><q-icon :name="link.icon" /></q-item-section>
              <q-item-section>{{ link.label }}</q-item-section>
            </q-item>
            <q-separator class="q-my-sm" />
            <q-item clickable to="/seguimiento">
              <q-item-section avatar><q-icon name="track_changes" /></q-item-section>
              <q-item-section>Consultar un código</q-item-section>
            </q-item>
            <q-item clickable @click="logout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Cerrar sesión</q-item-section>
            </q-item>
          </q-list>
        </aside>

        <section class="account-content">
          <router-view />
        </section>
      </div>
    </div>
  </div>
</template>
