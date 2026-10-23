<script setup>
import { computed } from 'vue'
import { useSiteStore } from '../../stores/site'
import { useSeo } from '../../composables/useSeo'

const site = useSiteStore()
const config = computed(() => site.siteConfig)
const adminEmails = computed(() => (config.value.adminEmails || []).filter(Boolean))
const phoneHref = computed(() =>
  config.value.phone ? `tel:${String(config.value.phone).replace(/[^\d+]/g, '')}` : ''
)
const mapsUrl = computed(() =>
  config.value.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        config.value.address
      )}`
    : ''
)

const faqs = [
  {
    question: '¿Necesito cita para llevar un equipo a reparación?',
    answer:
      'No. Puedes registrar la solicitud desde la web o llevar el equipo al local en el horario de atención. La web te da un código para consultar el estado.',
  },
  {
    question: '¿Cómo sé cuánto cuesta mi reparación?',
    answer:
      'Primero revisamos el equipo y registramos el diagnóstico. Luego verás la cotización en la consulta de estado y podrás aprobarla o rechazarla en línea.',
  },
  {
    question: '¿Puedo reservar productos y pagar después?',
    answer:
      'Sí. Los clientes con cuenta pueden armar un pedido y reservarlo. El pago se realiza en la tienda al recoger los productos.',
  },
  {
    question: '¿Qué pasa si no apruebo la cotización?',
    answer:
      'Te contactamos para coordinar la entrega del equipo sin reparar. No se cobra la reparación, aunque el diagnóstico puede tener una tarifa informada previamente.',
  },
]
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Contacto</span>
      </div>

      <div class="page-head">
        <div>
          <span class="eyebrow">Estamos cerca</span>
          <h1 class="title-xl">Contacto</h1>
          <p class="text-body2 text-grey-7 q-mb-none" style="max-width: 620px">
            Escríbenos, llámanos o visítanos. También puedes registrar tu solicitud de
            servicio técnico y consultar el estado en línea.
          </p>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="handyman"
          label="Solicitar servicio técnico"
          to="/servicio-tecnico"
        />
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-7">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Datos del local</div>

              <div class="stack" style="gap: 18px">
                <div v-if="config.address" class="row items-start q-gutter-md">
                  <div class="stat-icon"><q-icon name="place" /></div>
                  <div>
                    <div class="text-caption text-grey-7">Dirección</div>
                    <div class="text-weight-bold">{{ config.address }}</div>
                    <a
                      v-if="mapsUrl"
                      class="text-caption text-primary"
                      :href="mapsUrl"
                      target="_blank"
                      rel="noopener"
                    >
                      Ver en Google Maps
                      <q-icon name="open_in_new" size="13px" />
                    </a>
                  </div>
                </div>

                <div v-if="config.schedule" class="row items-start q-gutter-md">
                  <div class="stat-icon"><q-icon name="schedule" /></div>
                  <div>
                    <div class="text-caption text-grey-7">Horario de atención</div>
                    <div class="text-weight-bold">{{ config.schedule }}</div>
                  </div>
                </div>

                <div v-if="config.phone" class="row items-start q-gutter-md">
                  <div class="stat-icon"><q-icon name="call" /></div>
                  <div>
                    <div class="text-caption text-grey-7">Teléfono</div>
                    <a class="text-weight-bold" :href="phoneHref">{{ config.phone }}</a>
                  </div>
                </div>

                <div v-if="adminEmails.length" class="row items-start q-gutter-md">
                  <div class="stat-icon"><q-icon name="mail" /></div>
                  <div>
                    <div class="text-caption text-grey-7">Correos de los fundadores</div>
                    <div v-for="email in adminEmails" :key="email">
                      <a class="text-weight-bold" :href="`mailto:${email}`">{{ email }}</a>
                    </div>
                  </div>
                </div>

                <div v-if="config.employeeEmail" class="row items-start q-gutter-md">
                  <div class="stat-icon"><q-icon name="support_agent" /></div>
                  <div>
                    <div class="text-caption text-grey-7">Atención y soporte</div>
                    <a class="text-weight-bold" :href="`mailto:${config.employeeEmail}`">
                      {{ config.employeeEmail }}
                    </a>
                  </div>
                </div>

                <div
                  v-if="!config.address && !config.phone && !adminEmails.length"
                  class="soft-card q-pa-md text-grey-7 text-body2"
                >
                  Los datos de contacto se están actualizando. Mientras tanto, puedes
                  registrar tu solicitud desde la web.
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mt-lg">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Preguntas frecuentes</div>
              <q-expansion-item
                v-for="faq in faqs"
                :key="faq.question"
                :label="faq.question"
                expand-separator
                icon="help_outline"
                header-class="text-weight-bold"
              >
                <q-card flat>
                  <q-card-section class="text-body2 text-grey-8">
                    {{ faq.answer }}
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-md-5">
          <q-card flat bordered class="q-pa-lg">
            <div class="text-subtitle1 text-weight-bold q-mb-md">¿Qué necesitas hacer?</div>
            <div class="stack">
              <router-link to="/servicio-tecnico" class="surface-card q-pa-md row items-center q-gutter-md">
                <q-icon name="build_circle" color="secondary" size="28px" />
                <div>
                  <div class="text-weight-bold">Solicitar una reparación</div>
                  <div class="text-caption text-grey-7">Registra tu equipo y recibe un código.</div>
                </div>
              </router-link>
              <router-link to="/seguimiento" class="surface-card q-pa-md row items-center q-gutter-md">
                <q-icon name="track_changes" color="secondary" size="28px" />
                <div>
                  <div class="text-weight-bold">Consultar una orden</div>
                  <div class="text-caption text-grey-7">Revisa el estado con tu código.</div>
                </div>
              </router-link>
              <router-link to="/productos" class="surface-card q-pa-md row items-center q-gutter-md">
                <q-icon name="storefront" color="secondary" size="28px" />
                <div>
                  <div class="text-weight-bold">Comprar o reservar</div>
                  <div class="text-caption text-grey-7">Explora el catálogo y paga en tienda.</div>
                </div>
              </router-link>
              <router-link to="/servicios" class="surface-card q-pa-md row items-center q-gutter-md">
                <q-icon name="sell" color="secondary" size="28px" />
                <div>
                  <div class="text-weight-bold">Consultar tarifas</div>
                  <div class="text-caption text-grey-7">Servicio técnico, impresión y más.</div>
                </div>
              </router-link>
            </div>

            <q-separator class="q-my-lg" />

            <div class="text-caption text-grey-7">
              <q-icon name="info" size="15px" class="q-mr-xs" />
              Para agilizar la atención, ten a mano el modelo del equipo y el código de la
              orden si ya la registraste.
            </div>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>
