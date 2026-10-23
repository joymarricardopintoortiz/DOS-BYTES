<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoriesApi, productsApi } from '../../api/client'
import { formatCurrency, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'
import { useSeo } from '../../composables/useSeo'
import PaginationBar from '../../components/common/PaginationBar.vue'
import ImageManager from '../../components/panel/ImageManager.vue'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()

const products = ref([])
const categories = ref([])
const meta = ref({ total: 0, page: 1, pages: 1 })
const loading = ref(true)
const filters = ref({ q: '', category: '', visible: '' })

const dialog = ref(false)
const formRef = ref(null)
const editing = ref(null)
const form = ref(emptyForm())
const saving = ref(false)

const stockDialog = ref(false)
const stockTarget = ref(null)
const stockForm = ref({ stock: 0, lowStockThreshold: 3 })
const savingStock = ref(false)

const visibilityOptions = [
  { label: 'Todos', value: '' },
  { label: 'Visibles', value: 'true' },
  { label: 'Ocultos', value: 'false' },
]

const categoryOptions = computed(() => [
  { label: 'Todas las categorías', value: '' },
  ...categories.value.map((category) => ({
    label: category.name,
    value: category.slug,
  })),
])

const formCategoryOptions = computed(() =>
  categories.value.map((category) => ({
    label: category.name,
    value: category._id,
  }))
)

const dialogTitle = computed(() =>
  editing.value?._id ? 'Editar producto' : 'Nuevo producto'
)

const columns = [
  { name: 'product', label: 'Producto', field: 'name', align: 'left' },
  { name: 'category', label: 'Categoría', field: 'category.name', align: 'left' },
  { name: 'price', label: 'Precio', field: 'price', align: 'right' },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'left' },
  { name: 'visibility', label: 'Estado', field: 'visible', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const rules = {
  name: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe el nombre del producto',
    (value) => String(value || '').trim().length <= 160 || 'Máximo 160 caracteres',
  ],
  category: [(value) => Boolean(value) || 'Selecciona una categoría'],
  price: [
    (value) =>
      (Number(value) >= 0 && Number.isFinite(Number(value))) || 'Precio inválido',
  ],
}

function emptyForm() {
  return {
    name: '',
    code: '',
    sku: '',
    category: null,
    description: '',
    price: 0,
    compareAtPrice: 0,
    stock: 0,
    lowStockThreshold: 3,
    isOffer: false,
    featured: false,
    visible: true,
  }
}

function currentPage() {
  return Math.max(1, Number(route.query.page) || 1)
}

function filtersFromRoute() {
  filters.value = {
    q: String(route.query.q || ''),
    category: String(route.query.category || ''),
    visible: String(route.query.visible || ''),
  }
}

function applyFilters() {
  const query = {}
  if (filters.value.q.trim()) query.q = filters.value.q.trim()
  if (filters.value.category) query.category = filters.value.category
  if (filters.value.visible) query.visible = filters.value.visible
  router.push({ name: 'panel-products', query })
}

function clearFilters() {
  filters.value = { q: '', category: '', visible: '' }
  router.push({ name: 'panel-products', query: {} })
}

function changePage(page) {
  const query = { ...route.query }
  if (page > 1) query.page = String(page)
  else delete query.page
  router.push({ name: 'panel-products', query })
}

async function loadCategories() {
  try {
    const response = await categoriesApi.list({ includeHidden: true })
    categories.value = response.data.categories || []
  } catch (error) {
    notifyError(error, 'No se pudieron cargar las categorías')
  }
}

async function load() {
  loading.value = true
  try {
    const response = await productsApi.list({
      page: currentPage(),
      limit: 15,
      q: route.query.q || undefined,
      category: route.query.category || undefined,
      visible: route.query.visible || undefined,
    })
    products.value = response.data.products || []
    meta.value = response.meta || { total: 0, page: 1, pages: 1 }
  } catch (error) {
    notifyError(error, 'No se pudieron cargar los productos')
  } finally {
    loading.value = false
  }
}

function syncForm(product) {
  form.value = {
    name: product?.name || '',
    code: product?.code || '',
    sku: product?.sku || '',
    category: product?.category?._id || product?.category || null,
    description: product?.description || '',
    price: product?.price || 0,
    compareAtPrice: product?.compareAtPrice || 0,
    stock: product?.stock || 0,
    lowStockThreshold: product?.lowStockThreshold ?? 3,
    isOffer: Boolean(product?.isOffer),
    featured: Boolean(product?.featured),
    visible: product?.visible !== false,
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  if (categories.value.length === 1) form.value.category = categories.value[0]._id
  dialog.value = true
}

function openEdit(product) {
  editing.value = product
  syncForm(product)
  dialog.value = true
}

function resetDialog() {
  editing.value = null
  form.value = emptyForm()
}

async function saveProduct() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const payload = {
    name: form.value.name.trim(),
    sku: form.value.sku.trim(),
    category: form.value.category,
    description: form.value.description.trim(),
    price: Number(form.value.price) || 0,
    compareAtPrice: Number(form.value.compareAtPrice) || 0,
    stock: Number(form.value.stock) || 0,
    lowStockThreshold: Number(form.value.lowStockThreshold) || 0,
    isOffer: Boolean(form.value.isOffer),
    featured: Boolean(form.value.featured),
    visible: Boolean(form.value.visible),
  }
  if (form.value.code.trim()) payload.code = form.value.code.trim().toUpperCase()

  saving.value = true
  try {
    const isNew = !editing.value?._id
    const response = isNew
      ? await productsApi.create(payload)
      : await productsApi.update(editing.value._id, payload)
    const product = response.data.product
    editing.value = product
    syncForm(product)
    await load()
    notifySuccess(isNew ? 'Producto creado' : 'Producto guardado')
  } catch (error) {
    notifyError(error, 'No se pudo guardar el producto')
  } finally {
    saving.value = false
  }
}

function onImagesUpdated(product) {
  editing.value = product
  products.value = products.value.map((item) =>
    item._id === product._id ? { ...item, ...product } : item
  )
}

async function toggleVisibility(product) {
  const nextVisible = !product.visible
  try {
    const response = await productsApi.update(product._id, { visible: nextVisible })
    const updated = response.data.product
    products.value = products.value.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    )
    if (editing.value?._id === updated._id) editing.value = updated
    notifySuccess(updated.visible ? 'Producto visible en el catálogo' : 'Producto oculto')
  } catch (error) {
    notifyError(error, 'No se pudo cambiar la visibilidad')
  }
}

function openStock(product) {
  stockTarget.value = product
  stockForm.value = {
    stock: product.stock || 0,
    lowStockThreshold: product.lowStockThreshold ?? 3,
  }
  stockDialog.value = true
}

async function saveStock() {
  if (!stockTarget.value) return
  savingStock.value = true
  try {
    const response = await productsApi.updateStock(stockTarget.value._id, {
      stock: Number(stockForm.value.stock) || 0,
      lowStockThreshold: Number(stockForm.value.lowStockThreshold) || 0,
    })
    const updated = response.data.product
    products.value = products.value.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    )
    if (editing.value?._id === updated._id) editing.value = updated
    stockDialog.value = false
    notifySuccess('Inventario actualizado')
  } catch (error) {
    notifyError(error, 'No se pudo actualizar el inventario')
  } finally {
    savingStock.value = false
  }
}

async function hideProduct(product) {
  const accepted = await confirm({
    title: 'Ocultar producto',
    message: `"${product.name}" dejará de aparecer en el catálogo. Se conserva el historial de ventas y puedes volver a mostrarlo.`,
    okLabel: 'Ocultar',
    cancelLabel: 'Cancelar',
  })
  if (!accepted) return
  try {
    const response = await productsApi.remove(product._id)
    const updated = response.data.product
    products.value = products.value.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    )
    if (editing.value?._id === updated._id) editing.value = updated
    notifySuccess('Producto oculto del catálogo')
  } catch (error) {
    notifyError(error, 'No se pudo ocultar el producto')
  }
}

function stockColor(product) {
  if (product.stock <= 0) return 'negative'
  if (product.stock <= product.lowStockThreshold) return 'warning'
  return 'positive'
}

watch(
  () => route.query,
  () => {
    filtersFromRoute()
    load()
  },
  { immediate: true }
)

loadCategories()

useSeo({ title: 'Productos' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Productos</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          {{ meta.total || 0 }} productos · catálogo y existencias.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Nuevo producto"
          :disable="!categories.length"
          @click="openCreate"
        />
      </div>
    </div>

    <q-banner v-if="!categories.length" class="bg-orange-1 text-orange-9 q-mb-md" rounded>
      <template #avatar><q-icon name="category" /></template>
      Necesitas al menos una categoría para crear productos.
      <template #action>
        <q-btn flat no-caps color="orange-9" label="Crear categoría" to="/panel/categorias" />
      </template>
    </q-banner>

    <q-card flat bordered>
      <div class="panel-toolbar">
        <q-input
          v-model="filters.q"
          outlined
          dense
          clearable
          label="Buscar"
          placeholder="Nombre, código o SKU"
          style="min-width: 240px; flex: 1"
          @keyup.enter="applyFilters"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select
          v-model="filters.category"
          :options="categoryOptions"
          outlined
          dense
          emit-value
          map-options
          label="Categoría"
          style="min-width: 190px"
        />
        <q-select
          v-model="filters.visible"
          :options="visibilityOptions"
          outlined
          dense
          emit-value
          map-options
          label="Visibilidad"
          style="min-width: 140px"
        />
        <q-btn unelevated no-caps color="primary" icon="filter_alt" label="Aplicar" @click="applyFilters" />
        <q-btn flat no-caps color="primary" label="Limpiar" @click="clearFilters" />
      </div>

      <q-table
        :rows="products"
        :columns="columns"
        row-key="_id"
        :loading="loading"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        flat
        dense
        class="table-wrap"
        no-data-label="No hay productos con esos filtros"
      >
        <template #body-cell-product="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-sm">
              <img :src="mediaUrl(productImage(props.row))" :alt="props.row.name" class="table-thumb" />
              <div style="min-width: 0">
                <div class="text-weight-bold" style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                  {{ props.row.name }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ props.row.code }}
                  <template v-if="props.row.sku"> · {{ props.row.sku }}</template>
                  <q-icon
                    v-if="props.row.featured"
                    name="star"
                    color="warning"
                    size="13px"
                    class="q-ml-xs"
                  >
                    <q-tooltip>Destacado</q-tooltip>
                  </q-icon>
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-category="props">
          <q-td :props="props">{{ props.row.category?.name || 'Sin categoría' }}</q-td>
        </template>

        <template #body-cell-price="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ formatCurrency(props.row.price) }}</div>
            <div v-if="props.row.compareAtPrice > props.row.price" class="text-caption text-grey-7">
              <s>{{ formatCurrency(props.row.compareAtPrice) }}</s>
            </div>
          </q-td>
        </template>

        <template #body-cell-stock="props">
          <q-td :props="props">
            <q-badge :color="stockColor(props.row)">
              {{ props.row.stock }} uds.
            </q-badge>
            <div class="text-caption text-grey-7">Mínimo: {{ props.row.lowStockThreshold }}</div>
          </q-td>
        </template>

        <template #body-cell-visibility="props">
          <q-td :props="props">
            <q-badge :color="props.row.visible ? 'positive' : 'grey-6'">
              {{ props.row.visible ? 'Visible' : 'Oculto' }}
            </q-badge>
            <div class="text-caption text-grey-7">
              {{ props.row.isOffer ? 'En oferta' : 'Precio normal' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <div class="inline-actions" style="justify-content: flex-end">
              <q-btn flat dense round icon="edit" color="primary" aria-label="Editar" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="inventory" color="secondary" aria-label="Inventario" @click="openStock(props.row)">
                <q-tooltip>Actualizar stock</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                :icon="props.row.visible ? 'visibility_off' : 'visibility'"
                :color="props.row.visible ? 'grey-7' : 'positive'"
                :aria-label="props.row.visible ? 'Ocultar' : 'Mostrar'"
                @click="toggleVisibility(props.row)"
              >
                <q-tooltip>{{ props.row.visible ? 'Ocultar del catálogo' : 'Mostrar en el catálogo' }}</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.visible"
                flat
                dense
                round
                icon="delete"
                color="negative"
                aria-label="Ocultar producto"
                @click="hideProduct(props.row)"
              >
                <q-tooltip>Ocultar producto</q-tooltip>
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

    <q-dialog v-model="dialog" @hide="resetDialog">
      <q-card style="width: min(900px, 96vw); max-height: 94vh">
        <q-card-section class="row items-center justify-between q-pb-sm">
          <div>
            <div class="text-h6 text-weight-bold">{{ dialogTitle }}</div>
            <div v-if="editing?._id" class="text-caption text-grey-7">
              {{ editing.code }} · {{ editing.slug }}
            </div>
          </div>
          <q-btn flat round dense icon="close" aria-label="Cerrar" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: calc(94vh - 140px); overflow-y: auto">
          <q-form ref="formRef" @submit.prevent="saveProduct">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-8">
                <q-input
                  v-model="form.name"
                  outlined
                  label="Nombre del producto *"
                  maxlength="160"
                  :rules="rules.name"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-select
                  v-model="form.category"
                  :options="formCategoryOptions"
                  outlined
                  emit-value
                  map-options
                  label="Categoría *"
                  :rules="rules.category"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model="form.code"
                  outlined
                  label="Código"
                  maxlength="24"
                  hint="Vacío: se genera automáticamente."
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="form.sku" outlined label="SKU" maxlength="40" />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  step="100"
                  outlined
                  label="Precio *"
                  prefix="$"
                  :rules="rules.price"
                  lazy-rules
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.compareAtPrice"
                  type="number"
                  min="0"
                  step="100"
                  outlined
                  label="Precio anterior"
                  prefix="$"
                  hint="Para mostrar descuento."
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.stock"
                  type="number"
                  min="0"
                  outlined
                  label="Stock"
                />
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  v-model.number="form.lowStockThreshold"
                  type="number"
                  min="0"
                  outlined
                  label="Umbral de stock bajo"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="form.description"
                  type="textarea"
                  outlined
                  autogrow
                  maxlength="5000"
                  counter
                  label="Descripción"
                />
              </div>
              <div class="col-12">
                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-4">
                    <q-toggle v-model="form.visible" label="Visible en el catálogo" color="primary" />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-toggle v-model="form.isOffer" label="Marcar como oferta" color="primary" />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-toggle v-model="form.featured" label="Producto destacado" color="primary" />
                  </div>
                </div>
              </div>
            </div>

            <q-separator class="q-my-lg" />

            <template v-if="editing?._id">
              <ImageManager :product="editing" @updated="onImagesUpdated" />
            </template>
            <div v-else class="soft-card q-pa-md text-body2 text-grey-7">
              <q-icon name="photo_library" size="20px" class="q-mr-xs" />
              Guarda el producto para poder subir sus fotografías.
            </div>

            <div class="row justify-between items-center q-gutter-sm q-mt-lg">
              <q-btn
                v-if="editing?._id && editing.visible"
                flat
                no-caps
                color="negative"
                icon="visibility_off"
                label="Ocultar producto"
                @click="hideProduct(editing)"
              />
              <span v-else />
              <div class="inline-actions">
                <q-btn flat no-caps label="Cerrar" v-close-popup />
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="save"
                  label="Guardar producto"
                  type="submit"
                  :loading="saving"
                />
              </div>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="stockDialog" persistent>
      <q-card style="width: min(440px, 94vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="inventory" color="secondary" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Actualizar inventario</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="soft-card q-pa-md q-mb-md">
            <div class="text-weight-bold">{{ stockTarget?.name }}</div>
            <div class="text-caption text-grey-7">{{ stockTarget?.code }}</div>
            <div class="q-mt-xs text-caption text-grey-7">
              Stock actual: <strong>{{ stockTarget?.stock }}</strong> ·
              mínimo {{ stockTarget?.lowStockThreshold }}
            </div>
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="stockForm.stock"
                type="number"
                min="0"
                outlined
                label="Stock disponible"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="stockForm.lowStockThreshold"
                type="number"
                min="0"
                outlined
                label="Umbral de alerta"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Guardar stock"
            :loading="savingStock"
            @click="saveStock"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
