<script setup>
import { computed, onMounted, ref } from 'vue'
import { servicesApi } from '../../api/client'
import {
  PRICE_UNIT_OPTIONS,
  PRICE_UNITS,
  SERVICE_LINES,
  SERVICE_LINE_OPTIONS,
} from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import EmptyState from '../../components/common/EmptyState.vue'

const confirm = useConfirm()

const services = ref([])
const loading = ref(true)
const filters = ref({ line: '', visible: '' })

const dialog = ref(false)
const formRef = ref(null)
const editing = ref(null)
const saving = ref(false)
const form = ref(emptyForm())

const columns = [
  { name: 'name', label: 'Servicio', field: 'name', align: 'left' },
  { name: 'line', label: 'Línea', field: 'line', align: 'left' },
  { name: 'price', label: 'Tarifa', field: 'price', align: 'right' },
  { name: 'warranty', label: 'Garantía', field: 'warrantyDays', align: 'left' },
  { name: 'order', label: 'Orden', field: 'order', align: 'center' },
  { name: 'visibility', label: 'Estado', field: 'visible', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const lineFilterOptions = computed(() => [
  { label: 'Todas las líneas', value: '' },
  ...SERVICE_LINE_OPTIONS,
])

const visibilityOptions = [
  { label: 'Todos', value: '' },
  { label: 'Visibles', value: 'true' },
  { label: 'Ocultos', value: 'false' },
]

const filtered = computed(() =>
  services.value.filter((service) => {
    if (filters.value.line && service.line !== filters.value.line) return false
    if (filters.value.visible === 'true' && !service.visible) return false
    if (filters.value.visible === 'false' && service.visible) return false
    return true
  })
)

const rules = {
  name: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe el nombre del servicio',
    (value) => String(value || '').trim().length <= 140 || 'Máximo 140 caracteres',
  ],
  price: [
    (value) =>
      (Number(value) >= 0 && Number.isFinite(Number(value))) || 'Tarifa inválida',
  ],
}

function emptyForm() {
  return {
    name: '',
    slug: '',
    line: 'tecnico',
    description: '',
    price: 0,
    priceUnit: 'servicio',
    icon: '',
    warrantyDays: 0,
    visible: true,
    order: 0,
  }
}

async function load() {
  loading.value = true
  try {
    const response = await servicesApi.list({ includeHidden: true })
    services.value = response.data.services || []
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las tarifas')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  dialog.value = true
}

function openEdit(service) {
  editing.value = service
  form.value = {
    name: service.name || '',
    slug: service.slug || '',
    line: service.line || 'tecnico',
    description: service.description || '',
    price: service.price || 0,
    priceUnit: service.priceUnit || 'servicio',
    icon: service.icon || '',
    warrantyDays: service.warrantyDays || 0,
    visible: service.visible !== false,
    order: service.order || 0,
  }
  dialog.value = true
}

async function save() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const payload = {
    name: form.value.name.trim(),
    ...(form.value.slug.trim() ? { slug: form.value.slug.trim() } : {}),
    line: form.value.line,
    description: form.value.description.trim(),
    price: Number(form.value.price) || 0,
    priceUnit: form.value.priceUnit,
    icon: form.value.icon.trim(),
    warrantyDays: Number(form.value.warrantyDays) || 0,
    visible: Boolean(form.value.visible),
    order: Number(form.value.order) || 0,
  }

  saving.value = true
  try {
    const isNew = !editing.value?._id
    if (isNew) await servicesApi.create(payload)
    else await servicesApi.update(editing.value._id, payload)
    dialog.value = false
    await load()
    notifySuccess(isNew ? 'Servicio creado' : 'Servicio actualizado')
  } catch (error) {
    notifyError(error, 'No se pudo guardar el servicio')
  } finally {
    saving.value = false
  }
}

async function hide(service) {
  const accepted = await confirm({
    title: 'Ocultar servicio',
    message: `"${service.name}" dejará de mostrarse en la página de servicios y tarifas. Puedes volver a mostrarlo editándolo.`,
    okLabel: 'Ocultar',
    cancelLabel: 'Cancelar',
  })
  if (!accepted) return

  try {
    await servicesApi.remove(service._id)
    await load()
    notifySuccess('Servicio oculto')
  } catch (error) {
    notifyError(error, 'No se pudo ocultar el servicio')
  }
}

function lineLabel(value) {
  return SERVICE_LINES[value]?.label || value
}

function unitLabel(value) {
  return PRICE_UNITS[value] || value
}

onMounted(load)

useSeo({ title: 'Tarifas de servicios' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Tarifas de servicios</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ services.length }} servicios · servicio técnico, impresión y demás líneas.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
        <q-btn unelevated no-caps color="primary" icon="add" label="Nuevo servicio" @click="openCreate" />
      </div>
    </div>

    <q-card flat bordered>
      <div class="panel-toolbar">
        <q-select
          v-model="filters.line"
          :options="lineFilterOptions"
          outlined
          dense
          emit-value
          map-options
          label="Línea de servicio"
          style="min-width: 210px"
        />
        <q-select
          v-model="filters.visible"
          :options="visibilityOptions"
          outlined
          dense
          emit-value
          map-options
          label="Visibilidad"
          style="min-width: 150px"
        />
        <q-space />
        <span class="text-caption text-grey-7">{{ filtered.length }} resultados</span>
      </div>

      <q-table
        :rows="filtered"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        flat
        dense
        class="table-wrap"
        no-data-label="No hay servicios con esos filtros"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-sm">
              <div class="stat-icon" style="width: 38px; height: 38px">
                <q-icon :name="props.row.icon || SERVICE_LINES[props.row.line]?.icon || 'sell'" size="18px" />
              </div>
              <div>
                <div class="text-weight-bold">{{ props.row.name }}</div>
                <div class="text-caption text-grey-7">/{{ props.row.slug }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-line="props">
          <q-td :props="props">{{ lineLabel(props.row.line) }}</q-td>
        </template>

        <template #body-cell-price="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ formatCurrency(props.row.price) }}</div>
            <div class="text-caption text-grey-7">{{ unitLabel(props.row.priceUnit) }}</div>
          </q-td>
        </template>

        <template #body-cell-warranty="props">
          <q-td :props="props">
            {{ props.row.warrantyDays ? `${props.row.warrantyDays} días` : '—' }}
          </q-td>
        </template>

        <template #body-cell-order="props">
          <q-td :props="props">{{ props.row.order }}</q-td>
        </template>

        <template #body-cell-visibility="props">
          <q-td :props="props">
            <q-badge :color="props.row.visible ? 'positive' : 'grey-6'">
              {{ props.row.visible ? 'Visible' : 'Oculto' }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="inline-actions" style="justify-content: flex-end">
              <q-btn flat dense round icon="edit" color="primary" aria-label="Editar" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.visible"
                flat
                dense
                round
                icon="visibility_off"
                color="negative"
                aria-label="Ocultar"
                @click="hide(props.row)"
              >
                <q-tooltip>Ocultar tarifa</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <EmptyState
      v-if="!loading && !services.length"
      icon="sell"
      title="Todavía no hay tarifas"
      text="Registra los precios del servicio técnico, impresión, cibercafé y demás líneas."
    >
      <q-btn unelevated no-caps color="primary" icon="add" label="Nuevo servicio" @click="openCreate" />
    </EmptyState>

    <q-dialog v-model="dialog">
      <q-card style="width: min(660px, 94vw); max-height: 92vh">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="text-h6 text-weight-bold">
            {{ editing ? 'Editar servicio' : 'Nuevo servicio' }}
          </div>
          <q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: calc(92vh - 130px); overflow-y: auto">
          <q-form ref="formRef" @submit.prevent="save">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-8">
                <q-input
                  v-model="form.name"
                  outlined
                  label="Nombre del servicio *"
                  maxlength="140"
                  :rules="rules.name"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model="form.slug"
                  outlined
                  label="Slug"
                  maxlength="90"
                  hint="Vacío: se genera del nombre."
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="form.line"
                  :options="SERVICE_LINE_OPTIONS"
                  outlined
                  emit-value
                  map-options
                  label="Línea de servicio"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="form.icon"
                  outlined
                  label="Icono (Material)"
                  maxlength="80"
                  hint="Ejemplo: print"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  step="100"
                  outlined
                  label="Tarifa *"
                  prefix="$"
                  :rules="rules.price"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-select
                  v-model="form.priceUnit"
                  :options="PRICE_UNIT_OPTIONS"
                  outlined
                  emit-value
                  map-options
                  label="Unidad de cobro"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.warrantyDays"
                  type="number"
                  min="0"
                  outlined
                  label="Garantía"
                  suffix="días"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="form.order"
                  type="number"
                  outlined
                  label="Orden"
                  hint="Menor número aparece primero."
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-toggle v-model="form.visible" label="Visible en la web" color="primary" />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.description"
                  type="textarea"
                  outlined
                  autogrow
                  maxlength="1000"
                  counter
                  label="Descripción"
                />
              </div>
            </div>

            <div class="row justify-end q-gutter-sm q-mt-lg">
              <q-btn flat no-caps label="Cancelar" v-close-popup />
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="save"
                label="Guardar servicio"
                type="submit"
                :loading="saving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
