<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pages: { type: Number, default: 1 },
  total: { type: Number, default: null },
})

defineEmits(['update:page'])

const show = computed(() => Number(props.pages) > 1)
</script>

<template>
  <div v-if="show" class="row items-center justify-center q-mt-lg q-gutter-md">
    <span v-if="total !== null" class="text-caption text-grey-7">{{ total }} resultados</span>
    <q-pagination
      :model-value="page"
      :max="pages"
      :max-pages="5"
      boundary-numbers
      direction-links
      color="primary"
      @update:model-value="$emit('update:page', $event)"
    />
  </div>
</template>
