import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import MainLayout from '../layouts/MainLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import AccountLayout from '../layouts/AccountLayout.vue'
import PanelLayout from '../layouts/PanelLayout.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/public/HomeView.vue'),
        meta: { title: 'Inicio' },
      },
      {
        path: 'productos',
        name: 'catalog',
        component: () => import('../views/public/CatalogView.vue'),
        meta: { title: 'Catálogo' },
      },
      {
        path: 'categoria/:slug',
        name: 'category',
        redirect: (to) => ({
          name: 'catalog',
          query: { ...to.query, category: to.params.slug },
        }),
      },
      {
        path: 'producto/:slug',
        name: 'product',
        component: () => import('../views/public/ProductDetailView.vue'),
        props: true,
        meta: { title: 'Producto' },
      },
      {
        path: 'servicios',
        name: 'services',
        component: () => import('../views/public/ServicesView.vue'),
        meta: { title: 'Servicios y tarifas' },
      },
      {
        path: 'servicio-tecnico',
        name: 'service-request',
        component: () => import('../views/public/ServiceRequestView.vue'),
        meta: { title: 'Solicitar servicio técnico' },
      },
      {
        path: 'seguimiento/:code?',
        name: 'track',
        component: () => import('../views/public/TrackView.vue'),
        meta: { title: 'Seguimiento de reparación' },
      },
      {
        path: 'nosotros',
        name: 'about',
        component: () => import('../views/public/AboutView.vue'),
        meta: { title: 'Nosotros' },
      },
      {
        path: 'contacto',
        name: 'contact',
        component: () => import('../views/public/ContactView.vue'),
        meta: { title: 'Contacto' },
      },
      {
        path: 'privacidad',
        name: 'privacy',
        component: () => import('../views/public/LegalView.vue'),
        props: { document: 'privacy' },
        meta: { title: 'Política de privacidad' },
      },
      {
        path: 'terminos',
        name: 'terms',
        component: () => import('../views/public/LegalView.vue'),
        props: { document: 'terms' },
        meta: { title: 'Términos y condiciones' },
      },
      {
        path: 'carrito',
        name: 'cart',
        component: () => import('../views/account/CartView.vue'),
        meta: { title: 'Carrito de compras' },
      },
      {
        path: 'mi-cuenta',
        component: AccountLayout,
        meta: { requiresAuth: true, roles: ['customer'] },
        children: [
          {
            path: '',
            name: 'account-home',
            component: () => import('../views/account/AccountHomeView.vue'),
            meta: { title: 'Mi cuenta' },
          },
          {
            path: 'pedidos',
            name: 'account-orders',
            component: () => import('../views/account/AccountOrdersView.vue'),
            meta: { title: 'Mis pedidos' },
          },
          {
            path: 'pedidos/:code',
            name: 'account-order-detail',
            component: () => import('../views/account/AccountOrderDetailView.vue'),
            meta: { title: 'Detalle del pedido' },
          },
          {
            path: 'reparaciones',
            name: 'account-repairs',
            component: () => import('../views/account/AccountRepairsView.vue'),
            meta: { title: 'Mis reparaciones' },
          },
          {
            path: 'favoritos',
            name: 'account-favorites',
            component: () => import('../views/account/AccountFavoritesView.vue'),
            meta: { title: 'Mis favoritos' },
          },
          {
            path: 'opiniones',
            name: 'account-reviews',
            component: () => import('../views/account/AccountReviewsView.vue'),
            meta: { title: 'Mis opiniones' },
          },
          {
            path: 'preguntas',
            name: 'account-questions',
            component: () => import('../views/account/AccountQuestionsView.vue'),
            meta: { title: 'Mis preguntas' },
          },
        ],
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('../views/errors/ForbiddenView.vue'),
        meta: { title: 'Acceso restringido' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('../views/errors/NotFoundView.vue'),
        meta: { title: 'Página no encontrada' },
      },
    ],
  },
  {
    path: '/ingresar',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('../views/auth/LoginView.vue'),
        meta: { guestOnly: true, title: 'Ingresar' },
      },
    ],
  },
  {
    path: '/registro',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('../views/auth/RegisterView.vue'),
        meta: { guestOnly: true, title: 'Crear cuenta' },
      },
    ],
  },
  {
    path: '/recuperar',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'forgot-password',
        component: () => import('../views/auth/ForgotPasswordView.vue'),
        meta: { guestOnly: true, title: 'Recuperar contraseña' },
      },
    ],
  },
  {
    path: '/restablecer',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'reset-password',
        component: () => import('../views/auth/ResetPasswordView.vue'),
        meta: { title: 'Restablecer contraseña' },
      },
    ],
  },
  {
    path: '/verificar',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'verify-email',
        component: () => import('../views/auth/VerifyEmailView.vue'),
        meta: { title: 'Verificar correo' },
      },
    ],
  },
  {
    path: '/reenviar-verificacion',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'resend-verification',
        component: () => import('../views/auth/ResendVerificationView.vue'),
        meta: { guestOnly: true, title: 'Reenviar verificación' },
      },
    ],
  },
  {
    path: '/cambiar-contrasena',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'change-password',
        component: () => import('../views/auth/ChangePasswordView.vue'),
        meta: { requiresAuth: true, title: 'Cambiar contraseña' },
      },
    ],
  },
  {
    path: '/panel',
    component: PanelLayout,
    meta: { requiresAuth: true, roles: ['employee', 'admin'] },
    children: [
      {
        path: '',
        name: 'panel-home',
        component: () => import('../views/panel/PanelHomeView.vue'),
        meta: { title: 'Panel de administración' },
      },
      {
        path: 'ordenes',
        name: 'panel-service-orders',
        component: () => import('../views/panel/PanelServiceOrdersView.vue'),
        meta: { title: 'Órdenes de servicio' },
      },
      {
        path: 'ordenes/nueva',
        name: 'panel-service-order-new',
        component: () => import('../views/panel/PanelNewServiceOrderView.vue'),
        meta: { title: 'Nueva orden de servicio' },
      },
      {
        path: 'ordenes/:id',
        name: 'panel-service-order',
        component: () => import('../views/panel/PanelServiceOrderDetailView.vue'),
        meta: { title: 'Detalle de la orden' },
      },
      {
        path: 'pedidos',
        name: 'panel-orders',
        component: () => import('../views/panel/PanelOrdersView.vue'),
        meta: { title: 'Pedidos' },
      },
      {
        path: 'productos',
        name: 'panel-products',
        component: () => import('../views/panel/PanelProductsView.vue'),
        meta: { title: 'Productos' },
      },
      {
        path: 'inventario',
        name: 'panel-inventory',
        component: () => import('../views/panel/PanelInventoryView.vue'),
        meta: { title: 'Inventario bajo' },
      },
      {
        path: 'categorias',
        name: 'panel-categories',
        component: () => import('../views/panel/PanelCategoriesView.vue'),
        meta: { title: 'Categorías' },
      },
      {
        path: 'servicios',
        name: 'panel-services',
        component: () => import('../views/panel/PanelServicesView.vue'),
        meta: { title: 'Tarifas de servicios', roles: ['admin'] },
      },
      {
        path: 'opiniones',
        name: 'panel-reviews',
        component: () => import('../views/panel/PanelReviewsView.vue'),
        meta: { title: 'Moderación de opiniones' },
      },
      {
        path: 'preguntas',
        name: 'panel-questions',
        component: () => import('../views/panel/PanelQuestionsView.vue'),
        meta: { title: 'Preguntas de clientes' },
      },
      {
        path: 'usuarios',
        name: 'panel-users',
        component: () => import('../views/panel/PanelUsersView.vue'),
        meta: { title: 'Usuarios', roles: ['admin'] },
      },
      {
        path: 'configuracion',
        name: 'panel-config',
        component: () => import('../views/panel/PanelConfigView.vue'),
        meta: { title: 'Configuración del sitio', roles: ['admin'] },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.ensureReady()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (guestOnly && auth.isAuthenticated) {
    return auth.homeRoute
  }

  if (
    auth.isAuthenticated &&
    auth.mustChangePassword &&
    to.name !== 'change-password' &&
    to.name !== 'login'
  ) {
    return { name: 'change-password' }
  }

  const roleRecord = [...to.matched]
    .reverse()
    .find((record) => Array.isArray(record.meta.roles))

  if (roleRecord && !roleRecord.meta.roles.includes(auth.role)) {
    return { name: 'forbidden' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | DOS BYTES` : 'DOS BYTES'
})

export default router
