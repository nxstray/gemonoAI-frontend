<template>
  <div class="welcome-root">
    <p class="welcome-greeting" :style="{ color: colors.dim }">
      <span
        v-for="(char, i) in greetingChars"
        :key="`g-${i}`"
        class="char"
        :style="{ color: char.color }"
      >{{ char.display }}</span>
    </p>

    <p class="welcome-prompt">
      <span
        v-for="(char, i) in promptChars"
        :key="`p-${i}`"
        class="char"
        :style="{ color: char.color }"
      >{{ char.display }}</span>
      <span class="cursor" :style="{ background: colors.final }" :class="{ blink: cursorBlink }" />
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  isLight: { type: Boolean, default: false },
})

const authStore = useAuthStore()

const displayName = computed(() => {
  if (!authStore.isLoggedIn) return 'guest'
  return authStore.user?.displayName || authStore.user?.fullName?.split(' ')[0] || 'there'
})

// all colors derived purely from isLight prop — no CSS var lookup
const colors = computed(() => {
  if (props.isLight) {
    return {
      final:  '#1a1a18',   // dark text on light bg
      dim:    '#7a7a72',   // muted greeting
      hidden: '#d8d8d0',   // nearly invisible on light bg
      from:   208,         // scramble start channel value (light gray)
      to:     26,          // scramble end channel value (near black)
    }
  }
  return {
    final:  '#f0f0f0',   // light text on dark bg
    dim:    '#6b6b6b',   // muted greeting
    hidden: '#2a2a2a',   // nearly invisible on dark bg
    from:   42,          // scramble start channel value (dark gray)
    to:     240,         // scramble end channel value (near white)
  }
})

function colorAt(progress) {
  const { from, to } = colors.value
  const v = Math.round(from + (to - from) * progress)
  return `rgb(${v},${v},${v})`
}

const PROMPTS = [
  'What would you like to research',
  'What are you curious about',
  'What can I help you explore',
  'What topic are you diving into',
  'What would you like to know',
  'What shall we look into',
  'What question is on your mind',
  'What are you looking to discover',
]

const greetingChars   = ref([])
const promptChars     = ref([])
const subtitleVisible = ref(false)
const cursorBlink     = ref(false)

let promptIndex = 0
let timeouts = []

function later(fn, ms) { const t = setTimeout(fn, ms); timeouts.push(t); return t }
function clearAll()    { timeouts.forEach(clearTimeout); timeouts = [] }
function randBit()     { return Math.random() < 0.5 ? '0' : '1' }

function buildChars(target) {
  return target.split('').map(ch => ({
    display: ch === ' ' ? '\u00a0' : randBit(),
    color:   colors.value.hidden,
  }))
}

function animateReveal(charsRef, targetText, opts = {}) {
  const { startDelay = 0, charDelay = 52, scrambleSteps = 6, scrambleMs = 36 } = opts
  return new Promise(resolve => {
    charsRef.value = buildChars(targetText)
    targetText.split('').forEach((ch, i) => {
      if (ch === ' ') {
        later(() => {
          if (!charsRef.value[i]) return
          charsRef.value[i].display = '\u00a0'
          charsRef.value[i].color   = 'transparent'
        }, startDelay + i * charDelay)
        return
      }
      const t0 = startDelay + i * charDelay
      for (let s = 0; s < scrambleSteps; s++) {
        const step = s
        later(() => {
          if (!charsRef.value[i]) return
          charsRef.value[i].display = randBit()
          charsRef.value[i].color   = colorAt(step / scrambleSteps)
        }, t0 + step * scrambleMs)
      }
      later(() => {
        if (!charsRef.value[i]) return
        charsRef.value[i].display = ch
        charsRef.value[i].color   = colors.value.final
      }, t0 + scrambleSteps * scrambleMs)
    })
    later(resolve, startDelay + targetText.length * charDelay + scrambleSteps * scrambleMs)
  })
}

function animateErase(charsRef, opts = {}) {
  const { charDelay = 22 } = opts
  const len = charsRef.value.length
  return new Promise(resolve => {
    for (let i = len - 1; i >= 0; i--) {
      ;((idx, d) => {
        later(() => {
          if (!charsRef.value[idx]) return
          charsRef.value[idx].display = '\u00a0'
          charsRef.value[idx].color   = 'transparent'
        }, d)
      })(i, (len - 1 - i) * charDelay)
    }
    later(resolve, len * charDelay + 100)
  })
}

async function runPromptLoop() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const full = `${PROMPTS[promptIndex % PROMPTS.length]}, ${displayName.value}?`
    promptIndex++

    cursorBlink.value = false
    await animateReveal(promptChars, full)

    cursorBlink.value = true
    await new Promise(r => later(r, 2800))

    cursorBlink.value = false
    await animateErase(promptChars)
    await new Promise(r => later(r, 400))
  }
}

const greetingText = computed(() => `Hello, ${displayName.value}.`)

async function start() {
  clearAll()
  subtitleVisible.value = false
  cursorBlink.value     = false
  promptIndex = Math.floor(Math.random() * PROMPTS.length)

  // greeting: start transparent, fade to dim color
  greetingChars.value = greetingText.value.split('').map(ch => ({
    display: ch,
    color: 'transparent',
  }))
  later(() => {
    greetingChars.value.forEach(c => { c.color = colors.value.dim })
  }, 100)

  later(() => {
    runPromptLoop()
    later(() => { subtitleVisible.value = true }, 1800)
  }, 500)
}

onMounted(() => { document.fonts.ready.then(() => setTimeout(start, 200)) })
onUnmounted(clearAll)

watch(displayName,         () => { clearAll(); setTimeout(start, 100) })
watch(() => props.isLight, () => { clearAll(); setTimeout(start, 100) })
</script>

<style scoped>
.welcome-root {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 120px;
  text-align: center;
  gap: 6px;
}

.welcome-greeting {
  font-family: 'Doto', monospace;
  font-size: 13px;
  letter-spacing: 0.14em;
  margin-bottom: 4px;
  transition: color 0.5s ease;
}

.welcome-prompt {
  font-family: 'Doto', monospace;
  font-size: clamp(18px, 2.6vw, 26px);
  letter-spacing: 0.04em;
  margin-bottom: 14px;
  min-height: 1.5em;
  line-height: 1.4;
}

.char {
  display: inline-block;
  transition: color 0.06s ease;
  white-space: pre;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 0.85em;
  margin-left: 2px;
  vertical-align: middle;
  opacity: 0;
  transition: background 0.3s ease;
}

.cursor.blink {
  animation: cur-blink 0.85s step-end infinite;
}

@keyframes cur-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
</style>