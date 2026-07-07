<template>
  <div class="verify-root">
    <div class="verify-card gm-surface">
      <div v-if="state === 'loading'" class="verify-state">
        <div class="loading-dots">
          <span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" />
        </div>
        <p class="verify-label">Verifying your login link...</p>
      </div>

      <div v-else-if="state === 'success'" class="verify-state">
        <span class="verify-icon">
          <IconCheck style="width: 24px; height: 24px;" />
        </span>
        <p class="verify-title">Signed in</p>
        <p class="verify-sub">Redirecting you to Gemono...</p>
      </div>

      <div v-else-if="state === 'error'" class="verify-state">
        <span class="verify-icon error">
          <IconClose style="width: 24px; height: 24px;" />
        </span>
        <p class="verify-title">Link invalid or expired</p>
        <p class="verify-sub">{{ errorMsg }}</p>
        <button class="gm-btn gm-btn-ghost" style="margin-top:20px;" @click="goToLogin">
          Request a new link
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import authService from '@/services/authService'
import guestService from '@/services/guestService'
import IconCheck from '@/components/icons/IconCheck.vue'
import IconClose from '@/components/icons/IconClose.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const state = ref('loading')
const errorMsg = ref('')

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    state.value = 'error'
    errorMsg.value = 'No token found in the link.'
    return
  }

  try {
    const data = await authService.verifyMagicLink(token)
    authStore.setAuth(data.token, {
      email: data.email,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
      role: data.role,
    })
    // Clear guest ID after successful merge
    guestService.clearGuestId()

    state.value = 'success'
    setTimeout(() => router.push('/chat'), 1200)
  } catch (err) {
    state.value = 'error'
    errorMsg.value = err.response?.data?.error || 'This link has expired or already been used.'
  }
})

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.verify-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 24px;
}

.verify-card {
  width: 100%;
  max-width: 380px;
  padding: 48px 36px;
  text-align: center;
}

.verify-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.verify-icon {
  font-size: 32px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  font-style: normal;
}

.verify-icon.error { color: var(--color-text-dim); }

.verify-title {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--color-white);
  margin: 0;
}

.verify-sub {
  font-size: 13px;
  color: var(--color-subtle);
  margin: 0;
  max-width: 280px;
}

.verify-label {
  font-size: 14px;
  color: var(--color-text-dim);
  margin: 0;
}
</style>