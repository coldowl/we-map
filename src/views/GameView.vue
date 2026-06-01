<template>
  <div class="game-view" @keydown="handleKeydown" tabindex="0" ref="gameViewRef">
    <div v-if="!isGameStarted" class="start-screen">
      <h2>{{ t('game.ready') }}</h2>
      <p>{{ gameStore.gameMode === 'survival' ? t('menu.survival') : t('menu.standard') }} - {{ gameStore.questions.length }} {{ t('game.round') }}</p>
      <button @click="startGame">{{ t('game.start') }}</button>
      <router-link to="/">{{ t('game.back') }}</router-link>
    </div>

    <template v-else>
      <div class="hud">
        <span>{{ t('game.round') }}: {{ gameStore.currentRound + 1 }} / {{ gameStore.gameMode === 'survival' ? '∞' : gameStore.questions.length }}</span>
        <span>{{ t('game.totalScore') }}: {{ gameStore.totalScore }}</span>
        <span v-if="timedMode" :class="{ 'time-warning': timeLeft <= 10 }">⏱ {{ timeLeft }}s</span>
      </div>

      <div class="street-view-container">
        <StreetViewer
          v-if="accessToken && currentImageId"
          :access-token="accessToken"
          :image-id="currentImageId"
          :move="streetViewMove"
          @viewer-ready="onViewerReady"
          @viewer-error="onViewerError"
          @image-loaded="onImageLoaded"
          @skip="handleSkip"
        />
        <div v-else class="placeholder">
          <p v-if="!accessToken">{{ t('game.needToken') }}</p>
          <p v-else>{{ t('game.loading') }}</p>
        </div>
      </div>

      <GuessMap ref="guessMapRef" @guess-placed="onGuessPlaced" />

      <div v-if="submitting" class="submit-hint">{{ t('game.calculating') }}</div>
      <div v-else-if="hasGuess && gameStore.phase === 'playing'" class="submit-hint">
        {{ t('game.submit') }}
      </div>

      <router-link to="/" class="back-link">{{ t('game.back') }}</router-link>
    </template>

    <GameResult
      v-if="gameStore.phase === 'result' || gameStore.phase === 'gameover'"
      :last-result="gameStore.roundResults[gameStore.roundResults.length - 1] ?? null"
      :total-score="gameStore.totalScore"
      :current-round="gameStore.currentRound"
      :is-game-over="gameStore.phase === 'gameover'"
      :game-mode="gameStore.gameMode"
      @next-round="handleNextRound"
      @new-game="handleNewGame"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { useGameStore } from '../stores/game'
import { getRandomQuestions } from '../services/questionBank'
import { saveGameResult } from '../services/gameHistory'
import { getMapillaryToken, getSettings } from '../services/settings'
import type { Viewer } from 'mapillary-js'
import StreetViewer from '../components/StreetViewer.vue'
import GuessMap from '../components/GuessMap.vue'
import GameResult from '../components/GameResult.vue'

const router = useRouter()
const { t } = useI18n()
const gameStore = useGameStore()
const gameViewRef = ref<HTMLElement | null>(null)
const guessMapRef = ref<InstanceType<typeof GuessMap> | null>(null)
const isGameStarted = ref(false)
const hasGuess = ref(false)
const submitting = ref(false)
const accessToken = ref('')
const timedMode = ref(false)
const streetViewMove = ref(true)
const timeLimit = ref(60)
const timeLeft = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const currentImageId = computed(() => gameStore.currentQuestion?.imageId ?? '')

onMounted(async () => {
  gameViewRef.value?.focus()
  try {
    const settings = await getSettings()
    accessToken.value = settings.mapillaryToken
    timedMode.value = settings.timedMode
    streetViewMove.value = settings.streetViewMove
    timeLimit.value = settings.timeLimitSeconds
  } catch {
    console.warn('Failed to load settings')
  }
  if (gameStore.questions.length > 0 && gameStore.phase === 'playing') {
    isGameStarted.value = true
    if (timedMode.value) timeLeft.value = timeLimit.value
  }
})

onUnmounted(stopTimer)

// Save game result when game ends
watch(
  () => gameStore.phase,
  async (phase) => {
    if (phase === 'gameover' && gameStore.roundResults.length > 0) {
      try {
        const result = gameStore.getGameResult()
        await saveGameResult(result)
        console.log('Game result saved')
      } catch (err) {
        console.error('Failed to save game result:', err)
      }
    }
    // Timer: show full time while loading, stop on result/gameover
    if (phase === 'playing' && timedMode.value) {
      timeLeft.value = timeLimit.value
    } else if (phase !== 'playing') {
      stopTimer()
    }
  }
)

function onViewerReady(viewer: Viewer) {
  console.log('Mapillary viewer ready', viewer)
}

function onImageLoaded() {
  if (timedMode.value && gameStore.phase === 'playing' && !timerInterval) {
    timeLeft.value = timeLimit.value
    startTimer()
  }
}

function onViewerError(err: string) {
  console.error('Viewer error:', err)
}

function onGuessPlaced(lat: number, lng: number) {
  if (gameStore.phase !== 'playing') return
  gameStore.placeGuess(lat, lng)
  hasGuess.value = true
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    guessMapRef.value?.toggleCollapse()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (gameStore.phase === 'result') {
      handleNextRound()
    } else if (hasGuess.value && gameStore.phase === 'playing' && !submitting.value) {
      submitGuess()
    }
  } else if (e.key === 'Escape') {
    router.push('/')
  }
}

async function startGame() {
  isGameStarted.value = true
  hasGuess.value = false
}

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      stopTimer()
      handleTimeout()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

async function handleTimeout() {
  if (gameStore.phase !== 'playing') return

  if (hasGuess.value && gameStore.guess) {
    // Has guess placed — auto-submit
    await submitGuess()
  } else {
    // No guess — score 0
    const question = gameStore.currentQuestion
    if (question) {
      gameStore.placeGuess(question.latitude, question.longitude)
      gameStore.submitGuess({ distanceKm: 0, score: 0 })
    }
  }
}

async function submitGuess() {
  const guess = gameStore.guess
  const question = gameStore.currentQuestion
  if (!guess || !question) return

  submitting.value = true
  try {
    const result = await invoke<{ distance_km: number; score: number }>('calculate_distance', {
      guessLat: guess.latitude,
      guessLon: guess.longitude,
      actualLat: question.latitude,
      actualLon: question.longitude,
    })
    gameStore.submitGuess({ distanceKm: result.distance_km, score: result.score })
  } catch (err) {
    console.error('Failed to calculate distance:', err)
    // Fallback to JS calculation if Rust invoke fails
    const { evaluateGuess } = await import('../utils/haversine')
    const result = evaluateGuess(guess.latitude, guess.longitude, question.latitude, question.longitude)
    gameStore.submitGuess(result)
  } finally {
    submitting.value = false
  }
}

async function handleSkip() {
  // Fetch a replacement question not already used in this game
  const usedIds = new Set(gameStore.questions.map(q => q.imageId))
  const candidates = await getRandomQuestions(10)
  const replacement = candidates.find(q => !usedIds.has(q.imageId))
  if (replacement) {
    guessMapRef.value?.clearGuess()
    hasGuess.value = false
    gameStore.replaceCurrentQuestion(replacement)
  }
}

async function handleNextRound() {
  guessMapRef.value?.clearGuess()
  hasGuess.value = false

  // Survival mode: fetch more questions before running out
  if (gameStore.gameMode === 'survival') {
    const remaining = gameStore.questions.length - gameStore.currentRound - 1
    if (remaining <= 2) {
      const more = await getRandomQuestions(10)
      if (more.length > 0) {
        gameStore.addQuestions(more)
      }
    }
  }

  gameStore.nextRound()
}

async function handleNewGame() {
  guessMapRef.value?.clearGuess()
  hasGuess.value = false

  if (gameStore.gameMode === 'survival') {
    const questions = await getRandomQuestions(5)
    if (questions.length >= 5) {
      gameStore.startNewGame(questions, 'survival')
      return
    }
  }

  gameStore.resetGame()
  isGameStarted.value = false
}
</script>

<style scoped>
.game-view {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  outline: none;
}

.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  background: #f5f5f5;
}

.start-screen h2 {
  margin: 0;
}

.start-screen button {
  padding: 12px 32px;
  font-size: 1.1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.start-screen button:hover {
  background: #e0e0e0;
}

.start-screen a {
  color: #888;
  text-decoration: none;
}

.hud {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.9rem;
  z-index: 10;
  display: flex;
  gap: 24px;
}

.street-view-container {
  width: 100%;
  height: 100%;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  color: #ccc;
}

.back-link {
  position: absolute;
  top: 12px;
  left: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  z-index: 10;
}

.back-link:hover {
  background: rgba(0, 0, 0, 0.7);
}

.submit-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.9rem;
  z-index: 20;
}

.time-warning {
  color: #e74c3c;
  font-weight: bold;
  animation: shake 0.4s ease-in-out infinite;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
</style>
