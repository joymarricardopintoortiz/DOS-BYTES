<script setup>
import { computed, onMounted, ref } from 'vue'
import { homeApi } from '../../api/client'
import { useSiteStore } from '../../stores/site'
import { SERVICE_LINES } from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import ProductSection from '../../components/product/ProductSection.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const site = useSiteStore()

const home = ref(null)
const loading = ref(true)
const error = ref('')
const trackCode = ref('')

const config = computed(() => home.value?.config || site.siteConfig)
const categories = computed(() => home.value?.categories || site.categories)
const sections = computed(() => home.value?.sections || {})
const serviceGroups = computed(() =>
  Object.entries(home.value?.services || {}).map(([line, services]) => ({
    line,
    label: SERVICE_LINES[line]?.label || line,
    icon: SERVICE_LINES[line]?.icon || 'apps',
    services,
    cheapest: Math.min(...services.map((service) => Number(service.price) || 0)),
  }))
)

const heroStyle = computed(() => {
  const banner = config.value?.banners?.[0]
  if (!banner?.image) return {}
  return {
    backgroundImage: `linear-gradient(110deg, rgba(8,24,46,.94) 0%, rgba(11,31,58,.78) 45%, rgba(18,50,90,.55) 100%), url(${banner.image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
})

const heroTitle = computed(
  () => config.value?.banners?.[0]?.title || 'Tecnología que funciona, servicio que responde.'
)
const heroSubtitle = computed(
  () =>
    config.value?.banners?.[0]?.subtitle ||
    config.value?.description ||
    'Reparación de consolas, laptops y PC, cibercafé, impresión, papelería y accesorios. Compra en línea y paga al recoger.'
)

function goTrack() {
  const code = trackCode.value.trim().toUpperCase()
  router.push({ name: 'track', query: code ? { codigo: code } : {} })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await homeApi.get()
    home.value = response.data
    if (response.data.config) site.config = response.data.config
    if (response.data.categories) site.categories = response.data.categories
    site.loaded = true
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la portada'
    notifyError(err, 'No se pudo cargar la portada')
    await site.load(true).catch(() => {})
  } finally {
    loading.value = false
  }
}

useSeo(() => ({
  title: config.value?.businessName
    ? `${config.value.businessName} | Tecnología y servicio técnico`
    : 'Tecnología y servicio técnico',
  description: config.value?.description,
  canonical: '/',
}))

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <section class="hero" :style="heroStyle">
        <div class="hero-copy">
          <span class="hero-kicker">
            <q-icon name="verified" size="15px" />
            Servicio técnico con garantía
          </span>
          <h1 class="hero-title">{{ heroTitle }}</h1>
          <p class="hero-text">{{ heroSubtitle }}</p>
          <div class="hero-actions">
            <q-btn
              unelevated
              no-caps
              color="secondary"
              text-color="primary"
              icon="storefront"
              label="Ver catálogo"
              to="/productos"
              size="md"
            />
            <q-btn
              outline
              no-caps
              color="white"
              icon="handyman"
              label="Solicitar reparación"
              to="/servicio-tecnico"
              size="md"
            />
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <strong>Diagnóstico claro</strong>
              <span>Cotización antes de reparar</span>
            </div>
            <div class="hero-stat">
              <strong>Pago en tienda</strong>
              <span>Reserva y recoge</span>
            </div>
            <div class="hero-stat">
              <strong>Atención directa</strong>
              <span>Consolas, laptops y PC</span>
            </div>
          </div>
        </div>
        <svg class="hero-visual" viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="180" fill="none" stroke="#00C2FF" stroke-width="2" />
          <circle cx="200" cy="200" r="130" fill="none" stroke="#FFC93C" stroke-width="2" />
          <rect x="120" y="135" width="70" height="130" rx="20" fill="#00C2FF" />
          <rect x="210" y="135" width="70" height="130" rx="20" fill="#FFC93C" />
        </svg>
      </section>

      <div v-if="loading" class="section">
        <div class="category-strip">
          <q-skeleton v-for="index in 7" :key="index" height="104px" />
        </div>
      </div>

      <template v-else>
        <q-banner v-if="error" class="bg-red-1 text-negative q-mt-lg" rounded>
          {{ error }}
          <template #action>
            <q-btn flat no-caps color="negative" label="Reintentar" @click="load" />
          </template>
        </q-banner>

        <section v-if="categories.length" class="section">
          <div class="category-strip">
            <router-link
              v-for="category in categories"
              :key="category._id"
              class="category-card"
              :to="{ name: 'catalog', query: { category: category.slug } }"
            >
              <span class="category-icon"><q-icon name="category" /></span>
              <span>{{ category.name }}</span>
              <span class="text-caption text-grey-6">{{ category.productCount || 0 }} productos</span>
            </router-link>
          </div>
        </section>

        <section v-if="config.banners?.length" class="section">
          <div class="banner-strip">
            <div v-for="(banner, index) in config.banners.slice(0, 3)" :key="index" class="banner-card">
              <img v-if="banner.image" :src="banner.image" :alt="banner.title" />
              <div class="banner-card-content">
                <h3>{{ banner.title }}</h3>
                <p>{{ banner.subtitle }}</p>
                <q-btn
                  v-if="banner.link"
                  flat
                  no-caps
                  color="white"
                  icon="arrow_forward"
                  label="Ver más"
                  size="sm"
                  :to="banner.link"
                  class="q-mt-sm"
                />
              </div>
            </div>
          </div>
        </section>

        <ProductSection
          title="Ofertas de la semana"
          kicker="Precios especiales"
          :products="sections.offers || []"
          :link="{ name: 'catalog', query: { isOffer: 'true' } }"
          link-label="Ver ofertas"
        />

        <ProductSection
          title="Productos destacados"
          kicker="Los más pedidos"
          :products="sections.featured || []"
          :link="{ name: 'catalog', query: { featured: 'true' } }"
          link-label="Ver destacados"
        />

        <ProductSection
          title="Recién llegados"
          kicker="Novedades"
          :products="sections.newest || []"
          :link="{ name: 'catalog', query: { sort: 'newest' } }"
          link-label="Ver novedades"
        />

        <ProductSection
          title="Mejor calificados"
          kicker="Recomendados por clientes"
          :products="sections.topRated || []"
          :link="{ name: 'catalog', query: { sort: 'rating' } }"
          link-label="Ver mejor calificados"
        />

        <section v-if="serviceGroups.length" class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">Nuestros servicios</span>
              <h2 class="section-title">Todo lo que hacemos en DOS BYTES</h2>
            </div>
            <router-link class="section-link" to="/servicios">
              Ver tarifas <q-icon name="arrow_forward" size="16px" />
            </router-link>
          </div>

          <div class="product-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))">
            <router-link
              v-for="group in serviceGroups"
              :key="group.line"
              class="surface-card q-pa-lg"
              to="/servicios"
            >
              <div class="category-icon q-mb-sm"><q-icon :name="group.icon" /></div>
              <div class="text-subtitle1 text-weight-bold">{{ group.label }}</div>
              <p class="text-body2 text-grey-7 q-my-sm">
                {{ group.services.length }} servicios disponibles.
                Desde {{ formatCurrency(group.cheapest) }}.
              </p>
              <ul class="text-body2 text-grey-8" style="padding-left: 18px; margin: 0">
                <li v-for="service in group.services.slice(0, 3)" :key="service._id">
                  {{ service.name }}
                </li>
              </ul>
              <div class="text-primary text-weight-bold q-mt-md">
                Ver detalles <q-icon name="chevron_right" size="16px" />
              </div>
            </router-link>
          </div>
        </section>

        <section class="section">
          <div class="surface-card q-pa-lg row items-center justify-between q-gutter-lg">
            <div>
              <span class="eyebrow">Seguimiento</span>
              <h2 class="section-title">Consulta el estado de tu reparación</h2>
              <p class="text-body2 text-grey-7 q-mb-none">
                Ingresa el código que recibiste por correo, por ejemplo SRV-AB12CD.
              </p>
            </div>
            <form class="row q-gutter-sm" style="min-width: min(100%, 360px)" @submit.prevent="goTrack">
              <q-input
                v-model="trackCode"
                outlined
                dense
                label="Código de la orden"
                class="col"
                maxlength="30"
              />
              <q-btn unelevated no-caps color="primary" icon="search" label="Consultar" type="submit" />
            </form>
          </div>
        </section>

        <EmptyState
          v-if="!loading && !error && !sections.newest?.length && !sections.offers?.length"
          icon="storefront"
          title="El catálogo está tomando forma"
          text="Muy pronto encontrarás productos, ofertas y accesorios disponibles en la tienda."
        >
          <q-btn outline no-caps color="primary" label="Ver servicios" to="/servicios" />
        </EmptyState>
      </template>
    </div>
  </div>
</template>
