import axios from 'axios'
import { gooeyToast } from 'vue-goey-toast'

// Base axios instance — attaches JWT and handles 401 globally
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8020/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // 401 — redirect to login
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // 429 — rate limit, Either from redis (IP) or Groq (RateLimitException)
    if (status === 429) {
      gooeyToast.error('Too many requests', {
        description: 'Please wait a moment before trying again.',
      })
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api