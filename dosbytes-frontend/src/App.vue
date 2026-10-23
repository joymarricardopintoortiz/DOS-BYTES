<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()

function handleUnauthorized() {
  const wasAuthenticated = auth.isAuthenticated
  auth.clearSession()
  const current = router.currentRoute.value
  if (wasAuthenticated && current.meta.requiresAuth) {
    router.replace({ name: 'login', query: { redirect: current.fullPath } })
  }
}

function handlePasswordChangeRequired() {
  auth.mustChangePassword = true
  const current = router.currentRoute.value
  if (current.name !== 'change-password') {
    router.replace({ name: 'change-password' })
  }
}

onMounted(() => {
  window.addEventListener('db:unauthorized', handleUnauthorized)
  window.addEventListener('db:password-change-required', handlePasswordChangeRequired)
})

onUnmounted(() => {
  window.removeEventListener('db:unauthorized', handleUnauthorized)
  window.removeEventListener('db:password-change-required', handlePasswordChangeRequired)
})
</script>

<template>
  <router-view />
</template>
