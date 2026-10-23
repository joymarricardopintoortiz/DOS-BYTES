<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { serviceOrdersApi } from '../../api/client'
import {
  EQUIPMENT_TYPE_OPTIONS,
  QUOTE_STATUS,
  SERVICE_ORDER_STATUS,
  SERVICE_ORDER_TRANSITIONS,
} from '../../utils/constants'
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  formatDateTime,
} from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import StatusBadge from '../../components/common/StatusBadge.vue'
import StatusTimeline from '../../components/common/StatusTimeline.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import PartsEditor from '../../components/panel/PartsEditor.vue'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()

const order = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const changingStatus = ref(false)

const form = ref(emptyForm())
const originalQuoteStatus = ref('pendiente')
const nextStatus = ref('')
const statusNote = ref('')

const quoteOptions = Object.entries(QUOTE_STATUS).map(([value, item]) => ({
  value,
  label: item.label,
}))

const transitionOptions = computed(() => {
  const allowed = SERVICE_ORDER_TRANSITIONS[order.value?.status] || []
  return allowed.map((value) => ({
    value,
    label: SERVICE_ORDER_STATUS[value]?.label || value,
  }))
})

const history = computed(() => {
  const items = order.value?.statusHistory || []
  return [...items].sort((a, b) => new Date(a.at) - new Date(b.at))
})

const equipmentLabel = computed(() => {
  if (!order.value) return ''
  return (
    EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === order.value.equipment?.type)
      ?.label || 'Equipo'
  )
})

const partsTotal = computed(() =>
  form.value.parts.reduce(
    (sum, part) => sum + Number(part.quantity || 0) * Number(part.unitCost || 0),
    0
  )
)

const warrantyExpiry = computed(() => {
  const warranty = order.value?.warranty
  if (!warranty?.days) return ''
  if (warranty.expiresAt) return formatDate(warranty.expiresAt)
  const start = warranty.startsAt ? new Date(warranty.startsAt) : new Date()
  return formatDate(new Date(start.getTime() + warranty.days * 86400000))
})

const customerName = computed(
  () => order.value?.customer?.name || order.value?.customerSnapshot?.name || 'Cliente'
)

function emptyForm() {
  return {
    diagnosis: '',
    internalNotes: '',
    finalCost: 0,
    promisedAt: '',
    quoteAmount: 0,
    quoteNotes: '',
    quoteStatus: 'pendiente',
    parts: [],
    warrantyDays: 0,
    equipment: { brand: '', model: '', serial: '' },
  }
}

function syncForm(data) {
  form.value = {
    diagnosis: data.diagnosis || '',
    internalNotes: data.internalNotes || '',
    finalCost: data.finalCost || 0,
    promisedAt: formatDateInput(data.promisedAt),
    quoteAmount: data.quote?.amount || 0,
    quoteNotes: data.quote?.notes || '',
    quoteStatus: data.quote?.status || 'pendiente',
    parts: (data.parts || []).map((part) => ({
      name: part.name || '',
      quantity: part.quantity || 1,
      unitCost: part.unitCost || 0,
    })),
    warrantyDays: data.warranty?.days || 0,
    equipment: {
      brand: data.equipment?.brand || '',
      model: data.equipment?.model || '',
      serial: data.equipment?.serial || '',
    },
  }
  originalQuoteStatus.value = data.quote?.status || 'pendiente'
  nextStatus.value = (SERVICE_ORDER_TRANSITIONS[data.status] || [])[0] || ''
  statusNote.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await serviceOrdersApi.get(route.params.id)
    order.value = response.data.order
    syncForm(order.value)
    if (route.query.creada === '1') {
      notifySuccess(`Orden ${order.value.code} registrada correctamente`)
      router.replace({ name: 'panel-service-order', params: route.params })
    }
  } catch (err) {
    error.value =
      err.status === 404
        ? 'No encontramos esta orden de servicio.'
        : err.message || 'No se pudo cargar la orden'
    if (err.status !== 404) notifyError(err, 'No se pudo cargar la orden')
  } finally {
    loading.value = false
  }
}

async function save() {
  const invalidPart = form.value.parts.some((part) => !String(part.name || '').trim())
  if (invalidPart) {
    notifyError(null, 'Completa el nombre de cada repuesto o elimina la fila vacía')
    return
  }

  const payload = {
    diagnosis: form.value.diagnosis.trim(),
    internalNotes: form.value.internalNotes.trim(),
    finalCost: Number(form.value.finalCost) || 0,
    promisedAt: form.value.promisedAt || null,
    quote: {
      amount: Number(form.value.quoteAmount) || 0,
      notes: form.value.quoteNotes.trim(),
      ...(form.value.quoteStatus !== originalQuoteStatus.value
        ? { status: form.value.quoteStatus }
        : {}),
    },
    parts: form.value.parts.map((part) => ({
      name: part.name.trim(),
      quantity: Number(part.quantity) || 1,
      unitCost: Number(part.unitCost) || 0,
    })),
    warranty: { days: Number(form.value.warrantyDays) || 0 },
    equipment: {
      brand: form.value.equipment.brand.trim(),
      model: form.value.equipment.model.trim(),
      serial: form.value.equipment.serial.trim(),
    },
  }

  saving.value = true
  try {
    const response = await serviceOrdersApi.update(order.value._id, payload)
    order.value = response.data.order
    syncForm(order.value)
    notifySuccess('Orden actualizada')
  } catch (err) {
    notifyError(err, 'No se pudo actualizar la orden')
  } finally {
    saving.value = false
  }
}

async function changeStatus() {
  if (!nextStatus.value) return
  const label = SERVICE_ORDER_STATUS[nextStatus.value]?.label || nextStatus.value
  const accepted = await confirm({
    title: 'Cambiar estado',
    message: `La orden pasará a "${label}".${
      nextStatus.value === 'listo'
        ? ' Se intentará enviar el aviso de equipo listo al cliente.'
        : ''
    }`,
    okLabel: 'Cambiar estado',
    cancelLabel: 'Cancelar',
    color: 'primary',
    icon: 'swap_horiz',
  })
  if (!accepted) return

  changingStatus.value = true
  try {
    const response = await serviceOrdersApi.changeStatus(order.value._id, {
      status: nextStatus.value,
      ...(statusNote.value.trim() ? { note: statusNote.value.trim() } : {}),
    })
    order.value = response.data.order
    syncForm(order.value)
    notifySuccess(response.message || 'Estado actualizado')
  } catch (err) {
    notifyError(err, 'No se pudo cambiar el estado')
  } finally {
    changingStatus.value = false
  }
}

watch(() => route.params.id, load)

load()

useSeo(() =>
  order.value
    ? {
        title: `Orden ${order.value.code}`,
        description: 'Detalle y gestión de una orden de servicio técnico.',
      }
    : { title: 'Detalle de la orden' }
)
</script>

<template>
  <div class="panel-page">
    <div class="breadcrumb">
      <router-link to="/panel">Panel</router-link>
      <q-icon name="chevron_right" size="14px" />
      <router-link to="/panel/ordenes">Órdenes de servicio</router-link>
      <q-icon name="chevron_right" size="14px" />
      <span>{{ order?.code || 'Detalle' }}</span>
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton height="120px" style="border-radius: 14px" />
      <q-skeleton height="340px" style="border-radius: 14px" />
    </div>

    <EmptyState
      v-else-if="error || !order"
      icon="build_circle"
      title="Orden no disponible"
      :text="error || 'No encontramos esta orden.'"
    >
      <q-btn unelevated no-caps color="primary" label="Volver al listado" to="/panel/ordenes" />
    </EmptyState>

    <template v-else>
      <div class="panel-page-head">
        <div>
          <span class="eyebrow">Orden de servicio</span>
          <div class="row items-center q-gutter-sm">
            <h1 class="title-lg" style="letter-spacing: 0.04em">{{ order.code }}</h1>
            <StatusBadge :status="order.status" />
          </div>
          <p class="text-body2 text-grey-7 q-mb-none">
            {{ customerName }} · {{ equipmentLabel }}
            <template v-if="order.equipment?.brand || order.equipment?.model">
              {{ [order.equipment?.brand, order.equipment?.model].filter(Boolean).join(' ') }}
            </template>
          </p>
        </div>
        <div class="inline-actions">
          <q-btn
            outline
            no-caps
            color="primary"
            icon="refresh"
            label="Recargar"
            :loading="loading"
            @click="load"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="save"
            label="Guardar cambios"
            :loading="saving"
            @click="save"
          />
        </div>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-lg-8">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-start justify-between q-gutter-md">
                <div>
                  <div class="text-subtitle1 text-weight-bold">Cliente</div>
                  <div class="text-body2 q-mt-xs">{{ customerName }}</div>
                  <div class="text-caption text-grey-7">
                    {{ order.customerSnapshot?.email || 'Sin correo registrado' }}
                    <template v-if="order.customerSnapshot?.phone">
                      · {{ order.customerSnapshot.phone }}
                    </template>
                  </div>
                </div>
                <div class="text-right">
                  <q-badge
                    :color="order.source === 'local' ? 'primary' : 'secondary'"
                    :text-color="order.source === 'local' ? 'white' : 'primary'"
                  >
                    {{ order.source === 'local' ? 'Registrada en el local' : 'Solicitud web' }}
                  </q-badge>
                  <div v-if="order.customer" class="text-caption text-grey-7 q-mt-xs">
                    Cuenta vinculada
                  </div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div class="row q-col-gutter-md">
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-grey-7">Recibido</div>
                  <div class="text-weight-bold">{{ formatDate(order.receivedAt) }}</div>
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-grey-7">Entrega estimada</div>
                  <div class="text-weight-bold">{{ formatDate(order.promisedAt) }}</div>
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-grey-7">Entregado</div>
                  <div class="text-weight-bold">{{ formatDate(order.deliveredAt) }}</div>
                </div>
                <div class="col-6 col-sm-3">
                  <div class="text-caption text-grey-7">Última actualización</div>
                  <div class="text-weight-bold">{{ formatDateTime(order.updatedAt) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Equipo</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <q-select
                    :model-value="order.equipment?.type"
                    :options="EQUIPMENT_TYPE_OPTIONS"
                    outlined
                    emit-value
                    map-options
                    disable
                    label="Tipo de equipo"
                  />
                </div>
              </div>

              <div class="row q-col-gutter-md q-mt-xs">
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.equipment.brand" outlined label="Marca" maxlength="80" />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.equipment.model" outlined label="Modelo" maxlength="120" />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input
                    v-model="form.equipment.serial"
                    outlined
                    label="Número de serie"
                    maxlength="120"
                  />
                </div>
              </div>

              <div v-if="order.equipment?.accessories?.length" class="q-mt-md">
                <div class="text-caption text-grey-7">Accesorios entregados</div>
                <div class="inline-actions q-mt-xs">
                  <q-chip
                    v-for="item in order.equipment.accessories"
                    :key="item"
                    dense
                    outline
                    color="primary"
                    icon="check"
                  >
                    {{ item }}
                  </q-chip>
                </div>
              </div>

              <div class="q-mt-md">
                <div class="text-caption text-grey-7">Falla reportada</div>
                <p class="text-body2 q-mb-none" style="white-space: pre-line">
                  {{ order.reportedIssue }}
                </p>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Diagnóstico y notas</div>
              <q-input
                v-model="form.diagnosis"
                type="textarea"
                outlined
                autogrow
                maxlength="2000"
                counter
                label="Diagnóstico visible para el cliente"
                hint="El cliente verá este texto en el seguimiento y al aprobar la cotización."
                class="q-mb-md"
              />
              <q-input
                v-model="form.internalNotes"
                type="textarea"
                outlined
                autogrow
                maxlength="2000"
                counter
                label="Notas internas"
                hint="Solo visibles para el personal del negocio."
              />

              <q-separator class="q-my-lg" />

              <div class="text-subtitle1 text-weight-bold q-mb-md">Cotización</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <q-input
                    v-model.number="form.quoteAmount"
                    type="number"
                    min="0"
                    step="100"
                    outlined
                    label="Valor de la reparación"
                    prefix="$"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-select
                    v-model="form.quoteStatus"
                    :options="quoteOptions"
                    outlined
                    emit-value
                    map-options
                    label="Estado de la cotización"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input
                    v-model.number="form.finalCost"
                    type="number"
                    min="0"
                    step="100"
                    outlined
                    label="Costo final cobrado"
                    prefix="$"
                    hint="Se registra al entregar."
                  />
                </div>
              </div>
              <q-input
                v-model="form.quoteNotes"
                type="textarea"
                outlined
                autogrow
                maxlength="1000"
                counter
                label="Notas de la cotización"
                class="q-mt-md"
              />

              <q-separator class="q-my-lg" />

              <PartsEditor v-model="form.parts" />
              <div class="text-caption text-grey-7 q-mt-sm">
                Costo de repuestos: {{ formatCurrency(partsTotal) }}
              </div>

              <q-separator class="q-my-lg" />

              <div class="text-subtitle1 text-weight-bold q-mb-md">Entrega y garantía</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <q-input
                    v-model="form.promisedAt"
                    outlined
                    type="date"
                    label="Fecha prometida de entrega"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input
                    v-model.number="form.warrantyDays"
                    type="number"
                    min="0"
                    max="3650"
                    outlined
                    label="Días de garantía"
                    suffix="días"
                  />
                </div>
                <div class="col-12 col-sm-4">
                  <q-input
                    :model-value="warrantyExpiry || 'Se calcula al quedar listo'"
                    outlined
                    disable
                    label="Vence la garantía"
                  />
                </div>
              </div>

              <div class="row justify-end q-gutter-sm q-mt-lg">
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="save"
                  label="Guardar cambios"
                  :loading="saving"
                  @click="save"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-lg-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-sm">Cambiar estado</div>
              <template v-if="transitionOptions.length">
                <q-select
                  v-model="nextStatus"
                  :options="transitionOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Nuevo estado"
                  class="q-mb-sm"
                />
                <q-input
                  v-model="statusNote"
                  outlined
                  dense
                  maxlength="500"
                  label="Nota del cambio (opcional)"
                  class="q-mb-md"
                />
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="swap_horiz"
                  label="Aplicar cambio"
                  class="full-width"
                  :loading="changingStatus"
                  @click="changeStatus"
                />
              </template>
              <div v-else class="text-body2 text-grey-7">
                Esta orden ya está en su estado final. No hay transiciones disponibles.
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Resumen económico</div>
              <div class="meta-list">
                <div>
                  <span>Cotización</span>
                  <strong>{{ formatCurrency(order.quote?.amount) }}</strong>
                </div>
                <div>
                  <span>Estado cotización</span>
                  <strong>
                    <q-badge :color="QUOTE_STATUS[order.quote?.status]?.color || 'grey'">
                      {{ QUOTE_STATUS[order.quote?.status]?.label || order.quote?.status }}
                    </q-badge>
                  </strong>
                </div>
                <div>
                  <span>Repuestos</span>
                  <strong>{{ formatCurrency(partsTotal) }}</strong>
                </div>
                <div>
                  <span>Costo final</span>
                  <strong>{{ formatCurrency(order.finalCost) }}</strong>
                </div>
                <div>
                  <span>Garantía</span>
                  <strong>
                    {{ order.warranty?.days ? `${order.warranty.days} días` : 'Sin garantía' }}
                  </strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-md">Historial</div>
              <StatusTimeline
                v-if="history.length"
                :history="history"
                :current="order.status"
              />
              <div v-else class="text-body2 text-grey-7">Sin movimientos registrados.</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </div>
</template>
