<template>
  <div class="thinking-row">
    <div class="thinking-container">
      <Transition name="fade-phrase" mode="out-in">
        <p :key="currentPhrase" class="gradient-text">{{ currentPhrase }}</p>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  // 'text' | 'image' | 'audio' | 'pdf' — matches attachment type sent with the message
  attachmentType: { type: String, default: 'text' },
})

// phrase sets mirror the step descriptions already used in AgentService (backend)
// so the frontend animation feels consistent with what the agent is actually doing
const PHRASE_SETS = {
  text: ['Menganalisis permintaan...', 'Memproses konteks percakapan...', 'Menyusun jawaban...'],
  image: ['Menganalisis gambar...', 'Menyusun jawaban...'],
  audio: ['Mentranskripsi audio...', 'Menganalisis permintaan...', 'Menyusun jawaban...'],
  pdf: ['Membaca dokumen...', 'Menganalisis permintaan...', 'Menyusun jawaban...'],
}

const phrases = computed(() => PHRASE_SETS[props.attachmentType] || PHRASE_SETS.text)
const currentPhrase = ref(phrases.value[0])
let idx = 0
let timer = null

function startRotation() {
  clearInterval(timer)
  idx = 0
  currentPhrase.value = phrases.value[0]
  timer = setInterval(() => {
    idx = (idx + 1) % phrases.value.length
    currentPhrase.value = phrases.value[idx]
  }, 2200)
}

// restart rotation whenever attachment type changes (new message sent)
watch(() => props.attachmentType, startRotation)

onMounted(startRotation)
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.thinking-row {
  max-width: 720px;
  width: 100%;
  margin: 8px auto 0;
  padding: 0 24px;
}

.thinking-container {
  display: inline-block;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  border-bottom-left-radius: 2px;
  padding: 14px 18px;
}

.gradient-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500;
  font-family: var(--font-body);

  /* shine animation — gradient sweeps across the text left to right, looping */
  background: linear-gradient(
    90deg,
    var(--color-muted) 0%,
    var(--color-white) 25%,
    #2d3135 50%,
    var(--color-white) 75%,
    var(--color-muted) 100%
  );
  background-size: 200% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  to {
    background-position: 200% center;
  }
}

.fade-phrase-enter-active,
.fade-phrase-leave-active {
  transition: opacity 0.3s ease;
}
.fade-phrase-enter-from,
.fade-phrase-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .thinking-row { padding: 0 16px; }
}
</style>