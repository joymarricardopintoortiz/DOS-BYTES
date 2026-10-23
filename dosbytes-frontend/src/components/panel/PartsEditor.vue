<script setup>
import { computed } from 'vue'
import { formatCurrency } from '../../utils/format'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const total = computed(() =>
  rows.value.reduce(
    (sum, part) => sum + Number(part.quantity || 0) * Number(part.unitCost || 0),
    0
  )
)

function update(index, field, value) {
  const next = rows.value.map((part, position) =>
    position === index ? { ...part, [field]: value } : part
  )
  emit('update:modelValue', next)
}

function add() {
  emit('update:modelValue', [...rows.value, { name: '', quantity: 1, unitCost: 0 }])
}

function remove(index) {
  emit('update:modelValue', rows.value.filter((_, position) => position !== index))
}
</script>

<template>
  <div class="stack">
    <div class="row items-center justify-between">
      <div class="text-weight-bold">Repuestos utilizados</div>
      <q-btn flat dense no-caps icon="add" label="Agregar repuesto" color="primary" @click="add" />
    </div>

    <div v-if="!rows.length" class="text-caption text-grey-7">
      Aún no hay repuestos registrados.
    </div>

    <div v-for="(part, index) in rows" :key="index" class="parts-row">
      <q-input
        :model-value="part.name"
        outlined
        dense
        label="Repuesto"
        @update:model-value="update(index, 'name', $event)"
      />
      <q-input
        :model-value="part.quantity"
        type="number"
        min="1"
        outlined
        dense
        label="Cant."
        @update:model-value="update(index, 'quantity', Number($event) || 1)"
      />
      <q-input
        :model-value="part.unitCost"
        type="number"
        min="0"
        outlined
        dense
        label="Costo unit."
        prefix="$"
        @update:model-value="update(index, 'unitCost', Number($event) || 0)"
      />
      <q-btn flat round dense icon="delete" color="negative" aria-label="Quitar repuesto" @click="remove(index)" />
    </div>

    <div class="text-right text-weight-bold">
      Total repuestos: {{ formatCurrency(total) }}
    </div>
  </div>
</template>
