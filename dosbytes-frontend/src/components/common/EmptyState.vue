<script setup>
defineProps({
  icon: { type: String, default: 'inventory_2' },
  title: { type: String, default: 'No hay información todavía' },
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="empty-state">
    <q-icon :name="icon" />
    <h3>{{ title }}</h3>
    <p v-if="text">{{ text }}</p>
    <div v-if="$slots.default" class="q-mt-md">
      <slot />
    </div>
  </div>
</template>
