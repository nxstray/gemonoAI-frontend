<template>
  <div class="login-root">
    <div class="login-card gm-surface">
      <div class="login-brand">
        <span class="brand-name">GEMONO</span>
      </div>

      <!-- Google OAuth -->
      <button class="google-btn" @click="loginWithGoogle" data-testid="google-login-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#6b6b6b"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#888"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#a0a0a0"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#bbb"/>
        </svg>
        Continue with Google
      </button>

      <div class="divider"><span>or</span></div>

      <!-- Magic Link form -->
      <Transition name="fade" mode="out-in">
        <!-- State A: input email -->
        <form v-if="!linkSent" key="form" @submit.prevent="handleSendLink" class="magic-form">
          <div class="field-group">
            <input
              v-model="email"
              type="email"
              class="gm-input"
              placeholder="Input your email"
              data-testid="email-input"
              autocomplete="email"
              required
            />
          </div>

          <button
            type="submit"
            class="gm-btn gm-btn-primary w-full"
            :disabled="loading || !email.trim()"
            data-testid="send-link-btn"
          >
            <span v-if="!loading">Continue with email </span>
            <span v-else class="loading-dots">
              <span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" />
            </span>
          </button>

          <p class="magic-hint">We'll send a one-time link to your inbox.</p>
        </form>

        <!-- State B: link sent confirmation -->
        <div v-else key="sent" class="sent-state">
          <p class="sent-sub">
            Please check your inbox. We sent a login link to<br />
            <strong>{{ email }}</strong>
          </p>
          <p class="sent-expiry">The link expires in 15 minutes.</p>
          <button class="gm-btn gm-btn-ghost w-full" @click="resetForm" style="margin-top:20px;">
            Use a different email
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import authService from '@/services/authService'
import guestService from '@/services/guestService'
import { gooeyToast } from 'vue-goey-toast'

const authStore = useAuthStore()

const email = ref('')
const loading = ref(false)
const linkSent = ref(false)

// Google OAuth — full browser redirect, not axios
function loginWithGoogle() {
  window.location.href = 'http://localhost:8020/oauth2/authorization/google'
}

async function handleSendLink() {
  if (!email.value.trim()) return
  loading.value = true

  try {
    const guestId = guestService.getGuestId()
    await authService.sendMagicLink(email.value, guestId)
    linkSent.value = true
  } catch (err) {
    gooeyToast.error(err.response?.data?.error || 'Failed to send login link. Try again.')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  linkSent.value = false
  email.value = ''
}
</script>

<style scoped>
.login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 36px;
}

.login-brand { text-align: center; margin-bottom: 32px; }

.brand-name {
  font-family: var(--font-brand);
  font-size: 28px;
  letter-spacing: 0.08em;
  color: var(--color-white);
}

.google-btn {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; width: 100%; padding: 11px 20px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-family: var(--font-body); font-size: 14px;
  cursor: pointer; transition: all 0.15s;
}
.google-btn:hover { border-color: var(--color-subtle); color: var(--color-white); }

.divider {
  display: flex; align-items: center; gap: 12px; margin: 20px 0;
}
.divider::before, .divider::after { content:''; flex:1; height:1px; background: var(--color-border); }
.divider span { color: var(--color-subtle); font-size: 12px; }

.magic-form { display: flex; flex-direction: column; gap: 16px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }

.magic-hint {
  font-size: 12px;
  color: var(--color-muted);
  text-align: center;
  margin-top: -4px;
}

.w-full { width: 100%; }
.loading-dots { display: flex; gap: 4px; align-items: center; }

/* Sent state */
.sent-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px 0;
}

.sent-sub {
  font-size: 14px;
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 8px;
}

.sent-sub strong { color: var(--color-white); }

.sent-expiry {
  font-size: 12px;
  color: var(--color-muted);
}
</style>