<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceOrdersApi } from '../../api/client'
import {
  EQUIPMENT_TYPES,
  SERVICE_ORDER_STATUS_OPTIONS,
} from '../../utils/constants'
import { formatDate, formatDateTime } from '../../utils/format'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatusBadge from '../../components/common/StatusBadge.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()

const orders = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)

const filters = ref({ q: '', status: '', source: '' })

const statusOptions = computed(() => [
  { label: 'Todos los estados', value: '' },
  ...SERVICE_ORDER_STATUS_OPTIONS,
])

const sourceOptions = [
  { label: 'Todos los orígenes', value: '' },
  { label: 'Web', value: 'web' },
  { label: 'Local', value: 'local' },
]

const columns = [
  { name: 'code', label: 'Código', field: 'code', align: 'left', sortable: false },
  { name: 'customer', label: 'Cliente', field: 'customerSnapshot.name', align: 'left' },
  { name: 'equipment', label: 'Equipo', field: 'equipment.model', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'left' },
  { name: 'receivedAt', label: 'Recibido', field: 'receivedAt', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

function filtersFromRoute() {
  filters.value = {
    q: String(route.query.q || ''),
    status: String(route.query.status || ''),
    source: String(route.query.source || ''),
  }
}

function applyFilters() {
  const query = {}
  if (filters.value.q.trim()) query.q = filters.value.q.trim()
  if (filters.value.status) query.status = filters.value.status
  if (filters.value.source) query.source = filters.value.source
  router.push({ name: 'panel-service-orders', query })
}

function clearFilters() {
  filters.value = { q: '', status: '', source: '' }
  router.push({ name: 'panel-service-orders', query: {} })
}

function changePage(page) {
  const query = { ...route.query }
  if (page > 1) query.page = String(page)
  else delete query.page
  router.push({ name: 'panel-service-orders', query })
}

function customerName(order) {
  return order.customer?.name || order.customerSnapshot?.name || 'Cliente'
}

function equipmentText(order) {
  const type = EQUIPMENT_TYPES[order.equipment?.type]?.label || 'Equipo'
  const details = [order.equipment?.brand, order.equipment?.model].filter(Boolean).join(' ')
  return details ? `${type} · ${details}` : type
}

async function load() {
  loading.value = true
  try {
    const response = await serviceOrdersApi.list({
      page: currentPage(),
      limit: 15,
      q: route.query.q || undefined,
      status: route.query.status || undefined,
      source: route.query.source || undefined,
    })
    orders.value = response.data.orders || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las órdenes de servicio')
  } finally {
    loading.value = false
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

onMounted(filtersFromRoute)

useSeo({ title: 'Órdenes de servicio' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Órdenes de servicio</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} órdenes registradas.
        </p>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="add"
        label="Nueva orden"
        to="/panel/ordenes/nueva"
      />
    </div>

    <q-card flat bordered>
      <div class="panel-toolbar">
        <q-input
          v-model="filters.q"
          outlined
          dense
          clearable
          label="Buscar"
          placeholder="Código, cliente, serie o modelo"
          style="min-width: 260px; flex: 1"
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
        <q-select
          v-model="filters.source"
          :options="sourceOptions"
          outlined
          dense
          emit-value
          map-options
          label="Origen"
          style="min-width: 150px"
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
        no-data-label="No hay órdenes con esos filtros"
      >
        <template #body-cell-code="props">
          <q-td :props="props">
            <router-link
              class="text-primary text-weight-bold"
              :to="{ name: 'panel-service-order', params: { id: props.row._id } }"
            >
              {{ props.row.code }}
            </router-link>
          </q-td>
        </template>

        <template #body-cell-customer="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ customerName(props.row) }}</div>
            <div class="text-caption text-grey-7">
              {{ props.row.customerSnapshot?.email || 'Sin correo' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-equipment="props">
          <q-td :props="props">
            <div>{{ equipmentText(props.row) }}</div>
            <div class="text-caption text-grey-7">
              {{ props.row.equipment?.serial || 'Sin serie' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props"><StatusBadge :status="props.row.status" /></q-td>
        </template>

        <template #body-cell-receivedAt="props">
          <q-td :props="props">
            <div>{{ formatDate(props.row.receivedAt) }}</div>
            <div class="text-caption text-grey-7">
              Prometido: {{ formatDate(props.row.promisedAt) }}
            </div>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              round
              icon="visibility"
              color="primary"
              aria-label="Ver orden"
              :to="{ name: 'panel-service-order', params: { id: props.row._id } }"
            >
              <q-tooltip>Ver detalle</q-tooltip>
            </q-btn>
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
  </div>
</template>
