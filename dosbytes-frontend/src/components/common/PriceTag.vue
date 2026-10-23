<script setup>
import { computed } from 'vue'
import { formatCurrency } from '../../utils/format'

const props = defineProps({
  price: { type: [Number, String], default: 0 },
  compareAtPrice: { type: [Number, String], default: 0 },
  size: { type: String, default: 'md' },
  showOld: { type: Boolean, default: true },
})

const hasOld = computed(() => Number(props.compareAtPrice) > Number(props.price))
const fontSize = computed(() => {
  if (props.size === 'lg') return '2rem'
  if (props.size === 'sm') return '0.95rem'
  return '1.14rem'
})
</script>

<template>
  <span class="price-line">
    <span class="price-current" :style="{ fontSize }">{{ formatCurrency(price) }}</span>
    <span v-if="showOld && hasOld" class="price-old">
      {{ formatCurrency(compareAtPrice) }}
    </span>
  </span>
</template>
