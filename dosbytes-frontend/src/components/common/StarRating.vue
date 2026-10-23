<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  count: { type: [Number, String], default: null },
  size: { type: [Number, String], default: 16 },
  showValue: { type: Boolean, default: false },
})

const numeric = computed(() => {
  const value = Number(props.value)
  return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0
})

const stars = computed(() => {
  const rounded = Math.round(numeric.value * 2) / 2
  return Array.from({ length: 5 }, (_, index) => {
    const position = index + 1
    if (rounded >= position) return 'star'
    if (rounded >= position - 0.5) return 'star_half'
    return 'star_border'
  })
})

const style = computed(() => ({ fontSize: `${props.size}px` }))
</script>

<template>
  <span class="inline-flex items-center" style="display: inline-flex; align-items: center; gap: 4px">
    <span class="stars" :style="style" :aria-label="`${numeric.toFixed(1)} de 5 estrellas`">
      <q-icon v-for="(icon, index) in stars" :key="index" :name="icon" />
    </span>
    <span v-if="showValue" class="text-caption text-grey-7">{{ numeric.toFixed(1) }}</span>
    <span v-if="count !== null" class="text-caption text-grey-7">({{ count }})</span>
  </span>
</template>
