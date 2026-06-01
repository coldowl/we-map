import Database from '@tauri-apps/plugin-sql'
import type { Question } from '../types'
import { getSettings } from './settings'

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

// ─── 自动获取题库 ──────────────────────────────────────────────────────────

const BBOXES: { name: string; bbox: [number, number, number, number] }[] = [
  // 东亚
  { name: "东京",       bbox: [139.6917, 35.6895, 139.7554, 35.7105] },
  { name: "大阪",       bbox: [135.4800, 34.6700, 135.5300, 34.7100] },
  { name: "名古屋",     bbox: [136.9000, 35.1500, 136.9400, 35.1800] },
  { name: "福冈",       bbox: [130.3900, 33.5800, 130.4300, 33.6100] },
  { name: "首尔",       bbox: [126.9500, 37.5300, 127.0300, 37.5800] },
  { name: "釜山",       bbox: [129.0300, 35.1000, 129.0800, 35.1400] },
  { name: "台北",       bbox: [121.5200, 25.0200, 121.5700, 25.0600] },
  { name: "香港",       bbox: [114.1400, 22.2700, 114.1900, 22.3200] },
  { name: "上海",       bbox: [121.4600, 31.2200, 121.5100, 31.2600] },
  { name: "北京",       bbox: [116.3800, 39.9000, 116.4300, 39.9400] },
  { name: "广州",       bbox: [113.2500, 23.1200, 113.3000, 23.1600] },
  { name: "深圳",       bbox: [114.0500, 22.5300, 114.1000, 22.5700] },
  { name: "成都",       bbox: [104.0600, 30.6500, 104.1100, 30.6900] },
  // 东南亚
  { name: "曼谷",       bbox: [100.4900, 13.7200, 100.5700, 13.7700] },
  { name: "新加坡",     bbox: [103.7800, 1.2700, 103.8700, 1.3200] },
  { name: "雅加达",     bbox: [106.7800, -6.2200, 106.8500, -6.1700] },
  { name: "吉隆坡",     bbox: [101.6800, 3.1300, 101.7300, 3.1700] },
  { name: "马尼拉",     bbox: [120.9600, 14.5800, 121.0100, 14.6200] },
  { name: "胡志明市",   bbox: [106.6800, 10.7600, 106.7300, 10.8000] },
  { name: "河内",       bbox: [105.8300, 21.0100, 105.8700, 21.0400] },
  // 南亚 / 西亚
  { name: "新德里",     bbox: [77.1800, 28.5700, 77.2400, 28.6300] },
  { name: "孟买",       bbox: [72.8500, 19.0500, 72.9000, 19.0900] },
  { name: "班加罗尔",   bbox: [77.5800, 12.9600, 77.6300, 13.0000] },
  { name: "加尔各答",   bbox: [88.3500, 22.5500, 88.4000, 22.5900] },
  { name: "伊斯坦布尔", bbox: [28.9500, 41.0000, 29.0100, 41.0400] },
  { name: "迪拜",       bbox: [55.2600, 25.1900, 55.3100, 25.2300] },
  { name: "利雅得",     bbox: [46.7000, 24.6800, 46.7500, 24.7200] },
  // 欧洲
  { name: "巴黎",       bbox: [2.3100, 48.8400, 2.3800, 48.8700] },
  { name: "伦敦",       bbox: [-0.1400, 51.4900, -0.0800, 51.5200] },
  { name: "柏林",       bbox: [13.3700, 52.5000, 13.4300, 52.5300] },
  { name: "罗马",       bbox: [12.4700, 41.8800, 12.5100, 41.9100] },
  { name: "马德里",     bbox: [-3.7100, 40.4200, -3.6700, 40.4500] },
  { name: "米兰",       bbox: [9.1700, 45.4600, 9.2100, 45.4900] },
  { name: "阿姆斯特丹", bbox: [4.8700, 52.3500, 4.9200, 52.3800] },
  { name: "巴塞罗那",   bbox: [2.1500, 41.3700, 2.1900, 41.4000] },
  { name: "布拉格",     bbox: [14.4100, 50.0700, 14.4500, 50.0900] },
  { name: "维也纳",     bbox: [16.3500, 48.1900, 16.3900, 48.2200] },
  { name: "斯德哥尔摩", bbox: [18.0500, 59.3200, 18.0900, 59.3400] },
  { name: "哥本哈根",   bbox: [12.5600, 55.6700, 12.6000, 55.6900] },
  { name: "慕尼黑",     bbox: [11.5600, 48.1300, 11.6000, 48.1600] },
  { name: "华沙",       bbox: [21.0000, 52.2200, 21.0500, 52.2600] },
  { name: "布达佩斯",   bbox: [19.0400, 47.4900, 19.0800, 47.5200] },
  { name: "里斯本",     bbox: [-9.1500, 38.7200, -9.1100, 38.7500] },
  { name: "都柏林",     bbox: [-6.2700, 53.3400, -6.2300, 53.3700] },
  { name: "赫尔辛基",   bbox: [24.9300, 60.1600, 24.9700, 60.1900] },
  { name: "雅典",       bbox: [23.7100, 37.9700, 23.7600, 38.0000] },
  { name: "苏黎世",     bbox: [8.5300, 47.3700, 8.5700, 47.3900] },
  { name: "布鲁塞尔",   bbox: [4.3400, 50.8400, 4.3800, 50.8700] },
  { name: "莫斯科",     bbox: [37.6000, 55.7400, 37.6600, 55.7700] },
  // 北美
  { name: "纽约",       bbox: [-74.0200, 40.7000, -73.9600, 40.7500] },
  { name: "旧金山",     bbox: [-122.4300, 37.7600, -122.3900, 37.7900] },
  { name: "芝加哥",     bbox: [-87.6500, 41.8700, -87.6100, 41.9000] },
  { name: "西雅图",     bbox: [-122.3600, 47.5900, -122.3200, 47.6200] },
  { name: "洛杉矶",     bbox: [-118.2800, 34.0300, -118.2300, 34.0700] },
  { name: "华盛顿",     bbox: [-77.0500, 38.8900, -77.0100, 38.9200] },
  { name: "波士顿",     bbox: [-71.0700, 42.3500, -71.0300, 42.3800] },
  { name: "休斯顿",     bbox: [-95.3800, 29.7500, -95.3400, 29.7800] },
  { name: "费城",       bbox: [-75.1700, 39.9400, -75.1300, 39.9700] },
  { name: "亚特兰大",   bbox: [-84.3900, 33.7500, -84.3500, 33.7800] },
  { name: "丹佛",       bbox: [-104.9900, 39.7400, -104.9500, 39.7700] },
  { name: "多伦多",     bbox: [-79.4000, 43.6400, -79.3600, 43.6700] },
  { name: "温哥华",     bbox: [-123.1500, 49.2600, -123.1000, 49.2900] },
  { name: "蒙特利尔",   bbox: [-73.5700, 45.5000, -73.5300, 45.5300] },
  { name: "迈阿密",     bbox: [-80.2100, 25.7600, -80.1700, 25.7900] },
  { name: "墨西哥城",   bbox: [-99.1600, 19.4200, -99.1200, 19.4600] },
  // 南美
  { name: "布宜诺斯艾利斯", bbox: [-58.4200, -34.6200, -58.3600, -34.5800] },
  { name: "圣保罗",         bbox: [-46.6700, -23.5700, -46.6200, -23.5400] },
  { name: "里约热内卢",     bbox: [-43.1900, -22.9100, -43.1500, -22.8800] },
  { name: "波哥大",         bbox: [-74.1000, 4.6000, -74.0500, 4.6400] },
  { name: "利马",           bbox: [-77.0600, -12.0700, -77.0200, -12.0400] },
  { name: "圣地亚哥",       bbox: [-70.6700, -33.4500, -70.6300, -33.4200] },
  { name: "基多",           bbox: [-78.5000, -0.2000, -78.4600, -0.1700] },
  { name: "蒙得维的亚",     bbox: [-56.1900, -34.8900, -56.1500, -34.8600] },
  // 非洲
  { name: "开罗",       bbox: [31.2200, 30.0400, 31.2600, 30.0700] },
  { name: "开普敦",     bbox: [18.4000, -33.9400, 18.4500, -33.9100] },
  { name: "约翰内斯堡", bbox: [28.0300, -26.2000, 28.0800, -26.1700] },
  { name: "内罗毕",     bbox: [36.7800, -1.3000, 36.8300, -1.2600] },
  { name: "拉各斯",     bbox: [3.3700, 6.4400, 3.4200, 6.4800] },
  { name: "达累斯萨拉姆", bbox: [39.2600, -6.8100, 39.3000, -6.7800] },
  { name: "卡萨布兰卡", bbox: [-7.6000, 33.5700, -7.5600, 33.6000] },
  { name: "阿克拉",     bbox: [-0.2000, 5.5500, -0.1600, 5.5800] },
  { name: "亚的斯亚贝巴", bbox: [38.7400, 9.0100, 38.7800, 9.0400] },
  { name: "突尼斯",     bbox: [10.1700, 36.7900, 10.2100, 36.8200] },
  // 大洋洲
  { name: "悉尼",       bbox: [151.1800, -33.8900, 151.2300, -33.8600] },
  { name: "墨尔本",     bbox: [144.9400, -37.8300, 144.9900, -37.8000] },
  { name: "布里斯班",   bbox: [153.0100, -27.4700, 153.0600, -27.4400] },
  { name: "珀斯",       bbox: [115.8500, -31.9500, 115.9000, -31.9200] },
  { name: "奥克兰",     bbox: [174.7400, -36.8600, 174.7900, -36.8300] },
]

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function fetchQuestionsFromApi(
  count: number,
  onProgress?: (current: number, total: number, region: string) => void,
): Promise<number> {
  const settings = await getSettings()
  const token = settings.mapillaryToken
  if (!token) throw new Error('NO_TOKEN')

  const API_BASE = 'https://graph.mapillary.com/map_features'
  const FIELDS = 'id,geometry,images'
  const PAGE_LIMIT = 100
  const MAX_ROUNDS = 10
  const MIN_DISTANCE_KM = 5

  const collected = new Map<string, { imageId: string; latitude: number; longitude: number }>()
  const cursors = new Map<string, string | null>()

  for (let round = 0; round < MAX_ROUNDS && collected.size < count; round++) {
    const regions = shuffle(BBOXES)

    for (const region of regions) {
      if (collected.size >= count) break
      onProgress?.(collected.size, count, region.name)

      const after = cursors.get(region.name) ?? null
      const [w, s, e, n] = region.bbox
      const params = new URLSearchParams({
        access_token: token,
        bbox: `${w},${s},${e},${n}`,
        fields: FIELDS,
        limit: String(PAGE_LIMIT),
      })
      if (after) params.set('after', after)

      try {
        const res = await fetch(`${API_BASE}?${params}`)
        if (!res.ok) continue

        const json = await res.json()
        const features: Array<{ images?: { data: Array<{ id: string; geometry?: { coordinates: [number, number] } }> } }> = json.data ?? []

        const results: Array<{ imageId: string; latitude: number; longitude: number }> = []
        const seen = new Set<string>()
        for (const feat of features) {
          for (const img of feat.images?.data ?? []) {
            if (img.id && img.geometry?.coordinates && !seen.has(img.id)) {
              const [lon, lat] = img.geometry.coordinates
              seen.add(img.id)
              results.push({ imageId: img.id, latitude: lat, longitude: lon })
            }
          }
        }

        // 更新游标
        const nextUrl: string | undefined = json.paging?.next
        if (nextUrl) {
          try {
            const u = new URL(nextUrl)
            cursors.set(region.name, u.searchParams.get('after'))
          } catch { /* ignore */ }
        }

        // 去重 + 距离过滤
        for (const img of shuffle(results)) {
          if (collected.size >= count) break
          if (collected.has(img.imageId)) continue
          let tooClose = false
          for (const existing of collected.values()) {
            if (haversineDistance(img.latitude, img.longitude, existing.latitude, existing.longitude) < MIN_DISTANCE_KM) {
              tooClose = true
              break
            }
          }
          if (!tooClose) collected.set(img.imageId, img)
        }

        await new Promise(r => setTimeout(r, 300))
      } catch {
        // 跳过失败的区域，继续下一个
      }
    }
  }

  if (collected.size === 0) throw new Error('NO_RESULTS')

  const questions = shuffle([...collected.values()]).map(q => ({
    imageId: q.imageId,
    latitude: q.latitude,
    longitude: q.longitude,
  }))

  return importQuestions(questions)
}
