<script setup>
import { computed } from 'vue'
import Logo from '../common/Logo.vue'
import { useSiteStore } from '../../stores/site'

const site = useSiteStore()
const config = computed(() => site.siteConfig)
const year = new Date().getFullYear()
const adminEmails = computed(() => (config.value.adminEmails || []).filter(Boolean))
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <Logo light tagline="Tecnología y servicio" />
          <p class="footer-about">{{ config.description }}</p>
        </div>

        <div>
          <h3 class="footer-title">Tienda</h3>
          <ul class="footer-links">
            <li><router-link to="/productos">Catálogo</router-link></li>
            <li><router-link to="/productos?isOffer=true">Ofertas</router-link></li>
            <li><router-link to="/servicios">Servicios y tarifas</router-link></li>
            <li><router-link to="/servicio-tecnico">Solicitar servicio técnico</router-link></li>
            <li><router-link to="/seguimiento">Consultar reparación</router-link></li>
          </ul>
        </div>

        <div>
          <h3 class="footer-title">Información</h3>
          <ul class="footer-links">
            <li><router-link to="/nosotros">Nosotros</router-link></li>
            <li><router-link to="/contacto">Contacto</router-link></li>
            <li><router-link to="/privacidad">Política de privacidad</router-link></li>
            <li><router-link to="/terminos">Términos y condiciones</router-link></li>
            <li><router-link to="/mi-cuenta">Mi cuenta</router-link></li>
          </ul>
        </div>

        <div class="footer-contact-col">
          <h3 class="footer-title">Contacto</h3>
          <ul class="footer-contact">
            <li v-if="config.address">
              <q-icon name="place" size="18px" />
              <span>{{ config.address }}</span>
            </li>
            <li v-if="config.schedule">
              <q-icon name="schedule" size="18px" />
              <span>{{ config.schedule }}</span>
            </li>
            <li v-if="config.phone">
              <q-icon name="call" size="18px" />
              <a :href="`tel:${config.phone.replace(/\s+/g, '')}`">{{ config.phone }}</a>
            </li>
            <li v-for="email in adminEmails" :key="email">
              <q-icon name="mail" size="18px" />
              <a :href="`mailto:${email}`">{{ email }}</a>
            </li>
            <li v-if="config.employeeEmail">
              <q-icon name="support_agent" size="18px" />
              <a :href="`mailto:${config.employeeEmail}`">{{ config.employeeEmail }}</a>
            </li>
            <li v-if="!config.address && !config.adminEmails?.length">
              <q-icon name="info" size="18px" />
              <span>Datos de contacto disponibles próximamente.</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ year }} {{ config.businessName || 'DOS BYTES' }}. Todos los derechos reservados.</span>
        <span>Precios en pesos colombianos (COP) · Pago en tienda</span>
      </div>
    </div>
  </footer>
</template>
