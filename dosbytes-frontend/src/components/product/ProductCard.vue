<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { useFavoritesStore } from '../../stores/favorites'
import { discountPercent, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify'
import PriceTag from '../common/PriceTag.vue'
import StarRating from '../common/StarRating.vue'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const cart = useCartStore()
const favorites = useFavoritesStore()

const image = computed(() => mediaUrl(productImage(props.product)))
const discount = computed(() => discountPercent(props.product))
const inStock = computed(() => Number(props.product.stock) > 0)
const isFavorite = computed(() => favorites.isFavorite(props.product._id))

function addToCart() {
  if (auth.isStaff) {
    notifyInfo('El carrito está disponible para las cuentas de cliente.')
    return
  }
  if (!auth.isAuthenticated) {
    notifyInfo('Inicia sesión para agregar productos al carrito.')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!inStock.value) return
  if (cart.add(props.product, 1)) {
    notifySuccess('Producto agregado al carrito')
  }
}

// Compra directa desde el catálogo: agrega y va al checkout.
function buyNow() {
  if (auth.isStaff) {
    notifyInfo('Las compras son exclusivas de las cuentas de cliente.')
    return
  }
  if (!auth.isAuthenticated) {
    notifyInfo('Inicia sesión para comprar este producto.')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!inStock.value) return
  if (cart.add(props.product, 1)) {
    router.push({ name: 'checkout' })
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
    const added = await favorites.toggle(props.product._id)
    notifySuccess(added ? 'Agregado a favoritos' : 'Eliminado de favoritos')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar el favorito')
  }
}
</script>

<template>
  <article class="product-card">
    <div class="product-media">
      <router-link :to="{ name: 'product', params: { slug: product.slug } }">
        <img :src="image" :alt="product.name" loading="lazy" />
      </router-link>
      <span v-if="discount > 0" class="discount-badge">-{{ discount }}%</span>
      <q-btn
        v-if="!auth.isStaff"
        class="favorite-btn"
        round
        dense
        flat
        :icon="isFavorite ? 'favorite' : 'favorite_border'"
        :color="isFavorite ? 'negative' : 'grey-7'"
        :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
        @click.stop.prevent="toggleFavorite"
      >
        <q-tooltip>{{ isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos' }}</q-tooltip>
      </q-btn>
    </div>

    <div class="product-body">
      <router-link
        class="product-name"
        :to="{ name: 'product', params: { slug: product.slug } }"
      >
        {{ product.name }}
      </router-link>

      <div class="product-rating">
        <StarRating
          :value="product.ratingAvg || 0"
          :count="product.ratingCount || 0"
          :size="13"
        />
        <span v-if="!product.ratingCount">Sin opiniones</span>
      </div>

      <PriceTag
        :price="product.price"
        :compare-at-price="product.compareAtPrice"
        size="sm"
      />

      <div class="product-foot">
        <span class="stock-text" :class="inStock ? 'in' : 'out'">
          {{ inStock ? `${product.stock} disponibles` : 'Agotado' }}
        </span>
        <div class="product-foot-actions">
          <q-btn
            v-if="!auth.isStaff"
            dense
            no-caps
            unelevated
            color="primary"
            label="Comprar"
            :disable="!inStock"
            @click.stop.prevent="buyNow"
          />
          <q-btn
            v-if="!auth.isStaff"
            round
            dense
            outline
            color="primary"
            icon="add_shopping_cart"
            :disable="!inStock"
            aria-label="Agregar al carrito"
            @click.stop.prevent="addToCart"
          >
            <q-tooltip>
              {{ auth.isAuthenticated ? 'Agregar al carrito' : 'Inicia sesión para agregar al carrito' }}
            </q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
  </article>
</template>
