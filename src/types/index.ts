export interface Question {
  id: number
  imageId: string
  latitude: number
  longitude: number
  country?: string
  region?: string
}

export interface Guess {
  latitude: number
  longitude: number
}

export interface GuessResult {
  distanceKm: number
  score: number
}

export interface RoundResult {
  roundNumber: number
  question: Question
  guess: Guess
  result: GuessResult
}

export interface GameResult {
  id?: number
  gameMode: 'standard' | 'survival'
  totalScore: number
  roundsPlayed: number
  roundResults: RoundResult[]
  playedAt: string
}

export interface GameSettings {
  language: 'zh' | 'en'
  streetViewMove: boolean
  timedMode: boolean
  timeLimitSeconds: number
  mapillaryToken: string
  gameMode: 'standard' | 'survival'
  roundsCount: number
  survivalThreshold: number
}

export type GamePhase = 'idle' | 'playing' | 'result' | 'gameover'
