<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersApi } from '../../api/client'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatusBadge from '../../components/common/StatusBadge.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()

const orders = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

async function load() {
  loading.value = true
  try {
    const response = await ordersApi.mine({ page: currentPage(), limit: 10 })
    orders.value = response.data.orders || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar tus pedidos')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  router.push({ name: 'account-orders', query: page > 1 ? { page: String(page) } : {} })
}

watch(() => route.query.page, load)
onMounted(load)

useSeo({
  title: 'Mis pedidos',
  description: 'Consulta el estado y el detalle de tus pedidos reservados en DOS BYTES.',
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Historial de compras</span>
        <h1 class="title-lg">Mis pedidos</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} pedidos · pago en tienda al recoger.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="storefront" label="Seguir comprando" to="/productos" />
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton v-for="index in 3" :key="index" height="120px" style="border-radius: 14px" />
    </div>

    <div v-else-if="orders.length" class="stack">
      <q-card
        v-for="order in orders"
        :key="order._id"
        flat
        bordered
        class="order-card"
      >
        <q-card-section>
          <div class="row items-start justify-between q-gutter-md">
            <div>
              <div class="row items-center q-gutter-sm">
                <span class="text-subtitle1 text-weight-bold" style="letter-spacing: 0.04em">
                  {{ order.code }}
                </span>
                <StatusBadge :status="order.status" type="order" />
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">
                Creado el {{ formatDateTime(order.createdAt) }} ·
                {{ order.items?.length || 0 }} productos
              </div>
            </div>
            <div class="text-right">
              <div class="text-caption text-grey-7">Total</div>
              <div class="text-h6 text-weight-bold text-primary">
                {{ formatCurrency(order.total) }}
              </div>
            </div>
          </div>

          <div class="q-mt-md text-body2 text-grey-8">
            <div v-for="(item, index) in order.items" :key="index">
              {{ item.quantity }} × {{ item.name }}
              <span class="text-grey-6">— {{ formatCurrency(item.subtotal) }}</span>
            </div>
          </div>

          <div class="row items-center justify-between q-mt-md">
            <span v-if="order.pickupNotes" class="text-caption text-grey-7">
              <q-icon name="notes" size="14px" class="q-mr-xs" />{{ order.pickupNotes }}
            </span>
            <span v-else />
            <q-btn
              flat
              no-caps
              color="primary"
              icon="visibility"
              label="Ver detalle"
              :to="{ name: 'account-order-detail', params: { code: order.code } }"
            />
          </div>
        </q-card-section>
      </q-card>

      <PaginationBar
        :page="meta.page || currentPage()"
        :pages="meta.pages || 1"
        :total="meta.total"
        @update:page="changePage"
      />
    </div>

    <EmptyState
      v-else
      icon="receipt_long"
      title="Todavía no tienes pedidos"
      text="Cuando reserves productos, aparecerán aquí con su estado y código de retiro."
    >
      <q-btn unelevated no-caps color="primary" icon="storefront" label="Ver catálogo" to="/productos" />
    </EmptyState>
  </div>
</template>
