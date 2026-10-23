<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ordersApi } from '../../api/client'
import { formatCurrency, formatDateTime, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import StatusBadge from '../../components/common/StatusBadge.vue'
import StatusTimeline from '../../components/common/StatusTimeline.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const confirm = useConfirm()

const order = ref(null)
const loading = ref(true)
const error = ref('')
const cancelling = ref(false)

const canCancel = computed(
  () => order.value && ['reservado', 'listo'].includes(order.value.status)
)

const history = computed(() => {
  const items = order.value?.history || []
  return [...items].sort((a, b) => new Date(a.at) - new Date(b.at))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await ordersApi.getByCode(route.params.code)
    order.value = response.data.order
  } catch (err) {
    error.value =
      err.status === 404
        ? 'No encontramos este pedido. Verifica el código.'
        : err.message || 'No se pudo cargar el pedido'
    if (err.status !== 404) notifyError(err, 'No se pudo cargar el pedido')
  } finally {
    loading.value = false
  }
}

async function cancelOrder() {
  const accepted = await confirm({
    title: 'Cancelar pedido',
    message:
      'Se liberará el stock de los productos reservados. Puedes volver a reservarlos más tarde si están disponibles.',
    okLabel: 'Sí, cancelar',
    cancelLabel: 'Volver',
    color: 'negative',
  })
  if (!accepted) return

  cancelling.value = true
  try {
    const response = await ordersApi.cancel(order.value.code, {
      note: 'Cancelado por el cliente desde su cuenta',
    })
    order.value = response.data.order
    notifySuccess(response.message || 'Pedido cancelado')
  } catch (err) {
    notifyError(err, 'No se pudo cancelar el pedido')
  } finally {
    cancelling.value = false
  }
}

function orderImage(item) {
  return mediaUrl(productImage(item.product))
}

onMounted(load)

useSeo(() => ({
  title: order.value ? `Pedido ${order.value.code}` : 'Detalle del pedido',
  description: 'Detalle y estado de tu pedido en DOS BYTES.',
}))
</script>

<template>
  <div>
    <div class="breadcrumb">
      <router-link to="/mi-cuenta">Mi cuenta</router-link>
      <q-icon name="chevron_right" size="14px" />
      <router-link to="/mi-cuenta/pedidos">Mis pedidos</router-link>
      <q-icon name="chevron_right" size="14px" />
      <span>{{ route.params.code }}</span>
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton height="170px" style="border-radius: 14px" />
      <q-skeleton height="240px" style="border-radius: 14px" />
    </div>

    <EmptyState
      v-else-if="error || !order"
      icon="receipt_long"
      title="Pedido no disponible"
      :text="error || 'No encontramos este pedido.'"
    >
      <q-btn unelevated no-caps color="primary" label="Volver a mis pedidos" to="/mi-cuenta/pedidos" />
    </EmptyState>

    <template v-else>
      <div class="page-head">
        <div>
          <span class="eyebrow">Pedido</span>
          <h1 class="title-lg" style="letter-spacing: 0.04em">{{ order.code }}</h1>
          <p class="text-body2 text-grey-7 q-mb-none">
            Creado el {{ formatDateTime(order.createdAt) }}
          </p>
        </div>
        <div class="inline-actions">
          <StatusBadge :status="order.status" type="order" />
          <q-btn
            v-if="canCancel"
            outline
            no-caps
            color="negative"
            icon="cancel"
            label="Cancelar pedido"
            :loading="cancelling"
            @click="cancelOrder"
          />
        </div>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-8">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Productos</div>

              <div v-for="(item, index) in order.items" :key="index" class="cart-line">
                <img :src="orderImage(item)" :alt="item.name" />
                <div>
                  <div class="cart-line-name">{{ item.name }}</div>
                  <div class="text-caption text-grey-7">Código: {{ item.code }}</div>
                  <div class="text-caption text-grey-7">
                    {{ item.quantity }} × {{ formatCurrency(item.price) }}
                  </div>
                </div>
                <div class="text-right text-weight-bold">
                  {{ formatCurrency(item.subtotal) }}
                </div>
              </div>

              <div class="summary-row summary-total">
                <span>Total</span>
                <span>{{ formatCurrency(order.total) }}</span>
              </div>
              <div class="text-caption text-grey-7 q-mt-sm">
                Pago en tienda al recoger. No se realizan cobros en línea.
              </div>
            </q-card-section>
          </q-card>

          <q-card v-if="order.pickupNotes" flat bordered class="q-mt-md">
            <q-card-section>
              <div class="text-caption text-grey-7">Notas del pedido</div>
              <p class="text-body2 q-mb-none" style="white-space: pre-line">
                {{ order.pickupNotes }}
              </p>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Estado del pedido</div>
              <StatusTimeline
                v-if="history.length"
                :history="history"
                :current="order.status"
                type="order"
              />
              <div v-else class="text-body2 text-grey-7">Sin movimientos registrados.</div>
            </q-card-section>
          </q-card>

          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-sm">Datos de retiro</div>
              <div class="meta-list">
                <div>
                  <span>Código</span>
                  <strong>{{ order.code }}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong><StatusBadge :status="order.status" type="order" /></strong>
                </div>
                <div>
                  <span>Entrega</span>
                  <strong>{{ formatDateTime(order.deliveredAt) }}</strong>
                </div>
                <div v-if="order.cancelledAt">
                  <span>Cancelado</span>
                  <strong>{{ formatDateTime(order.cancelledAt) }}</strong>
                </div>
              </div>
              <q-separator class="q-my-md" />
              <div class="text-caption text-grey-7">
                Presenta este código en la tienda para reclamar tu pedido.
              </div>
              <q-btn
                outline
                no-caps
                color="primary"
                icon="arrow_back"
                label="Volver a mis pedidos"
                to="/mi-cuenta/pedidos"
                class="full-width q-mt-md"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </div>
</template>
