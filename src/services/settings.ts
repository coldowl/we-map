import { LazyStore } from '@tauri-apps/plugin-store'
import type { GameSettings } from '../types'

const store = new LazyStore('settings.json')

const DEFAULT_SETTINGS: GameSettings = {
  language: 'zh',
  theme: 'light',
  streetViewMove: true,
  timedMode: false,
  timeLimitSeconds: 60,
  mapillaryToken: '',
  gameMode: 'standard',
  roundsCount: 5,
  survivalThreshold: 2000,
}

export async function getSettings(): Promise<GameSettings> {
  const saved = await store.get<Partial<GameSettings>>('settings')
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  await store.set('settings', settings)
  await store.save()
}

export async function getMapillaryToken(): Promise<string> {
  const settings = await getSettings()
  return settings.mapillaryToken
}

export async function setMapillaryToken(token: string): Promise<void> {
  const settings = await getSettings()
  settings.mapillaryToken = token
  await saveSettings(settings)
}

export async function getLanguage(): Promise<'zh' | 'en'> {
  const settings = await getSettings()
  return settings.language
}

export async function setLanguage(lang: 'zh' | 'en'): Promise<void> {
  const settings = await getSettings()
  settings.language = lang
  await saveSettings(settings)
}
