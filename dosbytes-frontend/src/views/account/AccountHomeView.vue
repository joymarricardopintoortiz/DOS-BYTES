<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ordersApi, serviceOrdersApi, usersApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { useFavoritesStore } from '../../stores/favorites'
import { DELETION_REASON_OPTIONS } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatCard from '../../components/common/StatCard.vue'

const router = useRouter()
const auth = useAuthStore()
const favorites = useFavoritesStore()

const counts = ref({ orders: 0, repairs: 0, reviews: 0, questions: 0 })
const loadingCounts = ref(true)
const savingProfile = ref(false)
const profileForm = ref({ name: '', phone: '' })

const deleteDialog = ref(false)
const deleting = ref(false)
const deleteForm = ref({ password: '', reason: '', comment: '' })

const memberSince = computed(() => formatDateTime(auth.user?.createdAt))

const quickLinks = computed(() => [
  {
    label: 'Mis pedidos',
    icon: 'receipt_long',
    text: 'Revisa el estado de tus reservas.',
    to: '/mi-cuenta/pedidos',
    badge: counts.value.orders,
  },
  {
    label: 'Mis reparaciones',
    icon: 'build_circle',
    text: 'Sigue el estado de tus equipos.',
    to: '/mi-cuenta/reparaciones',
    badge: counts.value.repairs,
  },
  {
    label: 'Favoritos',
    icon: 'favorite',
    text: 'Productos que guardaste.',
    to: '/mi-cuenta/favoritos',
    badge: favorites.count,
  },
  {
    label: 'Mis opiniones',
    icon: 'star',
    text: 'Calificaciones que publicaste.',
    to: '/mi-cuenta/opiniones',
    badge: counts.value.reviews,
  },
  {
    label: 'Mis preguntas',
    icon: 'help_outline',
    text: 'Consultas sobre productos.',
    to: '/mi-cuenta/preguntas',
    badge: counts.value.questions,
  },
  {
    label: 'Consultar un código',
    icon: 'track_changes',
    text: 'Busca una orden por su código.',
    to: '/seguimiento',
  },
])

function syncProfile() {
  profileForm.value = {
    name: auth.user?.name || '',
    phone: auth.user?.phone || '',
  }
}

async function loadCounts() {
  loadingCounts.value = true
  try {
    const [orders, repairs, reviews, questions] = await Promise.allSettled([
      ordersApi.mine({ limit: 1 }),
      serviceOrdersApi.mine({ limit: 1 }),
      usersApi.myReviews({ limit: 1 }),
      usersApi.myQuestions({ limit: 1 }),
    ])
    counts.value = {
      orders: orders.status === 'fulfilled' ? orders.value.meta?.total || 0 : 0,
      repairs: repairs.status === 'fulfilled' ? repairs.value.meta?.total || 0 : 0,
      reviews: reviews.status === 'fulfilled' ? reviews.value.meta?.total || 0 : 0,
      questions: questions.status === 'fulfilled' ? questions.value.meta?.total || 0 : 0,
    }
  } finally {
    loadingCounts.value = false
  }
}

async function saveProfile() {
  const name = profileForm.value.name.trim()
  if (name.length < 2) {
    notifyError(null, 'El nombre debe tener al menos 2 caracteres')
    return
  }
  savingProfile.value = true
  try {
    await auth.updateProfile({
      name,
      phone: profileForm.value.phone.trim(),
    })
    notifySuccess('Perfil actualizado')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar el perfil')
  } finally {
    savingProfile.value = false
  }
}

function openDelete() {
  deleteForm.value = { password: '', reason: '', comment: '' }
  deleteDialog.value = true
}

async function deleteAccount() {
  if (!deleteForm.value.password) {
    notifyError(null, 'Escribe tu contraseña para confirmar')
    return
  }
  if (!deleteForm.value.reason) {
    notifyError(null, 'Selecciona un motivo')
    return
  }
  deleting.value = true
  try {
    const response = await auth.deleteAccount({
      password: deleteForm.value.password,
      reason: deleteForm.value.reason,
      comment: deleteForm.value.comment.trim() || undefined,
    })
    favorites.clear()
    deleteDialog.value = false
    notifySuccess(response.message || 'Tu cuenta fue eliminada')
    await router.replace('/')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la cuenta')
  } finally {
    deleting.value = false
  }
}

watch(() => auth.user, syncProfile, { deep: true })

useSeo({
  title: 'Mi cuenta',
  description: 'Gestiona tu perfil, pedidos, reparaciones, favoritos y opiniones en DOS BYTES.',
})

onMounted(() => {
  syncProfile()
  loadCounts()
  favorites.load().catch(() => {})
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Hola de nuevo</span>
        <h1 class="title-lg">{{ auth.displayName }}</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          Cliente desde {{ memberSince }} · {{ auth.user?.email }}
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="storefront" label="Ir a la tienda" to="/productos" />
    </div>

    <div class="stat-grid q-mb-lg">
      <StatCard label="Pedidos" :value="counts.orders" icon="receipt_long" :hint="loadingCounts ? 'Cargando…' : 'Reservas realizadas'" />
      <StatCard label="Reparaciones" :value="counts.repairs" icon="build_circle" color="secondary" :hint="loadingCounts ? 'Cargando…' : 'Equipos registrados'" />
      <StatCard label="Favoritos" :value="favorites.count" icon="favorite" color="negative" hint="Productos guardados" />
      <StatCard label="Opiniones" :value="counts.reviews" icon="star" color="warning" :hint="loadingCounts ? 'Cargando…' : 'Publicadas'" />
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="link in quickLinks" :key="link.to" class="col-12 col-sm-6 col-md-4">
        <router-link :to="link.to" class="surface-card q-pa-md row items-start q-gutter-md fit">
          <div class="stat-icon"><q-icon :name="link.icon" /></div>
          <div style="min-width: 0">
            <div class="row items-center q-gutter-sm">
              <span class="text-weight-bold">{{ link.label }}</span>
              <q-badge v-if="link.badge" color="secondary" text-color="primary">
                {{ link.badge }}
              </q-badge>
            </div>
            <div class="text-caption text-grey-7">{{ link.text }}</div>
          </div>
        </router-link>
      </div>
    </div>

    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Datos personales</div>
        <q-form @submit.prevent="saveProfile">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input v-model="profileForm.name" outlined label="Nombre completo" maxlength="120">
                <template #prepend><q-icon name="person" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="profileForm.phone" outlined type="tel" label="Teléfono" maxlength="30">
                <template #prepend><q-icon name="call" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input :model-value="auth.user?.email" outlined label="Correo electrónico" disable>
                <template #prepend><q-icon name="mail" /></template>
              </q-input>
              <div class="text-caption text-grey-7 q-mt-xs">
                El correo no se puede cambiar desde aquí.
              </div>
            </div>
          </div>
          <div class="row justify-end q-mt-md">
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="save"
              label="Guardar cambios"
              type="submit"
              :loading="savingProfile"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold text-negative q-mb-xs">
          Eliminar mi cuenta
        </div>
        <p class="text-body2 text-grey-7">
          Al eliminar tu cuenta se anonimizan tu nombre, correo y teléfono, y se cierra la
          sesión. Las opiniones y preguntas se conservan de forma anónima. No es posible
          eliminar la cuenta si tienes una reparación o un pedido pendiente.
        </p>
        <q-btn
          outline
          no-caps
          color="negative"
          icon="delete_forever"
          label="Eliminar cuenta"
          @click="openDelete"
        />
      </q-card-section>
    </q-card>

    <q-dialog v-model="deleteDialog" persistent>
      <q-card style="width: min(520px, 94vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="warning" color="negative" size="26px" />
          <div class="text-subtitle1 text-weight-bold">Eliminar mi cuenta</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-banner class="bg-red-1 text-negative q-mb-md" rounded dense>
            Esta acción es irreversible. Si tienes trámites pendientes, el sistema no
            permitirá eliminarla.
          </q-banner>

          <q-input
            v-model="deleteForm.password"
            outlined
            type="password"
            label="Contraseña actual"
            autocomplete="current-password"
            class="q-mb-md"
          >
            <template #prepend><q-icon name="lock" /></template>
          </q-input>

          <q-select
            v-model="deleteForm.reason"
            :options="DELETION_REASON_OPTIONS"
            outlined
            emit-value
            map-options
            label="Motivo"
            class="q-mb-md"
          />

          <q-input
            v-model="deleteForm.comment"
            type="textarea"
            outlined
            autogrow
            maxlength="500"
            counter
            label="Comentario (opcional)"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="negative"
            label="Eliminar definitivamente"
            :loading="deleting"
            :disable="!deleteForm.password || !deleteForm.reason"
            @click="deleteAccount"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
