<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { serviceOrdersApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { ACCESSORY_SUGGESTIONS, EQUIPMENT_TYPE_OPTIONS } from '../../utils/constants'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'

const auth = useAuthStore()
const formRef = ref(null)
const loading = ref(false)
const createdCode = ref('')

const form = reactive({
  customerSnapshot: {
    name: auth.user?.name || '',
    email: auth.user?.email || '',
    phone: auth.user?.phone || '',
  },
  equipment: {
    type: 'laptop',
    brand: '',
    model: '',
    serial: '',
    accessories: [],
  },
  reportedIssue: '',
})

const accessoryOptions = ref([...ACCESSORY_SUGGESTIONS])

const accessOptions = computed(() => obtain())

function obtain() {
  return accessoryOptions.value
}

function filterAccessories(value, update) {
  update(() => {
    const needle = String(value || '').toLowerCase()
    accessoryOptions.value = ACCESSORY_SUGGESTIONS.filter((item) =>
      item.toLowerCase().includes(needle)
    )
  })
}

const rules = {
  name: [(value) => Boolean(String(value || '').trim()) || 'Escribe tu nombre'],
  email: [
    (value) => Boolean(String(value || '').trim()) || 'Escribe tu correo',
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) || 'Correo inválido',
  ],
  phone: [
    (value) => Boolean(String(value || '').trim()) || 'Escribe tu teléfono',
    (value) => String(value || '').trim().length >= 7 || 'Teléfono inválido',
  ],
  issue: [
    (value) => String(value || '').trim().length >= 10 || 'Describe la falla con al menos 10 caracteres',
  ],
  type: [(value) => Boolean(value) || 'Selecciona el tipo de equipo'],
}

async function submit() {
  const valid = await formRef.value?.validate()
  if (!valid) return
  loading.value = true
  try {
    const response = await serviceOrdersApi.create({
      customerSnapshot: {
        name: form.customerSnapshot.name.trim(),
        email: form.customerSnapshot.email.trim(),
        phone: form.customerSnapshot.phone.trim(),
      },
      equipment: {
        type: form.equipment.type,
        brand: form.equipment.brand.trim(),
        model: form.equipment.model.trim(),
        serial: form.equipment.serial.trim(),
        accessories: form.equipment.accessories,
      },
      reportedIssue: form.reportedIssue.trim(),
    })
    createdCode.value = response.data.code
    notifySuccess('Solicitud registrada')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    notifyError(error, 'No se pudo registrar la solicitud')
  } finally {
    loading.value = false
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(createdCode.value)
    notifySuccess('Código copiado')
  } catch {
    notifyError(null, 'No se pudo copiar el código')
  }
}

function reset() {
  createdCode.value = ''
  form.customerSnapshot.name = auth.user?.name || ''
  form.customerSnapshot.email = auth.user?.email || ''
  form.customerSnapshot.phone = auth.user?.phone || ''
  form.equipment = { type: 'laptop', brand: '', model: '', serial: '', accessories: [] }
  form.reportedIssue = ''
}

watch(
  () => auth.user,
  (user) => {
    if (!user) return
    form.customerSnapshot.name = form.customerSnapshot.name || user.name || ''
    form.customerSnapshot.email = form.customerSnapshot.email || user.email || ''
    form.customerSnapshot.phone = form.customerSnapshot.phone || user.phone || ''
  },
  { immediate: true }
)

useSeo({
  title: 'Solicitar servicio técnico',
  description:
    'Registra tu consola, laptop o PC para diagnóstico y reparación en DOS BYTES. Recibe un código para consultar el estado en línea.',
  canonical: '/servicio-tecnico',
})
</script>

<template>
  <div class="page-shell">
    <div class="container">
      <div class="breadcrumb">
        <router-link to="/">Inicio</router-link>
        <q-icon name="chevron_right" size="14px" />
        <router-link to="/servicios">Servicios</router-link>
        <q-icon name="chevron_right" size="14px" />
        <span>Solicitud de servicio técnico</span>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-7">
          <q-card v-if="createdCode" flat bordered class="q-pa-lg text-center">
            <q-icon name="check_circle" color="positive" size="56px" />
            <h1 class="title-lg q-mt-md">Solicitud registrada</h1>
            <p class="text-body2 text-grey-7">
              Guarda este código. Lo enviamos también al correo registrado y lo necesitas
              para consultar el estado de tu equipo.
            </p>
            <div class="soft-card q-pa-lg q-my-lg">
              <div class="text-caption text-grey-7">Código de la orden</div>
              <div class="text-h4 text-weight-bold" style="letter-spacing: 0.08em">
                {{ createdCode }}
              </div>
            </div>
            <div class="inline-actions justify-center">
              <q-btn outline no-caps color="primary" icon="content_copy" label="Copiar código" @click="copyCode" />
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="track_changes"
                label="Consultar estado"
                :to="{ name: 'track', query: { codigo: createdCode } }"
              />
              <q-btn flat no-caps label="Nueva solicitud" @click="reset" />
            </div>
          </q-card>

          <template v-else>
            <span class="eyebrow">Servicio técnico</span>
            <h1 class="title-xl q-mb-sm">Solicita la revisión de tu equipo</h1>
            <p class="text-body2 text-grey-7">
              Completa los datos y describe la falla. Te contactaremos con el diagnóstico y
              la cotización antes de reparar. No necesitas iniciar sesión.
            </p>

            <q-form ref="formRef" class="q-mt-lg" @submit.prevent="submit">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle1 text-weight-bold q-mb-md">Tus datos</div>
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model="form.customerSnapshot.name"
                        outlined
                        label="Nombre completo"
                        :rules="rules.name"
                        lazy-rules
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model="form.customerSnapshot.email"
                        outlined
                        type="email"
                        label="Correo electrónico"
                        :rules="rules.email"
                        lazy-rules
                        hint="Aquí recibirás el código y las notificaciones."
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model="form.customerSnapshot.phone"
                        outlined
                        label="Teléfono"
                        :rules="rules.phone"
                        lazy-rules
                      />
                    </div>
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section>
                  <div class="text-subtitle1 text-weight-bold q-mb-md">Tu equipo</div>
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="form.equipment.type"
                        :options="EQUIPMENT_TYPE_OPTIONS"
                        outlined
                        emit-value
                        map-options
                        label="Tipo de equipo"
                        :rules="rules.type"
                        lazy-rules
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input v-model="form.equipment.brand" outlined label="Marca" maxlength="80" />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input v-model="form.equipment.model" outlined label="Modelo" maxlength="120" />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-input
                        v-model="form.equipment.serial"
                        outlined
                        label="Número de serie (opcional)"
                        maxlength="120"
                      />
                    </div>
                    <div class="col-12">
                      <q-select
                        v-model="form.equipment.accessories"
                        :options="accessOptions"
                        outlined
                        multiple
                        use-chips
                        use-input
                        new-value-mode="add-unique"
                        label="Accesorios entregados"
                        hint="Cargador, controles, cables u otros. Puedes escribir uno nuevo."
                        @filter="filterAccessories"
                      />
                    </div>
                    <div class="col-12">
                      <q-input
                        v-model="form.reportedIssue"
                        outlined
                        type="textarea"
                        autogrow
                        maxlength="2000"
                        counter
                        label="Describe la falla"
                        :rules="rules.issue"
                        lazy-rules
                        hint="Cuéntanos qué pasa, cuándo empezó y si el equipo presenta algún daño visible."
                      />
                    </div>
                  </div>
                </q-card-section>

                <q-card-actions align="right" class="q-pa-md">
                  <q-btn
                    unelevated
                    no-caps
                    color="primary"
                    icon="send"
                    label="Registrar solicitud"
                    type="submit"
                    :loading="loading"
                  />
                </q-card-actions>
              </q-card>
            </q-form>
          </template>
        </div>

        <div class="col-12 col-md-5">
          <q-card flat bordered class="q-pa-lg">
            <div class="text-subtitle1 text-weight-bold q-mb-md">Cómo funciona</div>
            <div class="stack">
              <div class="row items-start q-gutter-sm">
                <q-avatar size="28px" color="primary" text-color="white">1</q-avatar>
                <div>
                  <div class="text-weight-bold text-body2">Registra la solicitud</div>
                  <div class="text-caption text-grey-7">Recibes un código único por correo.</div>
                </div>
              </div>
              <div class="row items-start q-gutter-sm">
                <q-avatar size="28px" color="primary" text-color="white">2</q-avatar>
                <div>
                  <div class="text-weight-bold text-body2">Diagnóstico y cotización</div>
                  <div class="text-caption text-grey-7">Revisamos el equipo y te informamos el costo.</div>
                </div>
              </div>
              <div class="row items-start q-gutter-sm">
                <q-avatar size="28px" color="primary" text-color="white">3</q-avatar>
                <div>
                  <div class="text-weight-bold text-body2">Aprueba la reparación</div>
                  <div class="text-caption text-grey-7">Desde la consulta de estado, sin llamadas.</div>
                </div>
              </div>
              <div class="row items-start q-gutter-sm">
                <q-avatar size="28px" color="primary" text-color="white">4</q-avatar>
                <div>
                  <div class="text-weight-bold text-body2">Recoge tu equipo</div>
                  <div class="text-caption text-grey-7">Te avisamos por correo cuando esté listo.</div>
                </div>
              </div>
            </div>
            <q-separator class="q-my-md" />
            <div class="text-caption text-grey-7">
              <q-icon name="info" size="15px" class="q-mr-xs" />
              No recibimos equipos sin solicitud previa. La garantía depende del servicio
              realizado y se informa en la orden.
            </div>
            <q-btn
              flat
              no-caps
              color="primary"
              icon="track_changes"
              label="Ya tengo un código"
              to="/seguimiento"
              class="full-width q-mt-md"
            />
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>
