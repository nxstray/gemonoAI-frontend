<template>
  <GooeyToaster position="top-center" />
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { GooeyToaster } from 'vue-goey-toast'
import 'vue-goey-toast/styles.css'
</script>