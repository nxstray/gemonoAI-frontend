<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
        <div class="modal" :class="{ 'theme-light': isLight }">

          <!-- nav sidebar -->
          <nav class="modal-nav">
            <p class="modal-nav-label">Pengaturan</p>
            <button
              v-for="tab in tabs" :key="tab.id"
              class="modal-nav-item"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <IconSettings v-if="tab.icon === 'general'" class="nav-icon" />
              <IconProfile  v-else-if="tab.icon === 'account'" class="nav-icon" />
              {{ tab.label }}
            </button>
          </nav>

          <!-- content -->
          <div class="modal-content">
            <button class="modal-close" @click="$emit('update:modelValue', false)"><IconClose /></button>

            <!-- ── Umum ── -->
              <section v-if="activeTab === 'general'">
                <h2 class="modal-section-title">Umum</h2>

                <div class="field-row">
                  <label class="field-row-label">Nama lengkap</label>
                  <input
                    v-model="form.fullName"
                    class="field-row-input"
                    placeholder="Nama lengkap kamu"
                    @keydown.enter="saveGeneral"
                  />
                </div>

                <div class="field-row">
                  <label class="field-row-label">
                    Nama panggilan
                    <span class="field-row-desc">Ditampilkan di profil dan sapaan</span>
                  </label>
                  <input
                    v-model="form.displayName"
                    class="field-row-input"
                    placeholder="Nama panggilan"
                    @keydown.enter="saveGeneral"
                  />
                </div>

                <div class="field-row">
                  <label class="field-row-label">Bahasa</label>
                  <div class="custom-dropdown" @click.stop>
                    <div
                      class="custom-dropdown-trigger"
                      :class="{ active: languageDropdownOpen }"
                      @click="languageDropdownOpen = !languageDropdownOpen"
                    >
                      <span class="custom-dropdown-label">{{ selectedLanguageLabel }}</span>
                      <span class="custom-dropdown-arrow" :class="{ rotated: languageDropdownOpen }">
                        <IconArrow />
                      </span>
                    </div>

                    <div class="custom-dropdown-menu" :class="{ show: languageDropdownOpen }">
                      <div
                        v-for="opt in languageOptions"
                        :key="opt.value"
                        class="custom-dropdown-item"
                        :class="{ selected: opt.value === form.language }"
                        @click="selectLanguage(opt.value)"
                      >
                        {{ opt.label }}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            <!-- ── Akun ── -->
            <section v-if="activeTab === 'account'">
              <h2 class="modal-section-title">Akun</h2>

              <div class="account-row">
                <span class="account-row-label danger">Keluar dari semua perangkat</span>
                <button class="btn-ghost" @click="logoutAll">Keluar</button>
              </div>

              <div class="account-row">
                <span class="account-row-label danger">Hapus akun Anda</span>
                <button class="btn-danger" @click="confirmDelete = true">Hapus akun</button>
              </div>

              <div class="account-row">
                <span class="account-row-label">ID Pengguna</span>
                <code class="org-id" :title="orgId">{{ orgId }}</code>
              </div>

              <!-- active sessions -->
              <div class="sessions-section">
                <h3 class="sessions-title">Sesi aktif</h3>
                <div class="session-card">
                  <div class="session-card-left">
                    <span class="device-name">{{ currentDevice }}</span>
                    <span class="badge-now">Saat ini</span>
                  </div>
                  <div class="session-card-meta">
                    <div class="session-meta-row">
                      <span class="meta-label">Dibuat</span>
                      <span class="meta-value">{{ sessionTime }}</span>
                    </div>
                    <div class="session-meta-row">
                      <span class="meta-label">Diperbarui</span>
                      <span class="meta-value">{{ sessionTime }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        <!-- delete confirm -->
        <Transition name="modal-fade">
          <div v-if="confirmDelete" class="confirm-backdrop" @click.self="confirmDelete = false">
            <div class="confirm-dialog" :class="{ 'theme-light': isLight }">
              <h3>Hapus akun?</h3>
              <p>Semua data dan percakapan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</p>
              <div class="confirm-actions">
                <button class="btn-ghost" @click="confirmDelete = false">Batal</button>
                <button class="btn-danger" @click="deleteAccount">Hapus permanen</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { gooeyToast } from 'vue-goey-toast'
import api from '@/utils/api'

import IconSettings from '@/components/icons/IconSettings.vue'
import IconProfile from '@/components/icons/IconProfile.vue'
import IconClose from '@/components/icons/IconClose.vue'
import IconArrow from '@/components/icons/IconArrow.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  isLight:    { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const router    = useRouter()

const tabs = [
  { id: 'general', label: 'Umum',  icon: 'general' },
  { id: 'account', label: 'Akun',  icon: 'account' },
]

const activeTab     = ref('general')
const saving        = ref(false)
const confirmDelete = ref(false)
const languageDropdownOpen = ref(false)

const languageOptions = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
]

const selectedLanguageLabel = computed(() => {
  const found = languageOptions.find(o => o.value === form.value.language)
  return found ? found.label : 'Pilih bahasa'
})

function selectLanguage(value) {
  form.value.language = value
  languageDropdownOpen.value = false
  saveGeneral()
}

function closeLanguageDropdown() {
  languageDropdownOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closeLanguageDropdown)
})
onUnmounted(() => {
  document.removeEventListener('click', closeLanguageDropdown)
})

const form = ref({
  fullName:    '',
  displayName: '',
  language:    'id',
})

// sync form when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    form.value.fullName    = authStore.user?.fullName    || ''
    form.value.displayName = authStore.user?.displayName || ''
    form.value.language    = authStore.user?.language    || 'id'
    activeTab.value = 'general'
  }
})

// account info
const orgId = computed(() => authStore.user?.id || '—')

const currentDevice = computed(() => {
  const ua = navigator.userAgent
  if (ua.includes('Edg'))     return 'Microsoft Edge'
  if (ua.includes('Chrome'))  return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari'))  return 'Safari'
  return 'Browser'
})

const sessionTime = new Date().toLocaleString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
})

// save profile — langsung hit API, tidak bergantung pada authStore.updateProfile
async function saveGeneral() {
  saving.value = true
  try {
    const res = await api.put('/auth/profile', {
      fullName:    form.value.fullName    || null,
      displayName: form.value.displayName || null,
      language:    form.value.language    || null,
    })

    // update store + localStorage langsung di sini
    const updated = res.data?.data || res.data
    if (updated) {
      const merged = {
        ...authStore.user,
        fullName:    updated.fullName    ?? authStore.user?.fullName,
        displayName: updated.displayName ?? authStore.user?.displayName,
        language:    updated.language    ?? authStore.user?.language,
      }
      // pakai setAuth tanpa ganti token, atau langsung set user
      if (authStore.setUser) {
        authStore.setUser(merged)
      } else {
        // fallback: update localStorage manual
        localStorage.setItem('user', JSON.stringify(merged))
        authStore.user = merged
      }
    }

    gooeyToast.success('Profil berhasil disimpan')
  } catch (err) {
    console.error('updateProfile error:', err)
    gooeyToast.error('Gagal menyimpan profil')
  } finally {
    saving.value = false
  }
}

function logoutAll() {
  authStore.logout()
  emit('update:modelValue', false)
  router.push('/login')
}

async function deleteAccount() {
  try {
    await api.delete('/auth/account')
    authStore.logout()
    router.push('/login')
  } catch {
    gooeyToast.error('Gagal menghapus akun')
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  background: var(--color-surface, #141414);
  border: 1px solid var(--color-border, #242424);
  border-radius: 14px;
  width: 100%;
  max-width: 640px;
  height: 560px;
  max-height: 80vh;
  display: flex;
  overflow: hidden;
  color: var(--color-text, #e8e8e8);
}

.modal.theme-light {
  --color-bg:       #f5f5f0;
  --color-surface:  #ffffff;
  --color-border:   #e0e0d8;
  --color-muted:    #b0b0a8;
  --color-subtle:   #7a7a72;
  --color-text:     #1a1a18;
  --color-text-dim: #4a4a44;
  --color-white:    #1a1a18;
}

/* nav */
.modal-nav {
  width: 180px;
  min-width: 180px;
  background: var(--color-bg, #0c0c0c);
  border-right: 1px solid var(--color-border, #242424);
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-nav-label {
  font-size: 11px;
  color: var(--color-subtle, #6b6b6b);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 10px 8px;
}

.modal-nav-item {
  background: none;
  border: none;
  color: var(--color-text-dim, #a0a0a0);
  font-size: 13px;
  font-family: var(--font-body, sans-serif);
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-icon {
  width: 14px; height: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}
.modal-nav-item:hover  { background: rgba(255,255,255,0.05); color: var(--color-text, #e8e8e8); }
.modal-nav-item.active { background: rgba(255,255,255,0.08); color: var(--color-text, #e8e8e8); }
.modal.theme-light .modal-nav-item:hover  { background: rgba(0,0,0,0.05); }
.modal.theme-light .modal-nav-item.active { background: rgba(0,0,0,0.08); }
.modal-nav-item.active .nav-icon { opacity: 1; }

/* content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 28px 32px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px; right: 16px;
  background: none;
  border: none;
  color: var(--color-subtle, #6b6b6b);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s;
}
.modal-close:hover { color: var(--color-text, #e8e8e8); }

.modal-section-title {
  font-family: var(--font-body, sans-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-white, #f5f5f5);
  margin-bottom: 24px;
}

/* form */
.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border, #242424);
}
.field-row:last-child { border-bottom: none; }

.field-row-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #e8e8e8);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-row-desc {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-subtle, #6b6b6b);
}

.field-row-input {
  width: 220px;
  flex-shrink: 0;
  background: var(--color-bg, #0c0c0c);
  border: 1px solid var(--color-border, #242424);
  border-radius: 6px;
  color: var(--color-text, #e8e8e8);
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  padding: 7px 10px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  text-align: left;
}
.field-row-input:focus { border-color: var(--color-subtle, #6b6b6b); }
.field-select { cursor: pointer; }

/* Custom dropdown — Bahasa */
.custom-dropdown {
  position: relative;
  width: 220px;
  flex-shrink: 0;
}

.custom-dropdown-trigger {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid var(--color-border, #242424);
  border-radius: 6px;
  background: var(--color-bg, #0c0c0c);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.15s;
}

.custom-dropdown-trigger:hover,
.custom-dropdown-trigger.active {
  border-color: var(--color-subtle, #6b6b6b);
}

.custom-dropdown-label {
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  color: var(--color-text, #e8e8e8);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.custom-dropdown-arrow {
  color: var(--color-subtle, #6b6b6b);
  display: flex;
  align-items: center;
  margin-left: 8px;
  flex-shrink: 0;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.custom-dropdown-arrow.rotated { transform: rotate(-180deg); }

.custom-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: var(--color-surface, #141414);
  border: 1px solid var(--color-border, #242424);
  border-radius: 6px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
  transition: all 0.2s ease;
}

.custom-dropdown-menu.show {
  max-height: 200px;
  opacity: 1;
  overflow-y: auto;
  pointer-events: auto;
  z-index: 20;
}

.custom-dropdown-item {
  padding: 8px 10px;
  cursor: pointer;
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  color: var(--color-text, #e8e8e8);
  transition: background 0.15s;
}
.custom-dropdown-item:hover { background: rgba(255,255,255,0.05); }
.modal.theme-light .custom-dropdown-item:hover { background: rgba(0,0,0,0.05); }

.modal.theme-light .custom-dropdown-item.selected { background: rgba(0,0,0,0.06); }

/* account rows */
.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border, #242424);
}

.account-row-label       { font-size: 13px; color: var(--color-text, #e8e8e8); }
.account-row-label.danger { color: #e05c5c; }

.btn-ghost {
  background: none;
  border: 1px solid var(--color-border, #242424);
  border-radius: 6px;
  color: var(--color-text-dim, #a0a0a0);
  font-family: var(--font-body, sans-serif);
  font-size: 12px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover { border-color: var(--color-subtle, #6b6b6b); color: var(--color-text, #e8e8e8); }

.btn-danger {
  background: #e05c5c;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: var(--font-body, sans-serif);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover { background: #c94a4a; }

.org-id {
  font-family: var(--font-body, sans-serif);
  font-size: 11px;
  color: var(--color-subtle, #6b6b6b);
  background: var(--color-bg, #0c0c0c);
  border: 1px solid var(--color-border, #242424);
  border-radius: 4px;
  padding: 4px 8px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* session card */
.sessions-section { margin-top: 24px; }

.sessions-title {
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #e8e8e8);
  margin-bottom: 12px;
}

.session-card {
  background: var(--color-bg, #0c0c0c);
  border: 1px solid var(--color-border, #242424);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.session-card-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.device-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #e8e8e8);
}

.badge-now {
  background: rgba(80, 180, 120, 0.15);
  color: #50b478;
  border: 1px solid rgba(80,180,120,0.25);
  border-radius: 10px;
  font-size: 11px;
  padding: 2px 8px;
  white-space: nowrap;
}

.session-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.session-meta-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.meta-label {
  font-size: 11px;
  color: var(--color-subtle, #6b6b6b);
}

.meta-value {
  font-size: 11px;
  color: var(--color-text-dim, #a0a0a0);
}

/* confirm */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 210;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirm-dialog {
  background: var(--color-surface, #141414);
  border: 1px solid var(--color-border, #242424);
  border-radius: 12px;
  padding: 28px;
  max-width: 380px;
  width: 100%;
  color: var(--color-text, #e8e8e8);
}
.confirm-dialog.theme-light { --color-surface: #ffffff; --color-border: #e0e0d8; --color-text: #1a1a18; }

.confirm-dialog h3 { font-size: 15px; font-weight: 600; margin-bottom: 10px; color: var(--color-white, #f5f5f5); }
.confirm-dialog p  { font-size: 13px; color: var(--color-text-dim, #a0a0a0); line-height: 1.6; margin-bottom: 20px; }
.confirm-actions   { display: flex; gap: 10px; justify-content: flex-end; }

/* transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,  .modal-fade-leave-to      { opacity: 0; }
</style>