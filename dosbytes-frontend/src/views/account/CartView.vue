<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { formatCurrency } from '../../utils/format'
import { useSeo } from '../../composables/useSeo'
import CartItemRow from '../../components/cart/CartItemRow.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const itemCount = computed(() => cart.count)
const canCheckout = computed(() => cart.items.length > 0 && !auth.isStaff)

useSeo({
  title: 'Carrito de compras',
  description:
    'Revisa los productos de tu carrito y continúa para elegir el envío, tus datos y el método de pago en DOS BYTES.',
  canonical: '/carrito',
})
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Carrito</span>
      </div>

      <template v-if="cart.isEmpty">
        <EmptyState
          icon="shopping_cart"
          title="Tu carrito está vacío"
          text="Explora el catálogo y agrega los productos que quieras reservar para recoger en la tienda."
        >
          <q-btn unelevated no-caps color="primary" icon="storefront" label="Ver catálogo" to="/productos" />
        </EmptyState>
      </template>

      <template v-else>
        <div class="page-head">
          <div>
            <span class="eyebrow">Tu compra</span>
            <h1 class="title-xl">Carrito de compras</h1>
            <p class="text-body2 text-grey-7 q-mb-none">
              {{ itemCount }} {{ itemCount === 1 ? 'unidad' : 'unidades' }} ·
              {{ cart.items.length }} {{ cart.items.length === 1 ? 'producto' : 'productos' }}
            </p>
          </div>
          <q-btn flat no-caps color="negative" icon="delete_sweep" label="Vaciar carrito" @click="cart.clear()" />
        </div>

        <div class="cart-grid">
          <q-card flat bordered>
            <q-card-section class="q-py-sm">
              <CartItemRow v-for="item in cart.items" :key="item.productId" :item="item" />
            </q-card-section>
          </q-card>

          <q-card flat bordered class="summary-card">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Resumen del pedido</div>

              <div class="summary-row">
                <span>Productos ({{ itemCount }})</span>
                <span>{{ formatCurrency(cart.subtotal) }}</span>
              </div>
              <div class="summary-row">
                <span>Envío</span>
                <span class="text-grey-7">Según departamento</span>
              </div>
              <div class="summary-row summary-total">
                <span>Total parcial</span>
                <span>{{ formatCurrency(cart.subtotal) }}</span>
              </div>

              <q-banner v-if="auth.isStaff" class="bg-blue-1 text-primary q-mt-md" rounded dense>
                Las compras son exclusivas de las cuentas de cliente.
              </q-banner>

              <template v-else-if="!auth.isAuthenticated">
                <q-banner class="bg-orange-1 text-orange-9 q-mt-md" rounded dense>
                  Para comprar necesitas una cuenta de cliente. Puedes crear una en un
                  minuto.
                </q-banner>
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="login"
                  label="Iniciar sesión para comprar"
                  class="full-width q-mt-md"
                  @click="router.push({ name: 'login', query: { redirect: '/carrito' } })"
                />
                <q-btn
                  flat
                  no-caps
                  color="primary"
                  label="Crear cuenta"
                  to="/registro"
                  class="full-width q-mt-xs"
                />
              </template>

              <q-btn
                v-else
                unelevated
                no-caps
                color="primary"
                icon="arrow_forward"
                label="Continuar compra"
                class="full-width q-mt-lg"
                size="md"
                :disable="!canCheckout"
                :to="{ name: 'checkout' }"
              />

              <div class="text-caption text-grey-7 q-mt-md">
                <q-icon name="info" size="14px" class="q-mr-xs" />
                En el siguiente paso eliges el departamento y el envío, tus datos de entrega y
                el método de pago.
              </div>
            </q-card-section>
          </q-card>
        </div>
      </template>
    </div>
  </div>
</template>
