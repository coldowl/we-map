<template>
  <div class="settings-view">
    <div class="settings-content">
      <router-link to="/" class="back-link">{{ t('game.back') }}</router-link>
      <h2>{{ t('settings.title', '设置') }}</h2>
      <GameSettings />
    </div>

    <div class="question-bank-panel">
      <QuestionBank />
    </div>

  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GameSettings from '../components/GameSettings.vue'
import QuestionBank from '../components/QuestionBank.vue'

const { t } = useI18n()
</script>

<style scoped>
.settings-view {
  display: flex;
  height: 100vh;
  background: var(--bg-page);
}

.settings-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

h2 {
  margin: 0 0 20px;
  color: var(--text-primary);
}

.question-bank-panel {
  width: 400px;
  border-left: 1px solid var(--border);
  overflow-y: auto;
  background: var(--bg-surface);
}

.back-link {
  display: inline-block;
  margin-bottom: 12px;
  color: var(--text-primary);
  background: rgba(128, 128, 128, 0.1);
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
}

.back-link:hover {
  background: rgba(128, 128, 128, 0.18);
}
</style>
