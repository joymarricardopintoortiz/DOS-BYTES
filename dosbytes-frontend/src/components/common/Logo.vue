<script setup>
import { computed } from 'vue'
import { useSiteStore } from '../../stores/site'
import { mediaUrl } from '../../utils/media'

const props = defineProps({
  light: { type: Boolean, default: false },
  tagline: { type: String, default: 'Tecnología y servicio' },
})

const site = useSiteStore()
const businessName = computed(() => site.siteConfig.businessName || 'DOS BYTES')
const logoUrl = computed(() => site.siteConfig.logoUrl || '')
</script>

<template>
  <router-link to="/" class="brand" :class="{ 'brand-light': props.light }" aria-label="Ir al inicio">
    <img v-if="logoUrl" :src="mediaUrl(logoUrl)" :alt="businessName" class="brand-mark" />
    <svg
      v-else
      class="brand-mark"
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="11" fill="#0B1F3A" />
      <rect x="8" y="13" width="13" height="22" rx="4" fill="#00C2FF" />
      <rect x="27" y="13" width="13" height="22" rx="4" fill="#FFC93C" />
      <circle cx="14.5" cy="24" r="2" fill="#0B1F3A" />
      <circle cx="33.5" cy="24" r="2" fill="#0B1F3A" />
    </svg>
    <span>
      <span class="brand-name">{{ businessName }}</span>
      <span class="brand-tag">{{ tagline }}</span>
    </span>
  </router-link>
</template>
