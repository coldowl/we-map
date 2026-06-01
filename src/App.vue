<template>
  <div class="app-container">
    <TitleBar />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}
</style>
