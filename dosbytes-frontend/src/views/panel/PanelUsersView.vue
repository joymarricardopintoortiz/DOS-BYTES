<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { copyToClipboard } from 'quasar'
import { usersApi } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { DELETION_REASONS, ROLES } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatCard from '../../components/common/StatCard.vue'
import PaginationBar from '../../components/common/PaginationBar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const users = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)
const filters = ref({ q: '', role: '', active: '' })

const stats = ref({ total: 0, reasons: [] })
const statsLoading = ref(true)

const dialog = ref(false)
const formRef = ref(null)
const editing = ref(null)
const form = ref(emptyForm())
const saving = ref(false)

const createDialog = ref(false)
const createRef = ref(null)
const createForm = ref(emptyCreateForm())
const creating = ref(false)
const createdEmployee = ref(null)

const roleFilterOptions = [
  { label: 'Todos los roles', value: '' },
  ...Object.entries(ROLES).map(([value, label]) => ({ label, value })),
]

const activeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Activos', value: 'true' },
  { label: 'Inactivos', value: 'false' },
]

const editableRoleOptions = [
  { label: ROLES.customer, value: 'customer' },
  { label: ROLES.employee, value: 'employee' },
]

const columns = [
  { name: 'user', label: 'Usuario', field: 'name', align: 'left' },
  { name: 'role', label: 'Rol', field: 'role', align: 'left' },
  { name: 'status', label: 'Estado', field: 'active', align: 'left' },
  { name: 'createdAt', label: 'Registro', field: 'createdAt', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const formTitle = computed(() => (editing.value ? 'Editar usuario' : 'Usuario'))

const reasonTotal = computed(() =>
  stats.value.reasons.reduce((sum, item) => sum + Number(item.count || 0), 0)
)

const rules = {
  name: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe el nombre completo',
    (value) => String(value || '').trim().length <= 120 || 'Máximo 120 caracteres',
  ],
  phone: [(value) => String(value || '').length <= 30 || 'Máximo 30 caracteres'],
  role: [(value) => Boolean(value) || 'Selecciona un rol'],
}

const createRules = {
  name: rules.name,
  email: [
    (value) => Boolean(String(value || '').trim()) || 'Escribe el correo',
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) || 'Correo inválido',
  ],
  phone: rules.phone,
  tempPassword: [
    (value) => !value || String(value).length >= 8 || 'Mínimo 8 caracteres',
    (value) => !value || String(value).length <= 72 || 'Máximo 72 caracteres',
  ],
}

function emptyForm() {
  return { name: '', phone: '', role: 'customer', active: true }
}

function emptyCreateForm() {
  return { name: '', email: '', phone: '', tempPassword: '' }
}

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

function filtersFromRoute() {
  filters.value = {
    q: String(route.query.q || ''),
    role: String(route.query.role || ''),
    active: String(route.query.active || ''),
  }
}

function applyFilters() {
  const query = {}
  if (filters.value.q.trim()) query.q = filters.value.q.trim()
  if (filters.value.role) query.role = filters.value.role
  if (filters.value.active) query.active = filters.value.active
  router.push({ name: 'panel-users', query })
}

function clearFilters() {
  filters.value = { q: '', role: '', active: '' }
  router.push({ name: 'panel-users', query: {} })
}

function changePage(page) {
  const query = { ...route.query }
  if (page > 1) query.page = String(page)
  else delete query.page
  router.push({ name: 'panel-users', query })
}

function roleLabel(role) {
  return ROLES[role] || role
}

function reasonLabel(reason) {
  return DELETION_REASONS[reason] || reason
}

function reasonPercent(count) {
  if (!reasonTotal.value) return 0
  return Math.round((Number(count || 0) / reasonTotal.value) * 100)
}

function isSelf(user) {
  return user?._id && auth.user?._id === user._id
}

function canEdit(user) {
  return user && user.role !== 'admin'
}

async function load() {
  loading.value = true
  try {
    const response = await usersApi.list({
      page: currentPage(),
      limit: 20,
      q: route.query.q || undefined,
      role: route.query.role || undefined,
      active: route.query.active || undefined,
    })
    users.value = response.data.users || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar los usuarios')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    const response = await usersApi.deletionStats()
    stats.value = response.data || { total: 0, reasons: [] }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las estadísticas de eliminación')
  } finally {
    statsLoading.value = false
  }
}

function openEdit(user) {
  if (!canEdit(user)) return
  editing.value = user
  form.value = {
    name: user.name || '',
    phone: user.phone || '',
    role: user.role === 'admin' ? 'customer' : user.role || 'customer',
    active: user.active !== false,
  }
  dialog.value = true
}

function openCreate() {
  createdEmployee.value = null
  createForm.value = emptyCreateForm()
  createDialog.value = true
}

async function saveUser() {
  const valid = await formRef.value?.validate()
  if (!valid || !editing.value) return

  saving.value = true
  try {
    const response = await usersApi.update(editing.value._id, {
      name: form.value.name.trim(),
      phone: form.value.phone.trim(),
      role: form.value.role,
      active: Boolean(form.value.active),
    })
    const updated = response.data.user
    users.value = users.value.map((user) =>
      user._id === updated._id ? { ...user, ...updated } : user
    )
    dialog.value = false
    notifySuccess('Usuario actualizado')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar el usuario')
  } finally {
    saving.value = false
  }
}

async function toggleActive(user) {
  if (!canEdit(user)) return
  try {
    const response = await usersApi.update(user._id, { active: user.active === false })
    const updated = response.data.user
    users.value = users.value.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    )
    notifySuccess(updated.active ? 'Cuenta activada' : 'Cuenta desactivada')
  } catch (error) {
    notifyError(error, 'No se pudo cambiar el estado de la cuenta')
  }
}

async function createEmployee() {
  const valid = await createRef.value?.validate()
  if (!valid) return

  creating.value = true
  try {
    const payload = {
      name: createForm.value.name.trim(),
      email: createForm.value.email.trim(),
      phone: createForm.value.phone.trim(),
    }
    if (createForm.value.tempPassword.trim()) {
      payload.tempPassword = createForm.value.tempPassword.trim()
    }
    const response = await usersApi.createEmployee(payload)
    createdEmployee.value = {
      user: response.data.user,
      tempPassword: response.data.tempPassword,
    }
    createForm.value = emptyCreateForm()
    await load()
    notifySuccess(response.message || 'Empleado creado')
  } catch (error) {
    notifyError(error, 'No se pudo crear el empleado')
  } finally {
    creating.value = false
  }
}

async function copyPassword() {
  if (!createdEmployee.value?.tempPassword) return
  try {
    await copyToClipboard(createdEmployee.value.tempPassword)
    notifySuccess('Contraseña copiada')
  } catch {
    notifyError(null, 'No se pudo copiar la contraseña')
  }
}

onMounted(() => {
  load()
  loadStats()
})

useSeo({ title: 'Usuarios' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Usuarios</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} cuentas activas e inactivas · clientes y empleados.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
        <q-btn unelevated no-caps color="primary" icon="person_add" label="Nuevo empleado" @click="openCreate" />
      </div>
    </div>

    <div class="stat-grid q-mb-lg">
      <StatCard
        label="Cuentas encontradas"
        :value="meta.total || 0"
        icon="group"
        color="primary"
        hint="Según los filtros aplicados"
      />
      <StatCard
        label="Empleados en esta página"
        :value="users.filter((user) => user.role === 'employee').length"
        icon="badge"
        color="secondary"
        hint="Pueden gestionar la operación"
      />
      <StatCard
        label="Cuentas eliminadas"
        :value="stats.total || 0"
        icon="person_remove"
        color="warning"
        hint="Datos anonimizados"
      />
    </div>

    <q-card flat bordered class="q-mb-lg">
      <div class="panel-toolbar">
        <q-input
          v-model="filters.q"
          outlined
          dense
          clearable
          label="Buscar"
          placeholder="Nombre o correo"
          style="min-width: 240px; flex: 1"
          @keyup.enter="applyFilters"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select
          v-model="filters.role"
          :options="roleFilterOptions"
          outlined
          dense
          emit-value
          map-options
          label="Rol"
          style="min-width: 180px"
        />
        <q-select
          v-model="filters.active"
          :options="activeOptions"
          outlined
          dense
          emit-value
          map-options
          label="Estado"
          style="min-width: 150px"
        />
        <q-btn unelevated no-caps color="primary" icon="filter_alt" label="Aplicar" @click="applyFilters" />
        <q-btn flat no-caps color="primary" label="Limpiar" @click="clearFilters" />
      </div>

      <q-table
        :rows="users"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        flat
        dense
        class="table-wrap"
        no-data-label="No hay usuarios con esos filtros"
      >
        <template #body-cell-user="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-sm">
              <q-avatar size="38px" color="primary" text-color="white">
                {{ (props.row.name || '?').slice(0, 2).toUpperCase() }}
              </q-avatar>
              <div style="min-width: 0">
                <div class="text-weight-bold">
                  {{ props.row.name }}
                  <q-badge v-if="isSelf(props.row)" color="secondary" text-color="primary" class="q-ml-xs">
                    Tú
                  </q-badge>
                </div>
                <div class="text-caption text-grey-7">{{ props.row.email }}</div>
                <div v-if="props.row.phone" class="text-caption text-grey-7">
                  {{ props.row.phone }}
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-role="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.role === 'admin' ? 'primary' : props.row.role === 'employee' ? 'secondary' : 'grey-6'"
              :text-color="props.row.role === 'employee' ? 'primary' : 'white'"
            >
              {{ roleLabel(props.row.role) }}
            </q-badge>
            <div v-if="props.row.role === 'admin'" class="text-caption text-grey-7">
              No editable desde el panel
            </div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.row.active ? 'positive' : 'grey-6'">
              {{ props.row.active ? 'Activa' : 'Inactiva' }}
            </q-badge>
            <div v-if="props.row.mustChangePassword" class="text-caption text-warning text-weight-bold">
              Debe cambiar contraseña
            </div>
            <div v-else-if="!props.row.emailVerified" class="text-caption text-grey-7">
              Correo sin verificar
            </div>
          </q-td>
        </template>

        <template #body-cell-createdAt="props">
          <q-td :props="props">{{ formatDateTime(props.row.createdAt) }}</q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="inline-actions" style="justify-content: flex-end">
              <q-btn
                flat
                dense
                round
                icon="edit"
                color="primary"
                aria-label="Editar usuario"
                :disable="!canEdit(props.row)"
                @click="openEdit(props.row)"
              >
                <q-tooltip>
                  {{ canEdit(props.row) ? 'Editar usuario' : 'Las cuentas de administrador no se editan aquí' }}
                </q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                :icon="props.row.active ? 'block' : 'check_circle'"
                :color="props.row.active ? 'negative' : 'positive'"
                :aria-label="props.row.active ? 'Desactivar cuenta' : 'Activar cuenta'"
                :disable="!canEdit(props.row) || isSelf(props.row)"
                @click="toggleActive(props.row)"
              >
                <q-tooltip>
                  {{ props.row.active ? 'Desactivar cuenta' : 'Activar cuenta' }}
                </q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>

      <div class="q-pa-md">
        <PaginationBar
          :page="meta.page || currentPage()"
          :pages="meta.pages || 1"
          :total="meta.total"
          @update:page="changePage"
        />
      </div>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center justify-between q-mb-sm">
          <div>
            <div class="text-subtitle1 text-weight-bold">Motivos de eliminación de cuenta</div>
            <div class="text-caption text-grey-7">
              Estadísticas anónimas para mejorar el servicio (RF-26).
            </div>
          </div>
          <q-btn
            flat
            round
            dense
            icon="refresh"
            color="primary"
            aria-label="Actualizar estadísticas"
            :loading="statsLoading"
            @click="loadStats"
          />
        </div>

        <div v-if="statsLoading">
          <q-skeleton height="80px" style="border-radius: 12px" />
        </div>

        <div v-else-if="!stats.reasons.length" class="text-body2 text-grey-7">
          Todavía no hay cuentas eliminadas registradas.
        </div>

        <div v-else class="stack">
          <div v-for="item in stats.reasons" :key="item.reason">
            <div class="row items-center justify-between text-body2 q-mb-xs">
              <span class="text-weight-bold">{{ reasonLabel(item.reason) }}</span>
              <span class="text-grey-7">{{ item.count }} · {{ reasonPercent(item.count) }}%</span>
            </div>
            <q-linear-progress
              :value="reasonPercent(item.count) / 100"
              color="primary"
              track-color="grey-3"
              rounded
              size="8px"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialog">
      <q-card style="width: min(520px, 94vw)">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="text-h6 text-weight-bold">{{ formTitle }}</div>
          <q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="soft-card q-pa-md q-mb-md">
            <div class="text-weight-bold">{{ editing?.email }}</div>
            <div class="text-caption text-grey-7">
              Registrado el {{ formatDateTime(editing?.createdAt) }}
            </div>
          </div>

          <q-form ref="formRef" @submit.prevent="saveUser">
            <q-input
              v-model="form.name"
              outlined
              label="Nombre completo *"
              maxlength="120"
              :rules="rules.name"
              lazy-rules
              class="q-mb-md"
            />
            <q-input
              v-model="form.phone"
              outlined
              type="tel"
              label="Teléfono"
              maxlength="30"
              :rules="rules.phone"
              lazy-rules
              class="q-mb-md"
            />
            <q-select
              v-model="form.role"
              :options="editableRoleOptions"
              outlined
              emit-value
              map-options
              label="Rol *"
              :rules="rules.role"
              lazy-rules
              class="q-mb-md"
              hint="Solo se puede asignar cliente o empleado."
            />
            <q-toggle
              v-model="form.active"
              label="Cuenta activa"
              color="primary"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7">
              Al desactivar una cuenta se cierran sus sesiones abiertas.
            </div>

            <div class="row justify-end q-gutter-sm q-mt-lg">
              <q-btn flat no-caps label="Cancelar" v-close-popup />
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="save"
                label="Guardar cambios"
                type="submit"
                :loading="saving"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="createDialog" @hide="createdEmployee = null">
      <q-card style="width: min(560px, 94vw); max-height: 92vh">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div>
            <div class="text-h6 text-weight-bold">Nuevo empleado</div>
            <div class="text-caption text-grey-7">
              Recibirá un correo con su contraseña temporal.
            </div>
          </div>
          <q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: calc(92vh - 140px); overflow-y: auto">
          <div v-if="createdEmployee" class="stack">
            <q-banner class="bg-green-1 text-green-9" rounded>
              <template #avatar><q-icon name="check_circle" /></template>
              Empleado creado correctamente. Comparte la contraseña temporal por un canal seguro.
            </q-banner>

            <div class="soft-card q-pa-md">
              <div class="text-weight-bold">{{ createdEmployee.user.name }}</div>
              <div class="text-caption text-grey-7">{{ createdEmployee.user.email }}</div>
              <div class="text-caption text-grey-7 q-mt-xs">Contraseña temporal</div>
              <div class="row items-center q-gutter-sm q-mt-xs">
                <q-chip dense outline color="primary" icon="key" class="text-weight-bold">
                  {{ createdEmployee.tempPassword }}
                </q-chip>
                <q-btn flat dense no-caps color="primary" icon="content_copy" label="Copiar" @click="copyPassword" />
              </div>
              <div class="text-caption text-grey-7 q-mt-sm">
                Deberá cambiarla en su primer ingreso.
              </div>
            </div>

            <div class="row justify-end q-gutter-sm">
              <q-btn flat no-caps label="Cerrar" v-close-popup />
              <q-btn unelevated no-caps color="primary" icon="person_add" label="Crear otro" @click="openCreate" />
            </div>
          </div>

          <q-form v-else ref="createRef" @submit.prevent="createEmployee">
            <q-input
              v-model="createForm.name"
              outlined
              label="Nombre completo *"
              maxlength="120"
              :rules="createRules.name"
              lazy-rules
              class="q-mb-md"
            >
              <template #prepend><q-icon name="person" /></template>
            </q-input>
            <q-input
              v-model="createForm.email"
              outlined
              type="email"
              label="Correo electrónico *"
              :rules="createRules.email"
              lazy-rules
              class="q-mb-md"
            >
              <template #prepend><q-icon name="mail" /></template>
            </q-input>
            <q-input
              v-model="createForm.phone"
              outlined
              type="tel"
              label="Teléfono"
              maxlength="30"
              :rules="createRules.phone"
              lazy-rules
              class="q-mb-md"
            >
              <template #prepend><q-icon name="call" /></template>
            </q-input>
            <q-input
              v-model="createForm.tempPassword"
              outlined
              label="Contraseña temporal"
              hint="Opcional. Si la dejas vacía se genera automáticamente (mínimo 8 caracteres)."
              :rules="createRules.tempPassword"
              lazy-rules
            >
              <template #prepend><q-icon name="key" /></template>
            </q-input>

            <div class="row justify-end q-gutter-sm q-mt-lg">
              <q-btn flat no-caps label="Cancelar" v-close-popup />
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="person_add"
                label="Crear empleado"
                type="submit"
                :loading="creating"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
