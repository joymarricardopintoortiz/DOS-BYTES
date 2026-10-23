<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '../../api/client'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const route = useRoute()

const formRef = ref(null)
const loading = ref(false)
const done = ref(false)
const email = ref(String(route.query.email || ''))

const rules = {
  email: [
    (value) => Boolean(String(value || '').trim()) || 'Escribe tu correo',
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) || 'Correo inválido',
  ],
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    await authApi.resendVerification({ email: email.value.trim() })
    done.value = true
  } catch (error) {
    notifyError(error, 'No se pudo reenviar la verificación')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Reenviar verificación',
  description: 'Solicita un nuevo enlace de verificación para activar tu cuenta de DOS BYTES.',
  canonical: '/reenviar-verificacion',
})
</script>

<template>
  <q-card flat class="auth-card surface-card">
    <template v-if="done">
      <div class="text-center">
        <q-icon name="outgoing_mail" color="primary" size="56px" />
        <h2 class="q-mt-md">Solicitud enviada</h2>
        <p class="auth-sub">
          Si el correo está registrado y aún no ha sido verificado, enviamos un nuevo enlace
          de verificación. Revisa también la carpeta de spam.
        </p>
      </div>

      <q-banner class="bg-blue-1 text-primary q-mb-lg" rounded>
        <template #avatar><q-icon name="info" /></template>
        Debes esperar al menos un minuto entre reenvíos.
      </q-banner>

      <div class="stack">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="login"
          label="Ir a iniciar sesión"
          to="/ingresar"
        />
        <q-btn
          flat
          no-caps
          color="primary"
          label="Reenviar de nuevo"
          @click="done = false"
        />
      </div>
    </template>

    <template v-else>
      <h2>Reenviar verificación</h2>
      <p class="auth-sub">
        Si no recibiste el correo de verificación o el enlace ya venció, escribe tu correo
        para solicitar uno nuevo.
      </p>

      <q-form ref="formRef" @submit.prevent="submit">
        <q-input
          v-model="email"
          outlined
          type="email"
          label="Correo electrónico"
          autocomplete="email"
          :rules="rules.email"
          lazy-rules
        >
          <template #prepend><q-icon name="mail" /></template>
        </q-input>

        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="forward_to_inbox"
          label="Reenviar enlace"
          type="submit"
          class="full-width q-mt-lg"
          size="md"
          :loading="loading"
        />

        <div class="auth-links">
          <router-link to="/ingresar">Volver a iniciar sesión</router-link>
          <router-link to="/registro">Crear cuenta</router-link>
        </div>
      </q-form>
    </template>
  </q-card>
</template>
