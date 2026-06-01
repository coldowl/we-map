import Database from '@tauri-apps/plugin-sql'
import type { GameResult } from '../types'

let db: Database | null = null

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:we-map.db')
  }
  return db
}

export async function saveGameResult(result: GameResult): Promise<number> {
  const database = await getDb()

  const insertResult = await database.execute(
    'INSERT INTO game_history (game_mode, total_score, rounds_played) VALUES ($1, $2, $3)',
    [result.gameMode, result.totalScore, result.roundsPlayed]
  )
  const gameId = insertResult.lastInsertId

  for (const round of result.roundResults) {
    await database.execute(
      `INSERT INTO round_history
       (game_id, round_number, image_id, actual_lat, actual_lon, guess_lat, guess_lon, distance_km, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        gameId,
        round.roundNumber,
        round.question.imageId,
        round.question.latitude,
        round.question.longitude,
        round.guess.latitude,
        round.guess.longitude,
        round.result.distanceKm,
        round.result.score,
      ]
    )
  }

  return gameId
}

export async function clearAllHistory(): Promise<void> {
  const database = await getDb()
  await database.execute('DELETE FROM round_history')
  await database.execute('DELETE FROM game_history')
}

export interface GameHistoryEntry {
  id: number
  game_mode: string
  total_score: number
  rounds_played: number
  played_at: string
}

export async function getGameHistory(limit: number = 10): Promise<GameHistoryEntry[]> {
  const database = await getDb()
  return database.select<GameHistoryEntry[]>(
    'SELECT id, game_mode, total_score, rounds_played, played_at FROM game_history ORDER BY id DESC LIMIT $1',
    [limit]
  )
}

export interface PlayerStats {
  totalGames: number
  bestScore: number
  avgScore: number
  totalRounds: number
  avgDistance: number
  bestRoundScore: number
}

export async function getPlayerStats(): Promise<PlayerStats> {
  const database = await getDb()

  const gameStats = await database.select<{
    total_games: number
    best_score: number
    avg_score: number
  }[]>(
    'SELECT COUNT(*) as total_games, COALESCE(MAX(total_score), 0) as best_score, COALESCE(AVG(total_score), 0) as avg_score FROM game_history'
  )

  const roundStats = await database.select<{
    total_rounds: number
    avg_distance: number
    best_round_score: number
  }[]>(
    'SELECT COUNT(*) as total_rounds, COALESCE(AVG(distance_km), 0) as avg_distance, COALESCE(MAX(score), 0) as best_round_score FROM round_history'
  )

  return {
    totalGames: gameStats[0]?.total_games ?? 0,
    bestScore: gameStats[0]?.best_score ?? 0,
    avgScore: Math.round(gameStats[0]?.avg_score ?? 0),
    totalRounds: roundStats[0]?.total_rounds ?? 0,
    avgDistance: Math.round((roundStats[0]?.avg_distance ?? 0) * 100) / 100,
    bestRoundScore: roundStats[0]?.best_round_score ?? 0,
  }
}
