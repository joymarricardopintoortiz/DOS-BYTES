<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productsApi, questionsApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import EmptyState from '../../components/common/EmptyState.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const confirm = useConfirm()

const productOptions = ref([])
const productsLoading = ref(false)
const selectedProduct = ref(String(route.query.product || ''))

const questions = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(false)

const answerDialog = ref(false)
const answerTarget = ref(null)
const answerText = ref('')
const savingAnswer = ref(false)

const columns = [
  { name: 'question', label: 'Pregunta', field: 'text', align: 'left' },
  { name: 'answer', label: 'Respuesta', field: 'answer.text', align: 'left' },
  { name: 'createdAt', label: 'Fecha', field: 'createdAt', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const selectedLabel = computed(
  () => productOptions.value.find((option) => option.value === selectedProduct.value)?.label || ''
)

function toOption(product) {
  return {
    label: `${product.name} (${product.code})`,
    value: product.slug,
    caption: product.visible === false ? 'Oculto en el catálogo' : '',
  }
}

async function loadInitialProducts() {
  productsLoading.value = true
  try {
    const response = await productsApi.list({ limit: 30 })
    productOptions.value = (response.data.products || []).map(toOption)
  } catch (error) {
    notifyError(error, 'No se pudieron cargar los productos')
  } finally {
    productsLoading.value = false
  }
}

async function filterProducts(value, update) {
  if (!value) {
    update()
    return
  }
  productsLoading.value = true
  try {
    const response = await productsApi.list({ q: value, limit: 20 })
    update((response.data.products || []).map(toOption))
  } catch {
    update([])
  } finally {
    productsLoading.value = false
  }
}

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

async function loadQuestions() {
  if (!selectedProduct.value) {
    questions.value = []
    meta.value = { total: 0, page: 1, pages: 1 }
    return
  }
  loading.value = true
  try {
    const response = await productsApi.questions(selectedProduct.value, {
      page: currentPage(),
      limit: 10,
    })
    questions.value = response.data.questions || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las preguntas')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  const query = { product: selectedProduct.value }
  if (page > 1) query.page = String(page)
  router.push({ name: 'panel-questions', query })
}

function openAnswer(question) {
  answerTarget.value = question
  answerText.value = question.answer?.text || ''
  answerDialog.value = true
}

async function saveAnswer() {
  const text = answerText.value.trim()
  if (text.length < 2) {
    notifyError(null, 'Escribe la respuesta')
    return
  }
  savingAnswer.value = true
  try {
    const response = await questionsApi.answer(answerTarget.value._id, text)
    const updated = response.data.question
    questions.value = questions.value.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    )
    answerDialog.value = false
    notifySuccess('Respuesta publicada')
  } catch (error) {
    notifyError(error, 'No se pudo publicar la respuesta')
  } finally {
    savingAnswer.value = false
  }
}

async function hideQuestion(question) {
  const accepted = await confirm({
    title: 'Ocultar pregunta',
    message:
      'La pregunta dejará de mostrarse en la ficha del producto. El panel no tiene un listado global de preguntas ocultas, así que no podrás volver a mostrarla desde aquí.',
    okLabel: 'Ocultar',
    cancelLabel: 'Cancelar',
  })
  if (!accepted) return

  try {
    await questionsApi.setVisibility(question._id, false)
    questions.value = questions.value.filter((item) => item._id !== question._id)
    meta.value = {
      ...meta.value,
      total: Math.max(0, (meta.value.total || 1) - 1),
    }
    notifySuccess('Pregunta oculta')
  } catch (error) {
    notifyError(error, 'No se pudo ocultar la pregunta')
  }
}

async function removeQuestion(question) {
  const accepted = await confirm({
    title: 'Eliminar pregunta',
    message: 'La pregunta y su respuesta se eliminarán de forma permanente.',
    okLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    color: 'negative',
  })
  if (!accepted) return

  try {
    await questionsApi.remove(question._id)
    if (questions.value.length === 1 && currentPage() > 1) changePage(currentPage() - 1)
    else await loadQuestions()
    notifySuccess('Pregunta eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la pregunta')
  }
}

watch(selectedProduct, (slug) => {
  const query = {}
  if (slug) query.product = slug
  router.replace({ name: 'panel-questions', query })
  if (slug) loadQuestions()
  else {
    questions.value = []
    meta.value = { total: 0, page: 1, pages: 1 }
  }
})

watch(
  () => route.query.page,
  () => {
    if (selectedProduct.value) loadQuestions()
  }
)

onMounted(async () => {
  await loadInitialProducts()
  if (selectedProduct.value) loadQuestions()
})

useSeo({ title: 'Preguntas de clientes' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Preguntas de clientes</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          Selecciona un producto para responder sus preguntas.
        </p>
      </div>
      <q-btn
        v-if="selectedProduct"
        outline
        no-caps
        color="primary"
        icon="open_in_new"
        label="Ver ficha pública"
        :to="{ name: 'product', params: { slug: selectedProduct } }"
        target="_blank"
      />
    </div>

    <q-banner class="bg-blue-1 text-primary q-mb-md" rounded dense>
      <template #avatar><q-icon name="info" /></template>
      El catálogo público solo muestra preguntas visibles. Al ocultar una pregunta no hay forma de
      recuperarla desde este panel; responde las dudas reales en lugar de ocultarlas.
    </q-banner>

    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-8">
            <q-select
              v-model="selectedProduct"
              :options="productOptions"
              :loading="productsLoading"
              outlined
              use-input
              emit-value
              map-options
              input-debounce="300"
              label="Producto"
              hint="Busca por nombre, código o SKU."
              @filter="filterProducts"
            >
              <template #prepend><q-icon name="inventory_2" /></template>
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey-7">Sin resultados</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div class="col-12 col-md-4">
            <div v-if="selectedProduct" class="text-caption text-grey-7">
              {{ selectedLabel }}
            </div>
            <div v-else class="text-caption text-grey-7">
              Elige un producto del catálogo para ver sus preguntas.
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <template v-if="selectedProduct">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-body2 text-grey-7">
          {{ meta.total || 0 }} preguntas visibles en este producto.
        </div>
        <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="loadQuestions" />
      </div>

      <q-card flat bordered>
        <q-table
          :rows="questions"
          :columns="columns"
          row-key="_id"
          :loading="loading"
          :pagination="{ rowsPerPage: 0 }"
          hide-pagination
          flat
          dense
          class="table-wrap"
          no-data-label="Este producto no tiene preguntas visibles"
        >
          <template #body-cell-question="props">
            <q-td :props="props">
              <div class="text-caption text-grey-7">
                {{ props.row.user?.name || 'Cliente' }} ·
                {{ formatDateTime(props.row.createdAt) }}
              </div>
              <div class="text-body2" style="max-width: 360px; white-space: pre-line">
                {{ props.row.text }}
              </div>
            </q-td>
          </template>

          <template #body-cell-answer="props">
            <q-td :props="props">
              <div v-if="props.row.answer?.text" style="max-width: 320px">
                <div class="text-body2" style="white-space: pre-line">
                  {{ props.row.answer.text }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ formatDateTime(props.row.answer.answeredAt) }}
                  <template v-if="props.row.answer.answeredBy?.name">
                    · {{ props.row.answer.answeredBy.name }}
                  </template>
                </div>
              </div>
              <q-badge v-else color="warning">
                <q-icon name="schedule" size="12px" class="q-mr-xs" /> Sin responder
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-createdAt="props">
            <q-td :props="props">{{ formatDateTime(props.row.createdAt) }}</q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <div class="inline-actions" style="justify-content: flex-end">
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  :icon="props.row.answer?.text ? 'edit' : 'reply'"
                  :label="props.row.answer?.text ? 'Editar' : 'Responder'"
                  @click="openAnswer(props.row)"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="visibility_off"
                  color="grey-7"
                  aria-label="Ocultar pregunta"
                  @click="hideQuestion(props.row)"
                >
                  <q-tooltip>Ocultar pregunta</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="auth.isAdmin"
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  aria-label="Eliminar pregunta"
                  @click="removeQuestion(props.row)"
                >
                  <q-tooltip>Eliminar pregunta</q-tooltip>
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
    </template>

    <EmptyState
      v-else
      icon="help_outline"
      title="Selecciona un producto"
      text="Elige un producto para consultar y responder las preguntas que hicieron los clientes."
    />

    <q-dialog v-model="answerDialog" persistent>
      <q-card style="width: min(560px, 94vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="reply" color="primary" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Responder pregunta</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="soft-card q-pa-md q-mb-md">
            <div class="text-caption text-grey-7 q-mb-xs">
              {{ answerTarget?.user?.name || 'Cliente' }}
            </div>
            <div class="text-body2" style="white-space: pre-line">{{ answerTarget?.text }}</div>
          </div>

          <q-input
            v-model="answerText"
            type="textarea"
            outlined
            autogrow
            maxlength="1000"
            counter
            label="Respuesta pública"
            hint="La respuesta será visible en la ficha del producto."
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="send"
            label="Publicar respuesta"
            :loading="savingAnswer"
            :disable="!answerText.trim()"
            @click="saveAnswer"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
