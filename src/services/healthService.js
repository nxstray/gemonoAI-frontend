import api from '@/utils/api'

// Health check calls — useful for status page or admin panel
const healthService = {
  async getHealth() {
    const res = await api.get('/health')
    return res.data.data
  },

  async getRedisHealth() {
    const res = await api.get('/health/redis')
    return res.data.data
  },
}

export default healthService