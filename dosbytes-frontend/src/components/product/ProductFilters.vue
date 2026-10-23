<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  categories: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'apply'])

const filters = computed(() => props.modelValue || {})
const categoryOptions = computed(() =>
  props.categories.map((category) => ({
    label: `${category.name}${category.productCount !== undefined ? ` (${category.productCount})` : ''}`,
    value: category.slug,
  }))
)

const ratingOptions = [
  { label: '4 estrellas o más', value: 4 },
  { label: '3 estrellas o más', value: 3 },
  { label: '2 estrellas o más', value: 2 },
  { label: '1 estrella o más', value: 1 },
]

function set(field, value) {
  emit('update:modelValue', { ...filters.value, [field]: value })
}

function reset() {
  emit('update:modelValue', {
    q: filters.value.q || '',
    category: '',
    minPrice: '',
    maxPrice: '',
    available: false,
    minRating: '',
    isOffer: false,
    featured: false,
  })
  emit('apply')
}
</script>

<template>
  <div class="filter-panel surface-card">
    <div class="row items-center justify-between q-mb-sm">
      <h3 class="filter-title q-mb-none">Filtros</h3>
      <q-btn flat dense no-caps label="Limpiar" color="primary" size="sm" @click="reset" />
    </div>

    <div class="filter-block">
      <div class="filter-label">Categoría</div>
      <q-select
        :model-value="filters.category || ''"
        :options="categoryOptions"
        outlined
        dense
        emit-value
        map-options
        clearable
        placeholder="Todas las categorías"
        @update:model-value="set('category', $event || '')"
      />
    </div>

    <div class="filter-block">
      <div class="filter-label">Rango de precio (COP)</div>
      <div class="row q-gutter-sm">
        <q-input
          :model-value="filters.minPrice"
          type="number"
          min="0"
          outlined
          dense
          label="Mínimo"
          class="col"
          @update:model-value="set('minPrice', $event)"
        />
        <q-input
          :model-value="filters.maxPrice"
          type="number"
          min="0"
          outlined
          dense
          label="Máximo"
          class="col"
          @update:model-value="set('maxPrice', $event)"
        />
      </div>
    </div>

    <div class="filter-block">
      <div class="filter-label">Disponibilidad</div>
      <q-toggle
        :model-value="Boolean(filters.available)"
        label="Solo productos disponibles"
        color="positive"
        dense
        @update:model-value="set('available', $event)"
      />
    </div>

    <div class="filter-block">
      <div class="filter-label">Calificación</div>
      <q-select
        :model-value="filters.minRating || ''"
        :options="ratingOptions"
        outlined
        dense
        emit-value
        map-options
        clearable
        placeholder="Cualquier calificación"
        @update:model-value="set('minRating', $event || '')"
      />
    </div>

    <div class="filter-block">
      <div class="filter-label">Promociones</div>
      <q-toggle
        :model-value="Boolean(filters.isOffer)"
        label="Solo ofertas"
        color="warning"
        dense
        @update:model-value="set('isOffer', $event)"
      />
      <q-toggle
        :model-value="Boolean(filters.featured)"
        label="Solo destacados"
        color="secondary"
        dense
        @update:model-value="set('featured', $event)"
      />
    </div>

    <q-btn
      unelevated
      no-caps
      color="primary"
      icon="filter_alt"
      label="Aplicar filtros"
      class="full-width q-mt-md"
      @click="$emit('apply')"
    />
  </div>
</template>
