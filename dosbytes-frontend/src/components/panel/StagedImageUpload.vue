<script setup>
import { ref } from 'vue'
import { notifyError } from '../../utils/notify'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const input = ref(null)
const maxImages = 8
const maxSize = 5 * 1024 * 1024
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']

function openPicker() {
  input.value?.click()
}

function onFiles(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return

  const next = [...props.modelValue]
  const rejected = []

  for (const file of files) {
    if (next.length >= maxImages) break
    if (!acceptedTypes.includes(file.type)) {
      rejected.push(`${file.name}: formato no permitido (JPG, PNG o WebP)`)
      continue
    }
    if (file.size > maxSize) {
      rejected.push(`${file.name}: supera el máximo de 5 MB`)
      continue
    }
    next.push({ file, preview: URL.createObjectURL(file) })
  }

  if (rejected.length) notifyError(null, rejected.join(' · '))
  emit('update:modelValue', next)
}

function remove(index) {
  const next = [...props.modelValue]
  const [removed] = next.splice(index, 1)
  if (removed?.preview) URL.revokeObjectURL(removed.preview)
  emit('update:modelValue', next)
}
</script>

<template>
  <div>
    <div class="row items-center justify-between q-mb-md q-gutter-sm">
      <div>
        <div class="text-subtitle1 text-weight-bold">Galería de fotos *</div>
        <div class="text-caption text-grey-7">
          {{ modelValue.length }} de {{ maxImages }} imágenes. La primera será la
          principal. Obligatorio: agrega al menos una antes de guardar (JPG, PNG o
          WebP, máximo 5 MB).
        </div>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="add_photo_alternate"
        label="Agregar fotos"
        :disable="modelValue.length >= maxImages"
        @click="openPicker"
      />
      <input
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="onFiles"
      />
    </div>

    <div v-if="modelValue.length" class="image-manager">
      <div v-for="(item, index) in modelValue" :key="index" class="image-tile">
        <img :src="item.preview" alt="Foto seleccionada" />
        <q-badge
          v-if="index === 0"
          color="secondary"
          text-color="primary"
          class="main-image-flag"
        >
          Principal
        </q-badge>
        <div class="image-tile-actions">
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            aria-label="Quitar foto"
            @click="remove(index)"
          />
        </div>
      </div>
    </div>

    <div v-else class="soft-card q-pa-lg text-center text-grey-7">
      <q-icon name="photo_library" size="36px" />
      <div class="q-mt-sm">
        Aún no has agregado fotos. Agrega al menos una antes de guardar: es
        obligatorio.
      </div>
    </div>
  </div>
</template>
