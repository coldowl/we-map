<template>
  <div class="game-settings">
    <div class="setting-item">
      <label>{{ t('settings.theme') }}</label>
      <div class="theme-toggle">
        <button
          :class="{ active: localSettings.theme === 'light' }"
          @click="setTheme('light')"
        >{{ t('settings.light') }}</button>
        <button
          :class="{ active: localSettings.theme === 'dark' }"
          @click="setTheme('dark')"
        >{{ t('settings.dark') }}</button>
      </div>
    </div>

    <div class="setting-item">
      <label>{{ t('settings.language') }}</label>
      <select v-model="localSettings.language" @change="onLanguageChange">
        <option value="zh">{{ t('settings.chinese') }}</option>
        <option value="en">{{ t('settings.english') }}</option>
      </select>
    </div>

    <div class="setting-item">
      <label>{{ t('settings.streetViewMove') }}</label>
      <input type="checkbox" v-model="localSettings.streetViewMove" @change="save" />
    </div>

    <div class="setting-item">
      <label>{{ t('settings.timedMode') }}</label>
      <input type="checkbox" v-model="localSettings.timedMode" @change="save" />
    </div>

    <div class="setting-item" v-if="localSettings.timedMode">
      <label>{{ t('settings.timeLimit') }}</label>
      <input type="number" v-model.number="localSettings.timeLimitSeconds" min="10" max="300" @change="save" />
    </div>

    <div class="setting-item">
      <label>{{ t('settings.roundsCount') }}</label>
      <input type="number" v-model.number="localSettings.roundsCount" min="1" max="50" @change="save" />
    </div>

    <div class="setting-item">
      <label>{{ t('settings.survivalThreshold') }}</label>
      <input type="number" v-model.number="localSettings.survivalThreshold" min="100" max="10000" step="100" @change="save" />
    </div>

    <div class="setting-item">
      <label>{{ t('settings.mapillaryToken') }}</label>
      <input type="text" v-model="localSettings.mapillaryToken" placeholder="MLY|..." @change="save" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getSettings, saveSettings } from '../services/settings'
import type { GameSettings } from '../types'

const { t, locale } = useI18n()

const localSettings = reactive<GameSettings>({
  language: 'zh',
  theme: 'light',
  streetViewMove: true,
  timedMode: false,
  timeLimitSeconds: 60,
  mapillaryToken: '',
  gameMode: 'standard',
  roundsCount: 5,
  survivalThreshold: 2000,
})

onMounted(async () => {
  const settings = await getSettings()
  Object.assign(localSettings, settings)
  locale.value = settings.language
  document.documentElement.dataset.theme = settings.theme
})

function setTheme(theme: 'light' | 'dark') {
  localSettings.theme = theme
  document.documentElement.dataset.theme = theme
  save()
}

function onLanguageChange() {
  locale.value = localSettings.language
  save()
}

async function save() {
  await saveSettings({ ...localSettings })
}
</script>

<style scoped>
.game-settings {
  padding: 16px;
  max-width: 400px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.setting-item label {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.setting-item input[type='text'],
.setting-item input[type='number'] {
  width: 200px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-primary);
}

.setting-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
}

select {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-primary);
}

.theme-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.theme-toggle button {
  padding: 6px 16px;
  border: none;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s, color 0.2s;
}

.theme-toggle button:first-child {
  border-right: 1px solid var(--border);
}

.theme-toggle button.active {
  background: var(--accent);
  color: #fff;
}

.theme-toggle button:hover:not(.active) {
  background: var(--bg-elevated);
}
</style>
