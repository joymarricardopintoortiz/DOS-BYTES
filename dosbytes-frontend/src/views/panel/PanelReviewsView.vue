<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reviewsApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import StarRating from '../../components/common/StarRating.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const confirm = useConfirm()

const reviews = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)
const filters = ref({ visible: '', rating: '' })
const dialog = ref(false)
const selected = ref(null)

const ratingOptions = [
  { label: 'Todas las calificaciones', value: '' },
  { label: '5 estrellas', value: '5' },
  { label: '4 estrellas', value: '4' },
  { label: '3 estrellas', value: '3' },
  { label: '2 estrellas', value: '2' },
  { label: '1 estrella', value: '1' },
]

const visibilityOptions = [
  { label: 'Todas', value: '' },
  { label: 'Visibles', value: 'true' },
  { label: 'Ocultas', value: 'false' },
]

const columns = [
  { name: 'product', label: 'Producto', field: 'product.name', align: 'left' },
  { name: 'user', label: 'Cliente', field: 'user.name', align: 'left' },
  { name: 'rating', label: 'Calificación', field: 'rating', align: 'left' },
  { name: 'comment', label: 'Comentario', field: 'comment', align: 'left' },
  { name: 'createdAt', label: 'Fecha', field: 'createdAt', align: 'left' },
  { name: 'visible', label: 'Estado', field: 'visible', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

function filtersFromRoute() {
  filters.value = {
    visible: String(route.query.visible || ''),
    rating: String(route.query.rating || ''),
  }
}

function applyFilters() {
  const query = {}
  if (filters.value.visible) query.visible = filters.value.visible
  if (filters.value.rating) query.rating = filters.value.rating
  router.push({ name: 'panel-reviews', query })
}

function clearFilters() {
  filters.value = { visible: '', rating: '' }
  router.push({ name: 'panel-reviews', query: {} })
}

function changePage(page) {
  const query = { ...route.query }
  if (page > 1) query.page = String(page)
  else delete query.page
  router.push({ name: 'panel-reviews', query })
}

async function load() {
  loading.value = true
  try {
    const response = await reviewsApi.listAll({
      page: currentPage(),
      limit: 15,
      visible: route.query.visible || undefined,
      rating: route.query.rating || undefined,
    })
    reviews.value = response.data.reviews || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las opiniones')
  } finally {
    loading.value = false
  }
}

function openDetail(review) {
  selected.value = review
  dialog.value = true
}

async function toggleVisibility(review) {
  if (!auth.isAdmin) return
  try {
    const response = await reviewsApi.setVisibility(review._id, !review.visible)
    const updated = response.data.review
    reviews.value = reviews.value.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    )
    if (selected.value?._id === updated._id) {
      selected.value = { ...selected.value, ...updated }
    }
    notifySuccess(updated.visible ? 'Opinión visible' : 'Opinión oculta')
  } catch (error) {
    notifyError(error, 'No se pudo cambiar la visibilidad')
  }
}

async function remove(review) {
  const accepted = await confirm({
    title: 'Eliminar opinión',
    message:
      'La opinión se eliminará de forma permanente y se recalculará la calificación del producto.',
    okLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    color: 'negative',
  })
  if (!accepted) return

  try {
    await reviewsApi.remove(review._id)
    dialog.value = false
    if (reviews.value.length === 1 && currentPage() > 1) changePage(currentPage() - 1)
    else await load()
    notifySuccess('Opinión eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la opinión')
  }
}

watch(
  () => route.query,
  () => {
    filtersFromRoute()
    load()
  },
  { immediate: true }
)

useSeo({ title: 'Moderación de opiniones' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Opiniones</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} opiniones publicadas por clientes.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
    </div>

    <q-banner v-if="!auth.isAdmin" class="bg-blue-1 text-primary q-mb-md" rounded dense>
      <template #avatar><q-icon name="info" /></template>
      Puedes revisar las opiniones. Solo un administrador puede ocultarlas o eliminarlas.
    </q-banner>

    <q-card flat bordered>
      <div class="panel-toolbar">
        <q-select
          v-model="filters.visible"
          :options="visibilityOptions"
          outlined
          dense
          emit-value
          map-options
          label="Visibilidad"
          style="min-width: 150px"
        />
        <q-select
          v-model="filters.rating"
          :options="ratingOptions"
          outlined
          dense
          emit-value
          map-options
          label="Calificación"
          style="min-width: 190px"
        />
        <q-btn unelevated no-caps color="primary" icon="filter_alt" label="Aplicar" @click="applyFilters" />
        <q-btn flat no-caps color="primary" label="Limpiar" @click="clearFilters" />
      </div>

      <q-table
        :rows="reviews"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        flat
        dense
        class="table-wrap"
        no-data-label="No hay opiniones con esos filtros"
      >
        <template #body-cell-product="props">
          <q-td :props="props">
            <div class="text-weight-bold" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
              {{ props.row.product?.name || 'Producto eliminado' }}
            </div>
            <div class="text-caption text-grey-7">{{ props.row.product?.code || '—' }}</div>
          </q-td>
        </template>

        <template #body-cell-user="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.user?.name || 'Cliente' }}</div>
            <div class="text-caption text-grey-7">{{ props.row.user?.email || 'Sin correo' }}</div>
          </q-td>
        </template>

        <template #body-cell-rating="props">
          <q-td :props="props">
            <StarRating :value="props.row.rating" :size="15" show-value />
          </q-td>
        </template>

        <template #body-cell-comment="props">
          <q-td :props="props">
            <div
              class="ellipsis"
              style="max-width: 270px"
              :class="{ 'text-grey-6': !props.row.comment }"
            >
              {{ props.row.comment || 'Sin comentario' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-createdAt="props">
          <q-td :props="props">{{ formatDateTime(props.row.createdAt) }}</q-td>
        </template>

        <template #body-cell-visible="props">
          <q-td :props="props">
            <q-badge :color="props.row.visible ? 'positive' : 'grey-6'">
              {{ props.row.visible ? 'Visible' : 'Oculta' }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="inline-actions" style="justify-content: flex-end">
              <q-btn flat dense round icon="visibility" color="primary" aria-label="Ver" @click="openDetail(props.row)">
                <q-tooltip>Ver opinión</q-tooltip>
              </q-btn>
              <q-btn
                v-if="auth.isAdmin"
                flat
                dense
                round
                :icon="props.row.visible ? 'visibility_off' : 'visibility'"
                :color="props.row.visible ? 'grey-7' : 'positive'"
                :aria-label="props.row.visible ? 'Ocultar' : 'Mostrar'"
                @click="toggleVisibility(props.row)"
              >
                <q-tooltip>{{ props.row.visible ? 'Ocultar opinión' : 'Mostrar opinión' }}</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>

      <div class="q-pa-md">
        <PaginationBar
          :page="meta.page || currentPage()"
          :pages="meta.pages || 1"
          :total="meta.total"
          @update:page="changePage"
        />
      </div>
    </q-card>

    <q-dialog v-model="dialog">
      <q-card style="width: min(620px, 94vw); max-height: 92vh">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="text-h6 text-weight-bold">Detalle de la opinión</div>
          <q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="selected" style="max-height: calc(92vh - 150px); overflow-y: auto">
          <div class="row items-start justify-between q-gutter-md">
            <div>
              <div class="text-weight-bold">{{ selected.product?.name || 'Producto eliminado' }}</div>
              <div class="text-caption text-grey-7">
                {{ selected.user?.name || 'Cliente' }} ·
                {{ selected.user?.email || 'Sin correo' }}
              </div>
              <div class="text-caption text-grey-7">{{ formatDateTime(selected.createdAt) }}</div>
            </div>
            <q-badge :color="selected.visible ? 'positive' : 'grey-6'">
              {{ selected.visible ? 'Visible' : 'Oculta' }}
            </q-badge>
          </div>

          <div class="q-mt-md">
            <StarRating :value="selected.rating" :size="20" show-value />
          </div>

          <div class="soft-card q-pa-md q-mt-md">
            <div class="text-body2" style="white-space: pre-line">
              {{ selected.comment || 'El cliente no dejó comentario.' }}
            </div>
          </div>

          <div v-if="selected.editedAt" class="text-caption text-grey-7 q-mt-sm">
            Editada el {{ formatDateTime(selected.editedAt) }}
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cerrar" v-close-popup />
          <template v-if="auth.isAdmin && selected">
            <q-btn
              outline
              no-caps
              color="primary"
              :icon="selected.visible ? 'visibility_off' : 'visibility'"
              :label="selected.visible ? 'Ocultar' : 'Mostrar'"
              @click="toggleVisibility(selected)"
            />
            <q-btn
              unelevated
              no-caps
              color="negative"
              icon="delete"
              label="Eliminar"
              @click="remove(selected)"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
