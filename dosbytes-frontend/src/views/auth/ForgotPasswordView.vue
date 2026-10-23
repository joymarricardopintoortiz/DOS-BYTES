<script setup>
import { ref } from 'vue'
import { authApi } from '../../api/client'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const formRef = ref(null)
const loading = ref(false)
const sent = ref(false)
const email = ref('')

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
    await authApi.forgotPassword({ email: email.value.trim() })
    sent.value = true
  } catch (error) {
    notifyError(error, 'No se pudo enviar la solicitud')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Recuperar contraseña',
  description: 'Recupera el acceso a tu cuenta de DOS BYTES restableciendo tu contraseña por correo.',
  canonical: '/recuperar',
})
</script>

<template>
  <q-card flat class="auth-card surface-card">
    <template v-if="sent">
      <div class="text-center">
        <q-icon name="mark_email_read" color="primary" size="56px" />
        <h2 class="q-mt-md">Revisa tu correo</h2>
        <p class="auth-sub">
          Si <strong>{{ email }}</strong> está registrado y verificado, recibirás un enlace
          para restablecer tu contraseña. Puede tardar unos minutos.
        </p>
      </div>

      <q-banner class="bg-blue-1 text-primary q-mb-lg" rounded>
        <template #avatar><q-icon name="info" /></template>
        El enlace caduca en 60 minutos. Revisa también la carpeta de spam.
      </q-banner>

      <div class="stack">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="login"
          label="Volver a iniciar sesión"
          to="/ingresar"
        />
        <q-btn
          flat
          no-caps
          color="primary"
          label="Usar otro correo"
          @click="sent = false"
        />
      </div>
    </template>

    <template v-else>
      <h2>Recuperar contraseña</h2>
      <p class="auth-sub">
        Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva
        contraseña.
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
          icon="send"
          label="Enviar enlace"
          type="submit"
          class="full-width q-mt-lg"
          size="md"
          :loading="loading"
        />

        <div class="auth-links">
          <router-link to="/ingresar">
            <q-icon name="arrow_back" size="14px" /> Volver a iniciar sesión
          </router-link>
          <router-link to="/registro">Crear cuenta</router-link>
        </div>
      </q-form>
    </template>
  </q-card>
</template>
