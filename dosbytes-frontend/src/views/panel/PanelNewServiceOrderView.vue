<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { serviceOrdersApi } from '../../api/client'
import {
  ACCESSORY_SUGGESTIONS,
  EQUIPMENT_TYPE_OPTIONS,
} from '../../utils/constants'
import { notifyError } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const router = useRouter()

const formRef = ref(null)
const saving = ref(false)
const form = ref({
  name: '',
  email: '',
  phone: '',
  type: 'laptop',
  brand: '',
  model: '',
  serial: '',
  accessories: [],
  reportedIssue: '',
})

const rules = {
  name: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe el nombre del cliente',
    (value) => String(value || '').trim().length <= 120 || 'Máximo 120 caracteres',
  ],
  email: [
    (value) =>
      !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || 'Correo inválido',
  ],
  phone: [(value) => !value || String(value).length <= 30 || 'Teléfono inválido'],
  type: [(value) => Boolean(value) || 'Selecciona el tipo de equipo'],
  reportedIssue: [
    (value) => String(value || '').trim().length >= 5 || 'Describe la falla del equipo',
    (value) => String(value || '').trim().length <= 2000 || 'Máximo 2000 caracteres',
  ],
}

const equipmentLabel = computed(
  () =>
    EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === form.value.type)?.label ||
    'Equipo'
)

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const email = form.value.email.trim()
  saving.value = true
  try {
    const response = await serviceOrdersApi.createLocal({
      customerSnapshot: {
        name: form.value.name.trim(),
        phone: form.value.phone.trim(),
        ...(email ? { email } : {}),
      },
      equipment: {
        type: form.value.type,
        brand: form.value.brand.trim(),
        model: form.value.model.trim(),
        serial: form.value.serial.trim(),
        accessories: form.value.accessories,
      },
      reportedIssue: form.value.reportedIssue.trim(),
    })
    const order = response.data.order
    router.push({
      name: 'panel-service-order',
      params: { id: order._id },
      query: { creada: '1' },
    })
  } catch (error) {
    notifyError(error, 'No se pudo registrar la orden')
  } finally {
    saving.value = false
  }
}

useSeo({ title: 'Nueva orden de servicio' })
</script>

<template>
  <div class="panel-page">
    <div class="breadcrumb">
      <router-link to="/panel">Panel</router-link>
      <q-icon name="chevron_right" size="14px" />
      <router-link to="/panel/ordenes">Órdenes de servicio</router-link>
      <q-icon name="chevron_right" size="14px" />
      <span>Nueva orden</span>
    </div>

    <div class="panel-page-head">
      <div>
        <span class="eyebrow">Recepción en el local</span>
        <h1 class="title-lg">Registrar equipo</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          Guarda los datos del cliente y del equipo. El código de la orden se genera automáticamente.
        </p>
      </div>
      <q-btn outline no-caps color="primary" icon="arrow_back" label="Volver al listado" to="/panel/ordenes" />
    </div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <q-card flat bordered>
          <q-card-section>
            <q-form ref="formRef" @submit.prevent="submit">
              <div class="text-subtitle1 text-weight-bold q-mb-md">Datos del cliente</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.name"
                    outlined
                    label="Nombre completo *"
                    maxlength="120"
                    :rules="rules.name"
                    lazy-rules
                  >
                    <template #prepend><q-icon name="person" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.email"
                    outlined
                    type="email"
                    label="Correo electrónico"
                    hint="Opcional. Se usa para avisos de la orden."
                    :rules="rules.email"
                    lazy-rules
                  >
                    <template #prepend><q-icon name="mail" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.phone"
                    outlined
                    type="tel"
                    label="Teléfono"
                    maxlength="30"
                    :rules="rules.phone"
                    lazy-rules
                  >
                    <template #prepend><q-icon name="call" /></template>
                  </q-input>
                </div>
              </div>

              <q-separator class="q-my-lg" />

              <div class="text-subtitle1 text-weight-bold q-mb-md">Equipo recibido</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <q-select
                    v-model="form.type"
                    :options="EQUIPMENT_TYPE_OPTIONS"
                    outlined
                    emit-value
                    map-options
                    label="Tipo de equipo *"
                    :rules="rules.type"
                    lazy-rules
                  >
                    <template #prepend><q-icon name="devices" /></template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.brand" outlined label="Marca" maxlength="80">
                    <template #prepend><q-icon name="sell" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-4">
                  <q-input v-model="form.model" outlined label="Modelo" maxlength="120">
                    <template #prepend><q-icon name="memory" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="form.serial"
                    outlined
                    label="Número de serie"
                    maxlength="120"
                    hint="Ayuda a identificar el equipo."
                  >
                    <template #prepend><q-icon name="qr_code" /></template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="form.accessories"
                    :options="ACCESSORY_SUGGESTIONS"
                    outlined
                    multiple
                    use-chips
                    use-input
                    new-value-mode="add-unique"
                    label="Accesorios entregados"
                    hint="Escribe y presiona Enter para agregar otro."
                  >
                    <template #prepend><q-icon name="inventory_2" /></template>
                  </q-select>
                </div>
              </div>

              <q-separator class="q-my-lg" />

              <div class="text-subtitle1 text-weight-bold q-mb-md">Falla reportada</div>
              <q-input
                v-model="form.reportedIssue"
                type="textarea"
                outlined
                autogrow
                maxlength="2000"
                counter
                label="Describe el problema *"
                hint="Por ejemplo: no enciende, se apaga sola, pantalla rota, no carga."
                :rules="rules.reportedIssue"
                lazy-rules
              />

              <div class="row justify-end q-gutter-sm q-mt-lg">
                <q-btn flat no-caps label="Cancelar" to="/panel/ordenes" />
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="save"
                  label="Registrar orden"
                  type="submit"
                  :loading="saving"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-sm">Resumen</div>
            <div class="meta-list">
              <div>
                <span>Cliente</span>
                <strong>{{ form.name.trim() || 'Sin nombre' }}</strong>
              </div>
              <div>
                <span>Equipo</span>
                <strong>{{ equipmentLabel }}</strong>
              </div>
              <div v-if="form.brand || form.model">
                <span>Marca / modelo</span>
                <strong>{{ [form.brand, form.model].filter(Boolean).join(' ') }}</strong>
              </div>
              <div>
                <span>Accesorios</span>
                <strong>{{ form.accessories.length || 'Ninguno' }}</strong>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="soft-card">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-sm">Qué pasa después</div>
            <ol class="timeline" style="padding-left: 0">
              <li class="timeline-item current">
                <span class="timeline-dot"><q-icon name="inbox" size="13px" /></span>
                <div class="timeline-title">Equipo recibido</div>
                <div class="timeline-note">La orden queda en estado recibido.</div>
              </li>
              <li class="timeline-item">
                <span class="timeline-dot"><q-icon name="search" size="13px" /></span>
                <div class="timeline-title">Diagnóstico</div>
                <div class="timeline-note">Registra la falla y la cotización.</div>
              </li>
              <li class="timeline-item">
                <span class="timeline-dot"><q-icon name="pending_actions" size="13px" /></span>
                <div class="timeline-title">Aprobación del cliente</div>
                <div class="timeline-note">El cliente decide desde el seguimiento.</div>
              </li>
              <li class="timeline-item">
                <span class="timeline-dot"><q-icon name="verified_user" size="13px" /></span>
                <div class="timeline-title">Entrega con garantía</div>
                <div class="timeline-note">Al quedar listo se registra la garantía.</div>
              </li>
            </ol>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>
