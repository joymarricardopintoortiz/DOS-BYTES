<script setup>
import { computed, ref, watch } from 'vue'
import { mediaUrl, placeholder } from '../../utils/media'

const props = defineProps({
  images: { type: Array, default: () => [] },
  name: { type: String, default: 'Producto' },
})

const sorted = computed(() =>
  [...(props.images || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
)

const selected = ref(0)
const dialog = ref(false)
const zoomed = ref(false)

const current = computed(() => sorted.value[selected.value]?.url || placeholder)

watch(
  () => props.images,
  () => {
    selected.value = 0
  }
)

function open() {
  zoomed.value = false
  dialog.value = true
}
</script>

<template>
  <div>
    <div class="gallery-main" role="button" tabindex="0" @click="open" @keydown.enter="open">
      <img :src="mediaUrl(current)" :alt="name" />
      <q-badge color="dark" class="absolute-bottom-right q-ma-sm" style="opacity: 0.8">
        <q-icon name="zoom_in" size="14px" class="q-mr-xs" /> Ampliar
      </q-badge>
    </div>

    <div v-if="sorted.length > 1" class="gallery-thumbs">
      <button
        v-for="(image, index) in sorted"
        :key="image.publicId || index"
        type="button"
        class="gallery-thumb"
        :class="{ active: index === selected }"
        :aria-label="`Ver imagen ${index + 1}`"
        @click="selected = index"
      >
        <img :src="mediaUrl(image.url)" :alt="`${name} ${index + 1}`" loading="lazy" />
      </button>
    </div>

    <q-dialog v-model="dialog" maximized>
      <q-card class="bg-grey-10">
        <q-card-section class="row items-center justify-between text-white q-pb-none">
          <div class="text-subtitle1">{{ name }}</div>
          <div>
            <q-btn flat round dense color="white" icon="zoom_in" aria-label="Zoom" @click="zoomed = !zoomed" />
            <q-btn flat round dense color="white" icon="close" aria-label="Cerrar" v-close-popup />
          </div>
        </q-card-section>
        <q-card-section class="zoom-stage" :class="{ zoomed }">
          <img
            class="zoom-image"
            :src="mediaUrl(current)"
            :alt="name"
            @click="zoomed = !zoomed"
          />
        </q-card-section>
        <div class="text-center text-grey-5 q-pb-md text-caption">
          Toca la imagen para acercar o alejar.
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>
