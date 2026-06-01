import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Question, Guess, RoundResult, GameResult, GamePhase, GameSettings } from '../types'

export const useGameStore = defineStore('game', () => {
  const phase = ref<GamePhase>('idle')
  const questions = ref<Question[]>([])
  const currentRound = ref(0)
  const guess = ref<Guess | null>(null)
  const roundResults = ref<RoundResult[]>([])
  const gameMode = ref<'standard' | 'survival'>('standard')
  const survivalThreshold = ref(2000)

  const settings = ref<GameSettings>({
    language: 'zh',
    streetViewMove: true,
    timedMode: false,
    timeLimitSeconds: 60,
    mapillaryToken: '',
    gameMode: 'standard',
    roundsCount: 5,
    survivalThreshold: 2000,
  })

  const currentQuestion = computed(() => questions.value[currentRound.value] ?? null)
  const totalScore = computed(() => roundResults.value.reduce((sum, r) => sum + r.result.score, 0))
  const isGameOver = computed(() => phase.value === 'gameover')

  function startNewGame(newQuestions: Question[], mode: 'standard' | 'survival' = 'standard') {
    questions.value = newQuestions
    currentRound.value = 0
    guess.value = null
    roundResults.value = []
    gameMode.value = mode
    phase.value = 'playing'
  }

  function replaceCurrentQuestion(newQuestion: Question) {
    questions.value[currentRound.value] = newQuestion
    guess.value = null
  }

  function placeGuess(lat: number, lng: number) {
    guess.value = { latitude: lat, longitude: lng }
  }

  function submitGuess(result: { distanceKm: number; score: number }) {
    if (!currentQuestion.value || !guess.value) return

    const roundResult: RoundResult = {
      roundNumber: currentRound.value + 1,
      question: currentQuestion.value,
      guess: guess.value,
      result,
    }
    roundResults.value.push(roundResult)

    // Survival mode: end immediately if score is below threshold
    if (gameMode.value === 'survival' && result.score < survivalThreshold.value) {
      phase.value = 'gameover'
      return
    }

    phase.value = 'result'
  }

  function addQuestions(newQuestions: Question[]) {
    const existingIds = new Set(questions.value.map(q => q.imageId))
    for (const q of newQuestions) {
      if (!existingIds.has(q.imageId)) {
        questions.value.push(q)
        existingIds.add(q.imageId)
      }
    }
  }

  function nextRound() {
    const nextIndex = currentRound.value + 1

    if (nextIndex >= questions.value.length) {
      phase.value = 'gameover'
      return
    }

    currentRound.value = nextIndex
    guess.value = null
    phase.value = 'playing'
  }

  function getGameResult(): GameResult {
    return {
      gameMode: gameMode.value,
      totalScore: totalScore.value,
      roundsPlayed: roundResults.value.length,
      roundResults: roundResults.value,
      playedAt: new Date().toISOString(),
    }
  }

  function resetGame() {
    phase.value = 'idle'
    questions.value = []
    currentRound.value = 0
    guess.value = null
    roundResults.value = []
  }

  return {
    phase,
    questions,
    currentRound,
    guess,
    roundResults,
    gameMode,
    survivalThreshold,
    settings,
    currentQuestion,
    totalScore,
    isGameOver,
    startNewGame,
    addQuestions,
    replaceCurrentQuestion,
    placeGuess,
    submitGuess,
    nextRound,
    getGameResult,
    resetGame,
  }
})
