<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useSeo } from '../../composables/useSeo'

const auth = useAuthStore()

const homeLink = computed(() => {
  if (auth.isStaff) return { to: '/panel', label: 'Ir al panel', icon: 'dashboard' }
  if (auth.isCustomer) return { to: '/mi-cuenta', label: 'Ir a mi cuenta', icon: 'person' }
  return { to: '/ingresar', label: 'Iniciar sesión', icon: 'login' }
})

useSeo({
  title: 'Acceso restringido',
  description: 'No tienes permisos para acceder a esta sección.',
})
</script>

<template>
  <div class="page-shell">
    <div class="container" style="max-width: 680px">
      <div class="surface-card q-pa-xl text-center">
        <div class="stat-icon q-mx-auto" style="width: 64px; height: 64px">
          <q-icon name="lock" size="32px" />
        </div>
        <h1 class="title-lg q-mt-md">Acceso restringido</h1>
        <p class="text-body2 text-grey-7 q-mt-sm">
          Tu cuenta no tiene permisos para esta sección. Si crees que es un error, contacta
          a un administrador.
        </p>

        <div class="row justify-center q-gutter-sm q-mt-lg">
          <q-btn
            unelevated
            no-caps
            color="primary"
            :icon="homeLink.icon"
            :label="homeLink.label"
            :to="homeLink.to"
          />
          <q-btn outline no-caps color="primary" icon="home" label="Inicio" to="/" />
        </div>
      </div>
    </div>
  </div>
</template>
