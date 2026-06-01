import Database from '@tauri-apps/plugin-sql'
import type { Question } from '../types'

let db: Database | null = null

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:we-map.db')
    await initSchema(db)
  }
  return db
}

async function initSchema(database: Database): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id TEXT NOT NULL UNIQUE,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      country TEXT,
      region TEXT
    );
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_mode TEXT NOT NULL DEFAULT 'standard',
      total_score INTEGER NOT NULL DEFAULT 0,
      rounds_played INTEGER NOT NULL DEFAULT 0,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS round_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      image_id TEXT NOT NULL,
      actual_lat REAL NOT NULL,
      actual_lon REAL NOT NULL,
      guess_lat REAL NOT NULL,
      guess_lon REAL NOT NULL,
      distance_km REAL NOT NULL,
      score INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES game_history(id)
    );
  `)
}

export async function getRandomQuestions(count: number): Promise<Question[]> {
  const database = await getDb()
  const rows = await database.select<Question[]>(
    'SELECT id, image_id as imageId, latitude, longitude, country, region FROM questions ORDER BY RANDOM() LIMIT $1',
    [count]
  )
  return rows
}

export async function getQuestionCount(): Promise<number> {
  const database = await getDb()
  const rows = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM questions'
  )
  return rows[0]?.count ?? 0
}

export async function importQuestions(questions: Omit<Question, 'id'>[]): Promise<number> {
  const database = await getDb()
  let imported = 0

  for (const q of questions) {
    try {
      await database.execute(
        'INSERT OR IGNORE INTO questions (image_id, latitude, longitude, country, region) VALUES ($1, $2, $3, $4, $5)',
        [q.imageId, q.latitude, q.longitude, q.country ?? null, q.region ?? null]
      )
      imported++
    } catch {
      // Skip duplicates or invalid entries
    }
  }

  return imported
}

export async function importFromJson(jsonString: string): Promise<number> {
  const data = JSON.parse(jsonString)
  if (!Array.isArray(data)) {
    throw new Error('Invalid format: expected an array')
  }

  const questions = data.map((item: Record<string, unknown>) => ({
    imageId: String(item.imageId ?? item.image_id ?? ''),
    latitude: Number(item.latitude ?? item.lat ?? 0),
    longitude: Number(item.longitude ?? item.lng ?? item.lon ?? 0),
    country: item.country ? String(item.country) : undefined,
    region: item.region ? String(item.region) : undefined,
  })).filter(q => q.imageId && q.latitude && q.longitude)

  return importQuestions(questions)
}

export async function importFromCsv(csvString: string): Promise<number> {
  const lines = csvString.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('Invalid CSV: need header + at least one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const imageIdIdx = headers.indexOf('image_id')
  const latIdx = headers.findIndex(h => h === 'latitude' || h === 'lat')
  const lngIdx = headers.findIndex(h => h === 'longitude' || h === 'lng' || h === 'lon')
  const countryIdx = headers.indexOf('country')
  const regionIdx = headers.indexOf('region')

  if (imageIdIdx === -1 || latIdx === -1 || lngIdx === -1) {
    throw new Error('CSV must have image_id, latitude/lat, and longitude/lng/lon columns')
  }

  const questions = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      imageId: cols[imageIdIdx] ?? '',
      latitude: parseFloat(cols[latIdx] ?? '0'),
      longitude: parseFloat(cols[lngIdx] ?? '0'),
      country: countryIdx >= 0 ? cols[countryIdx] : undefined,
      region: regionIdx >= 0 ? cols[regionIdx] : undefined,
    }
  }).filter(q => q.imageId && !isNaN(q.latitude) && !isNaN(q.longitude))

  return importQuestions(questions)
}
