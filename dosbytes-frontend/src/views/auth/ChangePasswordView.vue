<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref(null)
const loading = ref(false)
const showPassword = ref(false)
const form = ref({ currentPassword: '', newPassword: '', confirm: '' })

const forced = computed(() => auth.mustChangePassword)

const rules = {
  currentPassword: [(value) => Boolean(value) || 'Escribe tu contraseña actual'],
  newPassword: [
    (value) => Boolean(value) || 'Crea una nueva contraseña',
    (value) => String(value).length >= 8 || 'Mínimo 8 caracteres',
    (value) => String(value).length <= 72 || 'Máximo 72 caracteres',
    (value) => value !== form.value.currentPassword || 'Debe ser diferente a la actual',
  ],
  confirm: [
    (value) => Boolean(value) || 'Confirma la nueva contraseña',
    (value) => value === form.value.newPassword || 'Las contraseñas no coinciden',
  ],
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    await auth.changePassword({
      currentPassword: form.value.currentPassword,
      newPassword: form.value.newPassword,
    })
    notifySuccess('Contraseña actualizada correctamente')
    await router.replace(auth.homeRoute)
  } catch (error) {
    notifyError(error, 'No se pudo cambiar la contraseña')
  } finally {
    loading.value = false
  }
}

useSeo({
  title: 'Cambiar contraseña',
  description: 'Actualiza la contraseña de tu cuenta de DOS BYTES.',
})
</script>

<template>
  <q-card flat class="auth-card surface-card" style="width: min(500px, 100%)">
    <h2>Cambiar contraseña</h2>
    <p class="auth-sub">
      <template v-if="forced">
        Estás usando una contraseña temporal. Crea una nueva para continuar usando la
        plataforma.
      </template>
      <template v-else>
        Por seguridad, te recomendamos usar una contraseña única que no uses en otros
        sitios.
      </template>
    </p>

    <q-banner v-if="forced" class="bg-orange-1 text-orange-9 q-mb-md" rounded dense>
      <template #avatar><q-icon name="lock_reset" /></template>
      Debes cambiar la contraseña temporal antes de continuar.
    </q-banner>

    <q-form ref="formRef" @submit.prevent="submit">
      <q-input
        v-model="form.currentPassword"
        outlined
        :type="showPassword ? 'text' : 'password'"
        label="Contraseña actual"
        autocomplete="current-password"
        :rules="rules.currentPassword"
        lazy-rules
        class="q-mb-md"
      >
        <template #prepend><q-icon name="lock" /></template>
      </q-input>

      <q-input
        v-model="form.newPassword"
        outlined
        :type="showPassword ? 'text' : 'password'"
        label="Nueva contraseña"
        autocomplete="new-password"
        maxlength="72"
        :rules="rules.newPassword"
        lazy-rules
        class="q-mb-md"
        hint="Entre 8 y 72 caracteres."
      >
        <template #prepend><q-icon name="lock_open" /></template>
        <template #append>
          <q-btn
            flat
            round
            dense
            :icon="showPassword ? 'visibility_off' : 'visibility'"
            :aria-label="showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'"
            @click="showPassword = !showPassword"
          />
        </template>
      </q-input>

      <q-input
        v-model="form.confirm"
        outlined
        :type="showPassword ? 'text' : 'password'"
        label="Confirmar nueva contraseña"
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
        <router-link :to="auth.homeRoute">
          <q-icon name="arrow_back" size="14px" /> Volver
        </router-link>
        <router-link to="/">Ir al inicio</router-link>
      </div>
    </q-form>
  </q-card>
</template>
