import api from '@/utils/api'

// All auth-related API calls
const authService = {
  // Step 1: send magic link to email
  async sendMagicLink(email, guestId) {
    const res = await api.post('/auth/magic-link',
      { email },
      { headers: { 'X-Guest-Id': guestId || '' } }
    )
    return res.data
  },

  // Step 2: verify token from magic link URL → get JWT
  async verifyMagicLink(token) {
    const res = await api.post('/auth/verify', { token })
    return res.data.data
  },
  async getProfile() {
    const res = await api.get('/auth/me')
    return res.data.data
  },
    async getProfile() {
    const res = await api.get('/auth/me')
    return res.data.data
  },
  async updateProfile({ fullName, displayName, language }) {
    const res = await api.put('/auth/profile', { fullName, displayName, language })
    return res.data.data
  },
}

export default authService