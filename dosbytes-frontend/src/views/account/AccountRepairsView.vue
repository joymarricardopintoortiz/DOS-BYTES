<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceOrdersApi } from '../../api/client'
import { EQUIPMENT_TYPES } from '../../utils/constants'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'
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

function equipmentText(order) {
  const type = EQUIPMENT_TYPES[order.equipment?.type]?.label || 'Equipo'
  const details = [order.equipment?.brand, order.equipment?.model].filter(Boolean).join(' ')
  return details ? `${type} · ${details}` : type
}

function warrantyText(order) {
  if (!order.warranty?.days) return ''
  if (!order.warranty.expiresAt) return `${order.warranty.days} días de garantía`
  return `Garantía hasta ${formatDate(order.warranty.expiresAt)}`
}

async function load() {
  loading.value = true
  try {
    const response = await serviceOrdersApi.mine({ page: currentPage(), limit: 10 })
    orders.value = response.data.orders || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar tus reparaciones')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  router.push({
    name: 'account-repairs',
    query: page > 1 ? { page: String(page) } : {},
  })
}

watch(() => route.query.page, load)
onMounted(load)

useSeo({
  title: 'Mis reparaciones',
  description: 'Consulta el historial y el estado de tus reparaciones en DOS BYTES.',
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Servicio técnico</span>
        <h1 class="title-lg">Mis reparaciones</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} órdenes registradas con tu cuenta o correo.
        </p>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="handyman"
        label="Solicitar reparación"
        to="/servicio-tecnico"
      />
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton v-for="index in 3" :key="index" height="140px" style="border-radius: 14px" />
    </div>

    <div v-else-if="orders.length" class="stack">
      <q-card v-for="order in orders" :key="order._id" flat bordered>
        <q-card-section>
          <div class="row items-start justify-between q-gutter-md">
            <div>
              <div class="row items-center q-gutter-sm">
                <span class="text-subtitle1 text-weight-bold" style="letter-spacing: 0.04em">
                  {{ order.code }}
                </span>
                <StatusBadge :status="order.status" />
              </div>
              <div class="text-weight-bold q-mt-sm">{{ equipmentText(order) }}</div>
              <div class="text-caption text-grey-7">
                Recibido el {{ formatDateTime(order.receivedAt) }}
                <template v-if="order.promisedAt">
                  · Entrega estimada {{ formatDate(order.promisedAt) }}
                </template>
              </div>
            </div>
            <div class="text-right">
              <div class="text-caption text-grey-7">Cotización</div>
              <div class="text-h6 text-weight-bold text-primary">
                {{ formatCurrency(order.quote?.amount || 0) }}
              </div>
              <div v-if="order.finalCost" class="text-caption text-grey-7">
                Costo final: {{ formatCurrency(order.finalCost) }}
              </div>
            </div>
          </div>

          <p class="text-body2 text-grey-8 q-mt-md q-mb-none">
            <span class="text-weight-bold">Falla reportada:</span>
            {{ order.reportedIssue }}
          </p>

          <div class="row items-center justify-between q-mt-md q-gutter-sm">
            <div class="text-caption text-grey-7">
              <template v-if="warrantyText(order)">
                <q-icon name="verified_user" size="14px" class="q-mr-xs text-positive" />
                {{ warrantyText(order) }}
              </template>
            </div>
            <q-btn
              flat
              no-caps
              color="primary"
              icon="track_changes"
              label="Ver seguimiento"
              :to="{ name: 'track', query: { codigo: order.code } }"
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
      icon="build_circle"
      title="Aún no tienes reparaciones registradas"
      text="Cuando registres un equipo con tu correo, aparecerá aquí su historial y estado."
    >
      <q-btn unelevated no-caps color="primary" icon="handyman" label="Solicitar servicio" to="/servicio-tecnico" />
    </EmptyState>
  </div>
</template>
