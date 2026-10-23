<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productsApi, reviewsApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { REVIEW_SORT_OPTIONS } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import StarRating from '../common/StarRating.vue'
import RatingSummary from './RatingSummary.vue'
import EmptyState from '../common/EmptyState.vue'
import PaginationBar from '../common/PaginationBar.vue'

const props = defineProps({
  slug: { type: String, required: true },
  summary: { type: Object, default: () => ({ average: 0, count: 0, breakdown: {} }) },
})

const emit = defineEmits(['update:summary'])

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const confirm = useConfirm()

const reviews = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const page = ref(1)
const ratingFilter = ref('')
const sort = ref('recent')
const loading = ref(false)
const submitting = ref(false)
const form = ref({ rating: 5, comment: '' })
const editingId = ref(null)
const editForm = ref({ rating: 5, comment: '' })

const myReview = computed(() => {
  if (!auth.user?._id) return null
  return reviews.value.find(
    (review) => String(review.user?._id || review.user) === String(auth.user._id)
  )
})

const filterOptions = [
  { label: 'Todas', value: '' },
  { label: '5 ★', value: 5 },
  { label: '4 ★', value: 4 },
  { label: '3 ★', value: 3 },
  { label: '2 ★', value: 2 },
  { label: '1 ★', value: 1 },
]

async function load() {
  loading.value = true
  try {
    const response = await productsApi.reviews(props.slug, {
      page: page.value,
      rating: ratingFilter.value || undefined,
      sort: sort.value,
    })
    reviews.value = response.data.reviews || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
    emit('update:summary', response.data.summary || props.summary)
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las opiniones')
  } finally {
    loading.value = false
  }
}

function changePage(value) {
  page.value = value
  load()
}

function changeFilter(value) {
  ratingFilter.value = value
  page.value = 1
  load()
}

function changeSort(value) {
  sort.value = value
  page.value = 1
  load()
}

function goLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

async function submitReview() {
  if (!auth.isCustomer) {
    goLogin()
    return
  }
  submitting.value = true
  try {
    await productsApi.createReview(props.slug, {
      rating: form.value.rating,
      comment: form.value.comment.trim(),
    })
    form.value = { rating: 5, comment: '' }
    page.value = 1
    await load()
    notifySuccess('Tu opinión fue publicada')
  } catch (error) {
    if (error.status === 409) await load()
    notifyError(error, 'No se pudo publicar la opinión')
  } finally {
    submitting.value = false
  }
}

function startEdit(review) {
  editingId.value = review._id
  editForm.value = { rating: review.rating, comment: review.comment || '' }
}

async function saveEdit() {
  try {
    await reviewsApi.update(editingId.value, {
      rating: editForm.value.rating,
      comment: editForm.value.comment.trim(),
    })
    editingId.value = null
    await load()
    notifySuccess('Opinión actualizada')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar la opinión')
  }
}

async function removeReview(review) {
  const accepted = await confirm({
    title: 'Eliminar opinión',
    message: 'Esta acción no se puede deshacer.',
    okLabel: 'Eliminar',
  })
  if (!accepted) return
  try {
    await reviewsApi.remove(review._id)
    await load()
    notifySuccess('Opinión eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la opinión')
  }
}

watch(
  () => props.slug,
  () => {
    page.value = 1
    ratingFilter.value = ''
    load()
  }
)

onMounted(load)
</script>

<template>
  <section>
    <div class="row items-center justify-between q-gutter-md q-mb-md">
      <div>
        <h2 class="title-lg">Opiniones</h2>
        <p class="text-body2 text-grey-7 q-mb-none">
          Calificaciones de clientes verificados.
        </p>
      </div>
      <q-select
        :model-value="sort"
        :options="REVIEW_SORT_OPTIONS"
        dense
        outlined
        emit-value
        map-options
        label="Ordenar"
        style="min-width: 180px"
        @update:model-value="changeSort"
      />
    </div>

    <RatingSummary :summary="summary" />

    <div class="q-mt-md row q-gutter-sm">
      <q-btn
        v-for="option in filterOptions"
        :key="String(option.value)"
        :label="option.label"
        :outline="ratingFilter !== option.value"
        :unelevated="ratingFilter === option.value"
        :color="ratingFilter === option.value ? 'primary' : 'grey-8'"
        no-caps
        dense
        @click="changeFilter(option.value)"
      />
    </div>

    <q-card v-if="auth.isCustomer && !myReview" flat bordered class="q-mt-lg">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Escribe tu opinión</div>
        <div class="row items-center q-gutter-md q-mb-md">
          <q-rating v-model="form.rating" :max="5" size="30px" color="warning" />
          <span class="text-caption text-grey-7">{{ form.rating }} de 5 estrellas</span>
        </div>
        <q-input
          v-model="form.comment"
          type="textarea"
          outlined
          autogrow
          maxlength="1000"
          counter
          label="Comparte tu experiencia (opcional)"
        />
        <div class="row justify-end q-mt-md">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="send"
            label="Publicar opinión"
            :loading="submitting"
            @click="submitReview"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-else-if="!auth.isAuthenticated" flat bordered class="q-mt-lg">
      <q-card-section class="row items-center justify-between q-gutter-md">
        <div>
          <div class="text-subtitle1 text-weight-bold">¿Compraste este producto?</div>
          <div class="text-body2 text-grey-7">Inicia sesión para calificarlo y dejar tu opinión.</div>
        </div>
        <q-btn unelevated no-caps color="primary" label="Ingresar" @click="goLogin" />
      </q-card-section>
    </q-card>

    <q-banner v-else-if="auth.isStaff" class="bg-blue-1 text-primary q-mt-lg" rounded>
      Las opiniones son publicadas por clientes. Como personal puedes moderarlas desde el panel.
    </q-banner>

    <q-card v-if="myReview" flat bordered class="q-mt-lg">
      <q-card-section>
        <div class="row items-center justify-between q-gutter-sm">
          <div class="text-subtitle1 text-weight-bold">Tu opinión</div>
          <div class="inline-actions">
            <q-btn flat dense no-caps icon="edit" label="Editar" color="primary" @click="startEdit(myReview)" />
            <q-btn flat dense no-caps icon="delete" label="Eliminar" color="negative" @click="removeReview(myReview)" />
          </div>
        </div>
        <div v-if="editingId === myReview._id" class="q-mt-md">
          <q-rating v-model="editForm.rating" :max="5" size="26px" color="warning" />
          <q-input
            v-model="editForm.comment"
            type="textarea"
            outlined
            autogrow
            maxlength="1000"
            counter
            class="q-mt-sm"
          />
          <div class="row justify-end q-gutter-sm q-mt-sm">
            <q-btn flat no-caps label="Cancelar" @click="editingId = null" />
            <q-btn unelevated no-caps color="primary" label="Guardar" @click="saveEdit" />
          </div>
        </div>
        <div v-else class="q-mt-sm">
          <StarRating :value="myReview.rating" :size="16" show-value />
          <p class="review-comment">{{ myReview.comment || 'Sin comentario.' }}</p>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="loading" class="q-mt-lg">
      <q-skeleton v-for="index in 3" :key="index" height="70px" class="q-mb-sm" />
    </div>

    <div v-else-if="reviews.length" class="q-mt-md">
      <div v-for="review in reviews" :key="review._id" class="review-item">
        <div class="review-head">
          <div class="row items-center q-gutter-sm">
            <q-avatar size="32px" color="grey-3" text-color="grey-8">
              {{ (review.user?.name || 'C')[0].toUpperCase() }}
            </q-avatar>
            <div>
              <div class="review-author">{{ review.user?.name || 'Cliente' }}</div>
              <StarRating :value="review.rating" :size="14" />
            </div>
          </div>
          <span class="review-date">
            {{ formatDateTime(review.createdAt) }}
            <template v-if="review.editedAt"> · editada</template>
          </span>
        </div>
        <p v-if="review.comment" class="review-comment">{{ review.comment }}</p>
      </div>

      <PaginationBar
        :page="meta.page || page"
        :pages="meta.pages || 1"
        :total="meta.total"
        @update:page="changePage"
      />
    </div>

    <EmptyState
      v-else
      icon="reviews"
      title="Este producto aún no tiene opiniones"
      text="Sé el primero en compartir tu experiencia después de comprar."
    />
  </section>
</template>
