import api from '@/utils/api'
import { v4 as uuidv4 } from 'uuid'

// Guest session — identified by guestId stored in localStorage
const guestService = {
  // Get or create a guestId for this browser
  getGuestId() {
    let id = localStorage.getItem('guestId')
    if (!id) {
      id = uuidv4()
      localStorage.setItem('guestId', id)
    }
    return id
  },

  clearGuestId() {
    localStorage.removeItem('guestId')
  },

  // Rotate guestId so backend returns empty conversation list on next load
  resetSession() {
    const id = uuidv4()
    localStorage.setItem('guestId', id)
    return id
  },

  guestHeaders() {
    return { 'X-Guest-Id': this.getGuestId() }
  },

  async getConversations() {
    const res = await api.get('/guest/conversations', { headers: this.guestHeaders() })
    return res.data.data
  },

  async getById(id) {
    const res = await api.get(`/guest/conversations/${id}`, { headers: this.guestHeaders() })
    return res.data.data
  },

  async send(content, conversationId, files) {
    const formData = new FormData()
    formData.append('content', content)
    if (conversationId) formData.append('conversationId', conversationId)
    if (files && files.length) {
      files.forEach(f => formData.append('files', f))
    }

    const res = await api.post('/guest/conversations/send', formData, {
      headers: {
        ...this.guestHeaders(),
        'Content-Type': 'multipart/form-data',
      }
    })
    return res.data.data
  },

  async sendStream(content, conversationId, files, onChunk) {
    const formData = new FormData()
    formData.append('content', content)
    if (conversationId) formData.append('conversationId', conversationId)
    if (files && files.length) {
      files.forEach(f => formData.append('files', f))
    }

    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8020/api'

    const response = await fetch(`${baseURL}/guest/conversations/send/stream`, {
      method: 'POST',
      headers: this.guestHeaders(),
      body: formData,
    })

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop()

      for (const event of events) {
        const dataLines = event.split('\n').filter(l => l.startsWith('data:'))
        if (!dataLines.length) continue
        const chunk = dataLines.map(l => l.slice(5)).join('\n')
        fullText += chunk
        onChunk?.(chunk, fullText)
      }
    }

    return fullText
  },

  async remove(id) {
    await api.delete(`/guest/conversations/${id}`, { headers: this.guestHeaders() })
  },
}

export default guestService