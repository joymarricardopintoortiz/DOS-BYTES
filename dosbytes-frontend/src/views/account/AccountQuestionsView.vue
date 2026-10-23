<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { questionsApi, usersApi } from '../../api/client'
import { formatDateTime, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import EmptyState from '../../components/common/EmptyState.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()

const questions = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

async function load() {
  loading.value = true
  try {
    const response = await usersApi.myQuestions({ page: currentPage(), limit: 10 })
    questions.value = response.data.questions || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar tus preguntas')
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  router.push({
    name: 'account-questions',
    query: page > 1 ? { page: String(page) } : {},
  })
}

async function remove(question) {
  const accepted = await confirm({
    title: 'Eliminar pregunta',
    message: 'La pregunta y su respuesta se eliminarán de la ficha del producto.',
    okLabel: 'Eliminar',
  })
  if (!accepted) return
  try {
    await questionsApi.remove(question._id)
    if (questions.value.length === 1 && currentPage() > 1) {
      changePage(currentPage() - 1)
    } else {
      await load()
    }
    notifySuccess('Pregunta eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la pregunta')
  }
}

watch(() => route.query.page, load)
onMounted(load)

useSeo({
  title: 'Mis preguntas',
  description: 'Consulta las preguntas que hiciste sobre productos de DOS BYTES y sus respuestas.',
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Tus consultas</span>
        <h1 class="title-lg">Mis preguntas</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} preguntas realizadas.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="storefront" label="Hacer una pregunta" to="/productos" />
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton v-for="index in 3" :key="index" height="130px" style="border-radius: 14px" />
    </div>

    <div v-else-if="questions.length" class="stack">
      <q-card v-for="question in questions" :key="question._id" flat bordered>
        <q-card-section>
          <div class="row items-start q-gutter-md">
            <router-link
              v-if="question.product?.slug"
              :to="{ name: 'product', params: { slug: question.product.slug } }"
              class="review-product-thumb"
            >
              <img :src="mediaUrl(productImage(question.product))" :alt="question.product?.name" />
            </router-link>
            <div style="min-width: 0; flex: 1">
              <div class="row items-start justify-between q-gutter-sm">
                <div>
                  <router-link
                    v-if="question.product?.slug"
                    class="text-weight-bold"
                    :to="{ name: 'product', params: { slug: question.product.slug } }"
                  >
                    {{ question.product.name }}
                  </router-link>
                  <span v-else class="text-weight-bold">Producto no disponible</span>
                  <div class="text-caption text-grey-7">
                    {{ formatDateTime(question.createdAt) }}
                  </div>
                </div>
                <q-btn
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  aria-label="Eliminar pregunta"
                  @click="remove(question)"
                />
              </div>

              <div class="row items-start q-gutter-sm q-mt-sm">
                <q-icon name="help_outline" color="secondary" size="20px" />
                <span class="text-body2">{{ question.text }}</span>
              </div>

              <div v-if="question.answer?.text" class="answer-box">
                <div class="text-caption text-weight-bold text-primary q-mb-xs">
                  <q-icon name="support_agent" size="14px" class="q-mr-xs" />
                  Respuesta de DOS BYTES
                  <span v-if="question.answer.answeredAt" class="text-grey-6 text-weight-regular">
                    · {{ formatDateTime(question.answer.answeredAt) }}
                  </span>
                </div>
                <div class="text-body2">{{ question.answer.text }}</div>
              </div>

              <q-badge v-else color="warning" class="q-mt-sm">
                <q-icon name="schedule" size="12px" class="q-mr-xs" /> Sin respuesta todavía
              </q-badge>
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
      icon="help_outline"
      title="Aún no has hecho preguntas"
      text="Entra a la ficha de un producto y pregunta lo que necesites saber antes de comprar."
    >
      <q-btn unelevated no-caps color="primary" icon="storefront" label="Ver productos" to="/productos" />
    </EmptyState>
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
