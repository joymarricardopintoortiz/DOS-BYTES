<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const auth = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const done = ref(false)
const registeredEmail = ref('')
const showPassword = ref(false)
const acceptedTerms = ref(false)
const form = ref({ name: '', email: '', phone: '', password: '', confirm: '' })

const rules = {
  name: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe tu nombre completo',
    (value) => String(value || '').trim().length <= 120 || 'Máximo 120 caracteres',
  ],
  email: [
    (value) => Boolean(String(value || '').trim()) || 'Escribe tu correo',
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) || 'Correo inválido',
  ],
  phone: [(value) => !value || String(value).length <= 30 || 'Teléfono inválido'],
  password: [
    (value) => Boolean(value) || 'Crea una contraseña',
    (value) => String(value).length >= 8 || 'Mínimo 8 caracteres',
    (value) => String(value).length <= 72 || 'Máximo 72 caracteres',
  ],
  confirm: [
    (value) => Boolean(value) || 'Confirma tu contraseña',
    (value) => value === form.value.password || 'Las contraseñas no coinciden',
  ],
  terms: [(value) => Boolean(value) || 'Debes aceptar los términos y la política de privacidad'],
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    await auth.register({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim() || undefined,
      password: form.value.password,
    })
    registeredEmail.value = form.value.email.trim()
    done.value = true
    notifySuccess('Cuenta creada. Revisa tu correo para verificarla.')
  } catch (error) {
    notifyError(error, 'No se pudo crear la cuenta')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Crear cuenta',
  description:
    'Crea tu cuenta de cliente en DOS BYTES para reservar productos, guardar favoritos, opinar y seguir tus reparaciones.',
  canonical: '/registro',
})
</script>

<template>
  <q-card flat class="auth-card surface-card">
    <template v-if="done">
      <div class="text-center">
        <q-icon name="mark_email_read" color="positive" size="56px" />
        <h2 class="q-mt-md">Revisa tu correo</h2>
        <p class="auth-sub">
          Enviamos un enlace de verificación a
          <strong>{{ registeredEmail }}</strong>. Debes abrirlo antes de iniciar sesión.
        </p>
      </div>

      <q-banner class="bg-blue-1 text-primary" rounded>
        <template #avatar><q-icon name="info" /></template>
        El enlace caduca en 24 horas. Si no llega, revisa la carpeta de spam o reenvíalo.
      </q-banner>

      <div class="stack q-mt-lg">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="login"
          label="Ir a iniciar sesión"
          to="/ingresar"
        />
        <q-btn
          outline
          no-caps
          color="primary"
          icon="forward_to_inbox"
          label="Reenviar verificación"
          :to="{ name: 'resend-verification', query: { email: registeredEmail } }"
        />
      </div>
    </template>

    <template v-else>
      <h2>Crear cuenta</h2>
      <p class="auth-sub">
        Es gratis y solo toma un minuto. Necesitas un correo que puedas verificar.
      </p>

      <q-form ref="formRef" @submit.prevent="submit">
        <q-input
          v-model="form.name"
          outlined
          label="Nombre completo"
          autocomplete="name"
          maxlength="120"
          :rules="rules.name"
          lazy-rules
          class="q-mb-md"
        >
          <template #prepend><q-icon name="person" /></template>
        </q-input>

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
          v-model="form.phone"
          outlined
          type="tel"
          label="Teléfono (opcional)"
          autocomplete="tel"
          maxlength="30"
          :rules="rules.phone"
          lazy-rules
          class="q-mb-md"
        >
          <template #prepend><q-icon name="call" /></template>
        </q-input>

        <q-input
          v-model="form.password"
          outlined
          :type="showPassword ? 'text' : 'password'"
          label="Contraseña"
          autocomplete="new-password"
          maxlength="72"
          :rules="rules.password"
          lazy-rules
          class="q-mb-md"
          hint="Entre 8 y 72 caracteres."
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

        <q-input
          v-model="form.confirm"
          outlined
          :type="showPassword ? 'text' : 'password'"
          label="Confirmar contraseña"
          autocomplete="new-password"
          maxlength="72"
          :rules="rules.confirm"
          lazy-rules
          class="q-mb-sm"
        >
          <template #prepend><q-icon name="lock_reset" /></template>
        </q-input>

        <q-checkbox
          v-model="acceptedTerms"
          dense
          color="primary"
          class="q-mt-sm"
        >
          <template #default>
            <span class="text-caption text-grey-8">
              Acepto los
              <router-link to="/terminos" class="text-primary text-weight-bold">términos y condiciones</router-link>
              y la
              <router-link to="/privacidad" class="text-primary text-weight-bold">política de privacidad</router-link>.
            </span>
          </template>
        </q-checkbox>
        <div v-if="!acceptedTerms" class="text-caption text-grey-6 q-mb-sm">
          Debes aceptar para continuar.
        </div>

        <q-btn
          unelevated
          no-caps
          color="primary"
          label="Crear mi cuenta"
          type="submit"
          class="full-width q-mt-md"
          size="md"
          :loading="loading"
          :disable="!acceptedTerms"
        />

        <div class="auth-links">
          <span class="text-grey-7">¿Ya tienes cuenta?</span>
          <router-link to="/ingresar">Iniciar sesión</router-link>
        </div>
      </q-form>
    </template>
  </q-card>
</template>
