<script setup>
import { computed } from 'vue'
import { statusInfo } from '../../utils/constants'

const props = defineProps({
  status: { type: String, required: true },
  type: { type: String, default: 'service' },
})

const info = computed(() => statusInfo(props.type, props.status))
</script>

<template>
  <q-badge :color="info.color" text-color="white" class="q-px-sm q-py-xs">
    <q-icon v-if="info.icon" :name="info.icon" size="12px" class="q-mr-xs" />
    {{ info.label }}
  </q-badge>
</template>
