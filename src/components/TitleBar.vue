<template>
  <div class="titlebar" data-tauri-drag-region>
    <span class="title" data-tauri-drag-region>We-Map</span>
    <div class="titlebar-controls">
      <button class="titlebar-btn pin-btn" @click="togglePin" :title="pinned ? t('titlebar.unpin') : t('titlebar.pin')">
        <svg :class="{ pinned }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 17v5"/>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
        </svg>
      </button>
      <button class="titlebar-btn" @click="minimizeWin">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button class="titlebar-btn" @click="toggleMaximize">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      </button>
      <button class="titlebar-btn close-btn" @click="closeWin">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCurrentWindow } from '@tauri-apps/api/window'

const { t } = useI18n()
const appWindow = getCurrentWindow()
const pinned = ref(false)

onMounted(async () => {
  pinned.value = await appWindow.isAlwaysOnTop()
})

async function togglePin() {
  pinned.value = !pinned.value
  await appWindow.setAlwaysOnTop(pinned.value)
}

async function minimizeWin() {
  await appWindow.minimize()
}

async function toggleMaximize() {
  await appWindow.toggleMaximize()
}

async function closeWin() {
  await appWindow.close()
}
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-light);
  user-select: none;
  flex-shrink: 0;
}

.title {
  padding-left: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  pointer-events: none;
}

.titlebar-controls {
  display: flex;
  height: 100%;
}

.titlebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.titlebar-btn:hover {
  background: rgba(128, 128, 128, 0.15);
  color: var(--text-primary);
}

.close-btn:hover {
  background: #e74c3c;
  color: #fff;
}

.pin-btn svg {
  transition: transform 0.25s;
}

.pin-btn svg.pinned {
  transform: rotate(-45deg);
  color: var(--accent);
}

[data-theme="dark"] .titlebar {
  background: var(--bg-surface);
  border-bottom-color: var(--border-light);
}
</style>
