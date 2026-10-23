<script setup>
import { computed } from 'vue'
import { useSiteStore } from '../../stores/site'
import { SERVICE_LINES } from '../../utils/constants'
import { useSeo } from '../../composables/useSeo'

const site = useSiteStore()
const config = computed(() => site.siteConfig)

const values = [
  {
    icon: 'handyman',
    title: 'Reparamos con criterio',
    text: 'Diagnosticamos antes de cotizar. Te explicamos qué falla, qué se cambia y cuánto cuesta, sin sorpresas.',
  },
  {
    icon: 'payments',
    title: 'Precios claros',
    text: 'Tarifas publicadas en pesos colombianos y pago en tienda. La cotización final se confirma tras el diagnóstico.',
  },
  {
    icon: 'verified_user',
    title: 'Garantía registrada',
    text: 'Cada reparación queda documentada con su garantía y fecha de vencimiento para que puedas consultarla en línea.',
  },
  {
    icon: 'diversity_3',
    title: 'Atención cercana',
    text: 'Un negocio de barrio con herramientas digitales: te atendemos personas, no un formulario automático.',
  },
]

const lines = [
  {
    key: 'tecnico',
    title: 'Servicio técnico',
    text: 'Reparación de consolas, laptops, computadores de escritorio y otros equipos. Diagnóstico, repuestos y garantía.',
    icon: SERVICE_LINES.tecnico.icon,
  },
  {
    key: 'cibercafe',
    title: 'Cibercafé',
    text: 'Equipos con internet para consultas, trámites y trabajo. Impresión y copias en el mismo lugar.',
    icon: SERVICE_LINES.cibercafe.icon,
  },
  {
    key: 'papeleria',
    title: 'Papelería y accesorios',
    text: 'Periféricos, cables, cargadores, controles, videojuegos, lápices y útiles para el día a día.',
    icon: SERVICE_LINES.papeleria.icon,
  },
  {
    key: 'impresion',
    title: 'Impresión y copias',
    text: 'Documentos, trabajos y material de estudio con tarifas por página y atención inmediata.',
    icon: SERVICE_LINES.impresion.icon,
  },
]

useSeo({
  title: 'Nosotros',
  description:
    'Conoce DOS BYTES: un negocio de tecnología con servicio técnico, cibercafé, papelería, impresión y accesorios. Reparación con diagnóstico, cotización y garantía.',
  canonical: '/nosotros',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.value.businessName || 'DOS BYTES',
    description: config.value.description,
    address: config.value.address || undefined,
    telephone: config.value.phone || undefined,
  },
})
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Nosotros</span>
      </div>

      <section class="hero">
        <div class="hero-copy">
          <span class="hero-kicker">
            <q-icon name="storefront" size="15px" />
            {{ config.businessName || 'DOS BYTES' }}
          </span>
          <h1 class="hero-title">Tecnología con servicio de verdad.</h1>
          <p class="hero-text">
            Somos un negocio de tecnología que une servicio técnico, cibercafé,
            papelería, impresión y accesorios en un solo lugar. La web es nuestra
            vitrina: te permite reservar productos, solicitar reparaciones y seguir su
            estado sin tener que llamar.
          </p>
          <div class="hero-actions">
            <q-btn
              unelevated
              no-caps
              color="secondary"
              text-color="primary"
              icon="handyman"
              label="Solicitar servicio técnico"
              to="/servicio-tecnico"
            />
            <q-btn
              outline
              no-caps
              color="white"
              icon="storefront"
              label="Ver catálogo"
              to="/productos"
            />
          </div>
        </div>
      </section>

      <section class="section">
        <div class="row q-col-gutter-lg items-start">
          <div class="col-12 col-md-7">
            <span class="eyebrow">Nuestra historia</span>
            <h2 class="title-lg q-mt-xs">Dos fundadores, una misma idea</h2>
            <div class="prose q-mt-md">
              <p>
                DOS BYTES nació como un proyecto de dos fundadores que querían acercar la
                tecnología al barrio: reparar lo que otros descartan, facilitar el acceso
                a un computador y tener a mano lo que hace falta para estudiar o trabajar.
              </p>
              <p>
                Empezamos con el servicio técnico como prioridad y fuimos sumando el
                cibercafé, la papelería, la impresión y los accesorios. Hoy la plataforma
                web nos permite mostrar el catálogo, registrar órdenes de servicio y
                mantener informado al cliente en cada etapa del proceso.
              </p>
              <p>
                No reemplazamos la atención del local: la ordenamos. Cada reparación tiene
                un código, un diagnóstico, una cotización que el cliente aprueba y una
                garantía registrada.
              </p>
            </div>
          </div>
          <div class="col-12 col-md-5">
            <div class="soft-card q-pa-lg">
              <div class="text-subtitle1 text-weight-bold q-mb-md">Cómo trabajamos</div>
              <ol class="timeline" style="padding-left: 0">
                <li class="timeline-item current">
                  <span class="timeline-dot"><q-icon name="inbox" size="14px" /></span>
                  <div class="timeline-title">Recibimos tu equipo</div>
                  <div class="timeline-note">
                    Registramos marca, modelo, accesorios y la falla reportada.
                  </div>
                </li>
                <li class="timeline-item">
                  <span class="timeline-dot"><q-icon name="search" size="14px" /></span>
                  <div class="timeline-title">Diagnóstico y cotización</div>
                  <div class="timeline-note">
                    Te informamos el problema y el costo antes de intervenir.
                  </div>
                </li>
                <li class="timeline-item">
                  <span class="timeline-dot"><q-icon name="handyman" size="14px" /></span>
                  <div class="timeline-title">Reparación autorizada</div>
                  <div class="timeline-note">
                    Solo avanzamos cuando apruebas la cotización desde la web.
                  </div>
                </li>
                <li class="timeline-item">
                  <span class="timeline-dot"><q-icon name="verified_user" size="14px" /></span>
                  <div class="timeline-title">Entrega con garantía</div>
                  <div class="timeline-note">
                    Registramos la garantía y te avisamos cuando está listo.
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Lo que nos define</span>
            <h2 class="section-title">Nuestros principios</h2>
          </div>
        </div>
        <div class="product-grid" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr))">
          <div v-for="value in values" :key="value.title" class="surface-card q-pa-lg">
            <div class="category-icon q-mb-sm"><q-icon :name="value.icon" /></div>
            <div class="text-subtitle1 text-weight-bold">{{ value.title }}</div>
            <p class="text-body2 text-grey-7 q-mt-sm q-mb-none">{{ value.text }}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Nuestras líneas</span>
            <h2 class="section-title">Todo en un mismo local</h2>
          </div>
          <router-link class="section-link" to="/servicios">
            Ver servicios y tarifas <q-icon name="arrow_forward" size="16px" />
          </router-link>
        </div>
        <div class="row q-col-gutter-md">
          <div v-for="line in lines" :key="line.key" class="col-12 col-sm-6 col-md-3">
            <div class="surface-card q-pa-lg fit">
              <div class="category-icon q-mb-sm"><q-icon :name="line.icon" /></div>
              <div class="text-subtitle1 text-weight-bold">{{ line.title }}</div>
              <p class="text-body2 text-grey-7 q-mt-sm q-mb-none">{{ line.text }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="surface-card q-pa-lg row items-center justify-between q-gutter-lg">
          <div>
            <div class="text-subtitle1 text-weight-bold">¿Tienes un equipo que revisar?</div>
            <p class="text-body2 text-grey-7 q-mb-none">
              Registra la solicitud en línea y recibe un código para seguir el proceso.
            </p>
          </div>
          <div class="inline-actions">
            <q-btn outline no-caps color="primary" icon="contact_phone" label="Contacto" to="/contacto" />
            <q-btn unelevated no-caps color="primary" icon="build_circle" label="Solicitar reparación" to="/servicio-tecnico" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
