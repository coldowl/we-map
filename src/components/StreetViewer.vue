<template>
  <div class="street-viewer-wrapper">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ t('game.loadingStreetView') }}</p>
      <button v-if="showSkip" @click="$emit('skip')" class="skip-btn">{{ t('game.skip') }}</button>
    </div>
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="retry">重试</button>
    </div>
    <div ref="containerRef" class="street-viewer" :class="{ hidden: loading || !!error }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Viewer } from 'mapillary-js'
import 'mapillary-js/dist/mapillary.css'

const { t } = useI18n()

const props = defineProps<{
  accessToken: string
  imageId: string
  move?: boolean
}>()

const emit = defineEmits<{
  'viewer-ready': [viewer: Viewer]
  'viewer-error': [error: string]
  'image-loaded': []
  'skip': []
}>()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showSkip = ref(false)
let viewer: Viewer | null = null
let skipTimer: ReturnType<typeof setTimeout> | null = null

const LOAD_TIMEOUT = 10000

function startSkipTimer() {
  clearSkipTimer()
  skipTimer = setTimeout(() => { showSkip.value = true }, LOAD_TIMEOUT)
}

function clearSkipTimer() {
  if (skipTimer) {
    clearTimeout(skipTimer)
    skipTimer = null
  }
  showSkip.value = false
}

function onImageLoaded() {
  loading.value = false
  clearSkipTimer()
  nextTick(() => { viewer?.resize() })
  emit('image-loaded')
}

async function initViewer() {
  if (!containerRef.value || !props.accessToken || !props.imageId) {
    loading.value = false
    error.value = !props.accessToken ? '缺少 Mapillary 访问令牌' : '缺少图片 ID'
    emit('viewer-error', error.value)
    return
  }

  loading.value = true
  error.value = null

  try {
    viewer = new Viewer({
      container: containerRef.value,
      accessToken: props.accessToken,
      imageId: props.imageId,
      component: {
        cover: false,
        direction: false,
        keyboard: false,
        move: props.move !== false,
        sequence: false,
        zoom: false,
      },
    })

    emit('viewer-ready', viewer)
    startSkipTimer()

    viewer.on('image', onImageLoaded)

    viewer.on('error', (err) => {
      console.error('Mapillary viewer error:', err)
      loading.value = false
      clearSkipTimer()
      error.value = '街景加载失败'
    })
  } catch (err) {
    loading.value = false
    error.value = err instanceof Error ? err.message : '初始化失败'
    emit('viewer-error', error.value)
  }
}

watch(
  () => props.imageId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      destroyViewer()
      initViewer()
    }
  }
)

function destroyViewer() {
  clearSkipTimer()
  if (viewer) {
    viewer.remove()
    viewer = null
  }
}

function retry() {
  error.value = null
  destroyViewer()
  initViewer()
}

onMounted(initViewer)

onUnmounted(destroyViewer)
</script>

<style scoped>
.street-viewer-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.street-viewer {
  width: 100%;
  height: 100%;
}

.street-viewer.hidden {
  display: none;
}

.loading,
.error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  color: #ccc;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #333;
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  color: #e74c3c;
}

.error button {
  padding: 8px 20px;
  border: 1px solid #e74c3c;
  background: transparent;
  color: #e74c3c;
  border-radius: 4px;
  cursor: pointer;
}

.error button:hover {
  background: rgba(231, 76, 60, 0.1);
}

.skip-btn {
  padding: 8px 20px;
  border: 1px solid #888;
  background: transparent;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.skip-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
