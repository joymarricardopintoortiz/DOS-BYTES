<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceOrdersApi } from '../../api/client'
import { EQUIPMENT_TYPES } from '../../utils/constants'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import { useConfirm } from '../../composables/useConfirm'
import StatusBadge from '../../components/common/StatusBadge.vue'
import StatusTimeline from '../../components/common/StatusTimeline.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()

const codeInput = ref('')
const order = ref(null)
const loading = ref(false)
const searched = ref(false)
const lookupError = ref('')
const deciding = ref(false)
const rejectDialog = ref(false)
const rejectNote = ref('')

const equipmentLabel = computed(() => {
  if (!order.value) return ''
  const type = EQUIPMENT_TYPES[order.value.equipment?.type]?.label || 'Equipo'
  const details = [order.value.equipment?.brand, order.value.equipment?.model]
    .filter(Boolean)
    .join(' ')
  return details ? `${type} · ${details}` : type
})

const canDecideQuote = computed(
  () =>
    order.value?.status === 'esperando_aprobacion' &&
    order.value?.quote?.status === 'pendiente'
)

const warrantyStatus = computed(() => {
  const warranty = order.value?.warranty
  if (!warranty?.days) return null
  if (!warranty.expiresAt) {
    return { label: `${warranty.days} días`, color: 'info', icon: 'verified_user' }
  }
  const expires = new Date(warranty.expiresAt)
  const active = expires.getTime() > Date.now()
  return {
    label: active
      ? `Vigente hasta ${formatDate(warranty.expiresAt)}`
      : `Vencida el ${formatDate(warranty.expiresAt)}`,
    color: active ? 'positive' : 'grey-7',
    icon: active ? 'verified_user' : 'event_busy',
  }
})

const history = computed(() => {
  const items = order.value?.statusHistory || []
  return [...items].sort((a, b) => new Date(a.at) - new Date(b.at))
})

async function load(code) {
  const clean = String(code || '').trim().toUpperCase()
  if (!clean) return
  loading.value = true
  lookupError.value = ''
  order.value = null
  try {
    const response = await serviceOrdersApi.track(clean)
    order.value = response.data.order
    searched.value = true
  } catch (error) {
    searched.value = true
    lookupError.value =
      error.status === 404
        ? `No encontramos una orden con el código ${clean}. Verifica el código e inténtalo de nuevo.`
        : error.message || 'No se pudo consultar la orden'
    if (error.status !== 404) notifyError(error, 'No se pudo consultar la orden')
  } finally {
    loading.value = false
  }
}

function submit() {
  const clean = codeInput.value.trim().toUpperCase()
  if (!clean) return
  if (clean === String(route.query.codigo || '').toUpperCase()) {
    load(clean)
    return
  }
  router.push({ name: 'track', query: { codigo: clean } })
}

async function approveQuote() {
  const accepted = await confirm({
    title: 'Aprobar cotización',
    message: `¿Autorizas la reparación por ${formatCurrency(order.value.quote.amount)}?`,
    okLabel: 'Sí, aprobar',
    cancelLabel: 'Volver',
    color: 'positive',
    icon: 'check_circle',
  })
  if (!accepted) return
  await sendDecision('aprobada')
}

async function rejectQuote() {
  rejectNote.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  const note = rejectNote.value.trim()
  rejectDialog.value = false
  await sendDecision('rechazada', note)
}

async function sendDecision(decision, note) {
  deciding.value = true
  try {
    await serviceOrdersApi.quoteDecision(order.value.code, {
      decision,
      ...(note ? { note } : {}),
    })
    notifySuccess(
      decision === 'aprobada'
        ? 'Cotización aprobada. Iniciaremos la reparación.'
        : 'Cotización rechazada. Te contactaremos para coordinar la entrega.'
    )
    await load(order.value.code)
  } catch (error) {
    notifyError(error, 'No se pudo registrar tu decisión')
  } finally {
    deciding.value = false
  }
}

watch(
  () => route.query.codigo,
  (value) => {
    const code = String(value || '').trim().toUpperCase()
    if (code) {
      codeInput.value = code
      load(code)
    } else {
      order.value = null
      searched.value = false
      lookupError.value = ''
    }
  },
  { immediate: true }
)

useSeo({
  title: 'Seguimiento de reparación',
  description:
    'Consulta en línea el estado de tu reparación en DOS BYTES con el código de la orden. Revisa el diagnóstico, aprueba la cotización y conoce tu garantía.',
  canonical: '/seguimiento',
})
</script>

<template>
  <div class="page-shell">
    <div class="container" style="max-width: 940px">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Seguimiento de reparación</span>
      </div>

      <div class="page-head">
        <div>
          <span class="eyebrow">Estado de tu equipo</span>
          <h1 class="title-xl">Consulta tu reparación</h1>
          <p class="text-body2 text-grey-7 q-mb-none" style="max-width: 620px">
            Ingresa el código que recibiste por correo (por ejemplo
            <strong>SRV-AB12CD</strong>). No necesitas iniciar sesión.
          </p>
        </div>
      </div>

      <q-card flat bordered class="q-pa-lg">
        <form class="row q-col-gutter-sm items-start" @submit.prevent="submit">
          <div class="col-12 col-sm">
            <q-input
              v-model="codeInput"
              outlined
              label="Código de la orden"
              placeholder="SRV-XXXXXX"
              maxlength="30"
              autocapitalize="characters"
              input-class="text-uppercase"
              :rules="[(value) => Boolean(String(value || '').trim()) || 'Escribe el código']"
              lazy-rules
            >
              <template #prepend>
                <q-icon name="confirmation_number" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="search"
              label="Consultar"
              type="submit"
              :loading="loading"
              class="full-width"
              style="height: 56px"
            />
          </div>
        </form>
      </q-card>

      <div v-if="loading" class="q-mt-lg">
        <q-skeleton height="180px" class="q-mb-md" style="border-radius: 14px" />
        <q-skeleton height="220px" style="border-radius: 14px" />
      </div>

      <q-banner
        v-else-if="lookupError"
        class="bg-red-1 text-negative q-mt-lg"
        rounded
      >
        <template #avatar>
          <q-icon name="search_off" />
        </template>
        {{ lookupError }}
        <template #action>
          <q-btn
            flat
            no-caps
            color="negative"
            label="Reintentar"
            @click="load(codeInput)"
          />
        </template>
      </q-banner>

      <template v-else-if="order">
        <q-card flat bordered class="q-mt-lg">
          <q-card-section class="row items-center justify-between q-gutter-md">
            <div>
              <div class="text-caption text-grey-7">Código de la orden</div>
              <div class="text-h5 text-weight-bold" style="letter-spacing: 0.06em">
                {{ order.code }}
              </div>
              <div class="text-caption text-grey-7 q-mt-xs">
                Recibido el {{ formatDateTime(order.receivedAt) }}
              </div>
            </div>
            <StatusBadge :status="order.status" />
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row q-col-gutter-lg">
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Equipo</div>
                <div class="text-weight-bold">{{ equipmentLabel }}</div>
              </div>
              <div class="col-12 col-sm-3">
                <div class="text-caption text-grey-7">Entrega prometida</div>
                <div class="text-weight-bold">{{ formatDate(order.promisedAt) }}</div>
              </div>
              <div class="col-12 col-sm-3">
                <div class="text-caption text-grey-7">Entregado</div>
                <div class="text-weight-bold">{{ formatDate(order.deliveredAt) }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card v-if="canDecideQuote" flat bordered class="q-mt-lg">
          <q-card-section>
            <div class="row items-start justify-between q-gutter-md">
              <div>
                <div class="row items-center q-gutter-sm">
                  <q-icon name="pending_actions" color="warning" size="24px" />
                  <div class="text-subtitle1 text-weight-bold">
                    Tu cotización está lista
                  </div>
                </div>
                <p class="text-body2 text-grey-8 q-mt-sm q-mb-none">
                  Revisa el diagnóstico y el valor de la reparación. Autoriza para que
                  empecemos o rechaza para coordinar la entrega de tu equipo.
                </p>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-7">Valor de la reparación</div>
                <div class="text-h5 text-weight-bold text-primary">
                  {{ formatCurrency(order.quote.amount) }}
                </div>
              </div>
            </div>

            <div v-if="order.diagnosis" class="answer-box q-mt-md">
              <div class="text-caption text-weight-bold text-primary q-mb-xs">
                <q-icon name="fact_check" size="14px" class="q-mr-xs" /> Diagnóstico
              </div>
              <div class="text-body2" style="white-space: pre-line">{{ order.diagnosis }}</div>
            </div>

            <div class="inline-actions q-mt-lg">
              <q-btn
                unelevated
                no-caps
                color="positive"
                icon="check_circle"
                label="Aprobar cotización"
                :loading="deciding"
                @click="approveQuote"
              />
              <q-btn
                outline
                no-caps
                color="negative"
                icon="cancel"
                label="Rechazar"
                :disable="deciding"
                @click="rejectQuote"
              />
            </div>
          </q-card-section>
        </q-card>

        <div class="row q-col-gutter-lg q-mt-md">
          <div class="col-12 col-md-7">
            <q-card flat bordered class="fit">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-md">
                  Historial de la orden
                </div>
                <StatusTimeline
                  v-if="history.length"
                  :history="history"
                  :current="order.status"
                />
                <div v-else class="text-grey-7 text-body2">
                  Aún no hay movimientos registrados.
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-5">
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  Resumen del servicio
                </div>
                <div class="meta-list">
                  <div>
                    <span>Estado de la cotización</span>
                    <strong>
                      <q-badge
                        :color="
                          order.quote.status === 'aprobada'
                            ? 'positive'
                            : order.quote.status === 'rechazada'
                              ? 'negative'
                              : 'warning'
                        "
                      >
                        {{
                          order.quote.status === 'aprobada'
                            ? 'Aprobada'
                            : order.quote.status === 'rechazada'
                              ? 'Rechazada'
                              : 'Pendiente'
                        }}
                      </q-badge>
                    </strong>
                  </div>
                  <div>
                    <span>Cotización</span>
                    <strong>{{ formatCurrency(order.quote.amount) }}</strong>
                  </div>
                  <div>
                    <span>Costo final</span>
                    <strong>{{ formatCurrency(order.finalCost) }}</strong>
                  </div>
                  <div>
                    <span>Última actualización</span>
                    <strong>{{ formatDateTime(order.updatedAt) }}</strong>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-card v-if="warrantyStatus" flat bordered>
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">Garantía</div>
                <q-badge :color="warrantyStatus.color" class="q-px-sm q-py-xs">
                  <q-icon :name="warrantyStatus.icon" size="13px" class="q-mr-xs" />
                  {{ warrantyStatus.label }}
                </q-badge>
                <div v-if="order.warranty?.startsAt" class="text-caption text-grey-7 q-mt-sm">
                  Inicia el {{ formatDate(order.warranty.startsAt) }} ·
                  {{ order.warranty.days }} días de cobertura.
                </div>
              </q-card-section>
            </q-card>

            <q-card v-else flat bordered>
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-xs">Garantía</div>
                <div class="text-caption text-grey-7">
                  La garantía se registra cuando la reparación queda lista para entrega.
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-card flat bordered class="q-mt-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-sm">Detalle técnico</div>
            <div class="q-mb-md">
              <div class="text-caption text-grey-7">Falla reportada</div>
              <p class="text-body2 q-mb-none" style="white-space: pre-line">
                {{ order.reportedIssue }}
              </p>
            </div>
            <div v-if="order.diagnosis">
              <div class="text-caption text-grey-7">Diagnóstico</div>
              <p class="text-body2 q-mb-none" style="white-space: pre-line">
                {{ order.diagnosis }}
              </p>
            </div>
          </q-card-section>
        </q-card>
      </template>

      <EmptyState
        v-else-if="searched"
        icon="qr_code_scanner"
        title="No encontramos esa orden"
        text="Revisa que el código esté completo. Si el problema continúa, contáctanos."
      >
        <q-btn outline no-caps color="primary" label="Contactar" to="/contacto" />
      </EmptyState>

      <q-card v-else flat bordered class="q-mt-lg">
        <q-card-section class="row items-center q-gutter-md">
          <q-icon name="info" color="secondary" size="26px" />
          <div class="text-body2 text-grey-8">
            ¿Todavía no has registrado tu equipo?
            <router-link to="/servicio-tecnico" class="text-primary text-weight-bold">
              Solicita el servicio técnico aquí
            </router-link>
            .
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="rejectDialog" persistent>
      <q-card style="width: min(460px, 92vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="report_problem" color="negative" size="26px" />
          <div class="text-subtitle1 text-weight-bold">Rechazar cotización</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <p class="text-body2 text-grey-8">
            Cuéntanos el motivo (opcional). Nos pondremos en contacto para coordinar la
            entrega de tu equipo sin reparar.
          </p>
          <q-input
            v-model="rejectNote"
            type="textarea"
            outlined
            autogrow
            maxlength="500"
            counter
            label="Motivo del rechazo"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="negative"
            label="Rechazar cotización"
            :loading="deciding"
            @click="confirmReject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
