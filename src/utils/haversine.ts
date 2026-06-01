const EARTH_RADIUS_KM = 6371
const MAX_SCORE = 5000
const DECAY_FACTOR = 2000

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2

  const c = 2 * Math.asin(Math.sqrt(a))

  return EARTH_RADIUS_KM * c
}

export function calculateScore(distanceKm: number): number {
  if (distanceKm <= 0) return MAX_SCORE
  return Math.round(MAX_SCORE * Math.exp(-distanceKm / DECAY_FACTOR))
}

export function evaluateGuess(
  guessLat: number,
  guessLon: number,
  actualLat: number,
  actualLon: number
): { distanceKm: number; score: number } {
  const distance = haversineDistance(guessLat, guessLon, actualLat, actualLon)
  return {
    distanceKm: Math.round(distance * 100) / 100,
    score: calculateScore(distance),
  }
}
