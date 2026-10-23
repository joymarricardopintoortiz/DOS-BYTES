<script setup>
import { computed, onMounted, ref } from 'vue'
import { productsApi } from '../../api/client'
import { formatCurrency, productImage } from '../../utils/format'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import StatCard from '../../components/common/StatCard.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const products = ref([])
const loading = ref(true)
const search = ref('')

const dialog = ref(false)
const target = ref(null)
const form = ref({ stock: 0, lowStockThreshold: 3 })
const saving = ref(false)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return products.value
  return products.value.filter(
    (product) =>
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term) ||
      (product.sku || '').toLowerCase().includes(term)
  )
})

const outOfStock = computed(() => products.value.filter((product) => product.stock <= 0).length)
const missingUnits = computed(() =>
  products.value.reduce(
    (sum, product) => sum + Math.max(0, (product.lowStockThreshold || 0) - (product.stock || 0)),
    0
  )
)

const columns = [
  { name: 'product', label: 'Producto', field: 'name', align: 'left' },
  { name: 'price', label: 'Precio', field: 'price', align: 'right' },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'left' },
  { name: 'threshold', label: 'Mínimo', field: 'lowStockThreshold', align: 'left' },
  { name: 'missing', label: 'Faltan', field: 'missing', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function load() {
  loading.value = true
  try {
    const response = await productsApi.lowStock()
    products.value = response.data.products || []
  } catch (error) {
    notifyError(error, 'No se pudo cargar el inventario bajo')
  } finally {
    loading.value = false
  }
}

function openRestock(product) {
  target.value = product
  form.value = {
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold ?? 3,
  }
  dialog.value = true
}

function missing(product) {
  return Math.max(0, (product.lowStockThreshold || 0) - (product.stock || 0))
}

async function saveStock() {
  if (!target.value) return
  saving.value = true
  try {
    await productsApi.updateStock(target.value._id, {
      stock: Number(form.value.stock) || 0,
      lowStockThreshold: Number(form.value.lowStockThreshold) || 0,
    })
    dialog.value = false
    notifySuccess('Inventario actualizado')
    await load()
  } catch (error) {
    notifyError(error, 'No se pudo actualizar el inventario')
  } finally {
    saving.value = false
  }
}

onMounted(load)

useSeo({ title: 'Inventario bajo' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Inventario bajo</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          Productos visibles con existencias iguales o por debajo de su umbral.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
        <q-btn unelevated no-caps color="primary" icon="inventory_2" label="Gestionar productos" to="/panel/productos" />
      </div>
    </div>

    <div class="stat-grid q-mb-lg">
      <StatCard label="En alerta" :value="products.length" icon="warning_amber" color="warning" hint="Requieren reposición" />
      <StatCard label="Agotados" :value="outOfStock" icon="remove_shopping_cart" color="negative" hint="Sin unidades" />
      <StatCard label="Unidades faltantes" :value="missingUnits" icon="add_shopping_cart" color="secondary" hint="Para llegar al mínimo" />
    </div>

    <q-card flat bordered>
      <div class="panel-toolbar">
        <q-input
          v-model="search"
          outlined
          dense
          clearable
          label="Filtrar"
          placeholder="Nombre, código o SKU"
          style="min-width: 260px; flex: 1"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
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
        no-data-label="No hay productos con inventario bajo"
      >
        <template #body-cell-product="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-sm">
              <img :src="mediaUrl(productImage(props.row))" :alt="props.row.name" class="table-thumb" />
              <div style="min-width: 0">
                <div class="text-weight-bold" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                  {{ props.row.name }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ props.row.code }}
                  <template v-if="props.row.category?.name"> · {{ props.row.category.name }}</template>
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-price="props">
          <q-td :props="props">{{ formatCurrency(props.row.price) }}</q-td>
        </template>

        <template #body-cell-stock="props">
          <q-td :props="props">
            <q-badge :color="props.row.stock <= 0 ? 'negative' : 'warning'">
              {{ props.row.stock }} uds.
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-threshold="props">
          <q-td :props="props">{{ props.row.lowStockThreshold }}</q-td>
        </template>

        <template #body-cell-missing="props">
          <q-td :props="props">
            <span :class="missing(props.row) ? 'text-negative text-weight-bold' : 'text-grey-7'">
              {{ missing(props.row) }}
            </span>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              unelevated
              dense
              no-caps
              color="primary"
              icon="add"
              label="Reponer"
              @click="openRestock(props.row)"
            />
          </q-td>
        </template>
      </q-table>

      <EmptyState
        v-if="!loading && !products.length"
        icon="inventory_2"
        title="Todo el inventario está al día"
        text="Ningún producto visible está por debajo de su umbral de stock."
      >
        <q-btn outline no-caps color="primary" label="Ver productos" to="/panel/productos" />
      </EmptyState>
    </q-card>

    <q-dialog v-model="dialog" persistent>
      <q-card style="width: min(440px, 94vw)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="add_shopping_cart" color="primary" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Reponer inventario</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="soft-card q-pa-md q-mb-md">
            <div class="text-weight-bold">{{ target?.name }}</div>
            <div class="text-caption text-grey-7">{{ target?.code }}</div>
            <div class="q-mt-xs text-caption text-grey-7">
              Stock actual: <strong>{{ target?.stock }}</strong> · mínimo
              {{ target?.lowStockThreshold }}
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="form.stock"
                type="number"
                min="0"
                outlined
                label="Stock disponible"
                autofocus
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="form.lowStockThreshold"
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
            :loading="saving"
            @click="saveStock"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
