<template>
  <div class="callback-root">
    <div class="loading-dots">
      <span class="loading-dot" />
      <span class="loading-dot" />
      <span class="loading-dot" />
    </div>
    <p>Signing you in...</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { gooeyToast } from 'vue-goey-toast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    gooeyToast.error('Authentication failed')
    router.push('/login')
    return
  }

  authStore.setAuth(token, null)

  try {
    await authStore.fetchProfile()
    router.push('/chat')
  } catch {
    gooeyToast.error('Could not load profile')
    router.push('/login')
  }
})
</script>

<style scoped>
.callback-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--color-subtle);
  font-size: 14px;
}
</style>