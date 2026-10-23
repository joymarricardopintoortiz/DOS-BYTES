<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productsApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { useFavoritesStore } from '../../stores/favorites'
import { discountPercent, formatCurrency, formatNumber, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import ProductGallery from '../../components/product/ProductGallery.vue'
import ProductCard from '../../components/product/ProductCard.vue'
import StarRating from '../../components/common/StarRating.vue'
import PriceTag from '../../components/common/PriceTag.vue'
import ReviewSection from '../../components/product/ReviewSection.vue'
import QuestionSection from '../../components/product/QuestionSection.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const props = defineProps({
  slug: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const favorites = useFavoritesStore()

const product = ref(null)
const rating = ref({ average: 0, count: 0, breakdown: {} })
const related = ref([])
const loading = ref(true)
const error = ref('')
const quantity = ref(1)

const image = computed(() => mediaUrl(productImage(product.value)))
const discount = computed(() => discountPercent(product.value))
const inStock = computed(() => Number(product.value?.stock) > 0)
const maxQuantity = computed(() => Math.min(99, Number(product.value?.stock) || 1))
const isFavorite = computed(() => favorites.isFavorite(product.value?._id))

const description = computed(
  () => product.value?.description || 'Este producto aún no tiene una descripción detallada.'
)

async function load() {
  loading.value = true
  error.value = ''
  product.value = null
  related.value = []
  try {
    const response = await productsApi.get(props.slug)
    product.value = response.data.product
    rating.value = response.data.rating || { average: 0, count: 0, breakdown: {} }
    quantity.value = 1

    if (auth.isCustomer && product.value?._id) {
      const id = String(product.value._id)
      if (response.data.isFavorite && !favorites.ids.includes(id)) {
        favorites.ids = [...favorites.ids, id]
      }
      if (!response.data.isFavorite) {
        favorites.ids = favorites.ids.filter((item) => item !== id)
      }
    }

    productsApi
      .related(props.slug)
      .then((relatedResponse) => {
        related.value = relatedResponse.data.products || []
      })
      .catch(() => {})
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el producto'
    if (err.status !== 404) notifyError(err, 'No se pudo cargar el producto')
  } finally {
    loading.value = false
  }
}

function changeQuantity(delta) {
  quantity.value = Math.max(1, Math.min(maxQuantity.value, quantity.value + delta))
}

function addToCart() {
  if (auth.isStaff) {
    notifyInfo('El carrito está disponible para las cuentas de cliente.')
    return
  }
  if (!inStock.value) return
  if (cart.add(product.value, quantity.value)) {
    notifySuccess(`${quantity.value} unidad(es) agregadas al carrito`)
  }
}

async function toggleFavorite() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!auth.isCustomer) {
    notifyInfo('Los favoritos están disponibles para las cuentas de cliente.')
    return
  }
  try {
    const added = await favorites.toggle(product.value._id)
    notifySuccess(added ? 'Agregado a favoritos' : 'Eliminado de favoritos')
  } catch (err) {
    notifyError(err, 'No se pudo actualizar el favorito')
  }
}

function updateSummary(summary) {
  rating.value = summary
  if (product.value) {
    product.value.ratingAvg = summary.average
    product.value.ratingCount = summary.count
  }
}

useSeo(() => {
  if (!product.value) return { title: 'Producto', canonical: route.path }
  const plainDescription = (product.value.description || '')
    .replace(/\s+/g, ' ')
    .slice(0, 160)
  return {
    title: product.value.name,
    description:
      plainDescription ||
      `${product.value.name} disponible en DOS BYTES. Código ${product.value.code}.`,
    image: mediaUrl(productImage(product.value)),
    canonical: route.path,
    type: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.value.name,
      description: plainDescription,
      sku: product.value.code,
      image: [mediaUrl(productImage(product.value))],
      aggregateRating:
        product.value.ratingCount > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.value.ratingAvg,
              reviewCount: product.value.ratingCount,
            }
          : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'COP',
        price: product.value.price,
        availability: inStock.value
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    },
  }
})

watch(() => props.slug, load)
onMounted(load)
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div v-if="loading">
        <div class="detail-grid">
          <q-skeleton height="460px" style="border-radius: 14px" />
          <div>
            <q-skeleton type="text" width="40%" />
            <q-skeleton type="text" height="48px" width="85%" />
            <q-skeleton type="text" width="30%" />
            <q-skeleton height="60px" class="q-mt-lg" />
            <q-skeleton height="120px" class="q-mt-md" />
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="error || !product"
        icon="production_quantity_limits"
        title="Producto no disponible"
        :text="error || 'El producto que buscas no existe o fue retirado del catálogo.'"
      >
        <q-btn unelevated no-caps color="primary" label="Volver al catálogo" to="/productos" />
      </EmptyState>

      <template v-else>
        <div class="breadcrumb">
          <router-link to="/">Inicio</router-link>
          <q-icon name="chevron_right" size="14px" />
          <router-link to="/productos">Catálogo</router-link>
          <template v-if="product.category?.name">
            <q-icon name="chevron_right" size="14px" />
            <router-link
              :to="{ name: 'catalog', query: { category: product.category.slug } }"
            >
              {{ product.category.name }}
            </router-link>
          </template>
          <q-icon name="chevron_right" size="14px" />
          <span>{{ product.name }}</span>
        </div>

        <div class="detail-grid">
          <ProductGallery :images="product.images" :name="product.name" />

          <div class="detail-info">
            <div class="text-caption text-grey-7">
              {{ product.category?.name || 'Producto' }} · Nuevo
            </div>
            <h1 class="detail-title">{{ product.name }}</h1>
            <div class="row items-center q-gutter-sm">
              <StarRating :value="rating.average" :count="rating.count" :size="16" />
              <a href="#opiniones" class="text-caption text-primary">
                {{ rating.count ? 'Ver opiniones' : 'Sin opiniones' }}
              </a>
              <span v-if="product.soldCount" class="text-caption text-grey-7">
                · {{ formatNumber(product.soldCount) }} vendidos
              </span>
            </div>
            <div class="detail-code q-mt-sm">Código: {{ product.code }}</div>

            <div class="detail-price">
              <PriceTag
                :price="product.price"
                :compare-at-price="product.compareAtPrice"
                size="lg"
              />
              <q-badge v-if="discount > 0" color="warning" text-color="dark" class="q-ml-sm">
                -{{ discount }}%
              </q-badge>
            </div>
            <div class="text-caption text-grey-7">
              Precio en pesos colombianos. Pago en tienda al recoger.
            </div>

            <div class="surface-card buy-box">
              <div class="row items-center q-gutter-sm">
                <q-icon
                  :name="inStock ? 'check_circle' : 'cancel'"
                  :color="inStock ? 'positive' : 'negative'"
                />
                <span class="text-weight-bold" :class="inStock ? 'text-positive' : 'text-negative'">
                  {{ inStock ? `Disponible (${product.stock} unidades)` : 'Producto agotado' }}
                </span>
              </div>

              <div v-if="!auth.isStaff" class="quantity-row q-mt-md">
                <span class="text-body2 text-grey-8">Cantidad</span>
                <div class="row items-center q-gutter-xs">
                  <q-btn round outline dense icon="remove" :disable="quantity <= 1" @click="changeQuantity(-1)" />
                  <span class="text-weight-bold" style="min-width: 30px; text-align: center">
                    {{ quantity }}
                  </span>
                  <q-btn round outline dense icon="add" :disable="quantity >= maxQuantity" @click="changeQuantity(1)" />
                </div>
                <span class="text-caption text-grey-7">Máximo {{ maxQuantity }}</span>
              </div>

              <div v-if="!auth.isStaff" class="buy-actions">
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="add_shopping_cart"
                  label="Agregar al carrito"
                  class="col"
                  :disable="!inStock"
                  @click="addToCart"
                />
                <q-btn
                  outline
                  no-caps
                  :color="isFavorite ? 'negative' : 'primary'"
                  :icon="isFavorite ? 'favorite' : 'favorite_border'"
                  :label="isFavorite ? 'Guardado' : 'Favorito'"
                  @click="toggleFavorite"
                />
              </div>

              <q-banner v-else class="bg-blue-1 text-primary q-mt-md" rounded dense>
                Estás viendo el producto como personal. El carrito es exclusivo de clientes.
              </q-banner>

              <div class="meta-list">
                <div><span>Código</span><strong>{{ product.code }}</strong></div>
                <div v-if="product.sku"><span>SKU proveedor</span><strong>{{ product.sku }}</strong></div>
                <div><span>Categoría</span><strong>{{ product.category?.name || '—' }}</strong></div>
                <div><span>Disponibilidad</span><strong>{{ inStock ? 'En stock' : 'Agotado' }}</strong></div>
                <div><span>Garantía</span><strong>Según producto y fabricante</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-sections">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-8">
              <q-card flat bordered class="q-mb-lg">
                <q-card-section>
                  <h2 class="title-lg q-mb-md">Descripción</h2>
                  <div class="prose">{{ description }}</div>
                </q-card-section>
              </q-card>

              <q-card id="opiniones" flat bordered class="q-mb-lg">
                <q-card-section>
                  <ReviewSection
                    :slug="product.slug"
                    :summary="rating"
                    @update:summary="updateSummary"
                  />
                </q-card-section>
              </q-card>

              <q-card id="preguntas" flat bordered class="q-mb-lg">
                <q-card-section>
                  <QuestionSection :slug="product.slug" />
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-4">
              <q-card flat bordered class="q-pa-lg">
                <div class="text-subtitle1 text-weight-bold q-mb-sm">Compra con confianza</div>
                <div class="stack">
                  <div class="row items-start q-gutter-sm">
                    <q-icon name="verified_user" color="positive" size="22px" />
                    <div>
                      <div class="text-weight-bold text-body2">Productos con garantía</div>
                      <div class="text-caption text-grey-7">Respaldo del fabricante y soporte del local.</div>
                    </div>
                  </div>
                  <div class="row items-start q-gutter-sm">
                    <q-icon name="payments" color="secondary" size="22px" />
                    <div>
                      <div class="text-weight-bold text-body2">Pago en tienda</div>
                      <div class="text-caption text-grey-7">Reserva en línea y paga al recoger.</div>
                    </div>
                  </div>
                  <div class="row items-start q-gutter-sm">
                    <q-icon name="support_agent" color="primary" size="22px" />
                    <div>
                      <div class="text-weight-bold text-body2">Asesoría directa</div>
                      <div class="text-caption text-grey-7">Te ayudamos a elegir lo que necesitas.</div>
                    </div>
                  </div>
                </div>
                <q-separator class="q-my-md" />
                <q-btn
                  outline
                  no-caps
                  color="primary"
                  icon="help"
                  label="Hacer una pregunta"
                  class="full-width"
                  href="#preguntas"
                />
              </q-card>
            </div>
          </div>
        </div>

        <section v-if="related.length" class="section">
          <div class="section-head">
            <div>
              <span class="eyebrow">También te puede interesar</span>
              <h2 class="section-title">Productos relacionados</h2>
            </div>
            <router-link
              class="section-link"
              :to="{ name: 'catalog', query: { category: product.category?.slug } }"
            >
              Ver categoría
            </router-link>
          </div>
          <div class="product-grid">
            <ProductCard v-for="item in related" :key="item._id" :product="item" />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
