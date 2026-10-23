<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productsApi } from '../../api/client'
import { useSiteStore } from '../../stores/site'
import { PRODUCT_SORT_OPTIONS } from '../../utils/constants'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import ProductCard from '../../components/product/ProductCard.vue'
import ProductFilters from '../../components/product/ProductFilters.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()
const site = useSiteStore()

const products = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)
const mobileFilters = ref(false)
const sort = ref('relevance')
const filters = ref({
  q: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  available: false,
  minRating: '',
  isOffer: false,
  featured: false,
})

const page = computed(() => Number(route.query.page) || 1)
const categoryName = computed(() => {
  const category = site.categories.find((item) => item.slug === filters.value.category)
  return category?.name || ''
})
const title = computed(() => {
  if (filters.value.q) return `Resultados para “${filters.value.q}”`
  if (categoryName.value) return categoryName.value
  if (filters.value.isOffer) return 'Ofertas'
  if (filters.value.featured) return 'Productos destacados'
  return 'Catálogo de productos'
})

const activeChips = computed(() => {
  const chips = []
  if (filters.value.q) chips.push({ key: 'q', label: `Búsqueda: ${filters.value.q}` })
  if (filters.value.category) chips.push({ key: 'category', label: categoryName.value || filters.value.category })
  if (filters.value.minPrice) chips.push({ key: 'minPrice', label: `Desde $${filters.value.minPrice}` })
  if (filters.value.maxPrice) chips.push({ key: 'maxPrice', label: `Hasta $${filters.value.maxPrice}` })
  if (filters.value.available) chips.push({ key: 'available', label: 'Disponibles' })
  if (filters.value.minRating) chips.push({ key: 'minRating', label: `${filters.value.minRating}★ o más` })
  if (filters.value.isOffer) chips.push({ key: 'isOffer', label: 'Ofertas' })
  if (filters.value.featured) chips.push({ key: 'featured', label: 'Destacados' })
  return chips
})

function filtersFromRoute() {
  const query = route.query
  filters.value = {
    q: String(query.q || ''),
    category: String(query.category || ''),
    minPrice: query.minPrice ? String(query.minPrice) : '',
    maxPrice: query.maxPrice ? String(query.maxPrice) : '',
    available: query.available === 'true',
    minRating: query.minRating ? String(query.minRating) : '',
    isOffer: query.isOffer === 'true',
    featured: query.featured === 'true',
  }
  sort.value = String(query.sort || 'relevance')
}

function buildQuery(nextFilters, nextPage = 1, nextSort = sort.value) {
  const query = {}
  if (nextFilters.q) query.q = nextFilters.q
  if (nextFilters.category) query.category = nextFilters.category
  if (nextFilters.minPrice) query.minPrice = nextFilters.minPrice
  if (nextFilters.maxPrice) query.maxPrice = nextFilters.maxPrice
  if (nextFilters.available) query.available = 'true'
  if (nextFilters.minRating) query.minRating = nextFilters.minRating
  if (nextFilters.isOffer) query.isOffer = 'true'
  if (nextFilters.featured) query.featured = 'true'
  if (nextSort && nextSort !== 'relevance') query.sort = nextSort
  if (nextPage > 1) query.page = String(nextPage)
  return query
}

async function load() {
  loading.value = true
  try {
    const response = await productsApi.list({
      q: filters.value.q || undefined,
      category: filters.value.category || undefined,
      minPrice: filters.value.minPrice || undefined,
      maxPrice: filters.value.maxPrice || undefined,
      available: filters.value.available ? 'true' : undefined,
      minRating: filters.value.minRating || undefined,
      isOffer: filters.value.isOffer ? 'true' : undefined,
      featured: filters.value.featured ? 'true' : undefined,
      sort: sort.value,
      page: page.value,
      limit: 20,
    })
    products.value = response.data.products || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudo cargar el catálogo')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  mobileFilters.value = false
  router.push({ name: 'catalog', query: buildQuery(filters.value, 1) })
}

function removeFilter(key) {
  const next = { ...filters.value }
  if (key === 'available' || key === 'isOffer' || key === 'featured') next[key] = false
  else next[key] = ''
  filters.value = next
  applyFilters()
}

function clearAll() {
  filters.value = {
    q: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    available: false,
    minRating: '',
    isOffer: false,
    featured: false,
  }
  router.push({ name: 'catalog', query: {} })
}

function changeSort(value) {
  sort.value = value
  router.push({ name: 'catalog', query: buildQuery(filters.value, 1, value) })
}

function changePage(value) {
  router.push({ name: 'catalog', query: buildQuery(filters.value, value) })
}

watch(
  () => route.query,
  () => {
    filtersFromRoute()
    load()
  },
  { immediate: true, deep: true }
)

useSeo(() => ({
  title: title.value,
  description: `Explora ${categoryName.value || 'el catálogo'} de DOS BYTES: accesorios, periféricos, consolas, videojuegos y papelería con pago en tienda.`,
  canonical: route.fullPath,
}))

onMounted(() => {
  site.load().catch(() => {})
})
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <router-link to="/productos">Catálogo</router-link>
        <template v-if="categoryName">
          <q-icon name="chevron_right" size="14px" />
          <span>{{ categoryName }}</span>
        </template>
      </div>

      <div class="page-head">
        <div>
          <span class="eyebrow">Tienda DOS BYTES</span>
          <h1 class="title-xl">{{ title }}</h1>
          <p class="text-body2 text-grey-7 q-mb-none">
            {{ meta.total || 0 }} productos encontrados. Precios en pesos colombianos.
          </p>
        </div>
        <q-btn
          outline
          no-caps
          color="primary"
          icon="tune"
          label="Filtros"
          class="lt-md"
          @click="mobileFilters = true"
        />
      </div>

      <div class="row q-col-gutter-lg">
        <aside class="col-12 col-md-3 gt-sm">
          <ProductFilters
            v-model="filters"
            :categories="site.categories"
            @apply="applyFilters"
          />
        </aside>

        <div class="col-12 col-md-9">
          <div class="results-bar">
            <div class="active-filters">
              <q-chip
                v-for="chip in activeChips"
                :key="chip.key"
                removable
                color="primary"
                text-color="white"
                size="sm"
                @remove="removeFilter(chip.key)"
              >
                {{ chip.label }}
              </q-chip>
              <q-btn
                v-if="activeChips.length"
                flat
                dense
                no-caps
                label="Limpiar todo"
                color="primary"
                size="sm"
                @click="clearAll"
              />
            </div>
            <div class="row items-center q-gutter-sm">
              <span class="text-caption text-grey-7">Ordenar por</span>
              <q-select
                :model-value="sort"
                :options="PRODUCT_SORT_OPTIONS"
                dense
                outlined
                emit-value
                map-options
                style="min-width: 180px"
                @update:model-value="changeSort"
              />
            </div>
          </div>

          <div v-if="loading" class="product-grid">
            <q-skeleton v-for="index in 9" :key="index" class="skeleton-card" />
          </div>

          <div v-else-if="products.length" class="product-grid">
            <ProductCard v-for="product in products" :key="product._id" :product="product" />
          </div>

          <EmptyState
            v-else
            icon="search_off"
            title="No encontramos productos con esos filtros"
            text="Prueba con otra búsqueda, cambia la categoría o limpia los filtros."
          >
            <q-btn outline no-caps color="primary" label="Limpiar filtros" @click="clearAll" />
          </EmptyState>

          <PaginationBar
            :page="meta.page || page"
            :pages="meta.pages || 1"
            :total="meta.total"
            @update:page="changePage"
          />
        </div>
      </div>
    </div>

    <q-dialog v-model="mobileFilters" position="bottom">
      <q-card style="width: 100%; max-height: 90vh" class="q-pa-md">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold">Filtros</div>
          <q-btn flat round dense icon="close" v-close-popup aria-label="Cerrar" />
        </div>
        <div style="overflow-y: auto; max-height: 72vh">
          <ProductFilters
            v-model="filters"
            :categories="site.categories"
            @apply="applyFilters"
          />
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>
