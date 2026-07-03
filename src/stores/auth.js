import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)

  function setAuth(tokenValue, userData) {
    token.value = tokenValue
    user.value  = userData
    if (tokenValue) {
      localStorage.setItem('token', tokenValue)
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  // update user fields in state + localStorage without touching token
  function setUser(userData) {
    user.value = { ...user.value, ...userData }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function fetchProfile() {
    const data = await authService.getProfile()
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
  }

  async function updateProfile(payload) {
    const data = await authService.updateProfile(payload)
    setUser(data)
    return data
  }

  function logout() {
    setAuth(null, null)
  }

  return { token, user, isLoggedIn, setAuth, setUser, fetchProfile, updateProfile, logout }
})