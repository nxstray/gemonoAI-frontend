<template>
  <div class="bubble-wrapper" :class="message.role">
    <!-- User bubble -->
    <div v-if="message.role === 'user'" class="bubble user-bubble">
      <!-- attachment previews — supports multiple files per message; falls back to the
          single legacy attachmentUrl/attachmentType/attachmentName fields for older messages -->
      <div v-if="attachmentList.length" class="attachment-list">
        <div v-for="(att, i) in attachmentList" :key="i" class="attachment">
          <img
            v-if="att.type === 'image'"
            :src="att.url"
            class="attachment-img"
            alt="attachment"
          />
          <div v-else class="attachment-file">
            <IconPaperclip />
            <span>{{ att.name || att.url.split('/').pop() }}</span>
          </div>
        </div>
      </div>
      <p v-if="message.content" class="bubble-text">{{ message.content }}</p>
    </div>

    <!-- Assistant bubble -->
    <div v-else class="bubble assistant-bubble">
      <!-- Markdown content rendered with syntax highlighting -->
      <div class="md-content" ref="mdEl" v-html="renderedContent" />

      <p class="bubble-time">{{ formatTime(message.createdAt) }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUpdated, nextTick, inject } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import IconPaperclip from '@/components/icons/IconPaperclip.vue'

const props = defineProps({
  message: { type: Object, required: true }
})

const mdEl = ref(null)

// Receive openArtifact from ChatPage via provide/inject
const openArtifact = inject('openArtifact', null)

// Custom renderer — wraps code blocks with header bar + open-in-panel button
const renderer = new marked.Renderer()

renderer.code = ({ text, lang }) => {
  // marked v9+ passes an object { text, lang, escaped } instead of (code, language)
  const language = lang || 'plaintext'
  const code = text || ''
  let highlighted = ''
  try {
    highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value
  } catch {
    highlighted = hljs.highlightAuto(code).value
  }

  // Encode so the button's data attribute safely carries multi-line code
  const encoded = encodeURIComponent(code)

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${language}</span>
        <button class="open-artifact-btn" data-code="${encoded}" data-lang="${language}">
          Open in panel ↗
        </button>
      </div>
      <pre><code class="hljs language-${language}">${highlighted}</code></pre>
    </div>
  `
}

marked.setOptions({ renderer })

const renderedContent = computed(() => {
  const src = props.message.content
  if (!src) return ''
  return marked.parse(src)
})

// Normalize attachments into one list — supports the new multi-attachment array
// (message.attachments) as well as the legacy single-attachment fields
const attachmentList = computed(() => {
  if (Array.isArray(props.message.attachments) && props.message.attachments.length) {
    return props.message.attachments
  }
  if (props.message.attachmentUrl) {
    return [{
      url: props.message.attachmentUrl,
      type: props.message.attachmentType,
      name: props.message.attachmentName,
    }]
  }
  return []
})

// Attach click handlers to "Open in panel" buttons after DOM updates
function attachArtifactButtons() {
  nextTick(() => {
    if (!mdEl.value || !openArtifact) return
    // Clone to remove stale listeners before re-attaching
    mdEl.value.querySelectorAll('.open-artifact-btn').forEach(btn => {
      const fresh = btn.cloneNode(true)
      btn.replaceWith(fresh)
    })
    mdEl.value.querySelectorAll('.open-artifact-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = decodeURIComponent(btn.dataset.code)
        const lang = btn.dataset.lang
        openArtifact(code, lang, `${lang} snippet`)
      })
    })
  })
}

onMounted(attachArtifactButtons)
onUpdated(attachArtifactButtons)

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Doto:wght@400;700&family=Yantramanav:wght@300;400;500&display=swap');
.bubble-wrapper {
  display: flex;
  margin-bottom: 12px;
}

.bubble-wrapper.user { justify-content: flex-end; }
.bubble-wrapper.assistant { justify-content: flex-start; }

.bubble {
  max-width: 72%;
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.65;
}

.user-bubble {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: 'Aleo', Georgia, serif;
}

.assistant-bubble {
  background: transparent;
  color: var(--color-text);
  max-width: 80%;
  padding: 8px 0;
  font-family: 'Aleo', Georgia, serif;
}

.bubble-text {
  color: var(--color-text);
  font-family: 'Yantramanav', sans-serif;
}

/* Attachment */
.attachment { margin-bottom: 8px; }
.attachment-img {
  max-width: 240px;
  max-height: 180px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}
.attachment-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--color-muted);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-dim);
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.attachment { margin-bottom: 0; }

/* Markdown content */
.md-content {
  font-family: 'Aleo', Georgia, serif;
  font-weight: 500px;
  font-size: 15px;
  line-height: 1.7;
}

/* Headings inside AI response use Aleo */
.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3),
.md-content :deep(h4) {
  font-family: 'Aleo', Georgia, serif;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 1em 0 0.4em;
  color: var(--color-white);
}

.md-content :deep(p) { margin: 0 0 0.75em; }
.md-content :deep(p:last-child) { margin-bottom: 0; }

.md-content :deep(ul),
.md-content :deep(ol) {
  padding-left: 1.4em;
  margin: 0.5em 0;
}
.md-content :deep(li) { margin-bottom: 0.3em; }
.md-content :deep(strong) { color: var(--color-white); }
.md-content :deep(a) { color: var(--color-text-dim); text-decoration: underline; }

/* Inline code */
.md-content :deep(code:not(pre code)) {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--color-text);
}

/* Code block outer wrapper */
.md-content :deep(.code-block-wrapper) {
  margin: 0.75em 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid #30363d;
}

/* Header bar above each code block */
.md-content :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

/* Language label */
.md-content :deep(.code-lang) {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: #79c0ff;
  text-transform: lowercase;
}

/* Open in artifact panel button inside bubble */
.md-content :deep(.open-artifact-btn) {
  font-size: 11px;
  font-family: var(--font-body);
  color: #8b949e;
  background: none;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.md-content :deep(.open-artifact-btn:hover) {
  border-color: #8b949e;
  color: #e6edf3;
}

/* Code block pre */
.md-content :deep(pre) {
  margin: 0;
  padding: 14px 16px;
  background: #0d1117;
  overflow-x: auto;
}

.md-content :deep(pre code) {
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.6;
  background: transparent;
  border: none;
  padding: 0;
}

.md-content :deep(blockquote) {
  border-left: 3px solid var(--color-border);
  margin: 0.75em 0;
  padding: 4px 12px;
  color: var(--color-subtle);
  font-style: italic;
}

/* Tables */
.md-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.9em 0;
  font-size: 13.5px;
  overflow-x: auto;
  display: block;
}

.md-content :deep(thead) {
  display: table-header-group;
}

.md-content :deep(tbody) {
  display: table-row-group;
}

.md-content :deep(tr) {
  display: table-row;
}

.md-content :deep(th),
.md-content :deep(td) {
  display: table-cell;
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
}

.md-content :deep(th) {
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-white);
}

.md-content :deep(tbody tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.02);
}

/* Timestamp */
.bubble-time {
  font-size: 10px;
  color: var(--color-muted);
  margin-top: 6px;
  font-family: 'Aleo', Georgia, serif;
}
</style>