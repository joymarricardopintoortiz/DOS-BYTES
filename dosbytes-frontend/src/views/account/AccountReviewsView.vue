<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reviewsApi, usersApi } from '../../api/client'
import { formatDateTime, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import StarRating from '../../components/common/StarRating.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()

const reviews = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)
const saving = ref(false)
const editing = ref(null)
const editForm = ref({ rating: 5, comment: '' })

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

async function load() {
  loading.value = true
  try {
    const response = await usersApi.myReviews({ page: currentPage(), limit: 10 })
    reviews.value = response.data.reviews || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar tus opiniones')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  router.push({
    name: 'account-reviews',
    query: page > 1 ? { page: String(page) } : {},
  })
}

function startEdit(review) {
  editing.value = review
  editForm.value = { rating: review.rating, comment: review.comment || '' }
}

async function saveEdit() {
  if (!editing.value) return
  saving.value = true
  try {
    await reviewsApi.update(editing.value._id, {
      rating: editForm.value.rating,
      comment: editForm.value.comment.trim(),
    })
    editing.value = null
    await load()
    notifySuccess('Opinión actualizada')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar la opinión')
  } finally {
    saving.value = false
  }
}

async function remove(review) {
  const accepted = await confirm({
    title: 'Eliminar opinión',
    message: 'La opinión se eliminará del producto y esta acción no se puede deshacer.',
    okLabel: 'Eliminar',
  })
  if (!accepted) return
  try {
    await reviewsApi.remove(review._id)
    if (reviews.value.length === 1 && currentPage() > 1) {
      changePage(currentPage() - 1)
    } else {
      await load()
    }
    notifySuccess('Opinión eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la opinión')
  }
}

watch(() => route.query.page, load)
onMounted(load)

useSeo({
  title: 'Mis opiniones',
  description: 'Gestiona las opiniones y calificaciones que publicaste en DOS BYTES.',
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Tu comunidad</span>
        <h1 class="title-lg">Mis opiniones</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} opiniones publicadas.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="storefront" label="Comprar y opinar" to="/productos" />
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton v-for="index in 3" :key="index" height="130px" style="border-radius: 14px" />
    </div>

    <div v-else-if="reviews.length" class="stack">
      <q-card v-for="review in reviews" :key="review._id" flat bordered>
        <q-card-section>
          <div class="row items-start q-gutter-md">
            <router-link
              v-if="review.product?.slug"
              :to="{ name: 'product', params: { slug: review.product.slug } }"
              class="review-product-thumb"
            >
              <img :src="mediaUrl(productImage(review.product))" :alt="review.product?.name" />
            </router-link>
            <div style="min-width: 0; flex: 1">
              <div class="row items-start justify-between q-gutter-sm">
                <div>
                  <router-link
                    v-if="review.product?.slug"
                    class="text-weight-bold"
                    :to="{ name: 'product', params: { slug: review.product.slug } }"
                  >
                    {{ review.product.name }}
                  </router-link>
                  <span v-else class="text-weight-bold">Producto no disponible</span>
                  <div class="text-caption text-grey-7">
                    Publicada el {{ formatDateTime(review.createdAt) }}
                    <template v-if="review.editedAt"> · editada</template>
                  </div>
                </div>
                <div class="inline-actions">
                  <q-btn flat dense round icon="edit" color="primary" aria-label="Editar" @click="startEdit(review)" />
                  <q-btn flat dense round icon="delete" color="negative" aria-label="Eliminar" @click="remove(review)" />
                </div>
              </div>

              <StarRating :value="review.rating" :size="16" show-value class="q-mt-xs" />
              <p v-if="review.comment" class="review-comment">{{ review.comment }}</p>
              <p v-else class="text-caption text-grey-6 q-mt-sm q-mb-none">
                Sin comentario.
              </p>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <PaginationBar
        :page="meta.page || currentPage()"
        :pages="meta.pages || 1"
        :total="meta.total"
        @update:page="changePage"
      />
    </div>

    <EmptyState
      v-else
      icon="star_border"
      title="Todavía no has publicado opiniones"
      text="Después de comprar un producto puedes calificarlo y contar tu experiencia."
    >
      <q-btn unelevated no-caps color="primary" icon="storefront" label="Ver productos" to="/productos" />
    </EmptyState>

    <q-dialog :model-value="Boolean(editing)" @update:model-value="editing = null">
      <q-card style="width: min(500px, 94vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="edit" color="primary" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Editar opinión</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey-7 q-mb-sm">{{ editing?.product?.name }}</div>
          <div class="row items-center q-gutter-md q-mb-md">
            <q-rating v-model="editForm.rating" :max="5" size="30px" color="warning" />
            <span class="text-caption text-grey-7">{{ editForm.rating }} de 5 estrellas</span>
          </div>
          <q-input
            v-model="editForm.comment"
            type="textarea"
            outlined
            autogrow
            maxlength="1000"
            counter
            label="Comentario (opcional)"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" @click="editing = null" />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Guardar"
            :loading="saving"
            @click="saveEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.review-product-thumb {
  display: block;
  flex: 0 0 72px;
  overflow: hidden;
  border: 1px solid var(--db-line);
  border-radius: 9px;
  background: #fff;
}

.review-product-thumb img {
  display: block;
  width: 72px;
  height: 72px;
  object-fit: contain;
  padding: 4px;
}
</style>
