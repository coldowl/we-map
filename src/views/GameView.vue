<template>
  <div class="game-view" @keydown="handleKeydown" tabindex="0" ref="gameViewRef">
    <div v-if="!isGameStarted" class="start-screen">
      <div class="start-card">
        <h1 class="game-title">We-Map</h1>
        <h2>{{ gameStore.gameMode === 'survival' ? t('menu.survival') : t('menu.standard') }}</h2>
        <p class="round-info">{{ gameStore.questions.length }} {{ t('game.round') }}</p>
        <button class="start-btn" @click="startGame">{{ t('game.start') }}</button>
        <router-link to="/" class="back-link-ghost">{{ t('game.back') }}</router-link>
      </div>
    </div>

    <template v-else>
      <div class="hud">
        <span class="hud-segment"><span class="hud-icon">◉</span> {{ t('game.round') }}: {{ gameStore.currentRound + 1 }} / {{ gameStore.gameMode === 'survival' ? '∞' : gameStore.questions.length }}</span>
        <span class="hud-divider"></span>
        <span class="hud-segment"><span class="hud-icon">★</span> {{ t('game.totalScore') }}: <span class="hud-score">{{ gameStore.totalScore }}</span></span>
        <span v-if="timedMode" class="hud-divider"></span>
        <span v-if="timedMode" class="hud-segment" :class="{ 'time-warning': timeLeft <= 10 }"><span class="hud-icon">◷</span> {{ timeLeft }}s</span>
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

      <div v-if="submitting" class="submit-hint"><span class="calculating-dots">{{ t('game.calculating') }}</span></div>
      <div v-else-if="hasGuess && gameStore.phase === 'playing'" class="submit-hint">
        <span class="submit-bounce">{{ t('game.submit') }}</span>
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

  // 标准模式：直接开始新游戏，跳过过渡页
  const settings = await getSettings()
  const count = settings.roundsCount
  const questions = await getRandomQuestions(count)
  if (questions.length >= count) {
    gameStore.startNewGame(questions, 'standard')
    return
  }

  gameStore.resetGame()
  isGameStarted.value = false
}
</script>

<style scoped>
.game-view {
  position: relative;
  width: 100%;
  flex: 1;
  overflow: hidden;
  outline: none;
}

/* ── Start Screen ── */
.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(145deg, #0f1923 0%, #1a2a3a 100%);
  position: relative;
}

.start-screen::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(52, 152, 219, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 152, 219, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.start-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 40px 48px;
}

.game-title {
  margin: 0;
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: #fff;
  text-shadow: 0 0 30px rgba(230, 126, 34, 0.4), 0 0 60px rgba(230, 126, 34, 0.15);
}

.start-card h2 {
  margin: 0;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
}

.round-info {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.9rem;
}

.start-btn {
  margin-top: 8px;
  padding: 14px 48px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #e67e22, #f39c12);
  color: #fff;
  cursor: pointer;
  transition: box-shadow 0.25s, transform 0.15s;
}

.start-btn:hover {
  box-shadow: 0 0 20px rgba(230, 126, 34, 0.45);
  transform: translateY(-1px);
}

.back-link-ghost {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 8px 24px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  transition: border-color 0.2s, color 0.2s;
}

.back-link-ghost:hover {
  border-color: rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.8);
}

/* ── HUD ── */
.hud {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 25, 35, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.9rem;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0;
}

.hud-segment {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
}

.hud-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.15);
}

.hud-icon {
  font-size: 0.8rem;
  opacity: 0.6;
}

.hud-score {
  color: #e67e22;
  font-weight: 700;
}

/* ── Street View Container ── */
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

/* ── Back Link (in-game) ── */
.back-link {
  position: absolute;
  top: 12px;
  left: 12px;
  color: #fff;
  background: rgba(15, 25, 35, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 18px;
  border-radius: 20px;
  text-decoration: none;
  z-index: 10;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.back-link:hover {
  background: rgba(15, 25, 35, 0.85);
}

/* ── Submit Hint ── */
.submit-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 25, 35, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 0.9rem;
  z-index: 20;
}

.calculating-dots::after {
  content: '';
  animation: dots 1.4s steps(4, end) infinite;
}

@keyframes dots {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%  { content: '...'; }
  100% { content: ''; }
}

.submit-bounce {
  display: inline-block;
  animation: bounce 1.6s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* ── Timer Warning ── */
.time-warning {
  color: #e74c3c;
  font-weight: bold;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
