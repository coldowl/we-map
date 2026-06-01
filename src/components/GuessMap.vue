<template>
  <div class="guess-map-wrapper" :class="{ collapsed }">
    <button class="toggle-btn" @click="toggleCollapse">
      {{ collapsed ? '展开地图 (Space)' : '折叠地图 (Space)' }}
    </button>
    <div v-show="!collapsed" ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../utils/leaflet-icon-fix'

const collapsed = ref(true)
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

const emit = defineEmits<{
  'guess-placed': [lat: number, lng: number]
}>()

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 18,
    maxBounds: [[-85, -Infinity], [85, Infinity]],
    maxBoundsViscosity: 1.0,
  })

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  map.on('click', (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    placeMarker(lat, lng)
  })
})

watch(collapsed, (isCollapsed) => {
  if (!isCollapsed && map) {
    // Invalidate size after the map becomes visible
    setTimeout(() => map?.invalidateSize(), 100)
  }
})

function placeMarker(lat: number, lng: number) {
  if (!map) return

  // 标记显示在原始点击位置（保持用户视角）
  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng]).addTo(map)
  }

  // 归一化经度到 -180 ~ 180 用于距离计算
  const normalizedLng = ((lng + 180) % 360 + 360) % 360 - 180
  emit('guess-placed', lat, normalizedLng)
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function clearGuess() {
  if (marker && map) {
    map.removeLayer(marker)
    marker = null
  }
}

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

defineExpose({ clearGuess, toggleCollapse, collapsed })
</script>

<style scoped>
.guess-map-wrapper {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 20;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.guess-map-wrapper:not(.collapsed) {
  width: 400px;
  height: 300px;
}

.guess-map-wrapper.collapsed {
  width: auto;
  height: auto;
}

.toggle-btn {
  display: block;
  width: 100%;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}

.toggle-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.map-container {
  width: 100%;
  height: calc(100% - 36px);
}
</style>
