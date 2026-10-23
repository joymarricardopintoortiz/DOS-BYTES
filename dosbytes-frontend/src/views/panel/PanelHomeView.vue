<script setup>
import { computed, onMounted, ref } from 'vue'
import { statsApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { SERVICE_ORDER_STATUS } from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatCard from '../../components/common/StatCard.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'

const auth = useAuthStore()

const stats = ref(null)
const loading = ref(true)
const error = ref('')

const statusRows = computed(() => {
  const rows = stats.value?.serviceOrdersByStatus || []
  const max = Math.max(1, ...rows.map((row) => row.count))
  return rows.map((row) => ({
    ...row,
    label: SERVICE_ORDER_STATUS[row.status]?.label || row.status,
    color: SERVICE_ORDER_STATUS[row.status]?.color || 'grey',
    percent: (row.count / max) * 100,
  }))
})

const quickLinks = computed(() => {
  const links = [
    {
      label: 'Nueva orden de servicio',
      icon: 'add_circle',
      text: 'Registra un equipo recibido en el local.',
      to: '/panel/ordenes/nueva',
      color: 'primary',
    },
    {
      label: 'Órdenes de servicio',
      icon: 'build_circle',
      text: 'Diagnóstico, cotización y estados.',
      to: '/panel/ordenes',
    },
    {
      label: 'Pedidos',
      icon: 'receipt_long',
      text: 'Reservas de clientes y entregas.',
      to: '/panel/pedidos',
    },
    {
      label: 'Productos',
      icon: 'inventory_2',
      text: 'Catálogo, precios y fotografías.',
      to: '/panel/productos',
    },
    {
      label: 'Inventario bajo',
      icon: 'warning_amber',
      text: 'Productos por agotarse.',
      to: '/panel/inventario',
    },
    {
      label: 'Categorías',
      icon: 'category',
      text: 'Organiza el catálogo.',
      to: '/panel/categorias',
    },
  ]
  if (auth.isAdmin) {
    links.push(
      {
        label: 'Tarifas de servicios',
        icon: 'sell',
        text: 'Precios de servicio técnico y más.',
        to: '/panel/servicios',
      },
      {
        label: 'Usuarios',
        icon: 'group',
        text: 'Clientes, empleados y accesos.',
        to: '/panel/usuarios',
      },
      {
        label: 'Configuración',
        icon: 'settings',
        text: 'Contacto, banners y logo.',
        to: '/panel/configuracion',
      }
    )
  }
  return links
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await statsApi.get()
    stats.value = response.data
  } catch (err) {
    error.value = err.message || 'No se pudieron cargar las estadísticas'
    notifyError(err, 'No se pudieron cargar las estadísticas')
  } finally {
    loading.value = false
  }
}

onMounted(load)

useSeo({
  title: 'Panel de administración',
  description: 'Resumen operativo de DOS BYTES.',
})
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <span class="eyebrow">Panel interno</span>
        <h1 class="title-lg">Hola, {{ auth.displayName }}</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ auth.roleLabel }} · resumen de la operación de DOS BYTES.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn
          outline
          no-caps
          color="primary"
          icon="refresh"
          label="Actualizar"
          :loading="loading"
          @click="load"
        />
        <q-btn
          v-if="auth.isAdmin"
          unelevated
          no-caps
          color="primary"
          icon="settings"
          label="Configuración"
          to="/panel/configuracion"
        />
      </div>
    </div>

    <q-banner v-if="error" class="bg-red-1 text-negative q-mb-lg" rounded>
      {{ error }}
      <template #action>
        <q-btn flat no-caps color="negative" label="Reintentar" @click="load" />
      </template>
    </q-banner>

    <div v-if="loading">
      <div class="stat-grid">
        <q-skeleton v-for="index in 8" :key="index" height="86px" style="border-radius: 14px" />
      </div>
      <q-skeleton height="240px" class="q-mt-lg" style="border-radius: 14px" />
    </div>

    <template v-else-if="stats">
      <div class="stat-grid">
        <StatCard
          label="Órdenes de servicio activas"
          :value="stats.pendingServiceOrders"
          icon="build_circle"
          hint="Sin entregar ni descartar"
        />
        <StatCard
          label="Pedidos pendientes"
          :value="stats.pendingOrders"
          icon="receipt_long"
          color="secondary"
          hint="Reservados o listos"
        />
        <StatCard
          label="Productos visibles"
          :value="stats.products"
          icon="inventory_2"
          color="primary"
          hint="En el catálogo"
        />
        <StatCard
          label="Inventario bajo"
          :value="stats.lowStock"
          icon="warning_amber"
          color="warning"
          hint="Requieren reposición"
        />
        <StatCard
          label="Clientes activos"
          :value="stats.customers"
          icon="group"
          color="positive"
          hint="Cuentas verificadas"
        />
        <StatCard
          v-if="auth.isAdmin"
          label="Empleados activos"
          :value="stats.employees"
          icon="badge"
          color="info"
          hint="Cuentas de personal"
        />
        <StatCard
          label="Pedidos entregados"
          :value="stats.deliveredOrders"
          icon="done_all"
          color="positive"
          hint="Histórico"
        />
        <StatCard
          label="Ingresos entregados"
          :value="formatCurrency(stats.revenue)"
          icon="payments"
          color="accent"
          hint="Pedidos pagados en tienda"
        />
      </div>

      <div class="row q-col-gutter-lg q-mt-lg">
        <div class="col-12 col-md-6">
          <q-card flat bordered class="fit">
            <q-card-section>
              <div class="row items-center justify-between q-mb-md">
                <div class="text-subtitle1 text-weight-bold">Órdenes por estado</div>
                <q-btn flat dense no-caps color="primary" label="Ver todas" to="/panel/ordenes" />
              </div>

              <div v-if="statusRows.length" class="stack">
                <div v-for="row in statusRows" :key="row.status">
                  <div class="row items-center justify-between q-mb-xs">
                    <StatusBadge :status="row.status" />
                    <strong class="text-body2">{{ row.count }}</strong>
                  </div>
                  <q-linear-progress
                    :value="row.percent / 100"
                    size="8px"
                    rounded
                    color="primary"
                    track-color="grey-3"
                  />
                </div>
              </div>
              <div v-else class="text-body2 text-grey-7">
                Todavía no hay órdenes de servicio registradas.
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card flat bordered class="fit">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Accesos rápidos</div>
              <div class="row q-col-gutter-sm">
                <div v-for="link in quickLinks" :key="link.to" class="col-12 col-sm-6">
                  <router-link :to="link.to" class="surface-card q-pa-sm row items-center q-gutter-sm">
                    <q-icon :name="link.icon" color="secondary" size="22px" />
                    <span class="text-body2 text-weight-bold">{{ link.label }}</span>
                  </router-link>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card flat bordered class="q-mt-lg">
        <q-card-section class="row items-center justify-between q-gutter-md">
          <div>
            <div class="text-subtitle1 text-weight-bold">Moderación de comunidad</div>
            <div class="text-body2 text-grey-7">
              Revisa opiniones y responde las preguntas de los clientes.
            </div>
          </div>
          <div class="inline-actions">
            <q-btn outline no-caps color="primary" icon="star" label="Opiniones" to="/panel/opiniones" />
            <q-btn outline no-caps color="primary" icon="help_outline" label="Preguntas" to="/panel/preguntas" />
          </div>
        </q-card-section>
      </q-card>
    </template>
  </div>
</template>
