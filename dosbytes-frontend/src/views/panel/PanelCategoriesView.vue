<script setup>
import { computed, onMounted, ref } from 'vue'
import { categoriesApi } from '../../api/client'
import { useSiteStore } from '../../stores/site'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import EmptyState from '../../components/common/EmptyState.vue'
import ImageUploader from '../../components/common/ImageUploader.vue'

const site = useSiteStore()
const confirm = useConfirm()

const categories = ref([])
const loading = ref(true)
const dialog = ref(false)
const formRef = ref(null)
const editing = ref(null)
const saving = ref(false)
const form = ref(emptyForm())

const columns = [
  { name: 'name', label: 'Categoría', field: 'name', align: 'left' },
  { name: 'products', label: 'Productos', field: 'productCount', align: 'left' },
  { name: 'parent', label: 'Categoría padre', field: 'parent', align: 'left' },
  { name: 'order', label: 'Orden', field: 'order', align: 'center' },
  { name: 'visibility', label: 'Estado', field: 'visible', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const parentOptions = computed(() => [
  { label: 'Sin categoría padre', value: null },
  ...categories.value
    .filter((category) => category._id !== editing.value?._id)
    .map((category) => ({ label: category.name, value: category._id })),
])

const parentName = computed(() => {
  const map = new Map(categories.value.map((category) => [category._id, category.name]))
  return (id) => (id ? map.get(id) || '—' : '—')
})

const rules = {
  name: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe el nombre de la categoría',
    (value) => String(value || '').trim().length <= 100 || 'Máximo 100 caracteres',
  ],
}

function emptyForm() {
  return {
    name: '',
    slug: '',
    description: '',
    icon: '',
    image: '',
    parent: null,
    order: 0,
    visible: true,
  }
}

async function load() {
  loading.value = true
  try {
    const response = await categoriesApi.list({ includeHidden: true })
    categories.value = response.data.categories || []
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las categorías')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  dialog.value = true
}

function openEdit(category) {
  editing.value = category
  form.value = {
    name: category.name || '',
    slug: category.slug || '',
    description: category.description || '',
    icon: category.icon || '',
    image: category.image || '',
    parent: category.parent || null,
    order: category.order || 0,
    visible: category.visible !== false,
  }
  dialog.value = true
}

async function save() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const payload = {
    name: form.value.name.trim(),
    ...(form.value.slug.trim() ? { slug: form.value.slug.trim() } : {}),
    description: form.value.description.trim(),
    icon: form.value.icon.trim(),
    image: form.value.image,
    parent: form.value.parent || null,
    order: Number(form.value.order) || 0,
    visible: Boolean(form.value.visible),
  }

  saving.value = true
  try {
    const isNew = !editing.value?._id
    if (isNew) await categoriesApi.create(payload)
    else await categoriesApi.update(editing.value._id, payload)
    dialog.value = false
    await load()
    site.refreshCategories().catch(() => {})
    notifySuccess(isNew ? 'Categoría creada' : 'Categoría actualizada')
  } catch (error) {
    notifyError(error, 'No se pudo guardar la categoría')
  } finally {
    saving.value = false
  }
}

async function remove(category) {
  const accepted = await confirm({
    title: 'Eliminar categoría',
    message:
      category.productCount > 0
        ? `"${category.name}" tiene ${category.productCount} productos. Debes moverlos a otra categoría antes de eliminarla.`
        : `"${category.name}" se eliminará de forma permanente.`,
    okLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    color: 'negative',
  })
  if (!accepted) return

  try {
    await categoriesApi.remove(category._id)
    await load()
    site.refreshCategories().catch(() => {})
    notifySuccess('Categoría eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la categoría')
  }
}

onMounted(load)

useSeo({ title: 'Categorías' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Categorías</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ categories.length }} categorías · organizan el catálogo y el menú.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
        <q-btn unelevated no-caps color="primary" icon="add" label="Nueva categoría" @click="openCreate" />
      </div>
    </div>

    <q-card flat bordered>
      <q-table
        :rows="categories"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        flat
        dense
        class="table-wrap"
        no-data-label="Todavía no hay categorías"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-sm">
              <q-avatar v-if="props.row.image" size="42px" square class="bg-grey-2">
                <img :src="mediaUrl(props.row.image)" :alt="props.row.name" />
              </q-avatar>
              <div v-else class="stat-icon" style="width: 42px; height: 42px">
                <q-icon :name="props.row.icon || 'category'" size="20px" />
              </div>
              <div>
                <div class="text-weight-bold">{{ props.row.name }}</div>
                <div class="text-caption text-grey-7">/{{ props.row.slug }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-products="props">
          <q-td :props="props">
            <q-badge :color="props.row.productCount ? 'primary' : 'grey-5'">
              {{ props.row.productCount || 0 }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-parent="props">
          <q-td :props="props">{{ parentName(props.row.parent) }}</q-td>
        </template>

        <template #body-cell-order="props">
          <q-td :props="props">{{ props.row.order }}</q-td>
        </template>

        <template #body-cell-visibility="props">
          <q-td :props="props">
            <q-badge :color="props.row.visible ? 'positive' : 'grey-6'">
              {{ props.row.visible ? 'Visible' : 'Oculta' }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="inline-actions" style="justify-content: flex-end">
              <q-btn flat dense round icon="edit" color="primary" aria-label="Editar" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete" color="negative" aria-label="Eliminar" @click="remove(props.row)">
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <EmptyState
      v-if="!loading && !categories.length"
      icon="category"
      title="Crea la primera categoría"
      text="Las categorías agrupan los productos y alimentan el menú del catálogo."
    >
      <q-btn unelevated no-caps color="primary" icon="add" label="Nueva categoría" @click="openCreate" />
    </EmptyState>

    <q-dialog v-model="dialog">
      <q-card style="width: min(620px, 94vw); max-height: 92vh">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div class="text-h6 text-weight-bold">
            {{ editing ? 'Editar categoría' : 'Nueva categoría' }}
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
                  label="Nombre *"
                  maxlength="100"
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
                <q-input
                  v-model="form.icon"
                  outlined
                  label="Icono (Material)"
                  maxlength="80"
                  hint="Ejemplo: sports_esports"
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
              <div class="col-12">
                <q-select
                  v-model="form.parent"
                  :options="parentOptions"
                  outlined
                  emit-value
                  map-options
                  label="Categoría padre"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.description"
                  type="textarea"
                  outlined
                  autogrow
                  maxlength="500"
                  counter
                  label="Descripción"
                />
              </div>
              <div class="col-12">
                <q-toggle v-model="form.visible" label="Visible en el catálogo" color="primary" />
              </div>
              <div class="col-12">
                <ImageUploader v-model="form.image" label="Imagen de la categoría" />
              </div>
            </div>

            <div class="row justify-end q-gutter-sm q-mt-lg">
              <q-btn flat no-caps label="Cancelar" v-close-popup />
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="save"
                label="Guardar categoría"
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
