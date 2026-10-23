<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productsApi, questionsApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import EmptyState from '../common/EmptyState.vue'
import PaginationBar from '../common/PaginationBar.vue'

const props = defineProps({
  slug: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const confirm = useConfirm()

const questions = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const page = ref(1)
const loading = ref(false)
const submitting = ref(false)
const text = ref('')

async function load() {
  loading.value = true
  try {
    const response = await productsApi.questions(props.slug, { page: page.value })
    questions.value = response.data.questions || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las preguntas')
  } finally {
    loading.value = false
  }
}

function changePage(value) {
  page.value = value
  load()
}

function goLogin() {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

async function ask() {
  const clean = text.value.trim()
  if (clean.length < 3) return
  submitting.value = true
  try {
    await productsApi.createQuestion(props.slug, { text: clean })
    text.value = ''
    page.value = 1
    await load()
    notifySuccess('Pregunta enviada. Te responderemos pronto.')
  } catch (error) {
    notifyError(error, 'No se pudo enviar la pregunta')
  } finally {
    submitting.value = false
  }
}

async function remove(question) {
  const accepted = await confirm({
    title: 'Eliminar pregunta',
    message: 'La pregunta se eliminará de la ficha del producto.',
    okLabel: 'Eliminar',
  })
  if (!accepted) return
  try {
    await questionsApi.remove(question._id)
    await load()
    notifySuccess('Pregunta eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la pregunta')
  }
}

watch(
  () => props.slug,
  () => {
    page.value = 1
    load()
  }
)

onMounted(load)
</script>

<template>
  <section>
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h2 class="title-lg">Preguntas y respuestas</h2>
        <p class="text-body2 text-grey-7 q-mb-none">
          Resolvemos tus dudas antes de comprar.
        </p>
      </div>
      <q-badge color="primary" class="q-px-sm q-py-xs">{{ meta.total || 0 }} preguntas</q-badge>
    </div>

    <q-card v-if="auth.isCustomer" flat bordered class="q-mb-lg">
      <q-card-section>
        <q-input
          v-model="text"
          type="textarea"
          outlined
          autogrow
          maxlength="500"
          counter
          label="Escribe tu pregunta"
          hint="Mínimo 3 caracteres. Las preguntas y respuestas son públicas."
        />
        <div class="row justify-end q-mt-sm">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="help"
            label="Preguntar"
            :loading="submitting"
            :disable="text.trim().length < 3"
            @click="ask"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-else-if="!auth.isAuthenticated" flat bordered class="q-mb-lg">
      <q-card-section class="row items-center justify-between q-gutter-md">
        <div>
          <div class="text-subtitle1 text-weight-bold">¿Tienes una duda?</div>
          <div class="text-body2 text-grey-7">Inicia sesión para preguntar sobre este producto.</div>
        </div>
        <q-btn unelevated no-caps color="primary" label="Ingresar" @click="goLogin" />
      </q-card-section>
    </q-card>

    <div v-if="loading">
      <q-skeleton v-for="index in 3" :key="index" height="70px" class="q-mb-sm" />
    </div>

    <div v-else-if="questions.length">
      <div v-for="question in questions" :key="question._id" class="question-item">
        <div class="row items-start justify-between q-gutter-sm">
          <div>
            <div class="row items-center q-gutter-sm">
              <q-icon name="help_outline" color="secondary" />
              <span class="review-author">{{ question.text }}</span>
            </div>
            <div class="review-date q-mt-xs">
              {{ question.user?.name || 'Cliente' }} · {{ formatDateTime(question.createdAt) }}
            </div>
          </div>
          <q-btn
            v-if="auth.user?._id && String(question.user?._id || question.user) === String(auth.user._id)"
            flat
            dense
            round
            icon="delete"
            color="negative"
            aria-label="Eliminar pregunta"
            @click="remove(question)"
          />
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
        <div v-else class="text-caption text-grey-6 q-mt-sm">
          Aún sin respuesta.
        </div>
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
      icon="forum"
      title="Todavía no hay preguntas"
      text="Haz la primera pregunta sobre este producto."
    />
  </section>
</template>
