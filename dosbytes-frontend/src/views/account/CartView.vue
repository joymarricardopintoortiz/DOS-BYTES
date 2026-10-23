<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ordersApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { formatCurrency } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import CartItemRow from '../../components/cart/CartItemRow.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const pickupNotes = ref('')
const creating = ref(false)
const createdOrder = ref(null)

const itemCount = computed(() => cart.count)
const canCheckout = computed(() => cart.items.length > 0 && !auth.isStaff)

async function checkout() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/carrito' } })
    return
  }
  if (auth.isStaff) return
  if (!cart.items.length) return

  creating.value = true
  try {
    const response = await ordersApi.create({
      items: cart.items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      })),
      pickupNotes: pickupNotes.value.trim() || undefined,
    })
    createdOrder.value = response.data.order
    cart.clear()
    pickupNotes.value = ''
    notifySuccess(response.message || 'Reserva creada correctamente')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    notifyError(error, 'No se pudo crear la reserva')
  } finally {
    creating.value = false
  }
}

useSeo({
  title: 'Carrito de compras',
  description:
    'Revisa los productos de tu carrito y reserva para recoger en DOS BYTES. El pago se realiza en la tienda.',
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

      <q-card v-if="createdOrder" flat bordered class="q-pa-lg text-center">
        <q-icon name="check_circle" color="positive" size="58px" />
        <h1 class="title-lg q-mt-md">Reserva creada</h1>
        <p class="text-body2 text-grey-7">
          Guarda tu código y presenta el pedido al recoger. El pago se realiza en la tienda.
        </p>

        <div class="soft-card q-pa-lg q-my-lg" style="max-width: 460px; margin-inline: auto">
          <div class="text-caption text-grey-7">Código del pedido</div>
          <div class="text-h4 text-weight-bold" style="letter-spacing: 0.06em">
            {{ createdOrder.code }}
          </div>
          <q-separator class="q-my-md" />
          <div class="row justify-between text-body2">
            <span class="text-grey-7">Total a pagar</span>
            <strong>{{ formatCurrency(createdOrder.total) }}</strong>
          </div>
          <div class="row justify-between text-body2 q-mt-xs">
            <span class="text-grey-7">Estado</span>
            <q-badge color="warning">Reservado</q-badge>
          </div>
        </div>

        <div class="inline-actions justify-center">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="receipt_long"
            label="Ver mi pedido"
            :to="{ name: 'account-order-detail', params: { code: createdOrder.code } }"
          />
          <q-btn outline no-caps color="primary" icon="storefront" label="Seguir comprando" to="/productos" />
        </div>

        <q-banner class="bg-blue-1 text-primary q-mt-lg" rounded>
          <template #avatar><q-icon name="info" /></template>
          Recibirás un correo con el resumen. Te avisaremos cuando tu pedido esté listo.
        </q-banner>
      </q-card>

      <template v-else-if="cart.isEmpty">
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
            <span class="eyebrow">Tu reserva</span>
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
                <span>Retiro en tienda</span>
                <span class="text-positive text-weight-bold">Gratis</span>
              </div>
              <div class="summary-row">
                <span>Pago</span>
                <span>En tienda</span>
              </div>
              <div class="summary-row summary-total">
                <span>Total</span>
                <span>{{ formatCurrency(cart.subtotal) }}</span>
              </div>

              <q-input
                v-model="pickupNotes"
                type="textarea"
                outlined
                autogrow
                maxlength="500"
                counter
                label="Notas para el pedido (opcional)"
                hint="Por ejemplo, horario estimado de retiro."
                class="q-mt-lg"
              />

              <q-banner v-if="auth.isStaff" class="bg-blue-1 text-primary q-mt-md" rounded dense>
                Las reservas son exclusivas de las cuentas de cliente.
              </q-banner>

              <template v-else-if="!auth.isAuthenticated">
                <q-banner class="bg-orange-1 text-orange-9 q-mt-md" rounded dense>
                  Para reservar necesitas una cuenta de cliente. Puedes crear una en un
                  minuto.
                </q-banner>
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="login"
                  label="Iniciar sesión para reservar"
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
                icon="check_circle"
                label="Confirmar reserva"
                class="full-width q-mt-lg"
                size="md"
                :loading="creating"
                :disable="!canCheckout"
                @click="checkout"
              />

              <div class="text-caption text-grey-7 q-mt-md">
                <q-icon name="info" size="14px" class="q-mr-xs" />
                La reserva queda sujeta a disponibilidad al momento del retiro. El pago se
                realiza en la tienda.
              </div>
            </q-card-section>
          </q-card>
        </div>
      </template>
    </div>
  </div>
</template>
