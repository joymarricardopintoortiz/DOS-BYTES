<script setup>
import { useSeo } from '../../composables/useSeo'

useSeo({
  title: 'Página no encontrada',
  description: 'La página que buscas no existe o fue movida.',
})
</script>

<template>
  <div class="page-shell">
    <div class="container" style="max-width: 720px">
      <div class="surface-card q-pa-xl text-center">
        <div class="text-h2 text-weight-bold text-primary" style="letter-spacing: -0.04em">
          404
        </div>
        <h1 class="title-lg q-mt-sm">No encontramos esta página</h1>
        <p class="text-body2 text-grey-7 q-mt-sm">
          Puede que el enlace esté mal escrito, que el producto ya no esté disponible o que
          la página se haya movido.
        </p>

        <div class="row justify-center q-gutter-sm q-mt-lg">
          <q-btn unelevated no-caps color="primary" icon="home" label="Ir al inicio" to="/" />
          <q-btn outline no-caps color="primary" icon="storefront" label="Ver catálogo" to="/productos" />
        </div>

        <q-separator class="q-my-lg" />

        <div class="text-caption text-grey-7 q-mb-sm">También puedes ir a:</div>
        <div class="inline-actions justify-center">
          <q-btn flat dense no-caps color="primary" label="Servicios" to="/servicios" />
          <q-btn flat dense no-caps color="primary" label="Seguimiento" to="/seguimiento" />
          <q-btn flat dense no-caps color="primary" label="Contacto" to="/contacto" />
          <q-btn flat dense no-caps color="primary" label="Mi cuenta" to="/mi-cuenta" />
        </div>
      </div>
    </div>
  </div>
</template>
