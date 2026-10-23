<script setup>
import { computed } from 'vue'
import { statusInfo } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'

const props = defineProps({
  history: { type: Array, default: () => [] },
  current: { type: String, default: '' },
  type: { type: String, default: 'service' },
})

const items = computed(() => {
  if (Array.isArray(props.history) && props.history.length) return props.history
  if (props.current) return [{ status: props.current }]
  return []
})
</script>

<template>
  <ol class="timeline">
    <li
      v-for="(item, index) in items"
      :key="`${item.status}-${index}`"
      class="timeline-item"
      :class="{ current: item.status === current }"
    >
      <span class="timeline-dot">
        <q-icon :name="statusInfo(type, item.status).icon || 'circle'" size="14px" />
      </span>
      <div class="timeline-title">{{ statusInfo(type, item.status).label }}</div>
      <div v-if="item.at" class="timeline-date">{{ formatDateTime(item.at) }}</div>
      <div v-if="item.note" class="timeline-note">{{ item.note }}</div>
    </li>
  </ol>
</template>
