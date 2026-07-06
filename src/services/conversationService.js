import api from '@/utils/api'

// All conversation API calls — used by the conversation store
const conversationService = {
  async getAll() {
    const res = await api.get('/conversations')
    return res.data.data
  },

  async getById(id) {
    const res = await api.get(`/conversations/${id}`)
    return res.data.data
  },

  async rename(id, title) {
    const res = await api.patch(`/conversations/${id}`, { title })
    return res.data.data
  },  

  async send(content, conversationId, files) {
    const formData = new FormData()
    formData.append('content', content)
    if (conversationId) formData.append('conversationId', conversationId)
    if (files && files.length) {
      files.forEach(f => formData.append('files', f))
    }

    const res = await api.post('/conversations/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
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

    const token = localStorage.getItem('token')
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8020/api'

    const response = await fetch(`${baseURL}/conversations/send/stream`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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
        // A single event may contain multiple "data:" lines if the chunk itself has
        // newlines — join them back with \n instead of only reading the first line
        const dataLines = event.split('\n').filter(l => l.startsWith('data:'))
        if (!dataLines.length) continue
        // No .trimStart() here: Spring's SseEmitter writes "data:<content>" with no
        // space after the colon, so any leading space in <content> is a real part of
        // the token (e.g. " Object") — trimming it was eating spaces between words
        const chunk = dataLines.map(l => l.slice(5)).join('\n')
        fullText += chunk
        onChunk?.(chunk, fullText)
      }
    }

    return fullText
  },

  async remove(id) {
    await api.delete(`/conversations/${id}`)
  },
}

export default conversationService