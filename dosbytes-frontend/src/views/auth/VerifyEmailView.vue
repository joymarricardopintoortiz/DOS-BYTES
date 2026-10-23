<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '../../api/client'
import { useSeo } from '../../composables/useSeo'

const route = useRoute()

const status = ref('loading')
const message = ref('')

async function verify() {
  const token = String(route.query.token || '').trim()
  if (!token) {
    status.value = 'error'
    message.value = 'El enlace no incluye un token de verificación.'
    return
  }

  try {
    const response = await authApi.verify(token)
    status.value = 'success'
    message.value = response.message || 'Correo verificado. Ya puedes iniciar sesión.'
  } catch (error) {
    status.value = 'error'
    message.value = error.message || 'El enlace de verificación es inválido o ya venció.'
  }
}

useSeo({
  title: 'Verificar correo',
  description: 'Verifica tu correo electrónico para activar tu cuenta de DOS BYTES.',
  canonical: '/verificar',
})

onMounted(verify)
</script>

<template>
  <q-card flat class="auth-card surface-card">
    <div v-if="status === 'loading'" class="text-center q-py-lg">
      <q-spinner color="primary" size="48px" />
      <h2 class="q-mt-lg">Verificando tu correo</h2>
      <p class="auth-sub">Esto solo toma un momento.</p>
    </div>

    <div v-else-if="status === 'success'" class="text-center q-py-lg">
      <q-icon name="verified" color="positive" size="60px" />
      <h2 class="q-mt-md">Correo verificado</h2>
      <p class="auth-sub">{{ message }}</p>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="login"
        label="Iniciar sesión"
        to="/ingresar"
        class="full-width q-mt-md"
      />
    </div>

    <div v-else class="q-py-lg">
      <div class="text-center">
        <q-icon name="link_off" color="negative" size="52px" />
        <h2 class="q-mt-md">No pudimos verificar tu correo</h2>
        <p class="auth-sub">{{ message }}</p>
      </div>

      <q-banner class="bg-orange-1 text-orange-9 q-mb-lg" rounded dense>
        <template #avatar><q-icon name="info" /></template>
        Los enlaces caducan a las 24 horas. Si ya pasó ese tiempo, solicita uno nuevo.
      </q-banner>

      <div class="stack">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="forward_to_inbox"
          label="Reenviar verificación"
          to="/reenviar-verificacion"
        />
        <q-btn outline no-caps color="primary" icon="login" label="Volver a iniciar sesión" to="/ingresar" />
      </div>
    </div>
  </q-card>
</template>
