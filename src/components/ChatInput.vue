<template>
  <div class="input-area">

    <!-- Attachments preview row -->
    <Transition name="slide-up">
      <div v-if="attachments.length" class="attachment-list">
        <div
          v-for="(att, i) in attachments"
          :key="i"
          class="attachment-card"
          :class="att.type"
          @click="openPreview(att)"
        >
          <button class="remove-btn" @click.stop="removeAttachment(i)" title="Hapus">
            <IconClose />
          </button>

          <!-- image -->
          <template v-if="att.type === 'image'">
            <img :src="att.previewUrl" class="thumb-img" :alt="att.name" />
          </template>

          <!-- code / text paste -->
          <template v-else-if="att.type === 'code'">
            <div class="att-inner">
              <div class="att-icon code-icon">
                <IconCode />
              </div>
              <div class="att-meta">
                <span class="att-name">Konten yang ditempel</span>
                <span class="att-sub">{{ formatSize(att.size) }} · {{ att.lines }} baris</span>
              </div>
            </div>
          </template>

          <!-- PDF -->
          <template v-else-if="att.type === 'pdf'">
            <div class="att-inner">
              <div class="att-icon pdf-icon">
                <IconPdf />
              </div>
              <div class="att-meta">
                <span class="att-name">{{ att.name }}</span>
                <span class="att-sub">{{ formatSize(att.size) }}</span>
              </div>
            </div>
          </template>

          <!-- audio -->
          <template v-else-if="att.type === 'audio'">
            <div class="att-inner">
              <div class="att-icon audio-icon">
                <IconAudio />
              </div>
              <div class="att-meta">
                <span class="att-name">{{ att.name }}</span>
                <span class="att-sub">{{ formatSize(att.size) }}</span>
              </div>
            </div>
          </template>

          <!-- generic file -->
          <template v-else>
            <div class="att-inner">
              <div class="att-icon file-icon">
                <IconFile />
              </div>
              <div class="att-meta">
                <span class="att-name">{{ att.name }}</span>
                <span class="att-sub">{{ formatSize(att.size) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <!-- Input row -->
    <div class="input-row">
      <button class="action-btn" @click="triggerFilePicker" title="Lampirkan file" :disabled="disabled">
        <IconPaperclip />
        <input ref="fileInput" type="file" accept="image/*,audio/*,.pdf,.txt,.doc,.docx" multiple style="display:none" @change="onFilesSelected" />
      </button>

      <button class="action-btn" :class="{ recording: isRecording }" @click="toggleRecording" :title="isRecording ? 'Stop' : 'Rekam suara'" :disabled="disabled">
        <IconMic v-if="!isRecording" />
        <span v-else class="rec-dot" />
      </button>

      <textarea
        ref="textareaEl"
        v-model="text"
        class="gm-input chat-textarea"
        placeholder="Ask anything"
        :disabled="disabled"
        @keydown.enter.exact.prevent="submit"
        @input="onInput"
        @paste="onPaste"
        rows="1"
      />

      <button class="send-btn gm-btn gm-btn-primary" :disabled="disabled || (!text.trim() && !attachments.length)" @click="submit">
        <IconSend />
      </button>
    </div>

    <!-- Preview modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="preview.open" class="preview-backdrop" @click.self="preview.open = false">
          <div class="preview-modal">
            <!-- header -->
            <div class="preview-header">
              <div class="preview-header-meta">
                <span class="preview-title">{{ preview.title }}</span>
                <span v-if="preview.sub" class="preview-sub">{{ preview.sub }}</span>
              </div>
              <div class="preview-header-actions">
                <button v-if="preview.type === 'code'" class="preview-action-btn" @click="copyPreview">
                  {{ previewCopied ? 'Disalin!' : 'Salin' }}
                </button>
                <button class="preview-close" @click="preview.open = false">
                  <IconClose />
                </button>
              </div>
            </div>

            <!-- body -->
            <div class="preview-body">
              <!-- image full -->
              <img v-if="preview.type === 'image'" :src="preview.url" class="preview-img-full" :alt="preview.title" />

              <!-- code with line numbers -->
              <div v-else-if="preview.type === 'code'" class="preview-code-wrap">
                <div class="preview-line-nums" aria-hidden="true">
                  <span v-for="n in preview.lineCount" :key="n">{{ n }}</span>
                </div>
                <pre class="preview-pre"><code>{{ preview.content }}</code></pre>
              </div>

              <!-- PDF embed -->
              <iframe v-else-if="preview.type === 'pdf'" :src="preview.url" class="preview-iframe" />

              <!-- audio player -->
              <audio v-else-if="preview.type === 'audio'" :src="preview.url" controls class="preview-audio" />

              <!-- generic info -->
              <div v-else class="preview-generic">
                <IconFile width="48" height="48" stroke-width="1.5" style="color: var(--color-subtle)" />
                <p>{{ preview.title }}</p>
                <p class="preview-generic-sub">{{ preview.sub }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { gooeyToast } from 'vue-goey-toast'
import IconPaperclip from '@/components/icons/IconPaperclip.vue'
import IconMic from '@/components/icons/IconMic.vue'
import IconSend from '@/components/icons/IconSend.vue'
import IconClose from '@/components/icons/IconClose.vue'
import IconCode from '@/components/icons/IconCode.vue'
import IconPdf from '@/components/icons/IconPdf.vue'
import IconAudio from '@/components/icons/IconAudio.vue'
import IconFile from '@/components/icons/IconFile.vue'

const props = defineProps({ disabled: { type: Boolean, default: false } })
const emit  = defineEmits(['send'])

const CODE_THRESHOLD = 500 // chars → auto-attachment

const text        = ref('')
const attachments = ref([])  // { type, name, size, lines?, content?, previewUrl?, file? }
const fileInput   = ref(null)
const textareaEl  = ref(null)
const isRecording = ref(false)
const previewCopied = ref(false)
let mediaRecorder = null
let audioChunks   = []

const preview = ref({ open: false, type: '', title: '', sub: '', content: '', url: '', lineCount: 0 })

// helpers
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)         return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function attTypeFor(file) {
  if (file.type.startsWith('image/'))       return 'image'
  if (file.type === 'application/pdf')      return 'pdf'
  if (file.type.startsWith('audio/'))       return 'audio'
  return 'file'
}

// file picker
function triggerFilePicker() { fileInput.value?.click() }

function onFilesSelected(e) {
  Array.from(e.target.files).forEach(addFile)
  e.target.value = ''
}

function addFile(file) {
  const type = attTypeFor(file)
  const previewUrl = (type === 'image' || type === 'pdf' || type === 'audio')
    ? URL.createObjectURL(file)
    : null
  attachments.value.push({ type, name: file.name, size: file.size, previewUrl, file })
}

function removeAttachment(i) {
  const a = attachments.value[i]
  if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
  attachments.value.splice(i, 1)
}

// paste detection
function onPaste(e) {
  const items = e.clipboardData?.items || []
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) addFile(file)
      return // jangan lanjut proses sebagai teks
    }
  }

  const pasted = e.clipboardData?.getData('text') || ''
  if (pasted.length > CODE_THRESHOLD) {
    e.preventDefault()
    const lines = pasted.split('\n').length
    attachments.value.push({
      type: 'code',
      name: 'Konten yang ditempel',
      size: new Blob([pasted]).size,
      lines,
      content: pasted,
      previewUrl: null,
      file: null,
    })
  }
}

// auto resize
function onInput() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

// preview modal
function openPreview(att) {
  if (att.type === 'image') {
    preview.value = { open: true, type: 'image', title: att.name, sub: formatSize(att.size), url: att.previewUrl }
  } else if (att.type === 'code') {
    preview.value = {
      open: true, type: 'code',
      title: 'Konten yang ditempel',
      sub: `${formatSize(att.size)} · ${att.lines} baris · Format mungkin tidak konsisten dengan sumber`,
      content: att.content,
      lineCount: att.lines,
    }
  } else if (att.type === 'pdf') {
    preview.value = { open: true, type: 'pdf', title: att.name, sub: formatSize(att.size), url: att.previewUrl }
  } else if (att.type === 'audio') {
    preview.value = { open: true, type: 'audio', title: att.name, sub: formatSize(att.size), url: att.previewUrl }
  } else {
    preview.value = { open: true, type: 'generic', title: att.name, sub: formatSize(att.size) }
  }
}

async function copyPreview() {
  try {
    await navigator.clipboard.writeText(preview.value.content)
    previewCopied.value = true
    setTimeout(() => { previewCopied.value = false }, 2000)
  } catch { gooeyToast.error('Gagal menyalin') }
}

// voice recording
async function toggleRecording() {
  if (isRecording.value) { mediaRecorder?.stop(); isRecording.value = false; return }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      addFile(new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }))
      stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorder.start()
    isRecording.value = true
    gooeyToast.success('Rekaman dimulai...')
    } catch { gooeyToast.error('Akses mikrofon ditolak') }
}

// submit
function submit() {
  if (props.disabled) return
  const content = text.value.trim()
  if (!content && !attachments.value.length) return

  // Multiple file attachments are now supported — send every attachment that has a real file object
  const fileAttachments = attachments.value.filter(a => a.file).map(a => a.file)

  emit('send', {
    content,
    files: fileAttachments,
    codeAttachments: attachments.value.filter(a => a.type === 'code').map(a => a.content),
  })

  text.value = ''
  attachments.value.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl) })
  attachments.value = []
  nextTick(onInput)
}
</script>

<style scoped>
.input-area {
  padding: 12px 20px 20px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

/* attachment list */
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.attachment-card {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 6px);
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color 0.15s;
  overflow: visible;
}
.attachment-card:hover { border-color: var(--color-subtle); }

.remove-btn {
  position: absolute;
  top: -8px; left: -8px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--color-subtle);
  color: var(--color-bg);
  border: 2px solid var(--color-bg);
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  padding: 0;
  transition: background 0.15s;
}
.remove-btn:hover { background: var(--color-text); }

/* image thumb */
.thumb-img {
  width: 72px; height: 72px;
  object-fit: cover;
  border-radius: var(--radius-sm, 6px);
  display: block;
}

/* non-image cards */
.att-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-width: 160px;
  max-width: 240px;
}

.att-icon {
  width: 34px; height: 34px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-muted);
  color: var(--color-text-dim);
}
.code-icon  { background: rgba(100,180,100,0.12); color: #64b464; }
.pdf-icon   { background: rgba(220,80,80,0.12);   color: #dc5050; }
.audio-icon { background: rgba(80,120,220,0.12);  color: #5078dc; }
.file-icon  { background: rgba(150,150,150,0.12); color: var(--color-text-dim); }

.att-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.att-name { font-size: 12px; font-weight: 500; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
.att-sub  { font-size: 11px; color: var(--color-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }

/* input row */
.input-row { display: flex; align-items: flex-end; gap: 8px; }

.action-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 6px);
  color: var(--color-subtle);
  cursor: pointer;
  padding: 8px;
  transition: all 0.15s;
  flex-shrink: 0;
  height: 38px; width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn:hover:not(:disabled) { border-color: var(--color-subtle); color: var(--color-text); }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.action-btn.recording { border-color: #888; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.rec-dot { width: 10px; height: 10px; background: #e55; border-radius: 50%; }

.chat-textarea {
  flex: 1; resize: none; max-height: 160px;
  overflow-y: auto; padding: 9px 14px;
  line-height: 1.5; font-size: 14px;
}

.send-btn { padding: 8px 14px; height: 38px; flex-shrink: 0; }
.send-btn:disabled { background: var(--color-muted); color: var(--color-subtle); }

/* slide-up transition */
.slide-up-enter-active { transition: all 0.2s ease; }
.slide-up-enter-from   { opacity: 0; transform: translateY(6px); }
.slide-up-leave-active { transition: all 0.15s ease; }
.slide-up-leave-to     { opacity: 0; }

/* Preview Modal */
.preview-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.preview-modal {
  background: var(--color-surface, #141414);
  border: 1px solid var(--color-border, #242424);
  border-radius: 12px;
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--color-text, #e8e8e8);
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #242424);
  gap: 12px;
  flex-shrink: 0;
}

.preview-header-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.preview-title { font-size: 14px; font-weight: 600; color: var(--color-text, #e8e8e8); }
.preview-sub   { font-size: 12px; color: var(--color-subtle, #6b6b6b); }

.preview-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.preview-action-btn {
  background: none;
  border: 1px solid var(--color-border, #242424);
  border-radius: 6px;
  color: var(--color-text-dim, #a0a0a0);
  font-size: 12px;
  padding: 4px 12px;
  cursor: pointer;
  font-family: var(--font-body, sans-serif);
  transition: all 0.15s;
}
.preview-action-btn:hover { border-color: var(--color-subtle); color: var(--color-text); }

.preview-close {
  background: none; border: none;
  color: var(--color-subtle, #6b6b6b);
  cursor: pointer; font-size: 16px;
  padding: 4px 8px; border-radius: 4px;
  transition: color 0.15s;
}
.preview-close:hover { color: var(--color-text, #e8e8e8); }

.preview-body { flex: 1; overflow: auto; }

/* image full */
.preview-img-full {
  width: 100%; height: 100%;
  object-fit: contain;
  display: block;
  max-height: 60vh;
  background: #000;
}

/* code preview */
.preview-code-wrap {
  display: flex;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.65;
  min-height: 200px;
}

.preview-line-nums {
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  min-width: 44px;
  text-align: right;
  background: var(--color-bg, #0c0c0c);
  border-right: 1px solid var(--color-border, #242424);
  user-select: none;
  flex-shrink: 0;
  color: var(--color-muted, #3a3a3a);
}
.preview-line-nums span { display: block; padding: 0 12px; }

.preview-pre {
  flex: 1; margin: 0; padding: 16px;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text, #e8e8e8);
  overflow: visible;
}

/* PDF embed */
.preview-iframe { width: 100%; height: 60vh; border: none; display: block; }

/* audio player */
.preview-audio { width: 100%; padding: 24px; display: block; }

/* generic */
.preview-generic {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 48px 24px;
  color: var(--color-text-dim, #a0a0a0);
  font-size: 14px;
}
.preview-generic-sub { font-size: 12px; color: var(--color-subtle, #6b6b6b); }

/* modal fade */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>