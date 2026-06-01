<template>
  <div class="game-result-overlay">
    <div class="result-card">
      <h2 v-if="!isGameOver">{{ t('game.roundResult', { round: currentRound + 1 }) }}</h2>
      <h2 v-else>{{ t('game.gameOver') }}</h2>

      <div class="result-details">
        <div class="result-map" ref="resultMapContainer"></div>

        <div class="result-info">
          <div class="stat">
            <span class="label">{{ t('game.distance') }}</span>
            <span class="value">{{ lastResult?.result.distanceKm ?? 0 }} km</span>
          </div>
          <div class="stat">
            <span class="label">{{ t('game.score') }}</span>
            <span class="value score">{{ lastResult?.result.score ?? 0 }}</span>
          </div>
          <div class="stat" v-if="isGameOver">
            <span class="label">{{ t('game.totalScore') }}</span>
            <span class="value total">{{ totalScore }}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button v-if="!isGameOver" @click="$emit('next-round')">{{ gameMode === 'survival' ? t('game.continue') : t('game.nextRound') }}</button>
        <button v-if="isGameOver" @click="$emit('new-game')">{{ t('game.newGame') }}</button>
        <router-link to="/">
          <button>{{ t('game.backToHome') }}</button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../utils/leaflet-icon-fix'
import type { RoundResult } from '../types'

const { t } = useI18n()

const props = defineProps<{
  lastResult: RoundResult | null
  totalScore: number
  currentRound: number
  isGameOver: boolean
  gameMode?: 'standard' | 'survival'
}>()

defineEmits<{
  'next-round': []
  'new-game': []
}>()

const resultMapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let line: L.Polyline | null = null

/** 返回两点间最短路径的经纬度数组（处理经度绕回） */
function shortestPath(guess: { latitude: number; longitude: number }, actual: { latitude: number; longitude: number }): [number, number][] {
  let lng1 = guess.longitude
  let lng2 = actual.longitude
  const diff = lng2 - lng1

  if (Math.abs(diff) > 180) {
    // 走反方向更短，将 lng2 调整到同一侧
    if (diff > 0) {
      lng2 -= 360
    } else {
      lng2 += 360
    }
  }

  return [[guess.latitude, lng1], [actual.latitude, lng2]]
}

onMounted(() => {
  if (!resultMapContainer.value || !props.lastResult) return

  const { guess, question } = props.lastResult

  const path = shortestPath(guess, question)
  const centerLat = (path[0][0] + path[1][0]) / 2
  const centerLng = (path[0][1] + path[1][1]) / 2

  map = L.map(resultMapContainer.value, {
    center: [centerLat, centerLng],
    zoom: 3,
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump: false,
  })

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)

  const guessMarker = L.marker([guess.latitude, guess.longitude], {
    icon: createIcon('#e74c3c'),
  }).addTo(map)
  guessMarker.bindPopup('你的猜测')

  const actualMarker = L.marker([question.latitude, question.longitude], {
    icon: createIcon('#2ecc71'),
  }).addTo(map)
  actualMarker.bindPopup('正确位置')

  line = L.polyline(
    shortestPath(guess, question),
    { color: '#3498db', weight: 2, dashArray: '8 4' }
  ).addTo(map)

  map.fitBounds(line.getBounds().pad(0.3))
})

watch(
  () => props.lastResult,
  () => {
    if (!map || !props.lastResult) return

    const { guess, question } = props.lastResult

    // Clear old layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        if (!(layer instanceof L.TileLayer)) {
          map!.removeLayer(layer)
        }
      }
    })

    L.marker([guess.latitude, guess.longitude], {
      icon: createIcon('#e74c3c'),
    }).addTo(map).bindPopup('你的猜测')

    L.marker([question.latitude, question.longitude], {
      icon: createIcon('#2ecc71'),
    }).addTo(map).bindPopup('正确位置')

    const newLine = L.polyline(
      shortestPath(guess, question),
      { color: '#3498db', weight: 2, dashArray: '8 4' }
    ).addTo(map)

    map.fitBounds(newLine.getBounds().pad(0.3))
  }
)

function createIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.game-result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.result-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

h2 {
  margin: 0 0 16px;
  text-align: center;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-map {
  width: 100%;
  height: 250px;
  border-radius: 8px;
  overflow: hidden;
}

.result-map :deep(.leaflet-control-attribution a) {
  pointer-events: none;
}

.result-info {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.stat {
  text-align: center;
}

.label {
  display: block;
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 4px;
}

.value {
  font-size: 1.5rem;
  font-weight: bold;
}

.score {
  color: #e67e22;
}

.total {
  color: #2ecc71;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

button {
  padding: 10px 24px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

button:hover {
  background: #f0f0f0;
}

a {
  text-decoration: none;
}
</style>
