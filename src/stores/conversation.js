import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

import conversationService from '@/services/conversationService'
import guestService from '@/services/guestService'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref([])
  const activeConversation = ref(null)
  const messages = ref([])
  const loading = ref(false)

  // Resolve whether to use auth or guest service
  function useGuest() {
    const auth = useAuthStore()
    return !auth.isLoggedIn
  }

  async function fetchConversations() {
    const data = useGuest()
      ? await guestService.getConversations()
      : await conversationService.getAll()
    conversations.value = data
  }

  async function loadConversation(id) {
    const data = useGuest()
      ? await guestService.getById(id)
      : await conversationService.getById(id)
    activeConversation.value = data
    messages.value = data.messages
  }

  async function renameConversation(id, title) {
    useGuest()
      ? await guestService.rename(id, title)
      : await conversationService.rename(id, title)
    const conv = conversations.value.find(c => c.id === id)
    if (conv) conv.title = title
  }

  async function sendMessage(content, conversationId, files) {
    loading.value = true
    try {
      const reply = useGuest()
        ? await guestService.send(content, conversationId, files)
        : await conversationService.send(content, conversationId, files)

      await fetchConversations()
      return reply
    } finally {
      loading.value = false
    }
  }

  async function sendMessageStream(content, conversationId, files, onChunk) {
    loading.value = true
    try {
      const fullText = useGuest()
        ? await guestService.sendStream(content, conversationId, files, onChunk)
        : await conversationService.sendStream(content, conversationId, files, onChunk)

      await fetchConversations()
      return fullText
    } finally {
      loading.value = false
    }
  }

  async function deleteConversation(id) {
    useGuest()
      ? await guestService.remove(id)
      : await conversationService.remove(id)

    conversations.value = conversations.value.filter(c => c.id !== id)
    if (activeConversation.value?.id === id) {
      activeConversation.value = null
      messages.value = []
    }
  }

  function newChat() {
    activeConversation.value = null
    messages.value = []
  }

  return {
    conversations, activeConversation, messages, loading,
    fetchConversations, loadConversation, renameConversation, sendMessage, sendMessageStream, deleteConversation, newChat
  }
})