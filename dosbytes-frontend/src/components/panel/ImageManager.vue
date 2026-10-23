<script setup>
import { computed, ref } from 'vue'
import { productsApi } from '../../api/client'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useConfirm } from '../../composables/useConfirm'

const props = defineProps({
  product: { type: Object, required: true },
})

const emit = defineEmits(['updated'])
const confirm = useConfirm()
const input = ref(null)
const uploading = ref(false)
const busy = ref(false)

const images = computed(() =>
  [...(props.product.images || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
)

const maxImages = 8
const canUpload = computed(() => images.value.length < maxImages)

function openPicker() {
  input.value?.click()
}

async function upload(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return
  uploading.value = true
  try {
    const response = await productsApi.addImages(props.product._id, files)
    emit('updated', response.data.product)
    notifySuccess('Imágenes agregadas')
  } catch (error) {
    notifyError(error, 'No se pudieron subir las imágenes')
  } finally {
    uploading.value = false
  }
}

async function setMain(image) {
  busy.value = true
  try {
    const response = await productsApi.setMainImage(props.product._id, image.publicId)
    emit('updated', response.data.product)
    notifySuccess('Imagen principal actualizada')
  } catch (error) {
    notifyError(error, 'No se pudo cambiar la imagen principal')
  } finally {
    busy.value = false
  }
}

async function removeImage(image) {
  const accepted = await confirm({
    title: 'Eliminar imagen',
    message: 'La imagen se eliminará del producto y del almacenamiento.',
    okLabel: 'Eliminar',
  })
  if (!accepted) return
  busy.value = true
  try {
    const response = await productsApi.removeImage(props.product._id, image.publicId)
    emit('updated', response.data.product)
    notifySuccess('Imagen eliminada')
  } catch (error) {
    notifyError(error, 'No se pudo eliminar la imagen')
  } finally {
    busy.value = false
  }
}

async function move(index, direction) {
  const next = [...images.value]
  const target = index + direction
  if (target < 0 || target >= next.length) return
  ;[next[index], next[target]] = [next[target], next[index]]
  busy.value = true
  try {
    const response = await productsApi.reorderImages(
      props.product._id,
      next.map((image, position) => ({ publicId: image.publicId, order: position }))
    )
    emit('updated', response.data.product)
  } catch (error) {
    notifyError(error, 'No se pudo reordenar las imágenes')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div class="row items-center justify-between q-mb-md q-gutter-sm">
      <div>
        <div class="text-subtitle1 text-weight-bold">Galería de fotos</div>
        <div class="text-caption text-grey-7">
          {{ images.length }} de {{ maxImages }} imágenes. La primera es la principal.
        </div>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="add_photo_alternate"
        label="Agregar fotos"
        :loading="uploading"
        :disable="!canUpload"
        @click="openPicker"
      />
      <input
        ref="input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="upload"
      />
    </div>

    <div v-if="images.length" class="image-manager">
      <div v-for="(image, index) in images" :key="image.publicId || index" class="image-tile">
        <img :src="mediaUrl(image.url)" :alt="image.alt || product.name" />
        <q-badge
          v-if="index === 0"
          color="secondary"
          text-color="primary"
          class="main-image-flag"
        >
          Principal
        </q-badge>
        <div class="image-tile-actions">
          <q-btn flat round dense icon="arrow_upward" :disable="index === 0 || busy" aria-label="Subir" @click="move(index, -1)" />
          <q-btn flat round dense icon="arrow_downward" :disable="index === images.length - 1 || busy" aria-label="Bajar" @click="move(index, 1)" />
          <q-btn flat round dense icon="star" color="warning" :disable="index === 0 || busy" aria-label="Hacer principal" @click="setMain(image)" />
          <q-btn flat round dense icon="delete" color="negative" :disable="busy" aria-label="Eliminar" @click="removeImage(image)" />
        </div>
      </div>
    </div>

    <div v-else class="soft-card q-pa-lg text-center text-grey-7">
      <q-icon name="photo_library" size="36px" />
      <div class="q-mt-sm">Este producto todavía no tiene fotos.</div>
    </div>
  </div>
</template>
