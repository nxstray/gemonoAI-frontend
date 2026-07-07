  <template>
    <div class="chat-root" :class="{ 'theme-light': isLight }">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <span class="brand-name">GEMONO</span>
          <button class="icon-btn" @click="newChat" title="New chat">
            <IconEdit />
          </button>
        </div>

        <div class="sidebar-search">
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search conversations"
          />
        </div>

        <div class="sidebar-list">
          <div
            v-for="conv in filteredConversations"
            :key="conv.id"
            class="conv-item"
            :class="{ active: activeId === conv.id }"
            @click="openConversation(conv.id)"
          >
            <IconChat class="conv-icon" />

            <input
              v-if="renamingId === conv.id"
              v-model="renameValue"
              class="conv-rename-input"
              @click.stop
              @keydown.enter="confirmRename(conv.id)"
              @keydown.esc="renamingId = null"
              @blur="confirmRename(conv.id)"
            />
            <span v-else class="conv-title">{{ conv.title }}</span>

            <button class="conv-menu-btn" @click.stop="toggleMenu(conv.id)" title="Opsi">
              <IconDots />
            </button>

            <div v-if="menuOpenId === conv.id" class="conv-menu" @click.stop>
              <button class="conv-menu-item" @click="startRename(conv)">
                <IconPen /> Rename
              </button>
              <button class="conv-menu-item danger" @click="deleteConv(conv.id)">
                <IconTrash /> Hapus
              </button>
            </div>
          </div>

          <div v-if="menuOpenId" class="conv-menu-overlay" @click="menuOpenId = null" />

          <div v-if="!filteredConversations.length" class="sidebar-empty">
            <p v-if="searchQuery">No results for "{{ searchQuery }}"</p>
            <p v-else>No conversations yet</p>
          </div>
        </div>

        <!-- User profile -->
        <div class="sidebar-footer">
          <div class="avatar-fallback">
            {{ authStore.user?.displayName?.[0]?.toUpperCase() || authStore.user?.fullName?.[0]?.toUpperCase() || authStore.user?.email?.[0]?.toUpperCase() || '?' }}
          </div>
          <div class="user-info">
            <p class="user-name">{{ authStore.user?.displayName || authStore.user?.fullName }}</p>
            <p class="user-email">{{ authStore.user?.email }}</p>
          </div>
          <button v-if="authStore.isLoggedIn" class="icon-btn dim" @click="logout" title="Sign out">
            <IconLogout />
          </button>
          <button v-else class="icon-btn dim" @click="router.push('/login')" title="Sign in">
            <IconLogin />
          </button>
        </div>
      </aside>

      <!-- Mobile overlay -->
      <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

      <!-- Main content area: chat + artifact panel side by side -->
      <div class="main-area">

        <!-- Chat main -->
        <main class="chat-main" :class="{ 'panel-open': artifact.open }">
          <!-- Topbar -->
          <div class="chat-topbar">
            <button class="icon-btn menu-toggle-btn" @click="sidebarOpen = !sidebarOpen">
              <IconMenu />
            </button>
            <span class="chat-title">{{ convStore.activeConversation?.title || '' }}</span>
            <div style="flex:1" />

            <!-- Settings button -->
            <button class="icon-btn" @click="settingsOpen = true" title="Settings">
              <IconSettings />
            </button>

            <!-- Theme toggle pill button -->
            <button class="theme-toggle" @click="isLight = !isLight" :title="isLight ? 'Switch to dark' : 'Switch to light'">
              <span class="toggle-track" :class="{ on: isLight }">
                <span class="toggle-thumb" />
              </span>
              <span class="toggle-label">{{ isLight ? 'Light' : 'Dark' }}</span>
            </button>
          </div>

          <!-- Messages -->
          <div class="messages-area" ref="messagesEl" @scroll="onMessagesScroll">
            <!-- Empty / welcome state -->
            <WelcomeAnimation v-if="!allMessages.length" :is-light="isLight" />

            <TransitionGroup name="slide-up" tag="div" class="messages-list">
              <MessageBubble
                v-for="msg in allMessages"
                :key="msg.id || msg.clientId || msg.tempId"
                :message="msg"
              />
            </TransitionGroup>

            <!-- Thinking indicator -->
            <ThinkingIndicator v-if="convStore.loading && !hasActiveStream" :attachment-type="pendingAttachmentType" />
          </div>

          <Transition name="fade">
            <button v-if="showScrollButton" class="scroll-to-bottom-btn" @click="scrollToBottomManual" title="Ke pesan terbaru">
              <IconArrowDown />
            </button>
          </Transition>

          <!-- Floating input -->
          <div class="input-wrapper">
            <ChatInput @send="handleSend" :disabled="convStore.loading" />
          </div>
        </main>

        <!-- Artifact panel — slides in from right, replaces chat area -->
        <Transition name="artifact-slide">
          <aside v-if="artifact.open" class="artifact-panel">
            <!-- Artifact topbar -->
            <div class="artifact-topbar">
              <div class="artifact-meta">
                <span class="artifact-lang">{{ artifact.language }}</span>
                <span class="artifact-title">{{ artifact.title }}</span>
              </div>
              <div class="artifact-actions">
                <button class="artifact-btn" @click="copyArtifact" :title="copied ? 'Copied!' : 'Copy code'">
                  <span v-if="copied">Copied!</span>
                  <span v-else>Copy</span>
                </button>
                <button class="artifact-btn artifact-close" @click="artifact.open = false" title="Close">
                  <IconClose />
                </button>
              </div>
            </div>

            <!-- Code with line numbers -->
            <div class="artifact-body">
              <div class="line-numbers" aria-hidden="true">
                <span v-for="n in lineCount" :key="n" class="line-num">{{ n }}</span>
              </div>
              <pre class="artifact-pre"><code class="artifact-code" v-html="highlighted" /></pre>
            </div>
          </aside>
        </Transition>

      </div>

      <!-- Settings modal -->
      <SettingsModal v-model="settingsOpen" :is-light="isLight" />
    </div>
  </template>

  <script setup>
  import { ref, computed, watch, nextTick, onMounted, provide } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { useConversationStore } from '@/stores/conversation'
  import guestService from '@/services/guestService'
  import { gooeyToast } from 'vue-goey-toast'
  import hljs from 'highlight.js'
  import MessageBubble from '@/components/MessageBubble.vue'
  import ChatInput from '@/components/ChatInput.vue'
  import WelcomeAnimation from '@/components/WelcomeAnimation.vue'
  import SettingsModal from '@/components/SettingsModal.vue'
  import IconEdit from '@/components/icons/IconEdit.vue'
  import IconMenu from '@/components/icons/IconMenu.vue'
  import IconLogin from '@/components/icons/IconLogin.vue'
  import IconLogout from '@/components/icons/IconLogout.vue'
  import IconChat from '@/components/icons/IconChat.vue'
  import IconTrash from '@/components/icons/IconTrash.vue'
  import IconSettings from '@/components/icons/IconSettings.vue'
  import IconClose from '@/components/icons/IconClose.vue'
  import ThinkingIndicator from '@/components/ThinkingIndicator.vue'
  import IconDots from '@/components/icons/IconDots.vue'
  import IconPen from '@/components/icons/IconPen.vue'
  import IconArrowDown from '@/components/icons/IconArrowDown.vue'

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const convStore = useConversationStore()

  const sidebarOpen  = ref(false)
  const settingsOpen = ref(false)
  const messagesEl   = ref(null)
  const searchQuery  = ref('')
  const localMessages = ref([])
  const activeId     = ref(null)
  const pendingAttachmentType = ref('text')
  const isLight      = ref(false)
  const copied       = ref(false)
  const menuOpenId  = ref(null)
  const renamingId  = ref(null)
  const renameValue = ref('')
  const showScrollButton = ref(false)
  let tempIdCounter  = 0

  // artifact panel state
  const artifact = ref({
    open: false,
    title: '',
    language: '',
    code: '',
  })

  const highlighted = computed(() => {
    const lang = artifact.value.language || 'plaintext'
    try {
      return hljs.highlight(artifact.value.code, { language: lang, ignoreIllegals: true }).value
    } catch {
      return hljs.highlightAuto(artifact.value.code).value
    }
  })

  const lineCount = computed(() => {
    if (!artifact.value.code) return 0
    return artifact.value.code.split('\n').length
  })

  function openArtifact(code, language, title) {
    artifact.value = {
      open: true,
      title: title || `${language || 'plaintext'} snippet`,
      language: language || 'plaintext',
      code,
    }
  }

  function toggleMenu(id) {
    menuOpenId.value = menuOpenId.value === id ? null : id
  }

  function startRename(conv) {
    renamingId.value = conv.id
    renameValue.value = conv.title
    menuOpenId.value = null
  }

  function isNearBottom() {
    const el = messagesEl.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }

  function onMessagesScroll() {
    showScrollButton.value = !isNearBottom()
  }

  function scrollToBottomManual() {
    if (messagesEl.value) {
      messagesEl.value.scrollTo({ top: messagesEl.value.scrollHeight, behavior: 'smooth' })
    }
  }

  async function confirmRename(id) {
    if (renamingId.value !== id) return
    const newTitle = renameValue.value.trim()
    renamingId.value = null
    if (!newTitle) return
    try {
      await convStore.renameConversation(id, newTitle)
    } catch {
      gooeyToast.error('Gagal mengganti nama')
    }
  }

  provide('openArtifact', openArtifact)

  async function copyArtifact() {
    try {
      await navigator.clipboard.writeText(artifact.value.code)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } catch {
      gooeyToast.error('Failed to copy')
    }
  }

  const filteredConversations = computed(() => {
    if (!searchQuery.value) return convStore.conversations
    const q = searchQuery.value.toLowerCase()
    return convStore.conversations.filter(c => c.title.toLowerCase().includes(q))
  })

  const allMessages = computed(() => [...convStore.messages, ...localMessages.value])

  const hasActiveStream = computed(() =>
    convStore.messages.some(m => m.streaming)
  )

  onMounted(async () => {
    if (!authStore.isLoggedIn) {
      guestService.resetSession()
      return
    }
    try {
      await convStore.fetchConversations()
    } catch {
      // silent
    }

    if (route.params.id) {  
      await openConversation(route.params.id)
    } else if (convStore.conversations.length) {
      const latest = convStore.conversations[0]
      await openConversation(latest.id)
    }
  })

  watch(() => route.params.id, async (id) => {
    if (id) await openConversation(id)
  })

  async function openConversation(id) {
    try {
      await convStore.loadConversation(id)
      activeId.value = id
      localMessages.value = []
      router.replace(`/chat/${id}`)
      sidebarOpen.value = false
      scrollToBottom()
    } catch {
      gooeyToast.error('Failed to load conversation')
    }
  }

  function newChat() {
    convStore.newChat()
    localMessages.value = []
    activeId.value = null
    router.replace('/chat')
    sidebarOpen.value = false
  }

  async function handleSend({ content, files }) {
    const fileList = files || []
    if (!content.trim() && !fileList.length) return

    const attachmentPreviews = fileList.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('audio/') ? 'audio'
        : file.type === 'application/pdf' ? 'pdf'
        : 'file',
      name: file.name,
    }))

    pendingAttachmentType.value = attachmentPreviews[0]?.type || 'text'

    const tempId = ++tempIdCounter
    const userClientId = `u-${tempId}`
    const assistantClientId = `a-${tempId}`

    localMessages.value = []
    convStore.messages.push({
      clientId: userClientId,
      role: 'user',
      content,
      attachments: attachmentPreviews,
      createdAt: new Date().toISOString(),
    })
    convStore.messages.push({
      clientId: assistantClientId,
      role: 'assistant',
      content: '',
      streaming: true,
      createdAt: new Date().toISOString(),
    })
    scrollToBottom()

    try {
      await convStore.sendMessageStream(content, activeId.value, fileList, (chunk, fullText) => {
        const target = convStore.messages.find(m => m.clientId === assistantClientId)
        if (target) target.content = fullText
      })

      const target = convStore.messages.find(m => m.clientId === assistantClientId)
      if (target) target.streaming = false

      if (!activeId.value && convStore.conversations.length) {
        const latest = convStore.conversations[0]
        activeId.value = latest.id
        router.replace(`/chat/${latest.id}`)
      }
    } catch (err) {
      convStore.messages = convStore.messages.filter(
        m => m.clientId !== assistantClientId && m.clientId !== userClientId
      )
      const msg = err.response?.data?.error || 'Failed to send message'
      gooeyToast.error(msg)
    }
  }

  async function deleteConv(id) {
    try {
      await convStore.deleteConversation(id)
      if (activeId.value === id) {
        activeId.value = null
        router.replace('/chat')
      }
    } catch {
      gooeyToast.error('Failed to delete')
    }
  }
  
  function logout() {
    authStore.logout()
    router.push('/login')
  }

  function scrollToBottom() {
    nextTick(() => {
      if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight
      }
    })
  }
  </script>

  <style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Doto:wght@400;700&family=Yantramanav:wght@300;400;500&display=swap');

  .chat-root {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
    transition: background 0.3s ease, color 0.3s ease;
  }

  .chat-root.theme-light {
    --color-bg:       #f5f5f0;
    --color-surface:  #ffffff;
    --color-border:   #e0e0d8;
    --color-muted:    #b0b0a8;
    --color-subtle:   #7a7a72;
    --color-text:     #1a1a18;
    --color-text-dim: #4a4a44;
    --color-white:    #1a1a18;
  }

  .sidebar {
    width: 260px;
    min-width: 260px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 20;
    transition: transform 0.25s ease, background 0.3s ease;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 14px 12px;
  }

  .brand-name {
    font-family: 'Doto', monospace;
    font-size: 16px;
    letter-spacing: 0.08em;
    color: var(--color-white);
  }

  .sidebar-search { padding: 0 10px 10px; }

  .search-input {
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 7px 12px;
    outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: var(--color-subtle); }
  .search-input::placeholder { color: var(--color-muted); }

  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
  }

  .conv-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
  }
  .conv-item:hover { background: rgba(255,255,255,0.05); }
  .conv-item.active { background: rgba(255,255,255,0.08); }
  .theme-light .conv-item:hover  { background: rgba(0,0,0,0.04); }
  .theme-light .conv-item.active { background: rgba(0,0,0,0.07); }

  .conv-icon { flex-shrink: 0; color: var(--color-muted); width: 14px; height: 14px; }

  .conv-title {
    font-size: 13px;
    color: var(--color-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .conv-item.active .conv-title { color: var(--color-text); }

  .conv-menu-btn {
    background: none; border: none; color: var(--color-muted);
    cursor: pointer; padding: 2px; opacity: 0; transition: all 0.15s; flex-shrink: 0;
  }
  .conv-item:hover .conv-menu-btn { opacity: 1; }
  .conv-menu-btn:hover { color: var(--color-text-dim); }

  .conv-menu {
    position: absolute; right: 8px; top: 100%; margin-top: 2px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 8px; padding: 4px; z-index: 25; min-width: 140px;
  }
  .conv-menu-item {
    display: flex; align-items: center; gap: 8px; width: 100%;
    background: none; border: none; padding: 6px 10px; font-size: 12px;
    color: var(--color-text-dim); cursor: pointer; border-radius: 6px; text-align: left;
  }
  .conv-menu-item:hover { background: rgba(255,255,255,0.06); }
  .conv-menu-item.danger { color: #e05c5c; }
  .conv-menu-overlay { position: fixed; inset: 0; z-index: 20; }

  .conv-rename-input {
    flex: 1; background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 4px; font-size: 13px; color: var(--color-text); padding: 2px 6px;
  }

  .sidebar-empty {
    padding: 24px 12px;
    text-align: center;
    font-size: 12px;
    color: var(--color-muted);
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-top: 1px solid var(--color-border);
  }

  .avatar-fallback {
    width: 30px; height: 30px;
    border-radius: 50%;
    background: var(--color-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  .user-info { flex: 1; min-width: 0; }
  .user-name  { font-size: 13px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-email { font-size: 11px; color: var(--color-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .main-area { flex: 1; display: flex; overflow: hidden; position: relative; }

  .chat-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--color-border);
    transition: border-color 0.3s ease;
  }

  .chat-title {
    font-size: 13px;
    color: var(--color-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;
  }

  .theme-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    flex-shrink: 0;
  }

  .toggle-track {
    width: 36px;
    height: 20px;
    border-radius: 10px;
    background: var(--color-border);
    border: 1px solid var(--color-subtle);
    position: relative;
    transition: background 0.3s ease, border-color 0.3s ease;
  }
  .toggle-track.on { background: var(--color-text-dim); border-color: var(--color-text-dim); }

  .toggle-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--color-subtle);
    position: absolute;
    top: 2px; left: 2px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
  }
  .toggle-track.on .toggle-thumb { transform: translateX(16px); background: var(--color-bg); }

  .toggle-label {
    font-size: 12px;
    color: var(--color-subtle);
    min-width: 30px;
    transition: color 0.3s ease;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    position: relative;
    transition: flex 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 32px 0 140px;
    display: flex;
    flex-direction: column;
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
    padding: 0 24px;
  }

  .thinking-row { max-width: 720px; width: 100%; margin: 8px auto 0; padding: 0 24px; }

  .thinking-bubble {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 10px 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    border-bottom-left-radius: 4px;
  }

  .input-wrapper {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 16px 24px 24px;
    background: linear-gradient(to top, var(--color-bg) 70%, transparent);
    display: flex;
    justify-content: center;
    transition: background 0.3s ease;
  }

  .input-wrapper > :deep(.input-area) {
    width: 100%;
    max-width: 720px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 10px 12px;
    box-shadow: 0 0 0 1px var(--color-border), 0 8px 32px rgba(0,0,0,0.4);
    transition: background 0.3s ease, border-color 0.3s ease;
  }

  .artifact-panel {
    width: 45%;
    min-width: 360px;
    max-width: 640px;
    background: #0d1117;
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .artifact-slide-enter-active,
  .artifact-slide-leave-active {
    transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
  }
  .artifact-slide-enter-from,
  .artifact-slide-leave-to { width: 0; opacity: 0; min-width: 0; }

  .artifact-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid #30363d;
    background: #161b22;
    flex-shrink: 0;
  }

  .artifact-meta { display: flex; align-items: center; gap: 10px; }

  .artifact-lang {
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: #79c0ff;
    background: rgba(121,192,255,0.1);
    border: 1px solid rgba(121,192,255,0.2);
    border-radius: 4px;
    padding: 2px 7px;
    text-transform: lowercase;
  }

  .artifact-title { font-size: 13px; color: #8b949e; font-family: var(--font-body); }
  .artifact-actions { display: flex; align-items: center; gap: 6px; }

  .artifact-btn {
    background: none;
    border: 1px solid #30363d;
    border-radius: var(--radius-sm);
    color: #8b949e;
    cursor: pointer;
    font-size: 12px;
    padding: 4px 10px;
    transition: all 0.15s;
    font-family: var(--font-body);
  }
  .artifact-btn:hover { border-color: #8b949e; color: #e6edf3; }
  .artifact-close { padding: 4px 8px; }

  .artifact-body { flex: 1; overflow: auto; display: flex; }

  .line-numbers {
    display: flex;
    flex-direction: column;
    padding: 16px 0;
    min-width: 44px;
    text-align: right;
    background: #0d1117;
    border-right: 1px solid #21262d;
    user-select: none;
    flex-shrink: 0;
  }

  .line-num {
    font-size: 13px;
    line-height: 20.8px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    color: #484f58;
    padding: 0 12px;
    display: block;
  }

  .artifact-pre {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    overflow-y: visible;
    background: transparent;
  }

  .artifact-code {
    font-size: 13px;
    line-height: 20.8px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    color: #e6edf3;
    background: transparent;
    white-space: pre;
    display: block;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--color-subtle);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .icon-btn:hover { color: var(--color-text); background: rgba(255,255,255,0.06); }
  .icon-btn.dim { color: var(--color-muted); }

  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 15;
  }

  .scroll-to-bottom-btn {
    position: absolute;
    bottom: 110px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-surface);
    color: var(--color-text-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    z-index: 5;
    transition: all 0.15s;
  }
  .scroll-to-bottom-btn:hover {
    color: var(--color-text);
    border-color: var(--color-subtle);
  }

  .fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  @media (max-width: 768px) {
    .sidebar { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); }
    .sidebar.sidebar-open { transform: translateX(0); }
    .sidebar-overlay { display: block; }
    .messages-list { padding: 0 16px; }
    .input-wrapper { padding: 12px 16px 20px; }
    .artifact-panel { position: fixed; inset: 0; width: 100% !important; max-width: 100%; z-index: 30; }
  }
  </style>