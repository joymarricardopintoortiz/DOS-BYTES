<script setup>
import { onMounted, ref } from 'vue'
import { favoritesApi } from '../../api/client'
import { useFavoritesStore } from '../../stores/favorites'
import { notifyError } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import ProductCard from '../../components/product/ProductCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const favoritesStore = useFavoritesStore()
const confirm = useConfirm()

const favorites = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const response = await favoritesApi.list()
    favorites.value = response.data.favorites || []
    favoritesStore.ids = favorites.value
      .map((favorite) => favorite.product?._id)
      .filter(Boolean)
      .map(String)
    favoritesStore.loaded = true
  } catch (error) {
    notifyError(error, 'No se pudieron cargar tus favoritos')
  } finally {
    loading.value = false
  }
}

async function remove(favorite) {
  const accepted = await confirm({
    title: 'Quitar de favoritos',
    message: `¿Quieres quitar "${favorite.product?.name}" de tu lista?`,
    okLabel: 'Quitar',
  })
  if (!accepted) return
  try {
    await favoritesStore.toggle(favorite.product._id)
    favorites.value = favorites.value.filter((item) => item._id !== favorite._id)
  } catch (error) {
    notifyError(error, 'No se pudo quitar el favorito')
  }
}

onMounted(load)

useSeo({
  title: 'Mis favoritos',
  description: 'Productos que guardaste como favoritos en DOS BYTES.',
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Tu lista</span>
        <h1 class="title-lg">Mis favoritos</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ favorites.length }} productos guardados.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="storefront" label="Explorar catálogo" to="/productos" />
    </div>

    <div v-if="loading" class="product-grid">
      <q-skeleton v-for="index in 6" :key="index" class="skeleton-card" />
    </div>

    <div v-else-if="favorites.length" class="product-grid">
      <div v-for="favorite in favorites" :key="favorite._id" class="favorite-wrapper">
        <ProductCard :product="favorite.product" />
        <q-btn
          class="favorite-remove"
          round
          dense
          unelevated
          color="negative"
          icon="delete"
          aria-label="Quitar de favoritos"
          @click.stop="remove(favorite)"
        >
          <q-tooltip>Quitar de favoritos</q-tooltip>
        </q-btn>
      </div>
    </div>

    <EmptyState
      v-else
      icon="favorite_border"
      title="Tu lista de favoritos está vacía"
      text="Toca el corazón en cualquier producto para guardarlo y encontrarlo aquí."
    >
      <q-btn unelevated no-caps color="primary" icon="storefront" label="Ver catálogo" to="/productos" />
    </EmptyState>
  </div>
</template>

<style scoped>
.favorite-wrapper {
  position: relative;
  display: flex;
}

.favorite-wrapper > :deep(.product-card) {
  flex: 1;
}

.favorite-remove {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
}
</style>
