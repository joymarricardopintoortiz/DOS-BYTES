<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ordersApi, shippingApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { formatCurrency } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import EmptyState from '../../components/common/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

const step = ref(1)
const loadingRates = ref(true)
const rates = ref({ departments: [], zones: [], freeShippingMin: 150000 })

const shipping = reactive({ department: '', city: '', address: '' })
const contact = reactive({ email: '', phone: '' })
const notes = ref('')
const payment = reactive({
  method: 'efectivo',
  cardNumber: '',
  cardName: '',
  expiry: '',
  cvv: '',
  bank: '',
  account: '',
})

const creating = ref(false)
const createdOrder = ref(null)

const PAYMENT_LABELS = {
  efectivo: 'Efectivo al recibir',
  tarjeta: 'Tarjeta de débito/crédito',
  cuenta_bancaria: 'Cuenta bancaria',
}

const BANKS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'Banco de Occidente',
  'Banco Popular',
  'Banco Caja Social',
  'BBVA Colombia',
  'Banco Santander',
  'Nequi',
  'Daviplata',
  'Otro',
]

const rules = {
  required: (value) => Boolean(String(value || '').trim()) || 'Este campo es obligatorio',
  city: (value) => String(value || '').trim().length >= 2 || 'Escribe la ciudad',
  address: (value) => String(value || '').trim().length >= 5 || 'Escribe la dirección completa',
  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim()) || 'Correo electrónico inválido',
  phone: (value) =>
    /^\+?[0-9\s().-]{7,20}$/.test(String(value || '').trim()) || 'Teléfono inválido',
  cardNumber: (value) =>
    String(value || '').replace(/\D/g, '').length >= 13 || 'Número de tarjeta inválido',
  cardName: (value) => String(value || '').trim().length >= 3 || 'Nombre del titular inválido',
  expiry: (value) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(String(value || '').trim()) || 'Usa el formato MM/AA',
  cvv: (value) => /^\d{3,4}$/.test(String(value || '').trim()) || 'CVV inválido',
  account: (value) => {
    const digits = String(value || '').replace(/\D/g, '')
    return (digits.length >= 4 && digits.length <= 20) || 'Número de cuenta inválido'
  },
}

const items = computed(() => cart.items)
const subtotal = computed(() => cart.subtotal)

const activeZone = computed(() =>
  rates.value.zones.find((zone) => zone.departments.includes(shipping.department)) || null
)

// El servidor vuelve a calcular esto al confirmar: esta vista es solo la vista.
const shippingCost = computed(() => {
  if (!activeZone.value) return 0
  return subtotal.value >= rates.value.freeShippingMin ? 0 : activeZone.value.cost
})

const total = computed(() => subtotal.value + shippingCost.value)
const freeShippingLeft = computed(() => {
  if (!activeZone.value || shippingCost.value === 0) return 0
  return Math.max(0, rates.value.freeShippingMin - subtotal.value)
})

const paymentLabel = computed(() => PAYMENT_LABELS[payment.method] || 'Pago en tienda')

function imageOf(item) {
  return mediaUrl(item.image)
}

function cardDigits() {
  return String(payment.cardNumber || '').replace(/\D/g, '')
}

function onCardInput() {
  const digits = cardDigits().slice(0, 19)
  payment.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim()
}

function onExpiryInput() {
  const digits = String(payment.expiry || '').replace(/\D/g, '').slice(0, 4)
  payment.expiry = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function onCvvInput() {
  payment.cvv = String(payment.cvv || '').replace(/\D/g, '').slice(0, 4)
}

function onAccountInput() {
  payment.account = String(payment.account || '').replace(/\D/g, '').slice(0, 20)
}

function goToLogin() {
  router.push({ name: 'login', query: { redirect: '/checkout' } })
}

async function confirm() {
  if (!cart.items.length) return
  creating.value = true
  try {
    const payload = {
      items: cart.items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      })),
      shipping: {
        department: shipping.department,
        city: shipping.city.trim(),
        address: shipping.address.trim(),
      },
      contact: {
        email: contact.email.trim(),
        phone: contact.phone.trim(),
      },
      paymentMethod: payment.method,
      pickupNotes: notes.value.trim() || undefined,
    }

    if (payment.method === 'tarjeta') {
      payload.payment = {
        cardNumber: cardDigits(),
        cardName: payment.cardName.trim(),
        expiry: payment.expiry.trim(),
        cvv: payment.cvv.trim(),
      }
    } else if (payment.method === 'cuenta_bancaria') {
      payload.payment = {
        bank: payment.bank,
        account: String(payment.account || '').replace(/\D/g, ''),
      }
    }

    const response = await ordersApi.create(payload)
    createdOrder.value = response.data.order
    cart.clear()
    notifySuccess(response.message || 'Pedido confirmado')
    step.value = 5
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    notifyError(error, 'No se pudo confirmar el pedido')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  if (auth.user?.email && !contact.email) contact.email = auth.user.email
  if (auth.user?.phone && !contact.phone) contact.phone = auth.user.phone

  try {
    const response = await shippingApi.get()
    rates.value = response.data
  } catch {
    // Sin tarifas la vista sigue funcionando: el envío se cotiza en el servidor.
  } finally {
    loadingRates.value = false
  }

  if (!cart.items.length && !createdOrder.value) {
    router.replace({ name: 'cart' })
  }
})

useSeo({
  title: 'Finalizar compra',
  description:
    'Confirma tu pedido en DOS BYTES: revisa el resumen, envía tus datos de entrega, elige el método de pago y confirma la compra.',
  canonical: '/checkout',
})
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <router-link to="/carrito">Carrito</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Finalizar compra</span>
      </div>

      <!-- ======== Confirmación ======== -->
      <q-card v-if="createdOrder" flat bordered class="q-pa-lg text-center">
        <q-icon name="check_circle" color="positive" size="58px" />
        <h1 class="title-lg q-mt-md">Pedido confirmado</h1>
        <p class="text-body2 text-grey-7">
          Recibirás el resumen en tu correo. Te avisaremos cuando tu pedido esté listo.
        </p>

        <div class="soft-card q-pa-lg q-my-lg" style="max-width: 520px; margin-inline: auto">
          <div class="text-caption text-grey-7">Código del pedido</div>
          <div class="text-h4 text-weight-bold" style="letter-spacing: 0.06em">
            {{ createdOrder.code }}
          </div>
          <q-separator class="q-my-md" />
          <div class="row justify-between text-body2 q-mb-xs">
            <span class="text-grey-7">Productos</span>
            <strong>{{ formatCurrency(createdOrder.subtotal || createdOrder.total) }}</strong>
          </div>
          <div class="row justify-between text-body2 q-mb-xs">
            <span class="text-grey-7">Envío</span>
            <strong>
              {{ createdOrder.shipping?.cost ? formatCurrency(createdOrder.shipping.cost) : 'Gratis' }}
            </strong>
          </div>
          <div class="row justify-between text-body2">
            <span class="text-grey-7">Total</span>
            <strong class="text-h6">{{ formatCurrency(createdOrder.total) }}</strong>
          </div>
          <q-separator class="q-my-md" />
          <div class="text-caption text-grey-7">
            {{ paymentLabel }} ·
            {{ createdOrder.shipping?.address || 'Retiro en el local' }}
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
      </q-card>

      <!-- ======== Carrito vacío ======== -->
      <EmptyState
        v-else-if="!cart.items.length"
        icon="shopping_cart"
        title="Tu carrito está vacío"
        text="Agrega productos antes de finalizar la compra."
      >
        <q-btn unelevated no-caps color="primary" icon="storefront" label="Ver catálogo" to="/productos" />
      </EmptyState>

      <!-- ======== Checkout ======== -->
      <template v-else>
        <div class="page-head">
          <div>
            <span class="eyebrow">Compra segura</span>
            <h1 class="title-xl">Finalizar compra</h1>
            <p class="text-body2 text-grey-7 q-mb-none">
              {{ cart.count }} {{ cart.count === 1 ? 'unidad' : 'unidades' }} ·
              {{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }}
            </p>
          </div>
        </div>

        <div v-if="loadingRates" class="q-mb-lg">
          <q-skeleton height="60px" style="border-radius: 14px" />
        </div>

        <q-stepper
          v-model="step"
          flat
          bordered
          animated
          header-nav
          class="checkout-stepper"
          color="primary"
        >
          <!-- Paso 1: resumen + envío -->
          <q-step :name="1" title="Resumen" icon="shopping_cart" :done="step > 1">
            <div class="checkout-grid">
              <div class="stack">
                <q-card v-for="item in items" :key="item.productId" flat bordered>
                  <q-card-section class="row q-gutter-md no-wrap">
                    <router-link :to="{ name: 'product', params: { slug: item.slug } }">
                      <img :src="imageOf(item)" :alt="item.name" class="checkout-thumb" />
                    </router-link>
                    <div class="col">
                      <router-link
                        :to="{ name: 'product', params: { slug: item.slug } }"
                        class="text-weight-bold text-body1"
                      >
                        {{ item.name }}
                      </router-link>
                      <div class="text-caption text-grey-7">
                        Código: {{ item.code }}<span v-if="item.sku"> · SKU: {{ item.sku }}</span>
                      </div>
                      <div class="text-caption text-grey-7">
                        {{ formatCurrency(item.price) }} c/u ·
                        <strong>{{ item.quantity }} × {{ formatCurrency(item.price * item.quantity) }}</strong>
                      </div>
                      <div v-if="item.description" class="text-caption text-grey-8 q-mt-xs checkout-details">
                        {{ item.description }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-weight-bold">{{ formatCurrency(item.price * item.quantity) }}</div>
                      <q-btn
                        flat
                        dense
                        no-caps
                        color="negative"
                        icon="delete"
                        label="Quitar"
                        class="q-mt-sm"
                        @click="cart.remove(item.productId)"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="summary-card">
                <div class="text-subtitle1 text-weight-bold q-mb-md">Resumen del pedido</div>

                <div class="summary-row">
                  <span>Productos ({{ cart.count }})</span>
                  <span>{{ formatCurrency(subtotal) }}</span>
                </div>

                <div class="q-mt-md">
                  <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
                    ¿A dónde enviamos tu pedido?
                  </div>
                  <q-select
                    v-model="shipping.department"
                    :options="rates.departments"
                    outlined
                    dense
                    clearable
                    label="Departamento"
                    :disable="loadingRates"
                    :rules="[rules.required]"
                    lazy-rules
                  >
                    <template #prepend><q-icon name="place" /></template>
                  </q-select>

                  <div class="summary-row q-mt-sm">
                    <span>Envío{{ activeZone ? ` · ${activeZone.label}` : '' }}</span>
                    <span v-if="!shipping.department" class="text-grey-7">Selecciona departamento</span>
                    <span v-else-if="shippingCost === 0" class="text-positive text-weight-bold">Gratis</span>
                    <span v-else class="text-weight-bold">{{ formatCurrency(shippingCost) }}</span>
                  </div>

                  <div
                    v-if="freeShippingLeft > 0 && shipping.department"
                    class="text-caption text-primary q-mt-xs"
                  >
                    <q-icon name="local_offer" size="13px" class="q-mr-xs" />
                    Te faltan {{ formatCurrency(freeShippingLeft) }} para el envío gratis.
                  </div>
                </div>

                <q-separator class="q-my-md" />

                <div class="summary-row summary-total">
                  <span>Total</span>
                  <span>{{ formatCurrency(total) }}</span>
                </div>

                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="arrow_forward"
                  label="Continuar"
                  class="full-width q-mt-lg"
                  :disable="!shipping.department"
                  @click="step = 2"
                />
                <div class="text-caption text-grey-7 q-mt-md">
                  <q-icon name="info" size="14px" class="q-mr-xs" />
                  El costo de envío se calcula según el departamento y se confirma en el servidor.
                </div>
              </div>
            </div>
          </q-step>

          <!-- Paso 2: datos de entrega -->
          <q-step :name="2" title="Datos de entrega" icon="local_shipping" :done="step > 2">
            <q-form greedy @submit="step = 3">
              <div class="checkout-form">
                <q-banner class="bg-blue-1 text-primary" rounded dense>
                  <template #avatar><q-icon name="place" /></template>
                  Envío a <strong>{{ shipping.department }}</strong>
                  <q-btn flat dense no-caps color="primary" label="Cambiar" class="q-ml-sm" @click="step = 1" />
                </q-banner>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="shipping.city"
                      outlined
                      label="Ciudad"
                      :rules="[rules.required, rules.city]"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="location_city" /></template>
                    </q-input>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="contact.phone"
                      outlined
                      label="Teléfono"
                      type="tel"
                      :rules="[rules.required, rules.phone]"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="phone" /></template>
                    </q-input>
                  </div>
                  <div class="col-12">
                    <q-input
                      v-model="shipping.address"
                      outlined
                      label="Dirección"
                      hint="Calle, número, barrio y referencia"
                      :rules="[rules.required, rules.address]"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="home" /></template>
                    </q-input>
                  </div>
                  <div class="col-12">
                    <q-input
                      v-model="contact.email"
                      outlined
                      type="email"
                      label="Correo electrónico"
                      hint="Aquí llegará el resumen de tu compra"
                      :rules="[rules.required, rules.email]"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="mail" /></template>
                    </q-input>
                  </div>
                  <div class="col-12">
                    <q-input
                      v-model="notes"
                      type="textarea"
                      outlined
                      autogrow
                      maxlength="500"
                      counter
                      label="Notas para el pedido (opcional)"
                      hint="Por ejemplo, horario en el que puedes recibir el paquete."
                    />
                  </div>
                </div>

                <div class="row justify-end q-gutter-sm q-mt-md">
                  <q-btn flat no-caps color="primary" icon="arrow_back" label="Atrás" @click="step = 1" />
                  <q-btn unelevated no-caps color="primary" icon="arrow_forward" label="Continuar" type="submit" />
                </div>
              </div>
            </q-form>
          </q-step>

          <!-- Paso 3: método de pago -->
          <q-step :name="3" title="Pago" icon="payment" :done="step > 3">
            <q-form greedy @submit="step = 4">
              <div class="checkout-form">
                <div class="text-caption text-grey-7 q-mb-md">
                  Esta versión no procesa cobros en línea: registras el método con el que pagarás
                  y el negocio lo confirma contigo.
                </div>

                <div class="pay-options">
                  <label
                    v-for="option in [
                      { value: 'efectivo', icon: 'payments', label: 'Efectivo', hint: 'Pagas al recibir el pedido' },
                      { value: 'tarjeta', icon: 'credit_card', label: 'Tarjeta de débito/crédito', hint: 'Referencia de la tarjeta' },
                      { value: 'cuenta_bancaria', icon: 'account_balance', label: 'Cuenta bancaria', hint: 'Transferencia desde tu banco' },
                    ]"
                    :key="option.value"
                    class="pay-option"
                    :class="{ 'pay-option--active': payment.method === option.value }"
                  >
                    <input
                      v-model="payment.method"
                      type="radio"
                      name="payment-method"
                      :value="option.value"
                      class="pay-option-input"
                    />
                    <q-icon :name="option.icon" size="26px" />
                    <div>
                      <div class="text-weight-bold">{{ option.label }}</div>
                      <div class="text-caption text-grey-7">{{ option.hint }}</div>
                    </div>
                  </label>
                </div>

                <div v-if="payment.method === 'tarjeta'" class="row q-col-gutter-md q-mt-md">
                  <div class="col-12">
                    <q-input
                      v-model="payment.cardNumber"
                      outlined
                      label="Número de tarjeta"
                      input-class="text-uppercase"
                      :rules="[rules.required, rules.cardNumber]"
                      lazy-rules
                      @update:model-value="onCardInput"
                    >
                      <template #prepend><q-icon name="credit_card" /></template>
                    </q-input>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="payment.cardName"
                      outlined
                      label="Nombre del titular"
                      :rules="[rules.required, rules.cardName]"
                      lazy-rules
                    />
                  </div>
                  <div class="col-6 col-sm-3">
                    <q-input
                      v-model="payment.expiry"
                      outlined
                      label="Vencimiento"
                      placeholder="MM/AA"
                      :rules="[rules.required, rules.expiry]"
                      lazy-rules
                      @update:model-value="onExpiryInput"
                    />
                  </div>
                  <div class="col-6 col-sm-3">
                    <q-input
                      v-model="payment.cvv"
                      outlined
                      label="CVV"
                      maxlength="4"
                      :rules="[rules.required, rules.cvv]"
                      lazy-rules
                      @update:model-value="onCvvInput"
                    />
                  </div>
                </div>

                <div v-if="payment.method === 'cuenta_bancaria'" class="row q-col-gutter-md q-mt-md">
                  <div class="col-12 col-sm-6">
                    <q-select
                      v-model="payment.bank"
                      :options="BANKS"
                      outlined
                      label="Banco"
                      :rules="[rules.required]"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="account_balance" /></template>
                    </q-select>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="payment.account"
                      outlined
                      label="Número de cuenta"
                      :rules="[rules.required, rules.account]"
                      lazy-rules
                      @update:model-value="onAccountInput"
                    />
                  </div>
                </div>

                <div class="row justify-end q-gutter-sm q-mt-md">
                  <q-btn flat no-caps color="primary" icon="arrow_back" label="Atrás" @click="step = 2" />
                  <q-btn unelevated no-caps color="primary" icon="arrow_forward" label="Continuar" type="submit" />
                </div>
              </div>
            </q-form>
          </q-step>

          <!-- Paso 4: recibo -->
          <q-step :name="4" title="Confirmar" icon="receipt_long">
            <div class="checkout-grid">
              <div class="stack">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle1 text-weight-bold q-mb-sm">Productos</div>
                    <div
                      v-for="item in items"
                      :key="item.productId"
                      class="row no-wrap q-mb-sm receipt-line"
                    >
                      <img :src="imageOf(item)" :alt="item.name" class="checkout-thumb-sm" />
                      <div class="col">
                        <div class="text-weight-bold">{{ item.name }}</div>
                        <div class="text-caption text-grey-7">
                          {{ item.quantity }} × {{ formatCurrency(item.price) }}
                        </div>
                      </div>
                      <div class="text-weight-bold">{{ formatCurrency(item.price * item.quantity) }}</div>
                    </div>
                  </q-card-section>
                </q-card>

                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle1 text-weight-bold q-mb-sm">Entrega</div>
                    <div class="text-body2">{{ shipping.address }}</div>
                    <div class="text-body2">{{ shipping.city }}, {{ shipping.department }}</div>
                    <div class="text-caption text-grey-7 q-mt-xs">
                      {{ contact.email }} · {{ contact.phone }}
                    </div>
                    <q-btn
                      flat
                      dense
                      no-caps
                      color="primary"
                      icon="edit"
                      label="Editar datos"
                      class="q-mt-sm"
                      @click="step = 2"
                    />
                  </q-card-section>
                </q-card>

                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle1 text-weight-bold q-mb-sm">Método de pago</div>
                    <div class="row items-center q-gutter-sm">
                      <q-icon :name="payment.method === 'tarjeta' ? 'credit_card' : payment.method === 'cuenta_bancaria' ? 'account_balance' : 'payments'" />
                      <span class="text-weight-bold">{{ paymentLabel }}</span>
                      <span v-if="payment.method === 'tarjeta'" class="text-caption text-grey-7">
                        **** {{ cardDigits().slice(-4) }}
                      </span>
                      <span v-else-if="payment.method === 'cuenta_bancaria'" class="text-caption text-grey-7">
                        {{ payment.bank }} · ****
                        {{ String(payment.account || '').replace(/\D/g, '').slice(-4) }}
                      </span>
                    </div>
                    <q-btn
                      flat
                      dense
                      no-caps
                      color="primary"
                      icon="edit"
                      label="Cambiar"
                      class="q-mt-sm"
                      @click="step = 3"
                    />
                  </q-card-section>
                </q-card>
              </div>

              <div class="summary-card">
                <div class="text-subtitle1 text-weight-bold q-mb-md">Recibo</div>
                <div class="summary-row">
                  <span>Productos ({{ cart.count }})</span>
                  <span>{{ formatCurrency(subtotal) }}</span>
                </div>
                <div class="summary-row">
                  <span>Envío · {{ activeZone ? activeZone.label : shipping.department }}</span>
                  <span v-if="shippingCost === 0" class="text-positive text-weight-bold">Gratis</span>
                  <span v-else>{{ formatCurrency(shippingCost) }}</span>
                </div>
                <q-separator class="q-my-md" />
                <div class="summary-row summary-total">
                  <span>Total a pagar</span>
                  <span>{{ formatCurrency(total) }}</span>
                </div>

                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="check_circle"
                  label="Confirmar compra"
                  class="full-width q-mt-lg"
                  :loading="creating"
                  @click="confirm"
                />

                <div class="text-caption text-grey-7 q-mt-md">
                  <q-icon name="verified_user" size="14px" class="q-mr-xs" />
                  Al confirmar reservamos el stock y enviamos el resumen a tu correo.
                </div>

                <q-btn
                  flat
                  no-caps
                  color="primary"
                  icon="arrow_back"
                  label="Volver al pago"
                  class="full-width q-mt-xs"
                  @click="step = 3"
                />
              </div>
            </div>
          </q-step>
        </q-stepper>

        <div v-if="!auth.isAuthenticated" class="q-mt-lg">
          <q-banner class="bg-orange-1 text-orange-9" rounded dense>
            Necesitas iniciar sesión para confirmar el pedido.
            <template #action>
              <q-btn flat dense no-caps color="primary" label="Ingresar" @click="goToLogin" />
            </template>
          </q-banner>
        </div>
      </template>
    </div>
  </div>
</template>
