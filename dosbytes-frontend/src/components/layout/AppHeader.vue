<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Logo from '../common/Logo.vue'
import SearchAutocomplete from './SearchAutocomplete.vue'
import { useAuthStore } from '../../stores/auth'
import { useFavoritesStore } from '../../stores/favorites'
import { useCartStore } from '../../stores/cart'
import { useSiteStore } from '../../stores/site'
import { useUiStore } from '../../stores/ui'
import { notifySuccess } from '../../utils/notify'

const router = useRouter()
const auth = useAuthStore()
const favorites = useFavoritesStore()
const cart = useCartStore()
const site = useSiteStore()
const ui = useUiStore()

const initials = computed(() => {
  const name = auth.user?.name || ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DB'
})

const navCategories = computed(() => site.categories.slice(0, 7))

function loadFavorites() {
  if (auth.isCustomer) {
    favorites.load().catch(() => {})
  } else {
    favorites.clear()
  }
}

function logout() {
  auth.logout()
  favorites.clear()
  cart.clear()
  notifySuccess('Sesión cerrada')
  router.push('/')
}

onMounted(() => {
  site.load().catch(() => {})
  loadFavorites()
})

watch(() => auth.user?._id, loadFavorites)
watch(() => auth.role, (role) => {
  if (role !== 'customer') favorites.clear()
})
</script>

<template>
  <div class="site-header">
    <div class="container">
      <div class="header-main">
        <q-btn
          class="lt-md"
          flat
          round
          dense
          icon="menu"
          aria-label="Abrir menú"
          @click="ui.toggleMobileNav(true)"
        />
        <Logo />

        <div class="header-search">
          <SearchAutocomplete />
        </div>

        <div class="header-actions">
          <template v-if="auth.isCustomer">
            <q-btn
              flat
              round
              icon="favorite_border"
              aria-label="Mis favoritos"
              to="/mi-cuenta/favoritos"
              :badge="favorites.count || undefined"
              badge-color="accent"
            />
            <q-btn
              flat
              round
              icon="shopping_cart"
              aria-label="Carrito de compras"
              to="/carrito"
              :badge="cart.count || undefined"
              badge-color="secondary"
            />
          </template>

          <template v-if="auth.isAuthenticated">
            <q-btn-dropdown
              flat
              no-caps
              class="header-user-btn"
              :label="auth.displayName"
            >
              <template #label>
                <q-avatar size="30px" color="primary" text-color="white" class="q-mr-sm">
                  {{ initials }}
                </q-avatar>
                <span class="header-user-name gt-xs">{{ auth.displayName }}</span>
                <q-icon name="expand_more" size="18px" class="q-ml-xs" />
              </template>
              <q-list style="min-width: 230px">
                <q-item class="q-pa-md">
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ auth.displayName }}</q-item-label>
                    <q-item-label caption>{{ auth.user?.email }}</q-item-label>
                    <q-item-label caption>{{ auth.roleLabel }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item
                  v-if="auth.isStaff"
                  clickable
                  v-close-popup
                  to="/panel"
                >
                  <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
                  <q-item-section>Panel de administración</q-item-section>
                </q-item>
                <template v-if="auth.isCustomer">
                  <q-item clickable v-close-popup to="/mi-cuenta">
                    <q-item-section avatar><q-icon name="person" /></q-item-section>
                    <q-item-section>Mi cuenta</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup to="/mi-cuenta/pedidos">
                    <q-item-section avatar><q-icon name="receipt_long" /></q-item-section>
                    <q-item-section>Mis pedidos</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup to="/mi-cuenta/favoritos">
                    <q-item-section avatar><q-icon name="favorite" /></q-item-section>
                    <q-item-section>Mis favoritos</q-item-section>
                  </q-item>
                </template>
                <q-item clickable v-close-popup to="/seguimiento">
                  <q-item-section avatar><q-icon name="track_changes" /></q-item-section>
                  <q-item-section>Consultar reparación</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="logout">
                  <q-item-section avatar><q-icon name="logout" /></q-item-section>
                  <q-item-section>Cerrar sesión</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </template>

          <template v-else>
            <q-btn flat no-caps label="Ingresar" to="/ingresar" class="gt-xs" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Crear cuenta"
              to="/registro"
              class="gt-xs"
            />
            <q-btn flat round icon="person" aria-label="Ingresar" to="/ingresar" class="lt-sm" />
          </template>
        </div>
      </div>
    </div>

    <div class="header-nav gt-sm">
      <div class="container header-nav-inner">
        <q-btn-dropdown
          flat
          no-caps
          dense
          icon="grid_view"
          label="Categorías"
          class="nav-link"
        >
          <q-list style="min-width: 220px">
            <q-item
              v-for="category in site.categories"
              :key="category._id"
              clickable
              v-close-popup
              :to="{ name: 'catalog', query: { category: category.slug } }"
            >
              <q-item-section>{{ category.name }}</q-item-section>
              <q-item-section side caption>{{ category.productCount || 0 }}</q-item-section>
            </q-item>
            <q-separator v-if="site.categories.length" />
            <q-item clickable v-close-popup to="/productos">
              <q-item-section class="text-primary text-weight-bold">Ver todo el catálogo</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <router-link
          v-for="category in navCategories"
          :key="category._id"
          class="nav-link"
          :to="{ name: 'catalog', query: { category: category.slug } }"
        >
          {{ category.name }}
        </router-link>
        <router-link class="nav-link" to="/productos?isOffer=true">Ofertas</router-link>
        <span class="q-ml-auto" />
        <router-link class="nav-link" to="/servicios">Servicios y tarifas</router-link>
        <router-link class="nav-link" to="/servicio-tecnico">Solicitar reparación</router-link>
        <router-link class="nav-link accent" to="/seguimiento">Consultar estado</router-link>
      </div>
    </div>
  </div>
</template>
