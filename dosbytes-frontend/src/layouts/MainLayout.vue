<script setup>
import { watch } from 'vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import Logo from '../components/common/Logo.vue'
import { useUiStore } from '../stores/ui'
import { useSiteStore } from '../stores/site'
import { useAuthStore } from '../stores/auth'
import { useFavoritesStore } from '../stores/favorites'

const ui = useUiStore()
const site = useSiteStore()
const auth = useAuthStore()
const favorites = useFavoritesStore()

function close() {
  ui.closeMobileNav()
}

watch(() => ui.mobileNav, (open) => {
  if (open) site.load().catch(() => {})
})
</script>

<template>
  <q-layout view="hHh LpR fFf">
    <q-header class="site-header">
      <AppHeader />
    </q-header>

    <q-drawer
      v-model="ui.mobileNav"
      side="left"
      behavior="mobile"
      :width="300"
      class="mobile-drawer"
    >
      <div class="mobile-nav-head">
        <Logo tagline="Menú" />
      </div>
      <q-list padding>
        <div class="mobile-nav-section">Catálogo</div>
        <q-item clickable to="/productos" @click="close" exact>
          <q-item-section avatar><q-icon name="storefront" /></q-item-section>
          <q-item-section>Ver todo</q-item-section>
        </q-item>
        <q-item
          v-for="category in site.categories"
          :key="category._id"
          clickable
          :to="{ name: 'catalog', query: { category: category.slug } }"
          @click="close"
        >
          <q-item-section avatar><q-icon name="category" /></q-item-section>
          <q-item-section>{{ category.name }}</q-item-section>
          <q-item-section side caption>{{ category.productCount || 0 }}</q-item-section>
        </q-item>
        <q-item clickable to="/productos?isOffer=true" @click="close">
          <q-item-section avatar><q-icon name="local_offer" color="accent" /></q-item-section>
          <q-item-section>Ofertas</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />
        <div class="mobile-nav-section">Servicios</div>
        <q-item clickable to="/servicios" @click="close">
          <q-item-section avatar><q-icon name="build_circle" /></q-item-section>
          <q-item-section>Servicios y tarifas</q-item-section>
        </q-item>
        <q-item clickable to="/servicio-tecnico" @click="close">
          <q-item-section avatar><q-icon name="handyman" /></q-item-section>
          <q-item-section>Solicitar reparación</q-item-section>
        </q-item>
        <q-item clickable to="/seguimiento" @click="close">
          <q-item-section avatar><q-icon name="track_changes" /></q-item-section>
          <q-item-section>Consultar estado</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />
        <template v-if="auth.isAuthenticated">
          <q-item
            v-if="auth.isStaff"
            clickable
            to="/panel"
            @click="close"
          >
            <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
            <q-item-section>Panel</q-item-section>
          </q-item>
          <template v-else>
            <q-item clickable to="/mi-cuenta" @click="close">
              <q-item-section avatar><q-icon name="person" /></q-item-section>
              <q-item-section>Mi cuenta</q-item-section>
            </q-item>
            <q-item clickable to="/mi-cuenta/pedidos" @click="close">
              <q-item-section avatar><q-icon name="receipt_long" /></q-item-section>
              <q-item-section>Mis pedidos</q-item-section>
            </q-item>
            <q-item clickable to="/mi-cuenta/favoritos" @click="close">
              <q-item-section avatar>
                <q-icon name="favorite" />
                <q-badge v-if="favorites.count" color="accent" floating>{{ favorites.count }}</q-badge>
              </q-item-section>
              <q-item-section>Favoritos</q-item-section>
            </q-item>
            <q-item clickable to="/carrito" @click="close">
              <q-item-section avatar><q-icon name="shopping_cart" /></q-item-section>
              <q-item-section>Carrito</q-item-section>
            </q-item>
          </template>
        </template>
        <template v-else>
          <q-item clickable to="/ingresar" @click="close">
            <q-item-section avatar><q-icon name="login" /></q-item-section>
            <q-item-section>Ingresar</q-item-section>
          </q-item>
          <q-item clickable to="/registro" @click="close">
            <q-item-section avatar><q-icon name="person_add" /></q-item-section>
            <q-item-section>Crear cuenta</q-item-section>
          </q-item>
        </template>

        <q-separator class="q-my-md" />
        <q-item clickable to="/nosotros" @click="close">
          <q-item-section avatar><q-icon name="info" /></q-item-section>
          <q-item-section>Nosotros</q-item-section>
        </q-item>
        <q-item clickable to="/contacto" @click="close">
          <q-item-section avatar><q-icon name="contact_phone" /></q-item-section>
          <q-item-section>Contacto</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="site-footer q-pa-none">
      <AppFooter />
    </q-footer>
  </q-layout>
</template>
