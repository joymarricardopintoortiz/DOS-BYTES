<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const showPassword = ref(false)
const form = ref({ email: '', password: '' })
const unverifiedEmail = ref('')

const redirectTarget = computed(() => {
  const target = String(route.query.redirect || '')
  return target.startsWith('/') && !target.startsWith('//') ? target : null
})

const rules = {
  email: [
    (value) => Boolean(String(value || '').trim()) || 'Escribe tu correo',
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) || 'Correo inválido',
  ],
  password: [(value) => Boolean(value) || 'Escribe tu contraseña'],
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  unverifiedEmail.value = ''
  try {
    await auth.login({
      email: form.value.email.trim(),
      password: form.value.password,
    })
    notifySuccess(`Bienvenido, ${auth.user?.name || 'de nuevo'}`)
    const destination = redirectTarget.value || auth.homeRoute
    await router.replace(destination)
  } catch (error) {
    const notVerified = (error.errors || []).some(
      (item) => item.code === 'EMAIL_NOT_VERIFIED'
    )
    if (notVerified) {
      unverifiedEmail.value = form.value.email.trim()
    }
    notifyError(error, 'No se pudo iniciar sesión')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Ingresar',
  description: 'Inicia sesión en tu cuenta de DOS BYTES para gestionar pedidos, favoritos y reparaciones.',
  canonical: '/ingresar',
})
</script>

<template>
  <q-card flat class="auth-card surface-card">
    <h2>Iniciar sesión</h2>
    <p class="auth-sub">
      Accede para gestionar tus pedidos, favoritos y el seguimiento de tus reparaciones.
    </p>

    <q-banner
      v-if="unverifiedEmail"
      class="bg-orange-1 text-orange-9 q-mb-md"
      rounded
      dense
    >
      <template #avatar><q-icon name="mark_email_unread" /></template>
      Debes verificar tu correo antes de ingresar.
      <router-link
        class="text-weight-bold"
        :to="{ name: 'resend-verification', query: { email: unverifiedEmail } }"
      >
        Reenviar verificación
      </router-link>
    </q-banner>

    <q-form ref="formRef" @submit.prevent="submit">
      <q-input
        v-model="form.email"
        outlined
        type="email"
        label="Correo electrónico"
        autocomplete="email"
        :rules="rules.email"
        lazy-rules
        class="q-mb-md"
      >
        <template #prepend><q-icon name="mail" /></template>
      </q-input>

      <q-input
        v-model="form.password"
        outlined
        :type="showPassword ? 'text' : 'password'"
        label="Contraseña"
        autocomplete="current-password"
        :rules="rules.password"
        lazy-rules
      >
        <template #prepend><q-icon name="lock" /></template>
        <template #append>
          <q-btn
            flat
            round
            dense
            :icon="showPassword ? 'visibility_off' : 'visibility'"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="showPassword = !showPassword"
          />
        </template>
      </q-input>

      <div class="row justify-end q-mt-sm">
        <router-link class="text-caption text-primary" to="/recuperar">
          ¿Olvidaste tu contraseña?
        </router-link>
      </div>

      <q-btn
        unelevated
        no-caps
        color="primary"
        label="Ingresar"
        type="submit"
        class="full-width q-mt-lg"
        size="md"
        :loading="loading"
      />

      <div class="auth-links">
        <span class="text-grey-7">¿No tienes cuenta?</span>
        <router-link to="/registro">Crear cuenta</router-link>
      </div>
    </q-form>
  </q-card>
</template>
