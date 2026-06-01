<template>
  <div class="home">
    <div class="main-menu">
      <h1>{{ t('app.title') }}</h1>
      <p>{{ t('app.subtitle') }}</p>

      <div class="game-modes">
        <div class="mode">
          <h3>{{ t('menu.standard') }}</h3>
          <p>{{ t('menu.standardDesc', { count: roundsCount }) }}</p>
          <button @click="startGame('standard')" :disabled="!dbReady || questionCount < roundsCount">
            {{ !dbReady ? '...' : questionCount < roundsCount ? t('menu.needQuestions', { count: roundsCount, current: questionCount }) : t('menu.startGame') }}
          </button>
        </div>
        <div class="mode">
          <h3>{{ t('menu.survival') }}</h3>
          <p>{{ t('menu.survivalDesc', { threshold: survivalThreshold }) }}</p>
          <button @click="startGame('survival')" :disabled="!dbReady || questionCount < roundsCount">
            {{ !dbReady ? '...' : questionCount < roundsCount ? t('menu.needQuestions', { count: roundsCount, current: questionCount }) : t('menu.startGame') }}
          </button>
        </div>
      </div>

      <div class="nav-links">
        <router-link to="/stats">
          <button>{{ t('menu.stats') }}</button>
        </router-link>
        <router-link to="/settings">
          <button>{{ t('menu.settings') }}</button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/game'
import { getRandomQuestions, getQuestionCount } from '../services/questionBank'
import { getSettings } from '../services/settings'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()
const questionCount = ref(0)
const dbReady = ref(false)
const roundsCount = ref(5)
const survivalThreshold = ref(2000)

onMounted(async () => {
  try {
    const settings = await getSettings()
    roundsCount.value = settings.roundsCount
    survivalThreshold.value = settings.survivalThreshold
  } catch {}
  refreshCount().finally(() => { dbReady.value = true })
})

async function refreshCount() {
  try {
    questionCount.value = await getQuestionCount()
  } catch {
    questionCount.value = 0
  }
}

async function startGame(mode: 'standard' | 'survival') {
  try {
    const count = roundsCount.value
    const questions = await getRandomQuestions(count)
    if (questions.length < count) {
      alert(t('menu.notEnoughQuestions', { count }))
      return
    }
    gameStore.survivalThreshold = survivalThreshold.value
    gameStore.startNewGame(questions, mode)
    router.push('/game')
  } catch (err) {
    console.error('Failed to start game:', err)
    alert(t('menu.loadFailed'))
  }
}
</script>

<style scoped>
.home {
  display: flex;
  height: 100vh;
}

.main-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

h1 {
  font-size: 3rem;
  margin: 0;
}

.main-menu > p {
  color: #888;
  margin: 0 0 24px;
}

.game-modes {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.mode {
  text-align: center;
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 12px;
  width: 220px;
}

.mode h3 {
  margin: 0 0 8px;
}

.mode p {
  color: #666;
  font-size: 0.85rem;
  margin: 0 0 16px;
}

.mode button {
  padding: 10px 24px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.mode button:hover:not(:disabled) {
  background: #f0f0f0;
}

.mode button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-links {
  display: flex;
  gap: 12px;
}

.nav-links button {
  padding: 10px 24px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.nav-links button:hover {
  background: #f0f0f0;
}

a {
  text-decoration: none;
}

</style>
