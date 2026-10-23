<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { productsApi } from '../../api/client'
import { formatCurrency } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { useUiStore } from '../../stores/ui'

const router = useRouter()
const ui = useUiStore()

const query = ref('')
const open = ref(false)
const loading = ref(false)
const products = ref([])
const categories = ref([])
let timer = null
let blurTimer = null
let requestId = 0

const showRecent = computed(() => !query.value.trim() && ui.recentSearches.length > 0)

function scheduleSearch() {
  clearTimeout(timer)
  const term = query.value.trim()
  if (term.length < 2) {
    products.value = []
    categories.value = []
    loading.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    const current = ++requestId
    try {
      const response = await productsApi.suggestions({ q: term })
      if (current !== requestId) return
      products.value = response.data.products || []
      categories.value = response.data.categories || []
    } catch {
      if (current === requestId) {
        products.value = []
        categories.value = []
      }
    } finally {
      if (current === requestId) loading.value = false
    }
  }, 280)
}

function onFocus() {
  clearTimeout(blurTimer)
  open.value = true
  if (query.value.trim().length >= 2 && !products.value.length) scheduleSearch()
}

function onBlur() {
  blurTimer = setTimeout(() => {
    open.value = false
  }, 160)
}

function submit() {
  const term = query.value.trim()
  open.value = false
  if (!term) return
  ui.pushRecentSearch(term)
  router.push({ name: 'catalog', query: { q: term } })
}

function applyRecent(term) {
  query.value = term
  submit()
}

function goProduct(product) {
  open.value = false
  ui.pushRecentSearch(query.value.trim() || product.name)
  query.value = ''
  router.push({ name: 'product', params: { slug: product.slug } })
}

function goCategory(category) {
  open.value = false
  query.value = ''
  router.push({ name: 'catalog', query: { category: category.slug } })
}

function clear() {
  query.value = ''
  products.value = []
  categories.value = []
}
</script>

<template>
  <form class="search-autocomplete" role="search" @submit.prevent="submit">
    <q-input
      v-model="query"
      class="search-field"
      outlined
      dense
      placeholder="Busca productos, código o categoría"
      aria-label="Buscar productos"
      @focus="onFocus"
      @blur="onBlur"
      @update:model-value="scheduleSearch"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
      <template #append>
        <q-spinner v-if="loading" size="18px" color="primary" />
        <q-btn
          v-else-if="query"
          flat
          round
          dense
          icon="close"
          aria-label="Limpiar búsqueda"
          @mousedown.prevent
          @click="clear"
        />
        <q-btn
          flat
          round
          dense
          icon="arrow_forward"
          aria-label="Buscar"
          @mousedown.prevent
          @click="submit"
        />
      </template>
    </q-input>

    <div v-if="open" class="search-dropdown">
      <template v-if="showRecent">
        <div class="search-group-label">Búsquedas recientes</div>
        <button
          v-for="term in ui.recentSearches"
          :key="term"
          type="button"
          class="search-item"
          @mousedown.prevent
          @click="applyRecent(term)"
        >
          <q-icon name="history" size="20px" color="grey-6" />
          <span class="search-item-name">{{ term }}</span>
        </button>
      </template>

      <template v-if="categories.length">
        <div class="search-group-label">Categorías</div>
        <button
          v-for="category in categories"
          :key="category._id"
          type="button"
          class="search-item"
          @mousedown.prevent
          @click="goCategory(category)"
        >
          <q-icon name="category" size="20px" color="grey-6" />
          <span class="search-item-name">{{ category.name }}</span>
          <q-icon name="chevron_right" size="18px" color="grey-5" />
        </button>
      </template>

      <template v-if="products.length">
        <div class="search-group-label">Productos</div>
        <button
          v-for="product in products"
          :key="product._id"
          type="button"
          class="search-item"
          @mousedown.prevent
          @click="goProduct(product)"
        >
          <img
            class="search-item-image"
            :src="mediaUrl(product.mainImage)"
            :alt="product.name"
            loading="lazy"
          />
          <span class="search-item-body">
            <span class="search-item-name">{{ product.name }}</span>
            <span class="search-item-meta">
              {{ product.code }} · {{ formatCurrency(product.price) }}
              <template v-if="!product.inStock"> · Agotado</template>
            </span>
          </span>
        </button>
      </template>

      <div
        v-if="query.trim().length >= 2 && !loading && !products.length && !categories.length"
        class="search-empty"
      >
        No encontramos coincidencias para “{{ query.trim() }}”. Prueba con otra palabra o el código del producto.
      </div>
    </div>
  </form>
</template>
