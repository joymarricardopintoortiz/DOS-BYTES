<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '../../api/client'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const route = useRoute()

const formRef = ref(null)
const loading = ref(false)
const done = ref(false)
const showPassword = ref(false)
const form = ref({ password: '', confirm: '' })

const token = computed(() => String(route.query.token || '').trim())
const tokenMissing = computed(() => !token.value)

const rules = {
  password: [
    (value) => Boolean(value) || 'Escribe una contraseña',
    (value) => String(value).length >= 8 || 'Mínimo 8 caracteres',
    (value) => String(value).length <= 72 || 'Máximo 72 caracteres',
  ],
  confirm: [
    (value) => Boolean(value) || 'Confirma tu contraseña',
    (value) => value === form.value.password || 'Las contraseñas no coinciden',
  ],
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    const response = await authApi.resetPassword(token.value, {
      password: form.value.password,
    })
    done.value = true
    notifySuccess(response.message || 'Contraseña actualizada')
  } catch (error) {
    notifyError(error, 'No se pudo restablecer la contraseña')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Restablecer contraseña',
  description: 'Crea una nueva contraseña para tu cuenta de DOS BYTES.',
  canonical: '/restablecer',
})
</script>

<template>
  <q-card flat class="auth-card surface-card">
    <template v-if="tokenMissing">
      <div class="text-center q-py-md">
        <q-icon name="link_off" color="negative" size="52px" />
        <h2 class="q-mt-md">Enlace inválido</h2>
        <p class="auth-sub">
          El enlace no incluye un token válido. Solicita uno nuevo para restablecer tu
          contraseña.
        </p>
      </div>
      <div class="stack">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="send"
          label="Solicitar nuevo enlace"
          to="/recuperar"
        />
        <q-btn flat no-caps color="primary" icon="login" label="Volver a iniciar sesión" to="/ingresar" />
      </div>
    </template>

    <template v-else-if="done">
      <div class="text-center q-py-md">
        <q-icon name="check_circle" color="positive" size="56px" />
        <h2 class="q-mt-md">Contraseña actualizada</h2>
        <p class="auth-sub">
          Ya puedes iniciar sesión con tu nueva contraseña. Los enlaces de recuperación
          anteriores quedan invalidados.
        </p>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="login"
        label="Iniciar sesión"
        to="/ingresar"
        class="full-width"
      />
    </template>

    <template v-else>
      <h2>Nueva contraseña</h2>
      <p class="auth-sub">
        Crea una contraseña de entre 8 y 72 caracteres. No uses la misma que tenías antes.
      </p>

      <q-form ref="formRef" @submit.prevent="submit">
        <q-input
          v-model="form.password"
          outlined
          :type="showPassword ? 'text' : 'password'"
          label="Nueva contraseña"
          autocomplete="new-password"
          maxlength="72"
          :rules="rules.password"
          lazy-rules
          class="q-mb-md"
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
        >
          <template #prepend><q-icon name="lock_reset" /></template>
        </q-input>

        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Guardar contraseña"
          type="submit"
          class="full-width q-mt-lg"
          size="md"
          :loading="loading"
        />

        <div class="auth-links">
          <router-link to="/ingresar">Volver a iniciar sesión</router-link>
        </div>
      </q-form>
    </template>
  </q-card>
</template>
