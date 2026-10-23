<script setup>
import { computed, onMounted, ref } from 'vue'
import { configApi } from '../../api/client'
import { useSiteStore } from '../../stores/site'
import { mediaUrl } from '../../utils/media'
import { notifyError, notifySuccess } from '../../utils/notify'
import { useSeo } from '../../composables/useSeo'
import ImageUploader from '../../components/common/ImageUploader.vue'
import EmptyState from '../../components/common/EmptyState.vue'

const site = useSiteStore()

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const formRef = ref(null)

const form = ref(emptyForm())
const adminEmails = ref(['', ''])
const banners = ref([])

const maxBanners = 8
const canAddBanner = computed(() => banners.value.length < maxBanners)

const rules = {
  businessName: [
    (value) => String(value || '').trim().length >= 2 || 'Escribe el nombre del negocio',
    (value) => String(value || '').trim().length <= 80 || 'Máximo 80 caracteres',
  ],
  adminEmail: [
    (value) =>
      !String(value || '').trim() ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ||
      'Correo inválido',
  ],
  employeeEmail: [
    (value) =>
      !String(value || '').trim() ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ||
      'Correo inválido',
  ],
  bannerTitle: [(value) => String(value || '').length <= 140 || 'Máximo 140 caracteres'],
  bannerSubtitle: [(value) => String(value || '').length <= 240 || 'Máximo 240 caracteres'],
  bannerLink: [(value) => String(value || '').length <= 500 || 'Máximo 500 caracteres'],
}

function emptyForm() {
  return {
    businessName: 'DOS BYTES',
    logoUrl: '',
    description: '',
    address: '',
    schedule: '',
    phone: '',
    employeeEmail: '',
  }
}

function applyConfig(config) {
  const data = config || {}
  form.value = {
    businessName: data.businessName || 'DOS BYTES',
    logoUrl: data.logoUrl || '',
    description: data.description || '',
    address: data.address || '',
    schedule: data.schedule || '',
    phone: data.phone || '',
    employeeEmail: data.employeeEmail || '',
  }
  const emails = Array.isArray(data.adminEmails) ? data.adminEmails : []
  adminEmails.value = [emails[0] || '', emails[1] || '']
  banners.value = (Array.isArray(data.banners) ? data.banners : []).map((banner, index) => ({
    title: banner.title || '',
    subtitle: banner.subtitle || '',
    image: banner.image || '',
    link: banner.link || '',
    order: Number.isFinite(Number(banner.order)) ? Number(banner.order) : index,
  }))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await configApi.get()
    applyConfig(response.data.config)
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la configuración'
    notifyError(err, 'No se pudo cargar la configuración')
  } finally {
    loading.value = false
  }
}

function addBanner() {
  if (!canAddBanner.value) return
  banners.value.push({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    order: banners.value.length,
  })
}

function removeBanner(index) {
  banners.value = banners.value
    .filter((_, position) => position !== index)
    .map((banner, position) => ({ ...banner, order: position }))
}

function moveBanner(index, direction) {
  const target = index + direction
  if (target < 0 || target >= banners.value.length) return
  const next = [...banners.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  banners.value = next.map((banner, position) => ({ ...banner, order: position }))
}

async function save() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const emails = adminEmails.value
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean)

  if (new Set(emails).size !== emails.length) {
    notifyError(null, 'Los correos de administrador no pueden repetirse')
    return
  }

  const payload = {
    businessName: form.value.businessName.trim(),
    logoUrl: form.value.logoUrl || '',
    description: form.value.description.trim(),
    address: form.value.address.trim(),
    schedule: form.value.schedule.trim(),
    phone: form.value.phone.trim(),
    adminEmails: emails,
    employeeEmail: form.value.employeeEmail.trim().toLowerCase(),
    banners: banners.value.map((banner, index) => ({
      title: String(banner.title || '').trim(),
      subtitle: String(banner.subtitle || '').trim(),
      image: banner.image || '',
      link: String(banner.link || '').trim(),
      order: index,
    })),
  }

  saving.value = true
  try {
    const response = await configApi.update(payload)
    applyConfig(response.data.config)
    site.refreshConfig().catch(() => {})
    notifySuccess(response.message || 'Configuración actualizada')
  } catch (err) {
    notifyError(err, 'No se pudo guardar la configuración')
  } finally {
    saving.value = false
  }
}

onMounted(load)

useSeo({ title: 'Configuración del sitio' })
</script>

<template>
  <div class="panel-page">
    <div class="panel-page-head">
      <div>
        <h1 class="title-lg">Configuración del sitio</h1>
        <p class="text-body2 text-grey-7 q-mb-none">
          Datos de contacto, identidad y banners de la página de inicio.
        </p>
      </div>
      <div class="inline-actions">
        <q-btn outline no-caps color="primary" icon="refresh" label="Recargar" :loading="loading" @click="load" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Guardar cambios"
          :loading="saving"
          :disable="loading || Boolean(error)"
          @click="save"
        />
      </div>
    </div>

    <div v-if="loading" class="stack">
      <q-skeleton height="120px" style="border-radius: 14px" />
      <q-skeleton height="360px" style="border-radius: 14px" />
      <q-skeleton height="280px" style="border-radius: 14px" />
    </div>

    <EmptyState
      v-else-if="error"
      icon="settings"
      title="Configuración no disponible"
      :text="error"
    >
      <q-btn unelevated no-caps color="primary" icon="refresh" label="Intentar de nuevo" @click="load" />
    </EmptyState>

    <template v-else>
      <q-form ref="formRef" @submit.prevent="save">
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-lg-8">
            <q-card flat bordered class="q-mb-lg">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold">Identidad del negocio</div>
                <div class="text-caption text-grey-7 q-mb-md">
                  Se muestra en el encabezado, el pie de página y los metadatos del sitio.
                </div>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-7">
                    <q-input
                      v-model="form.businessName"
                      outlined
                      label="Nombre del negocio *"
                      maxlength="80"
                      :rules="rules.businessName"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="storefront" /></template>
                    </q-input>
                  </div>
                  <div class="col-12 col-sm-5">
                    <q-input
                      v-model="form.phone"
                      outlined
                      type="tel"
                      label="Teléfono"
                      maxlength="30"
                    >
                      <template #prepend><q-icon name="call" /></template>
                    </q-input>
                  </div>
                  <div class="col-12">
                    <q-input
                      v-model="form.description"
                      type="textarea"
                      outlined
                      autogrow
                      maxlength="500"
                      counter
                      label="Descripción corta"
                      hint="Se usa como descripción del sitio para buscadores."
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="form.address"
                      outlined
                      label="Dirección"
                      maxlength="240"
                    >
                      <template #prepend><q-icon name="place" /></template>
                    </q-input>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="form.schedule"
                      outlined
                      label="Horario de atención"
                      maxlength="240"
                    >
                      <template #prepend><q-icon name="schedule" /></template>
                    </q-input>
                  </div>
                </div>

                <q-separator class="q-my-lg" />

                <div class="text-subtitle1 text-weight-bold q-mb-sm">Logotipo</div>
                <ImageUploader
                  v-model="form.logoUrl"
                  label="Logotipo del sitio"
                  hint="PNG, JPG o WebP con fondo transparente. Máximo 5 MB."
                />
              </q-card-section>
            </q-card>

            <q-card flat bordered class="q-mb-lg">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold">Correos de notificación</div>
                <div class="text-caption text-grey-7 q-mb-md">
                  Los fundadores reciben copia de los avisos importantes. El correo de empleado
                  recibe las notificaciones operativas.
                </div>

                <div class="row q-col-gutter-md">
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="adminEmails[0]"
                      outlined
                      type="email"
                      label="Correo de administrador 1"
                      :rules="rules.adminEmail"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="shield_person" /></template>
                    </q-input>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="adminEmails[1]"
                      outlined
                      type="email"
                      label="Correo de administrador 2"
                      :rules="rules.adminEmail"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="shield_person" /></template>
                    </q-input>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      v-model="form.employeeEmail"
                      outlined
                      type="email"
                      label="Correo del empleado"
                      hint="Opcional. Recibe avisos de órdenes y pedidos."
                      :rules="rules.employeeEmail"
                      lazy-rules
                    >
                      <template #prepend><q-icon name="badge" /></template>
                    </q-input>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-card flat bordered>
              <q-card-section>
                <div class="row items-start justify-between q-gutter-sm">
                  <div>
                    <div class="text-subtitle1 text-weight-bold">Banners de inicio</div>
                    <div class="text-caption text-grey-7">
                      Hasta {{ maxBanners }} banners. El orden define cómo aparecen en el carrusel.
                    </div>
                  </div>
                  <q-btn
                    outline
                    no-caps
                    color="primary"
                    icon="add_photo_alternate"
                    label="Agregar banner"
                    :disable="!canAddBanner"
                    @click="addBanner"
                  />
                </div>

                <div v-if="!banners.length" class="soft-card q-pa-md text-body2 text-grey-7 q-mt-md">
                  <q-icon name="view_carousel" size="20px" class="q-mr-xs" />
                  Todavía no hay banners. La página de inicio usará el diseño por defecto.
                </div>

                <div v-else class="stack q-mt-md">
                  <q-card
                    v-for="(banner, index) in banners"
                    :key="index"
                    flat
                    bordered
                    class="banner-editor"
                  >
                    <q-card-section>
                      <div class="row items-center justify-between q-mb-sm">
                        <div class="row items-center q-gutter-sm">
                          <q-badge color="primary">Banner {{ index + 1 }}</q-badge>
                          <span class="text-caption text-grey-7">
                            {{ banner.image ? 'Imagen cargada' : 'Sin imagen' }}
                          </span>
                        </div>
                        <div class="inline-actions">
                          <q-btn
                            flat
                            dense
                            round
                            icon="arrow_upward"
                            aria-label="Mover arriba"
                            :disable="index === 0"
                            @click="moveBanner(index, -1)"
                          />
                          <q-btn
                            flat
                            dense
                            round
                            icon="arrow_downward"
                            aria-label="Mover abajo"
                            :disable="index === banners.length - 1"
                            @click="moveBanner(index, 1)"
                          />
                          <q-btn
                            flat
                            dense
                            round
                            icon="delete"
                            color="negative"
                            aria-label="Eliminar banner"
                            @click="removeBanner(index)"
                          />
                        </div>
                      </div>

                      <div class="row q-col-gutter-md">
                        <div class="col-12 col-md-7">
                          <q-input
                            v-model="banner.title"
                            outlined
                            dense
                            label="Título"
                            maxlength="140"
                            :rules="rules.bannerTitle"
                            lazy-rules
                            class="q-mb-sm"
                          />
                          <q-input
                            v-model="banner.subtitle"
                            outlined
                            dense
                            type="textarea"
                            autogrow
                            label="Subtítulo"
                            maxlength="240"
                            :rules="rules.bannerSubtitle"
                            lazy-rules
                            class="q-mb-sm"
                          />
                          <q-input
                            v-model="banner.link"
                            outlined
                            dense
                            label="Enlace"
                            maxlength="500"
                            hint="Ruta interna (/productos) o URL completa."
                            :rules="rules.bannerLink"
                            lazy-rules
                          >
                            <template #prepend><q-icon name="link" /></template>
                          </q-input>
                        </div>
                        <div class="col-12 col-md-5">
                          <ImageUploader
                            v-model="banner.image"
                            label="Imagen del banner"
                            hint="Formato horizontal. Máximo 5 MB."
                          />
                          <div v-if="banner.image" class="banner-preview q-mt-sm">
                            <img :src="mediaUrl(banner.image)" :alt="banner.title || 'Banner'" />
                          </div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>

                <div v-if="!canAddBanner" class="text-caption text-orange-9 q-mt-sm">
                  Alcanzaste el máximo de {{ maxBanners }} banners.
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-lg-4">
            <q-card flat bordered class="q-mb-md sticky-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">Vista previa</div>
                <div class="config-preview">
                  <div class="config-preview-brand">
                    <img
                      v-if="form.logoUrl"
                      :src="mediaUrl(form.logoUrl)"
                      alt="Logotipo"
                      class="config-preview-logo"
                    />
                    <div v-else class="config-preview-mark">DB</div>
                    <div>
                      <div class="text-weight-bold">{{ form.businessName || 'DOS BYTES' }}</div>
                      <div class="text-caption text-grey-7">Tecnología y servicios</div>
                    </div>
                  </div>
                  <p class="text-body2 text-grey-7 q-mt-md q-mb-sm">
                    {{ form.description || 'Sin descripción configurada.' }}
                  </p>
                  <div class="meta-list">
                    <div v-if="form.phone">
                      <span>Teléfono</span>
                      <strong>{{ form.phone }}</strong>
                    </div>
                    <div v-if="form.address">
                      <span>Dirección</span>
                      <strong>{{ form.address }}</strong>
                    </div>
                    <div v-if="form.schedule">
                      <span>Horario</span>
                      <strong>{{ form.schedule }}</strong>
                    </div>
                    <div>
                      <span>Banners</span>
                      <strong>{{ banners.length }} de {{ maxBanners }}</strong>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">Buenas prácticas</div>
                <ul class="config-tips">
                  <li>Usa un logotipo horizontal y liviano para el encabezado.</li>
                  <li>Escribe una descripción de una o dos frases para buscadores.</li>
                  <li>Mantén los horarios y el teléfono actualizados.</li>
                  <li>Los banners se muestran en el orden definido aquí.</li>
                  <li>Los cambios se publican al guardar y refrescar el sitio.</li>
                </ul>
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="save"
                  label="Guardar cambios"
                  class="full-width q-mt-md"
                  :loading="saving"
                  @click="save"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-form>
    </template>
  </div>
</template>
