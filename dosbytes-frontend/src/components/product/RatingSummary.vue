<script setup>
import { computed } from 'vue'
import StarRating from '../common/StarRating.vue'

const props = defineProps({
  summary: {
    type: Object,
    default: () => ({ average: 0, count: 0, breakdown: {} }),
  },
})

const count = computed(() => Number(props.summary?.count) || 0)
const average = computed(() => Number(props.summary?.average) || 0)
const breakdown = computed(() => props.summary?.breakdown || {})
const rows = computed(() =>
  [5, 4, 3, 2, 1].map((rating) => {
    const value = Number(breakdown.value[rating] || breakdown.value[String(rating)] || 0)
    return {
      rating,
      count: value,
      percent: count.value ? (value / count.value) * 100 : 0,
    }
  })
)
</script>

<template>
  <div class="rating-summary surface-card">
    <div class="rating-average">
      <strong>{{ average.toFixed(1) }}</strong>
      <StarRating :value="average" :size="18" />
      <div class="text-caption text-grey-7 q-mt-xs">{{ count }} opiniones</div>
    </div>

    <div class="rating-breakdown">
      <div v-for="row in rows" :key="row.rating" class="breakdown-row">
        <span style="width: 34px">{{ row.rating }} ★</span>
        <q-linear-progress
          :value="row.percent / 100"
          size="8px"
          rounded
          color="warning"
          track-color="grey-3"
        />
        <span style="width: 32px; text-align: right">{{ row.count }}</span>
      </div>
    </div>
  </div>
</template>
