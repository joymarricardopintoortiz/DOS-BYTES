<script setup>
import { computed, onMounted, ref } from 'vue'
import { servicesApi } from '../../api/client'
import { SERVICE_LINES, PRICE_UNITS } from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import EmptyState from '../../components/common/EmptyState.vue'

const services = ref([])
const loading = ref(true)

const grouped = computed(() => {
  const groups = {}
  services.value.forEach((service) => {
    if (!groups[service.line]) groups[service.line] = []
    groups[service.line].push(service)
  })
  return Object.entries(groups).map(([line, items]) => ({
    line,
    label: SERVICE_LINES[line]?.label || line,
    icon: SERVICE_LINES[line]?.icon || 'apps',
    items,
    cheapest: Math.min(...items.map((item) => Number(item.price) || 0)),
  }))
})

async function load() {
  loading.value = true
  try {
    const response = await servicesApi.list()
    services.value = response.data.services || []
  } catch (error) {
    notifyError(error, 'No se pudieron cargar los servicios')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Servicios y tarifas',
  description:
    'Tarifas de servicio técnico, cibercafé, impresión y copias de DOS BYTES. Reparación de consolas, laptops y PC con diagnóstico y garantía.',
  canonical: '/servicios',
})

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Servicios y tarifas</span>
      </div>

      <div class="page-head">
        <div>
          <span class="eyebrow">Lo que hacemos</span>
          <h1 class="title-xl">Servicios y tarifas</h1>
          <p class="text-body2 text-grey-7 q-mb-none" style="max-width: 680px">
            Reparación de equipos, cibercafé, impresión, copias y más. Los precios son
            de referencia; la cotización final se confirma después del diagnóstico.
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
        <q-skeleton v-for="index in 3" :key="index" height="180px" />
      </div>

      <template v-else-if="grouped.length">
        <section v-for="group in grouped" :key="group.line" class="section">
          <div class="section-head">
            <div class="row items-center q-gutter-md">
              <div class="category-icon"><q-icon :name="group.icon" /></div>
              <div>
                <h2 class="section-title">{{ group.label }}</h2>
                <span class="text-caption text-grey-7">
                  Desde {{ formatCurrency(group.cheapest) }}
                </span>
              </div>
            </div>
            <q-btn
              v-if="group.line === 'tecnico'"
              flat
              no-caps
              color="primary"
              icon="arrow_forward"
              label="Solicitar"
              to="/servicio-tecnico"
            />
          </div>

          <div class="product-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))">
            <q-card v-for="service in group.items" :key="service._id" flat bordered class="q-pa-lg">
              <div class="row items-start justify-between q-gutter-sm">
                <div class="text-subtitle1 text-weight-bold">{{ service.name }}</div>
                <q-badge color="primary" class="q-px-sm q-py-xs">
                  {{ formatCurrency(service.price) }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">
                {{ PRICE_UNITS[service.priceUnit] || service.priceUnit }}
              </div>
              <p class="text-body2 text-grey-8 q-mt-md q-mb-sm">
                {{ service.description || 'Consulta los detalles con nuestro equipo.' }}
              </p>
              <div v-if="service.warrantyDays" class="text-caption text-positive">
                <q-icon name="verified_user" size="14px" class="q-mr-xs" />
                Garantía de {{ service.warrantyDays }} días
              </div>
            </q-card>
          </div>
        </section>

        <section class="section">
          <div class="soft-card q-pa-lg row items-center justify-between q-gutter-lg">
            <div>
              <div class="text-subtitle1 text-weight-bold">¿No encuentras lo que buscas?</div>
              <p class="text-body2 text-grey-7 q-mb-none">
                Cuéntanos qué necesitas y te orientamos sin compromiso.
              </p>
            </div>
            <div class="inline-actions">
              <q-btn outline no-caps color="primary" icon="mail" label="Contacto" to="/contacto" />
              <q-btn unelevated no-caps color="primary" icon="handyman" label="Solicitar reparación" to="/servicio-tecnico" />
            </div>
          </div>
        </section>
      </template>

      <EmptyState
        v-else
        icon="build_circle"
        title="Tarifas en actualización"
        text="Estamos preparando la lista de servicios. Mientras tanto, puedes contactarnos."
      >
        <q-btn unelevated no-caps color="primary" label="Contactar" to="/contacto" />
      </EmptyState>
    </div>
  </div>
</template>
