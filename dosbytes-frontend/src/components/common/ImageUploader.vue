<script setup>
import { computed, ref } from 'vue'
import { uploadsApi } from '../../api/client'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Imagen' },
  hint: { type: String, default: 'JPG, PNG o WebP. Máximo 5 MB.' },
})

const emit = defineEmits(['update:modelValue'])
const input = ref(null)
const uploading = ref(false)

const preview = computed(() => (props.modelValue ? mediaUrl(props.modelValue) : ''))

function openPicker() {
  input.value?.click()
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const response = await uploadsApi.upload(file)
    emit('update:modelValue', response.data.image.url)
    notifySuccess('Imagen subida')
  } catch (error) {
    notifyError(error, 'No se pudo subir la imagen')
  } finally {
    uploading.value = false
  }
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="stack">
    <div class="row items-center q-gutter-sm">
      <q-avatar v-if="preview" size="64px" square class="bg-grey-2">
        <img :src="preview" :alt="label" />
      </q-avatar>
      <div v-else class="soft-card q-pa-md text-grey-6">
        <q-icon name="image" size="28px" />
      </div>
      <div class="column q-gutter-xs">
        <div class="row q-gutter-sm">
          <q-btn
            outline
            no-caps
            color="primary"
            icon="upload"
            :label="preview ? 'Cambiar' : 'Subir imagen'"
            :loading="uploading"
            @click="openPicker"
          />
          <q-btn
            v-if="preview"
            flat
            no-caps
            color="negative"
            icon="delete"
            label="Quitar"
            @click="clear"
          />
        </div>
        <span class="text-caption text-grey-7">{{ hint }}</span>
      </div>
      <input
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        @change="onFile"
      />
    </div>
    <q-input
      :model-value="modelValue"
      outlined
      dense
      label="URL de la imagen"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>
