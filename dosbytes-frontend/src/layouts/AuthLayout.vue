<script setup>
import { onMounted } from 'vue'
import Logo from '../components/common/Logo.vue'
import { useSiteStore } from '../stores/site'

const site = useSiteStore()

onMounted(() => {
  site.load().catch(() => {})
})
</script>

<template>
  <div class="auth-layout">
    <aside class="auth-aside">
      <Logo light tagline="Tecnología y servicio" />

      <div class="auth-aside-copy">
        <span class="hero-kicker">Tu cuenta DOS BYTES</span>
        <h1>Todo tu tecnología, en un solo lugar.</h1>
        <p>
          Solicita reparaciones, sigue su estado, guarda tus favoritos y reserva
          productos para recoger en el local.
        </p>
        <div class="auth-features">
          <div class="auth-feature">
            <q-icon name="verified" color="secondary" size="22px" />
            <span>Cuenta verificada por correo para proteger tu información.</span>
          </div>
          <div class="auth-feature">
            <q-icon name="build_circle" color="secondary" size="22px" />
            <span>Seguimiento de reparaciones con el código de tu orden.</span>
          </div>
          <div class="auth-feature">
            <q-icon name="shopping_bag" color="secondary" size="22px" />
            <span>Reserva en línea y paga al recoger en la tienda.</span>
          </div>
        </div>
      </div>

      <div class="auth-links" style="color: #a9bdd4">
        <router-link to="/privacidad" style="color: #cfe0f2">Privacidad</router-link>
        <router-link to="/terminos" style="color: #cfe0f2">Términos</router-link>
        <router-link to="/" style="color: #cfe0f2">Volver al inicio</router-link>
      </div>
    </aside>

    <main class="auth-main">
      <router-view />
    </main>
  </div>
</template>
