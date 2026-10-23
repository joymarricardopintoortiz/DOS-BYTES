<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  icon: { type: String, default: 'insights' },
  hint: { type: String, default: '' },
  color: { type: String, default: 'primary' },
})
</script>

<template>
  <div class="surface-card stat-card">
    <div class="stat-icon" :class="`bg-${color}-1 text-${color}`">
      <q-icon :name="icon" />
    </div>
    <div class="stat-body">
      <strong>{{ value }}</strong>
      <span>{{ label }}</span>
      <span v-if="hint" class="block text-caption text-grey-6">{{ hint }}</span>
    </div>
  </div>
</template>
