<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ordersApi } from '../../api/client'
import {
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
  ORDER_TRANSITIONS,
} from '../../utils/constants'
import {
  formatCurrency,
  formatDateTime,
  productImage,
} from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatusBadge from '../../components/common/StatusBadge.vue'
import StatusTimeline from '../../components/common/StatusTimeline.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()

const orders = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)
const filters = ref({ q: '', status: '' })

const detailOpen = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

const statusDialog = ref(false)
const statusTarget = ref(null)
const statusForm = ref({ status: '', note: '' })
const changing = ref(false)

const statusOptions = computed(() => [
  { label: 'Todos los estados', value: '' },
  ...ORDER_STATUS_OPTIONS,
])

const nextStatusOptions = computed(() => {
  const allowed = ORDER_TRANSITIONS[statusTarget.value?.status] || []
  return allowed.map((value) => ({
    value,
    label: ORDER_STATUS[value]?.label || value,
  }))
})

const columns = [
  { name: 'code', label: 'Pedido', field: 'code', align: 'left' },
  { name: 'customer', label: 'Cliente', field: 'customer.name', align: 'left' },
  { name: 'items', label: 'Productos', field: 'items', align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'right' },
  { name: 'status', label: 'Estado', field: 'status', align: 'left' },
  { name: 'createdAt', label: 'Creado', field: 'createdAt', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

function filtersFromRoute() {
  filters.value = {
    q: String(route.query.q || ''),
    status: String(route.query.status || ''),
  }
}

function applyFilters() {
  const query = {}
  if (filters.value.q.trim()) query.q = filters.value.q.trim()
  if (filters.value.status) query.status = filters.value.status
  router.push({ name: 'panel-orders', query })
}

function clearFilters() {
  filters.value = { q: '', status: '' }
  router.push({ name: 'panel-orders', query: {} })
}

function changePage(page) {
  const query = { ...route.query }
  if (page > 1) query.page = String(page)
  else delete query.page
  router.push({ name: 'panel-orders', query })
}

function customerName(order) {
  return order.customer?.name || 'Cliente'
}

function itemsSummary(order) {
  if (!order.items?.length) return 'Sin productos'
  return order.items
    .map((item) => `${item.quantity} × ${item.name}`)
    .join(' · ')
}

function itemImage(item) {
  return mediaUrl(productImage(item.product))
}

function detailHistory(order) {
  return [...(order?.history || [])].sort((a, b) => new Date(a.at) - new Date(b.at))
}

async function load() {
  loading.value = true
  try {
    const response = await ordersApi.list({
      page: currentPage(),
      limit: 15,
      q: route.query.q || undefined,
      status: route.query.status || undefined,
    })
    orders.value = response.data.orders || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar los pedidos')
  } finally {
    loading.value = false
  }
}

async function openDetail(order) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const response = await ordersApi.getByCode(order.code)
    detail.value = response.data.order
  } catch (error) {
    notifyError(error, 'No se pudo cargar el pedido')
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function openStatus(order) {
  statusTarget.value = order
  statusForm.value = {
    status: (ORDER_TRANSITIONS[order.status] || [])[0] || '',
    note: '',
  }
  statusDialog.value = true
}

async function applyStatus() {
  if (!statusTarget.value || !statusForm.value.status) return
  changing.value = true
  try {
    const response = await ordersApi.changeStatus(statusTarget.value._id, {
      status: statusForm.value.status,
      ...(statusForm.value.note.trim() ? { note: statusForm.value.note.trim() } : {}),
    })
    const updated = response.data.order
    orders.value = orders.value.map((order) =>
      order._id === updated._id ? { ...order, ...updated } : order
    )
    if (detail.value?._id === updated._id) {
      detail.value = { ...detail.value, ...updated }
    }
    statusDialog.value = false
    notifySuccess(response.message || 'Pedido actualizado')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar el pedido')
  } finally {
    changing.value = false
  }
}

watch(
  () => route.query,
  () => {
    filtersFromRoute()
    load()
  },
  { immediate: true }
)

useSeo({ title: 'Pedidos' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Pedidos</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} reservas registradas · pago en tienda.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
    </div>

    <q-card flat bordered>
      <div class="panel-toolbar">
        <q-input
          v-model="filters.q"
          outlined
          dense
          clearable
          label="Buscar"
          placeholder="Código del pedido o producto"
          style="min-width: 250px; flex: 1"
          @keyup.enter="applyFilters"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select
          v-model="filters.status"
          :options="statusOptions"
          outlined
          dense
          emit-value
          map-options
          label="Estado"
          style="min-width: 190px"
        />
        <q-btn unelevated no-caps color="primary" icon="filter_alt" label="Aplicar" @click="applyFilters" />
        <q-btn flat no-caps color="primary" label="Limpiar" @click="clearFilters" />
      </div>

      <q-table
        :rows="orders"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        flat
        dense
        class="table-wrap"
        no-data-label="No hay pedidos con esos filtros"
      >
        <template #body-cell-code="props">
          <q-td :props="props">
            <button
              type="button"
              class="text-primary text-weight-bold"
              style="border: 0; background: transparent; padding: 0; letter-spacing: 0.03em; cursor: pointer"
              @click="openDetail(props.row)"
            >
              {{ props.row.code }}
            </button>
          </q-td>
        </template>

        <template #body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ customerName(props.row) }}</div>
            <div class="text-caption text-grey-7">
              {{ props.row.customer?.email || 'Sin correo' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-items="props">
          <q-td :props="props">
            <div class="ellipsis" style="max-width: 260px">
              {{ itemsSummary(props.row) }}
            </div>
            <div class="text-caption text-grey-7">
              {{ props.row.items?.length || 0 }} productos
            </div>
          </q-td>
        </template>

        <template #body-cell-total="props">
          <q-td :props="props" class="text-weight-bold">
            {{ formatCurrency(props.row.total) }}
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props"><StatusBadge :status="props.row.status" type="order" /></q-td>
        </template>

        <template #body-cell-createdAt="props">
          <q-td :props="props">{{ formatDateTime(props.row.createdAt) }}</q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="inline-actions" style="justify-content: flex-end">
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                aria-label="Ver pedido"
                @click="openDetail(props.row)"
              >
                <q-tooltip>Ver detalle</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="swap_horiz"
                color="secondary"
                aria-label="Cambiar estado"
                :disable="!(ORDER_TRANSITIONS[props.row.status] || []).length"
                @click="openStatus(props.row)"
              >
                <q-tooltip>Cambiar estado</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>

      <div class="q-pa-md">
        <PaginationBar
          :page="meta.page || currentPage()"
          :pages="meta.pages || 1"
          :total="meta.total"
          @update:page="changePage"
        />
      </div>
    </q-card>

    <q-dialog v-model="detailOpen">
      <q-card style="width: min(760px, 95vw); max-height: 92vh">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div>
            <div class="text-caption text-grey-7">Pedido</div>
            <div class="text-h6 text-weight-bold" style="letter-spacing: 0.04em">
              {{ detail?.code || 'Cargando…' }}
            </div>
          </div>
          <q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-none" style="overflow-y: auto; max-height: 70vh">
          <div v-if="detailLoading" class="q-pa-lg">
            <q-skeleton height="120px" class="q-mb-md" />
            <q-skeleton height="180px" />
          </div>

          <div v-else-if="detail" class="q-pa-lg">
            <div class="row items-start justify-between q-gutter-md q-mb-md">
              <div>
                <div class="text-weight-bold">{{ customerName(detail) }}</div>
                <div class="text-caption text-grey-7">
                  {{ detail.customer?.email || 'Sin correo' }}
                  <template v-if="detail.customer?.phone"> · {{ detail.customer.phone }}</template>
                </div>
                <div class="text-caption text-grey-7">
                  Creado el {{ formatDateTime(detail.createdAt) }}
                </div>
              </div>
              <StatusBadge :status="detail.status" type="order" />
            </div>

            <div class="text-weight-bold q-mb-sm">Productos</div>
            <div v-for="(item, index) in detail.items" :key="index" class="cart-line">
              <img :src="itemImage(item)" :alt="item.name" />
              <div>
                <div class="cart-line-name">{{ item.name }}</div>
                <div class="text-caption text-grey-7">
                  {{ item.code }} · {{ item.quantity }} × {{ formatCurrency(item.price) }}
                </div>
              </div>
              <div class="text-right text-weight-bold">{{ formatCurrency(item.subtotal) }}</div>
            </div>

            <div class="summary-row summary-total">
              <span>Total</span>
              <span>{{ formatCurrency(detail.total) }}</span>
            </div>

            <div v-if="detail.pickupNotes" class="soft-card q-pa-md q-mt-md">
              <div class="text-caption text-weight-bold text-primary q-mb-xs">Notas del cliente</div>
              <div class="text-body2" style="white-space: pre-line">{{ detail.pickupNotes }}</div>
            </div>

            <div class="q-mt-lg">
              <div class="text-weight-bold q-mb-sm">Historial</div>
              <StatusTimeline
                v-if="detailHistory(detail).length"
                :history="detailHistory(detail)"
                :current="detail.status"
                type="order"
              />
              <div v-else class="text-caption text-grey-7">Sin movimientos registrados.</div>
            </div>
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cerrar" v-close-popup />
          <q-btn
            v-if="detail"
            outline
            no-caps
            color="primary"
            icon="swap_horiz"
            label="Cambiar estado"
            :disable="!(ORDER_TRANSITIONS[detail.status] || []).length"
            @click="openStatus(detail)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="statusDialog" persistent>
      <q-card style="width: min(480px, 94vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="swap_horiz" color="primary" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Cambiar estado del pedido</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="soft-card q-pa-md q-mb-md">
            <div class="text-weight-bold">{{ statusTarget?.code }}</div>
            <div class="text-caption text-grey-7">{{ customerName(statusTarget || {}) }}</div>
            <div class="q-mt-xs">
              <StatusBadge :status="statusTarget?.status" type="order" />
            </div>
          </div>

          <q-select
            v-model="statusForm.status"
            :options="nextStatusOptions"
            outlined
            emit-value
            map-options
            label="Nuevo estado"
            class="q-mb-md"
          />
          <q-input
            v-model="statusForm.note"
            type="textarea"
            outlined
            autogrow
            maxlength="500"
            counter
            label="Nota del cambio (opcional)"
          />
          <q-banner
            v-if="statusForm.status === 'cancelado'"
            class="bg-orange-1 text-orange-9 q-mt-md"
            rounded
            dense
          >
            <template #avatar><q-icon name="warning" /></template>
            Al cancelar se devuelve el stock de los productos reservados.
          </q-banner>
          <q-banner
            v-if="statusForm.status === 'listo'"
            class="bg-blue-1 text-primary q-mt-md"
            rounded
            dense
          >
            <template #avatar><q-icon name="mail" /></template>
            Se intentará notificar al cliente que su pedido está listo.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Aplicar cambio"
            :loading="changing"
            :disable="!statusForm.status"
            @click="applyStatus"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
