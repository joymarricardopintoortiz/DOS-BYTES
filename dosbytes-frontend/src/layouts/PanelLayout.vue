<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Logo from '../components/common/Logo.vue'
import { useAuthStore } from '../stores/auth'
import { useSiteStore } from '../stores/site'
import { notifySuccess } from '../utils/notify'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const site = useSiteStore()
const drawer = ref(false)

const initials = computed(() => {
  const name = auth.user?.name || ''
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DB'
})

const isAdmin = computed(() => auth.isAdmin)

const navGroups = computed(() => [
  {
    label: 'Operación',
    items: [
      { label: 'Resumen', icon: 'dashboard', to: '/panel', exact: true },
      { label: 'Órdenes de servicio', icon: 'build_circle', to: '/panel/ordenes' },
      { label: 'Pedidos', icon: 'receipt_long', to: '/panel/pedidos' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos', icon: 'inventory_2', to: '/panel/productos' },
      { label: 'Inventario bajo', icon: 'warning_amber', to: '/panel/inventario' },
      { label: 'Categorías', icon: 'category', to: '/panel/categorias' },
      ...(isAdmin.value
        ? [{ label: 'Tarifas de servicios', icon: 'sell', to: '/panel/servicios' }]
        : []),
    ],
  },
  {
    label: 'Comunidad',
    items: [
      { label: 'Opiniones', icon: 'star', to: '/panel/opiniones' },
      { label: 'Preguntas', icon: 'help_outline', to: '/panel/preguntas' },
    ],
  },
  ...(isAdmin.value
    ? [
        {
          label: 'Administración',
          items: [
            { label: 'Usuarios', icon: 'group', to: '/panel/usuarios' },
            { label: 'Configuración', icon: 'settings', to: '/panel/configuracion' },
          ],
        },
      ]
    : []),
])

const pageTitle = computed(() => route.meta.title || 'Panel')

function closeDrawer() {
  drawer.value = false
}

async function logout() {
  await auth.logout()
  notifySuccess('Sesión cerrada')
  router.push('/')
}

onMounted(() => {
  site.load().catch(() => {})
})
</script>

<template>
  <q-layout view="hHh LpR fFf" class="panel-layout">
    <q-header class="panel-header q-pa-none">
      <div class="panel-header-inner">
        <q-btn
          flat
          round
          dense
          icon="menu"
          color="white"
          class="lt-md"
          aria-label="Abrir menú"
          @click="drawer = !drawer"
        />
        <Logo light tagline="Panel interno" class="panel-brand" />
        <div class="panel-title gt-sm">{{ pageTitle }}</div>
        <q-space />
        <q-btn flat no-caps color="white" icon="storefront" label="Ver tienda" to="/" class="gt-xs" />
        <q-btn-dropdown flat no-caps color="white" class="header-user-btn">
          <template #label>
            <q-avatar size="30px" color="secondary" text-color="primary" class="q-mr-sm">
              {{ initials }}
            </q-avatar>
            <span class="header-user-name gt-sm">{{ auth.displayName }}</span>
            <q-icon name="expand_more" size="18px" class="q-ml-xs" />
          </template>
          <q-list style="min-width: 220px">
            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ auth.displayName }}</q-item-label>
                <q-item-label caption>{{ auth.roleLabel }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup to="/">
              <q-item-section avatar><q-icon name="storefront" /></q-item-section>
              <q-item-section>Ir a la tienda</q-item-section>
            </q-item>
            <q-item clickable v-close-popup to="/cambiar-contrasena">
              <q-item-section avatar><q-icon name="lock_reset" /></q-item-section>
              <q-item-section>Cambiar contraseña</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup @click="logout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Cerrar sesión</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      bordered
      :width="252"
      class="panel-drawer"
    >
      <q-scroll-area class="fit">
        <div v-for="group in navGroups" :key="group.label">
          <div class="panel-nav-head">{{ group.label }}</div>
          <q-list padding>
            <q-item
              v-for="item in group.items"
              :key="item.to"
              clickable
              :to="item.to"
              :exact="item.exact"
              class="panel-nav-item"
              @click="closeDrawer"
            >
              <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </q-list>
        </div>
        <div class="q-pa-md q-mt-md">
          <q-btn
            flat
            no-caps
            icon="storefront"
            label="Ver tienda"
            to="/"
            class="full-width"
            color="primary"
            @click="closeDrawer"
          />
        </div>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
